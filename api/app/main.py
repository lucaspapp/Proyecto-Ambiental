from datetime import datetime, timezone
import hashlib
import secrets
from threading import Lock

from fastapi import FastAPI, Form, HTTPException, status
from mysql.connector import Error, IntegrityError
from pydantic import BaseModel, ConfigDict, Field

from conexion import conexion_db


app = FastAPI(
    title="API Proyecto Ambiental",
    description="API para usuarios, proyectos, módulos y mediciones del prototipo ESP32.",
    version="1.0.0",
)

_datos_sensores: list[dict[str, object]] = []
_sensores_lock = Lock()
_MAX_MEDICIONES_EN_MEMORIA = 1000


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, 600_000
    )
    return f"pbkdf2_sha256$600000${salt.hex()}${digest.hex()}"


class SensorMeasurement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_sp: int = Field(..., gt=0)
    valor: float = Field(..., ge=-1_000_000, le=1_000_000)


class SensorData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id_proyecto: int = Field(..., gt=0)
    id_modulo: int = Field(..., gt=0)
    mediciones: list[SensorMeasurement] = Field(..., min_length=1, max_length=100)


def _error_db(error: Error) -> HTTPException:
    if isinstance(error, IntegrityError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El recurso ya existe o referencia datos inexistentes.",
        )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="No fue posible completar la operación con la base de datos.",
    )


@app.get("/", include_in_schema=False)
def inicio() -> dict[str, str]:
    return {"mensaje": "API Proyecto Ambiental", "docs": "/docs"}


@app.post("/crearuser", status_code=status.HTTP_201_CREATED)
def crearuser(
    id: str = Form(..., min_length=1, max_length=100),
    nombre: str = Form(..., min_length=1, max_length=100),
    apellido: str = Form(..., min_length=1, max_length=100),
    rol: str = Form("estudiante"),
    contrasenia: str = Form(..., min_length=8, max_length=255),
    institucion: str = Form("", max_length=150),
) -> dict[str, str]:
    if rol not in {"estudiante", "docente", "invitado", "administrador"}:
        raise HTTPException(status_code=422, detail="Rol no válido.")
    try:
        with conexion_db() as (_, cursor):
            cursor.execute(
                """
                INSERT INTO usuarios
                    (id_usuario, Nombre, Apellido, Institucion, Rol, Password)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    id.strip(),
                    nombre.strip(),
                    apellido.strip(),
                    institucion.strip(),
                    rol,
                    _hash_password(contrasenia),
                ),
            )
    except (Error, RuntimeError) as error:
        if isinstance(error, Error):
            raise _error_db(error) from error
        raise HTTPException(status_code=503, detail="Base de datos no configurada.") from error
    return {"mensaje": "Usuario creado correctamente"}


@app.post("/crearproyecto", status_code=status.HTTP_201_CREATED)
def crearproyecto(
    Usuario: str = Form(..., min_length=1, max_length=100),
    Titulo: str = Form(..., min_length=1, max_length=200),
    Descripcion: str = Form("", max_length=5000),
) -> dict[str, str]:
    try:
        with conexion_db() as (_, cursor):
            cursor.execute(
                "INSERT INTO proyectos (Usuario, Titulo, Descripcion) VALUES (%s, %s, %s)",
                (Usuario.strip(), Titulo.strip(), Descripcion.strip()),
            )
    except (Error, RuntimeError) as error:
        if isinstance(error, Error):
            raise _error_db(error) from error
        raise HTTPException(status_code=503, detail="Base de datos no configurada.") from error
    return {"mensaje": "Proyecto creado correctamente"}


@app.post("/crearconfig", status_code=status.HTTP_201_CREATED)
def crearconfig(
    Id_proyecto: int = Form(..., gt=0),
    Data_mediciones: int = Form(..., ge=0),
    Data_guardado: int = Form(..., ge=0),
    Nombre: str = Form(..., min_length=1, max_length=150),
    Descripcion: str = Form("", max_length=5000),
) -> dict[str, str]:
    try:
        with conexion_db() as (_, cursor):
            cursor.execute(
                """
                INSERT INTO conf_modulos
                    (Id_proyecto, Data_mediciones, Data_guardado, Nombre, Descripcion)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (Id_proyecto, Data_mediciones, Data_guardado, Nombre.strip(), Descripcion.strip()),
            )
    except (Error, RuntimeError) as error:
        if isinstance(error, Error):
            raise _error_db(error) from error
        raise HTTPException(status_code=503, detail="Base de datos no configurada.") from error
    return {"mensaje": "Configuración creada correctamente"}


@app.get("/veruser")
def verusers() -> dict[str, list[dict[str, object]]]:
    try:
        with conexion_db() as (_, cursor):
            cursor.execute(
                "SELECT id_usuario, Nombre, Apellido, Institucion, Rol FROM usuarios"
            )
            usuarios = cursor.fetchall()
    except (Error, RuntimeError) as error:
        if isinstance(error, Error):
            raise _error_db(error) from error
        raise HTTPException(status_code=503, detail="Base de datos no configurada.") from error
    return {"usuarios": usuarios}


@app.post("/sensores", status_code=status.HTTP_201_CREATED)
def recibir_datos(datos: SensorData) -> dict[str, object]:
    registro = datos.model_dump()
    registro["fecha"] = datetime.now(timezone.utc).isoformat()

    try:
        with conexion_db() as (_, cursor):
            sensor_ids = [medicion.id_sp for medicion in datos.mediciones]
            placeholders = ", ".join(["%s"] * len(sensor_ids))
            cursor.execute(
                f"""
                SELECT id_sp
                FROM sensores_proyecto
                WHERE id_proyecto = %s AND id_sp IN ({placeholders})
                """,
                [datos.id_proyecto, *sensor_ids],
            )
            sensores_validos = {fila["id_sp"] for fila in cursor.fetchall()}
            sensores_invalidos = sorted(set(sensor_ids) - sensores_validos)
            if sensores_invalidos:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "Los sensores no pertenecen al proyecto: "
                        + ", ".join(map(str, sensores_invalidos))
                    ),
                )

            cursor.executemany(
                """
                INSERT INTO mediciones
                    (Id_proyecto, Id_modulo, Valor, id_sp)
                VALUES (%s, %s, %s, %s)
                """,
                [
                    (datos.id_proyecto, datos.id_modulo, medicion.valor, medicion.id_sp)
                    for medicion in datos.mediciones
                ],
            )
    except (Error, RuntimeError) as error:
        if isinstance(error, Error):
            raise _error_db(error) from error
        raise HTTPException(status_code=503, detail="Base de datos no configurada.") from error

    with _sensores_lock:
        _datos_sensores.append(registro)
        del _datos_sensores[:-_MAX_MEDICIONES_EN_MEMORIA]
    return {
        "ok": True,
        "mensaje": "Mediciones guardadas",
        "cantidad": len(datos.mediciones),
        "fecha": registro["fecha"],
    }


@app.get("/sensores/actual")
def sensores_actual() -> dict[str, object]:
    with _sensores_lock:
        if not _datos_sensores:
            raise HTTPException(status_code=404, detail="No hay mediciones todavía.")
        return _datos_sensores[-1].copy()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
