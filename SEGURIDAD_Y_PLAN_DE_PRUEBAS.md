# EcoLab — seguridad, despliegue y plan de pruebas

Este documento registra las correcciones estáticas realizadas y deja una instrucción lista para la persona que continúe el trabajo. **Por pedido del propietario, no ejecutar más pruebas en esta sesión.** Las comprobaciones que figuran abajo deben correr después, idealmente primero en staging con una base de datos de prueba.

## Prompt listo para continuar

> Actúa como ingeniero/a senior de QA y seguridad web. Revisa y prueba el proyecto EcoLab completo en un entorno local o staging aislado; nunca registres datos en producción ni hagas pruebas destructivas contra el dominio real. Lee primero `README.md`, `api/README.md` y este archivo.
>
> Antes de modificar código, inventaría rutas y estructura de la API PHP bajo `api/`, frontend bajo `frontend/`, esquema y migraciones. Verifica rutas de ejecución y versiones instaladas sin imprimir valores de `.env`. No publiques, copies ni incluyas credenciales, cookies, tokens, contraseñas o datos personales en logs, capturas, respuestas o el informe.
>
> Ejecuta pruebas unitarias/de contrato, lint PHP, comprobaciones estáticas del JavaScript y pruebas funcionales con una base temporal: presentación, login, logout, sesión al recargar, registro de estudiante, rol no escalable, creación/listado/unión a aula, aislamiento de miembros, proyectos/módulos/sensores, validaciones y errores. Prueba como usuario anónimo, estudiante, docente y administrador. Verifica también protección CSRF/CORS, cookies, límites de tasa/tamaño, IDs de rutas dinámicas, SQL parametrizado, errores 401/403/409/422/429/500 y ausencia de filtraciones.
>
> Comprueba que `/api/public/health` responde JSON; que `/api/public/crearuser` procesa multipart; que sesiones del frontend en `/frontend/` llegan a la API del mismo dominio; y que directorios/archivos privados (`.env`, `src`, `routes`, `tests`, `migrations`, `run.php`, metadatos Git) no se sirven por HTTP. Evalúa específicamente la configuración Nginx de `api/nginx-security.conf`; Apache `.htaccess` no protege Nginx.
>
> Corrige únicamente fallos reproducibles, agrega pruebas de regresión, documenta cada cambio y repite las pruebas. No borres datos. No cambies la base de producción. Al terminar, entrega: comandos ejecutados, resultados, fallos corregidos, riesgos pendientes, rutas/archivos tocados y una lista separada de pasos manuales del proveedor. Si una prueba requiere credencial o acceso al hosting, no la simules: déjala como pendiente sin pedir que se pegue el secreto en el chat.

## Correcciones aplicadas en el código

- La API usa sesiones de servidor con cookie `HttpOnly`, `SameSite=Strict`, regeneración del identificador al autenticar y vencimiento de sesión. El frontend recupera la sesión desde `/auth/me`; ya no confía en un usuario guardado en `localStorage`.
- Rutas de aulas y proyectos requieren sesión. La creación/listado de aulas y sus miembros se limita por propietario/membresía; `/veruser` queda para administradores; operaciones de proyectos verifican propietario.
- El registro público solo crea estudiantes y requiere contraseña de 12–128 caracteres. Se agregaron rutas de consulta, logout y cambio de contraseña autenticadas.
- Envíos de sensores requieren sesión o `DEVICE_API_TOKEN` más un allowlist de proyecto `DEVICE_PROJECT_IDS`; limitan la cantidad, validan valores/sensores y guardan cada lote en transacción.
- Se añadieron límites de intentos, tamaño máximo de solicitud, transacciones para operaciones multi-fila, errores internos genéricos, encabezados defensivos y CORS sin comodín.
- Se corrigió extracción de parámetros de rutas dinámicas, se retiró la contraseña por defecto del esquema y se ignoró `api/.env` y la configuración local del frontend.
- Se eliminó un `.env` del frontend que no se cargaba; los valores que llegan al navegador no son secretos.
- No se encontró un backdoor obvio en la revisión estática. Esto no sustituye un análisis de dependencias, historial Git, hosting o servidor.

## Tareas manuales imprescindibles antes de producción

1. **Rotar de inmediato la contraseña de MySQL que estuvo en un archivo de entorno compartido durante la conversación.** Cambiarla en el panel de base de datos/proveedor y actualizar `api/.env` en el servidor. No incluirla en commits ni en este archivo. Confirmar que Git no conserva secretos en commits anteriores; si los conserva, eliminar el secreto del historial con un procedimiento coordinado y rotarlo primero.
2. Verificar que `api/.env` no esté versionado ni sea accesible por HTTP. Restringir su lectura al usuario de PHP y limitar la cuenta SQL a la base necesaria y a las operaciones requeridas.
3. El servidor observado publica la API en `https://cn.weblab.tec4.ar/api/public`; mantener el frontend configurado para esa base. La API y frontend deben compartir dominio HTTPS para la cookie de sesión.
4. **Aplicar `api/nginx-security.conf` en el bloque HTTPS real de Nginx.** Nginx no lee `.htaccess`. El proveedor debe denegar `.env`, `.git`, `src/`, `routes/`, `tests/`, `migrations/`, `run.php` y documentos internos. El chequeo previo vio errores 500 vacíos al pedir algunos PHP internos: no revelaron contenido en esa respuesta, pero hace falta cerrarlos explícitamente en Nginx.
5. Definir `CORS_ALLOWED_ORIGINS=https://cn.weblab.tec4.ar` en el entorno de producción. Si el PHP corre en más de un servidor, configurar almacenamiento compartido y seguro de sesiones y rate limits; el limitador actual usa archivos temporales locales.
6. Si una ESP32 envía datos, generar un `DEVICE_API_TOKEN` largo y aleatorio y configurar `DEVICE_PROJECT_IDS` con los proyectos permitidos. **No poner el token en JavaScript, HTML, `.env` del frontend ni repositorio.** La credencial actual se comparte; diseñar tokens separados y revocables por dispositivo antes de confiarle acceso de largo plazo.
7. Ejecutar una vez en la base existente la migración `api/migrations/20261028_harden_password_default.sql` para retirar el default antiguo de `usuarios.Password`. Hacer backup y probar primero sobre una copia.
8. Las contraseñas heredadas que no estén en el formato PBKDF2 de la API no podrán iniciar sesión. Preparar restablecimiento individual confiable o migración administrativa; no reactivar contraseñas por defecto ni permitir que el usuario elija su propio rol.
9. Crear/provisionar cuentas docentes y administradoras desde una operación administrativa confiable. El registro público solo crea estudiantes; promocionar roles únicamente después de verificar la identidad del docente.
10. La interfaz todavía consume Tailwind, Chart.js y fuentes desde CDNs. Servirlos localmente o fijar versiones e integridad SRI, revisar la política CSP y proporcionar una apariencia funcional sin internet. El navegador integrado de la revisión tuvo tiempos de espera al cargar recursos externos.
11. Confirmar que el frontend muestra errores del servidor y no presenta datos locales de demostración como persistidos. Revisar la duplicación histórica de funciones `clase()`/`sensores()` en `frontend/script.js` y retirar las implementaciones muertas después de comprobar cuál se usa.
12. Revisar y corregir `api/README.md` y `README.md` si todavía documentan rutas/archivos Python o el directorio inexistente `api-php`; documentar con precisión el flujo de sesión, registro, reset de contraseña y token de sensores.

## Secuencia de despliegue recomendada

1. Backup de base de datos y archivos; rotación de secretos.
2. Publicar los archivos corregidos de `api/` y `frontend/` en staging; configurar PHP compatible con sesiones, PDO MySQL y HTTPS.
3. Configurar reglas Nginx de denegación y CORS; no basta con subir `.htaccess`.
4. Aplicar migración de contraseña en una copia de DB y verificar recuperación de cuentas existentes.
5. Ejecutar el prompt de pruebas de arriba en staging, con usuarios de prueba y base descartable.
6. Resolver incompatibilidades de firmware para el token Bearer, confirmar backups/restauración y hacer despliegue controlado.
7. Realizar las verificaciones públicas mínimas después de publicar, sin usar cuentas reales para pruebas.

## Límites de esta revisión

No se ejecutó una auditoría de dependencias/SCA, análisis de historial Git, revisión del Nginx instalado, auditoría de firmware ESP32 ni pruebas autenticadas end-to-end. Por pedido del usuario no se ejecutarán pruebas adicionales en esta sesión. El despliegue en el servidor no queda hecho automáticamente desde el workspace.
