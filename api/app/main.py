from fastapi import FastAPI,Form
from pydantic import BaseModel
from datetime import datetime
from mysql.connector import Error
from conexion import conectar
from fastapi.responses import FileResponse


app = FastAPI()
datos_sensores = []

class SensorData (BaseModel):
    temperatura: float
    viento: float
    humedad: float
    aire: float



@app.post("/crearuser")
def crearuser(
    nombre: str = Form(...),
    apellido: str = Form(...),
    rol: str = Form(...),
    contrasenia: str = Form(...),
    institucion: str = Form(...)
):
    conexion, cursor = conectar()

    if conexion is None:
        return {"error": "No se pudo conectar a la base de datos"}

    try:
        datos = (
            nombre,
            apellido,
            institucion,
            rol,
            contrasenia
        )

        cursor.execute(
            """
            INSERT INTO usuarios
            (Nombre, Apellido, Institucion, Rol, Password)
            VALUES (%s, %s, %s, %s, %s)
            """,
            datos
        )

        conexion.commit()

        return {"mensaje": "Usuario insertado correctamente"}

    except Error as e:
        return {"error": str(e)}

    finally:
        cursor.close()
        conexion.close()


@app.get("/veruser")
def verusers():
    conexion, cursor = conectar()

    if conexion is None:
        return {"error": "No se pudo conectar a la base de datos"}

    try:
        cursor.execute("SELECT * FROM usuarios")
        usuarios = cursor.fetchall()

        return {"usuarios": usuarios}

    except Error as e:
        return {"error": str(e)}

    finally:
        cursor.close()
        conexion.close()

# Aca envia los datos la ESP32
@app.post("/sensores")
def recibirDatos(datos: SensorData):
    registro = {
        "temperatura": datos.temperatura,
        "viento": datos.viento,
        "humedad": datos.humedad,
        "aire": datos.aire,
        "fecha": datetime.now().strftime("%H:%M:%S")
    }
    datos_sensores.append(registro)
    print('Datos Recibidos')
    print(registro)
    return {
        "ok": True,
        "mensaje": "Datos Guardados"
    }

# Devuelve el ultimo informe recibido
@app.get("/sensores/actual")
def sensoresActual():
    if len(datos_sensores) == 0:
        return {
            "mensaje": "No hay datos aun"
        }
    
    return datos_sensores[-1]
