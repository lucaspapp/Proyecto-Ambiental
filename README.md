# EcoLab - Proyecto Ambiental

EcoLab es una plataforma para escuelas que usan un microcontrolador (por
ejemplo, una ESP32) con sensores. El docente crea un aula, configura los
dispositivos y los alumnos se unen con un código. Las mediciones quedan
disponibles para trabajar en clase.

## Estructura

```text
api/
  .env                 Configuración local de la API y MySQL/MariaDB
  run.php              Arranque local del servidor PHP
  public/index.php     Entrada HTTP de la API
  routes/api.php       Endpoints de la API
  src/                 Configuración, autenticación y acceso a datos
frontend/
  index.html           Estructura y estilos de la aplicación
  script.js            Lógica del frontend
bd.sql                 Tablas iniciales de la base de datos
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

## 2. Iniciar la API PHP localmente

Configura `api/.env` con los datos de MySQL:

```dotenv
API_HOST=0.0.0.0
API_PORT=8003
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cnlab
```

`DB_PASSWORD` puede quedar vacío si tu instalación local no usa contraseña.
En producción, usa una contraseña segura y no publiques el archivo `.env`.
Desde la carpeta del proyecto, inicia el servidor PHP:

```bash
php -S 0.0.0.0:8003 -t api/public api/public/index.php
```

Comprueba que funciona:

- API: <http://127.0.0.1:8003>
- Estado: <http://127.0.0.1:8003/health>

## 3. Abrir el frontend

Con la API iniciada, abre [`frontend/index.html`](frontend/index.html) en el
navegador. Si la API está en otra computadora, configura la URL de API desde
la consola del navegador:

```js
localStorage.setItem("ecolab_api_url", "http://192.168.1.50:8003");
location.reload();
```

## 4. Crear usuarios y aulas

1. En el frontend selecciona **Crear cuenta**.
2. Completa nombre, apellido, correo y una contraseña de al menos 12
   caracteres.
3. Inicia sesión.
4. Un docente o administrador puede crear un aula desde **Mi clase**.
5. Comparte el código del aula para que los alumnos se unan.
6. Desde **Sensores**, configura el dispositivo y los sensores del aula.

El registro usa `POST /crearuser` con `multipart/form-data`. La contraseña se
almacena como hash y nunca se devuelve en las respuestas.

En el hosting actual, la API PHP está publicada bajo `/api/public`; por eso el
frontend usa `https://cn.weblab.tec4.ar/api/public` como base de la API. Comprueba
`/api/public/health` para confirmar que esa ruta responde `{"status":"ok"}`.
No uses `/api/health` mientras el hosting no publique un alias para esa ruta.

Si el registro falla, revisa la respuesta de `POST /api/public/crearuser` en la
pestaña **Red/Network** del navegador: un `404` indica una URL de API incorrecta,
un `422` indica campos inválidos, un `409` indica que el correo ya está
registrado y un `503` apunta a la conexión o configuración de MySQL.

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

En producción, los envíos sin sesión a `POST /sensores` deben incluir el
encabezado `Authorization: Bearer <DEVICE_API_TOKEN>` y el ID del proyecto debe
estar incluido en `DEVICE_PROJECT_IDS`. Configura ambos valores solo en el
entorno del servidor; guarda el token en el firmware del dispositivo y nunca en
el frontend ni en el repositorio.

## Seguridad de producción

- El login crea una sesión PHP protegida con cookie `HttpOnly`, `SameSite=Strict`
  y `Secure` en producción. Las rutas de aulas/proyectos requieren sesión.
- El registro público solo crea cuentas de estudiante. Las cuentas docentes y
  administradoras deben provisionarse desde un flujo administrativo confiable.
- Las cuentas existentes que todavía tengan contraseñas heredadas sin hash deben
  restablecerse antes de poder iniciar sesión; luego se puede actualizar la clave
  desde el endpoint autenticado `POST /auth/change-password`.
- Se aplican límites de intentos para login, registro y códigos de aula, además
  de un límite de tamaño para las solicitudes.
- Ejecuta una vez el SQL de
  [`api/migrations/20261028_harden_password_default.sql`](api/migrations/20261028_harden_password_default.sql)
  sobre la base existente para quitar el default antiguo de `usuarios.Password`.
- Rota las credenciales de base de datos que hayan sido compartidas, mantenlas
  fuera del repositorio y verifica que `api/.env` no esté publicado ni servido
  desde el document root. Configura `CORS_ALLOWED_ORIGINS` con el origen exacto.
- Si usas Nginx, aplica dentro del bloque HTTPS las reglas de
  [`api/nginx-security.conf`](api/nginx-security.conf); Nginx no procesa los
  archivos `.htaccess` de Apache.
- Para que usuario y API compartan cookie, publica ambas bajo el mismo dominio
  HTTPS. El frontend nunca debe confiar en el usuario guardado en `localStorage`
  como autenticación; el servidor valida la sesión en cada ruta.

## Solución rápida del error `503` al crear un usuario

El `503` significa que la API no pudo completar la operación con MySQL/MariaDB.

1. Comprueba que MySQL/MariaDB esté iniciado.
2. Revisa `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` en
   [`api/.env`](api/.env).
3. Confirma que importaste `bd.sql` en la base `cnlab`.
4. Abre <http://127.0.0.1:8003/health> para confirmar que la API está viva.
5. Revisa los logs del servidor PHP: el mensaje distingue
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

La API PHP no incluye una interfaz Swagger; consulta las rutas disponibles en
[`api/README.md`](api/README.md).

## Uso en una red escolar

Configura `API_HOST=0.0.0.0`, permite el puerto `8003` en el firewall y apunta
el frontend a la IP de la computadora que ejecuta la API. Los equipos de los
alumnos deben estar en la misma red y poder acceder a esa IP. La URL se puede
definir en el navegador mediante `localStorage` como se indica arriba.

Para producción, configura `CORS_ALLOWED_ORIGINS` con el origen exacto y usa
credenciales de base de datos con permisos mínimos.
