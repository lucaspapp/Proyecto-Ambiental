# API Proyecto Ambiental

API HTTP construida con FastAPI para conectar el frontend y la ESP32 con la
base de datos MariaDB/MySQL del proyecto. Permite crear usuarios, proyectos,
configurar módulos y registrar mediciones asociadas a sensores de proyecto.

## 1. Requisitos

- Python 3.10 o superior.
- MariaDB/MySQL con la estructura entregada en `bd.sql`.
- La base de datos debe llamarse `cnlab` (o debe indicarse otro nombre en
  `DB_NAME`).
- La ESP32 y el frontend deben poder alcanzar la dirección IP y el puerto de
  la API.

La API no crea ni modifica tablas. Primero debe importarse `bd.sql` en el
servidor de base de datos.

## 2. Configuración local

Desde `api/app`, define las variables de conexión:

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_USER="cnlab_user"
$env:DB_PASSWORD="contraseña_segura"
$env:DB_NAME="cnlab"
```

Instala dependencias e inicia el servidor:

```powershell
cd api
python -m pip install -r ..\requirements.text
cd app
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Direcciones locales:

- API: `http://127.0.0.1:8003`
- Documentación Swagger: `http://127.0.0.1:8003/docs`
- Documentación ReDoc: `http://127.0.0.1:8003/redoc`
- Estado: `http://127.0.0.1:8003/health`

Para producción no uses `--reload`.

## 3. Respuestas y errores

Las respuestas exitosas usan JSON. Los errores de validación usan `422`;
un recurso duplicado o una referencia inválida puede devolver `409`; una
medición cuyo `id_sp` no pertenece al proyecto devuelve `422`; y un problema
de conexión con la base de datos devuelve `503`.

Ejemplo de error:

```json
{
  "detail": "Los sensores no pertenecen al proyecto: 8"
}
```

## 4. Endpoints para el frontend

### Estado de la API

```http
GET /health
```

Respuesta:

```json
{"status": "ok"}
```

### Crear usuario

`POST /crearuser` recibe `multipart/form-data`.

Campos:

| Campo | Tipo | Obligatorio |
|---|---|---|
| `id` | texto, máximo 100 | sí |
| `nombre` | texto, máximo 100 | sí |
| `apellido` | texto, máximo 100 | sí |
| `rol` | `estudiante`, `docente`, `invitado` o `administrador` | no |
| `contrasenia` | texto de 8 a 255 caracteres | sí |
| `institucion` | texto, máximo 150 | no |

Ejemplo con JavaScript:

```js
const formulario = new FormData();
formulario.append("id", "alumno-001");
formulario.append("nombre", "Ana");
formulario.append("apellido", "Perez");
formulario.append("rol", "estudiante");
formulario.append("contrasenia", "una-clave-segura");
formulario.append("institucion", "Escuela 1");

const respuesta = await fetch("http://10.5.10.11:8003/crearuser", {
  method: "POST",
  body: formulario
});

const datos = await respuesta.json();
if (!respuesta.ok) throw new Error(datos.detail ?? "No se pudo crear el usuario");
console.log(datos);
```

Respuesta `201`:

```json
{"mensaje": "Usuario creado correctamente"}
```

### Crear proyecto

`POST /crearproyecto` recibe `multipart/form-data`.

```js
const formulario = new FormData();
formulario.append("Usuario", "alumno-001");
formulario.append("Titulo", "Calidad del aire");
formulario.append("Descripcion", "Mediciones del laboratorio");

const respuesta = await fetch("http://10.5.10.11:8003/crearproyecto", {
  method: "POST",
  body: formulario
});
const datos = await respuesta.json();
```

### Crear configuración de módulo

`POST /crearconfig` recibe `multipart/form-data`.

```js
const formulario = new FormData();
formulario.append("Id_proyecto", "1");
formulario.append("Data_mediciones", "60");
formulario.append("Data_guardado", "300");
formulario.append("Nombre", "Módulo ambiental");
formulario.append("Descripcion", "Sensores conectados a la ESP32");

const respuesta = await fetch("http://10.5.10.11:8003/crearconfig", {
  method: "POST",
  body: formulario
});
console.log(await respuesta.json());
```

### Listar usuarios

```js
const respuesta = await fetch("http://10.5.10.11:8003/veruser");
const datos = await respuesta.json();
console.log(datos.usuarios);
```

La API no devuelve contraseñas en este endpoint.

### Obtener la última tanda recibida

```js
const respuesta = await fetch("http://10.5.10.11:8003/sensores/actual");
if (respuesta.status === 404) {
  console.log("Todavía no hay mediciones");
} else {
  console.log(await respuesta.json());
}
```

La última tanda se mantiene en memoria del proceso y se pierde al reiniciar la
API. El historial persistente queda en la tabla `mediciones`.

## 5. Endpoint para la ESP32

### Registrar mediciones

La ESP32 debe llamar:

```http
POST /sensores
Content-Type: application/json
```

Payload recomendado:

```json
{
  "id_proyecto": 1,
  "id_modulo": 2,
  "mediciones": [
    {"id_sp": 5, "valor": 22.5},
    {"id_sp": 6, "valor": 60.0},
    {"id_sp": 7, "valor": 3.2}
  ]
}
```

Cada `id_sp` debe existir en `sensores_proyecto` y pertenecer a
`id_proyecto`. El `id_modulo` también debe existir en `conf_modulos`.
La API inserta una fila por cada elemento en `mediciones`, dentro de una única
transacción.

Respuesta `201`:

```json
{
  "ok": true,
  "mensaje": "Mediciones guardadas",
  "cantidad": 3,
  "fecha": "2026-09-10T12:00:00+00:00"
}
```

Ejemplo equivalente con `curl`:

```bash
curl -X POST http://10.5.10.11:8003/sensores \
  -H "Content-Type: application/json" \
  -d '{
    "id_proyecto": 1,
    "id_modulo": 2,
    "mediciones": [
      {"id_sp": 5, "valor": 22.5},
      {"id_sp": 6, "valor": 60.0}
    ]
  }'
```

Ejemplo mínimo para Arduino/ESP32 usando `HTTPClient`:

```cpp
#include <HTTPClient.h>
#include <WiFi.h>

HTTPClient http;
http.begin("http://10.5.10.11:8003/sensores");
http.addHeader("Content-Type", "application/json");

String body = R"({
  "id_proyecto": 1,
  "id_modulo": 2,
  "mediciones": [
    {"id_sp": 5, "valor": 22.5},
    {"id_sp": 6, "valor": 60.0}
  ]
})";

int codigo = http.POST(body);
String respuesta = http.getString();
Serial.printf("HTTP %d: %s\n", codigo, respuesta.c_str());
http.end();
```

La ESP32 debe considerar exitosos los códigos `200` o `201`, reintentar
errores temporales `503` con espera progresiva y no reenviar indefinidamente
un payload que haya recibido un `422` o `409`.



## 6. Instalación en Debian

### Instalar paquetes del sistema

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git nginx
```

### Copiar el proyecto y crear el entorno virtual

```bash
sudo mkdir -p /opt/proyecto-ambiental
sudo chown -R "$USER":"$USER" /opt/proyecto-ambiental
git clone URL_DEL_REPOSITORIO /opt/proyecto-ambiental
cd /opt/proyecto-ambiental
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.text
```

Si el proyecto ya está copiado, omite `git clone`.

### Configurar variables de entorno

```bash
sudo nano /etc/proyecto-ambiental.env
```

Contenido:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cnlab_user
DB_PASSWORD=CAMBIAR_POR_UNA_CLAVE_SEGURA
DB_NAME=cnlab
```

Protege el archivo:

```bash
sudo chown root:root /etc/proyecto-ambiental.env
sudo chmod 600 /etc/proyecto-ambiental.env
```

### Crear el servicio systemd

```bash
sudo nano /etc/systemd/system/proyecto-ambiental.service
```

```ini
[Unit]
Description=API Proyecto Ambiental
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/proyecto-ambiental/api/app
EnvironmentFile=/etc/proyecto-ambiental.env
ExecStart=/opt/proyecto-ambiental/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Asegura que `www-data` pueda leer el proyecto:

```bash
sudo chown -R www-data:www-data /opt/proyecto-ambiental
sudo systemctl daemon-reload
sudo systemctl enable --now proyecto-ambiental
sudo systemctl status proyecto-ambiental
```

Ver logs:

```bash
sudo journalctl -u proyecto-ambiental -f
```

### Configurar Nginx como proxy

```bash
sudo nano /etc/nginx/sites-available/proyecto-ambiental
```

```nginx
server {
    listen 80;
    server_name api.ejemplo.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/proyecto-ambiental /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Después, la URL pública será `http://api.ejemplo.com`. Para producción se
recomienda habilitar HTTPS con Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.ejemplo.com
```

## 7. Verificación del despliegue

Desde el servidor:

```bash
curl http://127.0.0.1:8000/health
```

Desde otro equipo de la red:

```bash
curl http://IP_DEL_SERVIDOR/health
```

La respuesta esperada es:

```json
{"status": "ok"}
```

Si falla, revisar en este orden:

1. `sudo systemctl status proyecto-ambiental`.
2. `sudo journalctl -u proyecto-ambiental -n 100`.
3. Las variables de `/etc/proyecto-ambiental.env`.
4. La conexión del servidor a MariaDB/MySQL.
5. `sudo nginx -t` y los logs de Nginx.
