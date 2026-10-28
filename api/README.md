# API PHP de EcoLab

Esta carpeta contiene una reconstrucción en PHP de la API original de FastAPI para el proyecto EcoLab. Se conserva la estructura funcional y los contratos principales del backend, sin reemplazar ni borrar la implementación en Python original.

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

Copia `.env.example` a `.env` y ajusta los valores locales:

```dotenv
API_HOST=0.0.0.0
API_PORT=8003
API_RELOAD=false

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cnlab
```

## Ejecución local

```bash
cd api-php
cp .env.example .env
php -S 0.0.0.0:8003 -t public public/index.php
```

O con el script incluido:

```bash
cd api-php
php run.php
```

## Migración

1. Se revisa el contrato del backend FastAPI y el consumo del frontend.
2. Se duplican los endpoints y formatos esenciales en PHP.
3. Se mantiene la base de datos `cnlab` y se reutiliza el mismo esquema.
4. Se deja la API Python original intacta como respaldo durante la transición.

## Seguridad y compatibilidad

- Se conserva el uso de `pbkdf2_sha256` para la contraseña.
- Se valida la pertenencia de sensores al proyecto antes de guardar mediciones.
- Se usa PDO con consultas parametrizadas.
- Se exponen errores estructurados con `detail` para mantener compatibilidad con la API actual.

## Verificación

Se incluye una prueba simple de contrato:

```bash
php api-php/tests/api_contract_test.php
```

La prueba verifica la presencia de los endpoints clave del backend PHP.
