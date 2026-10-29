# API PHP de EcoLab

Esta carpeta contiene la API de EcoLab implementada únicamente en PHP.

## Arquitectura

- Capa web: PHP con servidor embebido (`php -S`) o cualquier servidor compatible con PHP-FPM.
- Enrutamiento: router simple con soporte para rutas estáticas y paramétricas (`/aulas/{id_aula}`).
- Controladores: en `routes/api.php` usando closures asociadas a rutas.
- Servicios: validaciones, hashing, manejo de roles y operaciones de conexión a base de datos en `src/`.
- Persistencia: PDO con MySQL/MariaDB, compatible con la base `cnlab` del proyecto.

## Endpoints principales

| Método | Ruta | Estado |
| --- | --- | --- |
| `GET` | `/health` | Salud de la API |
| `POST` | `/auth/login` | Login |
| `POST` | `/crearuser` | Registro |
| `GET` | `/aulas` | Listar aulas |
| `POST` | `/aulas` | Crear aula |
| `POST` | `/aulas/unirse` | Unirse con código |
| `GET` | `/aulas/{id_aula}` | Ver aula |
| `GET` | `/aulas/{id_aula}/miembros` | Listar miembros |
| `POST` | `/sensores` | Guardar mediciones |
| `GET` | `/sensores/actual` | Última tanda |
| `POST` | `/crearproyecto` | Crear proyecto |
| `POST` | `/crearconfig` | Configurar módulo |
| `GET` | `/proyectos/{id_proyecto}/dispositivos` | Listar dispositivos |
| `POST` | `/proyectos/{id_proyecto}/dispositivos` | Crear dispositivo |
| `GET` | `/veruser` | Listar usuarios |

## Variables de entorno

Configura `api/.env` con los valores de tu entorno:

```dotenv
API_HOST=0.0.0.0
API_PORT=8003

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cnlab
```

## Ejecución local

```bash
php -S 0.0.0.0:8003 -t api/public api/public/index.php
```

También puedes iniciar el servidor integrado desde la carpeta `api/`:

```bash
cd api
php run.php
```

## Seguridad y compatibilidad

- Se conserva el uso de `pbkdf2_sha256` para la contraseña.
- Se valida la pertenencia de sensores al proyecto antes de guardar mediciones.
- Se usa PDO con consultas parametrizadas.
- Se exponen errores estructurados con `detail` para mantener compatibilidad con la API actual.

## Verificación

Se incluye una prueba simple de contrato:

```bash
php api/tests/api_contract_test.php
```

La prueba verifica la presencia de los endpoints clave del backend PHP.
