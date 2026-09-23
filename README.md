# EcoLab - Proyecto Ambiental

EcoLab es una plataforma para escuelas que usan un microcontrolador (por
ejemplo, una ESP32) con sensores. El docente crea un aula, configura los
dispositivos y los alumnos se unen con un código. Las mediciones quedan
disponibles para trabajar en clase.

## Estructura

```text
api/
  .env                 Configuración local de la API y MySQL/MariaDB
  run.py               Arranque del servidor
  app/main.py          Endpoints FastAPI
  app/conexion.py      Conexión a la base de datos
frontend/
  index.html           Estructura y estilos de la aplicación
  script.js            Lógica del frontend
bd.sql                 Tablas iniciales de la base de datos
requirements.text      Dependencias de Python
```

## 1. Preparar la base de datos

1. Instala e inicia MySQL o MariaDB.
2. Crea una base llamada `cnlab`.
3. Importa [`bd.sql`](bd.sql). El archivo crea las tablas que necesita la API.
4. Ten a mano el usuario y la contraseña de esa base.

Ejemplo desde una consola de MySQL:

```sql
CREATE DATABASE cnlab CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

Luego importa el archivo `bd.sql` desde phpMyAdmin o con el cliente de MySQL.
Si ya tenías una instalación anterior que no incluía las aulas, la API crea
automáticamente `aulas` y `aula_miembros` cuando se abre la sección **Mi
clase**.

## 2. Iniciar la API en Windows

Abre una terminal en la carpeta del proyecto:

```powershell
cd api
python -m venv ..\.venv
..\.venv\Scripts\python.exe -m pip install -r ..\requirements.text
```

Edita [`api/.env`](api/.env) con los datos de MySQL:

```dotenv
API_HOST=0.0.0.0
API_PORT=8003
API_RELOAD=true

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cnlab
```

`DB_PASSWORD` puede quedar vacío si tu instalación local de MySQL no usa
contraseña. En una instalación compartida o de producción, usa una contraseña
segura.

Inicia la API:

```powershell
..\.venv\Scripts\python.exe run.py
```

Comprueba que funciona:

- API: <http://127.0.0.1:8003>
- Swagger: <http://127.0.0.1:8003/docs>
- Estado: <http://127.0.0.1:8003/health>

## 3. Abrir el frontend

Con la API iniciada, abre [`frontend/index.html`](frontend/index.html) en el
navegador. Si la API está en otra computadora, cambia `API_PUBLIC_URL` en
`api/.env` por una dirección accesible desde la red, por ejemplo:

```dotenv
API_PUBLIC_URL=http://192.168.1.50:8003
```

También puedes indicar la dirección desde la consola del navegador:

```js
localStorage.setItem("ecolab_api_url", "http://192.168.1.50:8003");
location.reload();
```

## 4. Crear usuarios y aulas

1. En el frontend selecciona **Crear cuenta**.
2. Completa nombre, apellido, correo, rol y una contraseña de al menos 8
   caracteres.
3. Inicia sesión.
4. Un docente o administrador puede crear un aula desde **Mi clase**.
5. Comparte el código del aula para que los alumnos se unan.
6. Desde **Sensores**, configura el dispositivo y los sensores del aula.

El registro usa `POST /crearuser` con `multipart/form-data`. La contraseña se
almacena como hash y nunca se devuelve en las respuestas.

## 5. Conectar una ESP32

La ESP32 envía una tanda de mediciones a `POST /sensores`:

```json
{
  "id_proyecto": 1,
  "id_modulo": 2,
  "mediciones": [
    { "id_sp": 5, "valor": 22.5 },
    { "id_sp": 6, "valor": 60.0 }
  ]
}
```

La petición debe usar `Content-Type: application/json`. Cada `id_sp` debe
existir en `sensores_proyecto` y pertenecer al proyecto indicado.

## Solución rápida del error `503` al crear un usuario

El `503` significa que la API no pudo completar la operación con MySQL/MariaDB.

1. Comprueba que MySQL/MariaDB esté iniciado.
2. Revisa `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en
   [`api/.env`](api/.env).
3. Confirma que importaste `bd.sql` en la base `cnlab`.
4. Abre <http://127.0.0.1:8003/health> para confirmar que la API está viva.
5. Mira la terminal donde ejecutaste `run.py`: ahora el mensaje distingue
   entre servicio apagado, credenciales incorrectas y base inexistente.

Si aparece `Ya existe una cuenta`, utiliza otro correo: `id_usuario` es único.

### Error al crear una clase

Si ves `No fue posible completar la operación con la base de datos`, reinicia
la API y vuelve a abrir **Mi clase**. La API actual crea las tablas
colaborativas que faltaban en bases antiguas. Si el error continúa, confirma
que el usuario que inició sesión tenga rol `docente` o `administrador` y que
su correo exista en la tabla `usuarios`.

## Endpoints principales

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/crearuser` | Crear un usuario |
| `POST` | `/auth/login` | Iniciar sesión |
| `GET` | `/aulas` | Listar aulas |
| `POST` | `/aulas` | Crear un aula |
| `POST` | `/aulas/unirse` | Unirse con un código |
| `GET` | `/aulas/{id_aula}/miembros` | Ver integrantes |
| `POST` | `/sensores` | Guardar mediciones de la ESP32 |
| `GET` | `/sensores/actual` | Consultar la última tanda |

Para ver todos los campos y probar las rutas, usa Swagger en `/docs`.

## Uso en una red escolar

Configura `API_HOST=0.0.0.0`, permite el puerto `8003` en el firewall y usa la
IP de la computadora que ejecuta la API en `API_PUBLIC_URL`. Los equipos de
los alumnos deben estar en la misma red y poder acceder a esa IP.

Para producción, desactiva `API_RELOAD`, restringe los orígenes CORS en
`api/app/main.py` y usa credenciales de base de datos con permisos mínimos.
