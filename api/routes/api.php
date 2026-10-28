<?php

declare(strict_types=1);

function normalizeString(?string $value, int $max = 255): string
{
    if ($value === null) {
        return '';
    }

    return trim(substr($value, 0, $max));
}

function passwordHash(string $password): string
{
    $salt = random_bytes(16);
    $digest = hash_pbkdf2('sha256', $password, $salt, 600000, 32, true);
    return 'pbkdf2_sha256$600000$' . bin2hex($salt) . '$' . bin2hex($digest);
}

function passwordVerify(string $password, string $stored): bool
{
    $parts = explode('$', $stored);
    if (count($parts) !== 4 || $parts[0] !== 'pbkdf2_sha256') {
        return false;
    }

    $iterations = (int) $parts[1];
    $salt = hex2bin($parts[2]);
    $expected = $parts[3];
    if ($salt === false) {
        return false;
    }

    $digest = hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true);
    return hash_equals($expected, bin2hex($digest));
}

function validateUserRole(string $role): void
{
    $valid = ['estudiante', 'docente', 'invitado', 'administrador'];
    if (!in_array($role, $valid, true)) {
        throw new ApiException('Rol no válido.', 422);
    }
}

function ensureAulaTables(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS aulas (
            id_aula INT NOT NULL AUTO_INCREMENT,
            nombre VARCHAR(150) NOT NULL,
            descripcion TEXT NULL,
            codigo VARCHAR(20) NOT NULL,
            propietario VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
            creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id_aula),
            UNIQUE KEY uq_aulas_codigo (codigo),
            KEY fk_aulas_propietario (propietario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS aula_miembros (
            id_aula INT NOT NULL,
            id_usuario VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
            rol_aula ENUM('propietario', 'miembro') NOT NULL DEFAULT 'miembro',
            unido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id_aula, id_usuario),
            KEY fk_aula_miembros_usuario (id_usuario)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function validateUserAndRole(PDO $pdo, string $usuario, string $rol): void
{
    validateUserRole($rol);
    $stmt = $pdo->prepare('SELECT Rol FROM usuarios WHERE id_usuario = ?');
    $stmt->execute([$usuario]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new ApiException('El usuario no existe.', 401);
    }
    if ($row['Rol'] !== $rol) {
        throw new ApiException('El rol recibido no coincide con el rol del usuario.', 403);
    }
}

function makeClassCode(): string
{
    return strtoupper(bin2hex(random_bytes(4)));
}

Router::add('GET', '/', static function (): void {
    Response::json(['mensaje' => 'API Proyecto Ambiental', 'docs' => '/docs'], 200);
});

Router::add('GET', '/health', static function (): void {
    Response::json(['status' => 'ok']);
});

Router::add('POST', '/auth/login', static function (): void {
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    $usuario = normalizeString((string) ($input['usuario'] ?? ''), 100);
    $password = (string) ($input['contrasenia'] ?? '');

    if ($usuario === '' || $password === '') {
        Response::error('Usuario o contraseña incorrectos.', 401);
    }

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT id_usuario, Nombre, Apellido, Institucion, Rol, Password FROM usuarios WHERE id_usuario = ?');
        $stmt->execute([strtolower($usuario)]);
        $user = $stmt->fetch();
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    if (!$user || !passwordVerify($password, (string) $user['Password'])) {
        Response::error('Usuario o contraseña incorrectos.', 401);
    }

    Response::json([
        'usuario' => [
            'id' => $user['id_usuario'],
            'nombre' => $user['Nombre'],
            'apellido' => $user['Apellido'],
            'institucion' => $user['Institucion'],
            'role' => $user['Rol'],
        ],
    ]);
});

Router::add('POST', '/crearuser', static function (): void {
    $form = $_POST;
    $id = normalizeString((string) ($form['id'] ?? ''), 100);
    $nombre = normalizeString((string) ($form['nombre'] ?? ''), 100);
    $apellido = normalizeString((string) ($form['apellido'] ?? ''), 100);
    $rol = normalizeString((string) ($form['rol'] ?? 'estudiante'), 20);
    $password = (string) ($form['contrasenia'] ?? '');
    $institucion = normalizeString((string) ($form['institucion'] ?? ''), 150);

    if ($id === '' || $nombre === '' || $apellido === '' || strlen($password) < 8) {
        Response::error('Validación fallida.', 422);
    }
    validateUserRole($rol);

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('INSERT INTO usuarios (id_usuario, Nombre, Apellido, Institucion, Rol, Password) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$id, $nombre, $apellido, $institucion, $rol, passwordHash($password)]);
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json(['mensaje' => 'Usuario creado correctamente'], 201);
});

Router::add('POST', '/aulas', static function (): void {
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    $nombre = normalizeString((string) ($input['nombre'] ?? ''), 150);
    $descripcion = normalizeString((string) ($input['descripcion'] ?? ''), 5000);
    $usuario = normalizeString((string) ($input['usuario'] ?? ''), 100);
    $rol = normalizeString((string) ($input['rol'] ?? ''), 20);

    if ($nombre === '' || $usuario === '') {
        Response::error('Validación fallida.', 422);
    }
    if (!in_array($rol, ['docente', 'administrador'], true)) {
        Response::error('Solo docentes y administradores pueden crear aulas.', 403);
    }

    try {
        $pdo = Database::connection();
        ensureAulaTables($pdo);
        validateUserAndRole($pdo, $usuario, $rol);
        $codigo = makeClassCode();
        $stmt = $pdo->prepare('INSERT INTO aulas (nombre, descripcion, codigo, propietario) VALUES (?, ?, ?, ?)');
        $stmt->execute([$nombre, $descripcion, $codigo, $usuario]);
        $idAula = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO aula_miembros (id_aula, id_usuario, rol_aula) VALUES (?, ?, "propietario")')->execute([$idAula, $usuario]);
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json([
        'id_aula' => $idAula,
        'nombre' => $nombre,
        'descripcion' => $descripcion,
        'codigo' => $codigo,
        'propietario' => $usuario,
    ], 201);
});

Router::add('GET', '/aulas', static function (): void {
    $usuario = normalizeString($_GET['usuario'] ?? '', 100);
    $rol = normalizeString($_GET['rol'] ?? '', 20);

    if (($usuario === '') !== ($rol === '')) {
        Response::error('usuario y rol deben enviarse juntos.', 422);
    }

    try {
        $pdo = Database::connection();
        ensureAulaTables($pdo);
        if ($usuario === '') {
            $stmt = $pdo->query("SELECT a.id_aula, a.nombre, a.descripcion, a.codigo, a.propietario, a.creado_en, COUNT(am.id_usuario) AS cantidad_miembros FROM aulas AS a LEFT JOIN aula_miembros AS am ON am.id_aula = a.id_aula GROUP BY a.id_aula ORDER BY a.id_aula DESC");
        } else {
            validateUserAndRole($pdo, $usuario, $rol);
            $stmt = $pdo->prepare("SELECT a.id_aula, a.nombre, a.descripcion, a.codigo, a.propietario, a.creado_en, COUNT(total.id_usuario) AS cantidad_miembros FROM aulas AS a INNER JOIN aula_miembros AS propios ON propios.id_aula = a.id_aula AND propios.id_usuario = ? LEFT JOIN aula_miembros AS total ON total.id_aula = a.id_aula GROUP BY a.id_aula ORDER BY a.id_aula DESC");
            $stmt->execute([$usuario]);
        }
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    $rows = $stmt->fetchAll();
    Response::json(['aulas' => $rows]);
});

Router::add('GET', '/aulas/{id_aula}', static function (): void {
    $idAula = (int) ($_GET['id_aula'] ?? 0);
    $usuario = normalizeString($_GET['usuario'] ?? '', 100);
    $rol = normalizeString($_GET['rol'] ?? '', 20);

    if (($usuario === '') !== ($rol === '')) {
        Response::error('usuario y rol deben enviarse juntos.', 422);
    }

    try {
        $pdo = Database::connection();
        ensureAulaTables($pdo);
        if ($usuario !== '') {
            validateUserAndRole($pdo, $usuario, $rol);
        }

        $stmt = $pdo->prepare('SELECT id_aula FROM aulas WHERE id_aula = ?');
        $stmt->execute([$idAula]);
        if (!$stmt->fetch()) {
            Response::error('El aula no existe.', 404);
        }

        $stmt = $pdo->prepare("SELECT a.id_aula, a.nombre, a.descripcion, a.codigo, a.propietario, a.creado_en, COUNT(am.id_usuario) AS cantidad_miembros FROM aulas AS a LEFT JOIN aula_miembros AS am ON am.id_aula = a.id_aula WHERE a.id_aula = ? GROUP BY a.id_aula");
        $stmt->execute([$idAula]);
        $aula = $stmt->fetch();
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    if (!$aula) {
        Response::error('El aula no existe.', 404);
    }

    Response::json($aula);
});

Router::add('POST', '/aulas/unirse', static function (): void {
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    $codigo = strtoupper(normalizeString((string) ($input['codigo'] ?? ''), 20));
    $usuario = normalizeString((string) ($input['usuario'] ?? ''), 100);
    $rol = normalizeString((string) ($input['rol'] ?? ''), 20);

    try {
        $pdo = Database::connection();
        ensureAulaTables($pdo);
        validateUserAndRole($pdo, $usuario, $rol);
        $stmt = $pdo->prepare('SELECT id_aula, nombre FROM aulas WHERE codigo = ?');
        $stmt->execute([$codigo]);
        $aula = $stmt->fetch();
        if (!$aula) {
            Response::error('El código de aula no existe.', 404);
        }
        $stmt = $pdo->prepare('INSERT INTO aula_miembros (id_aula, id_usuario, rol_aula) VALUES (?, ?, "miembro")');
        $stmt->execute([$aula['id_aula'], $usuario]);
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json([
        'mensaje' => 'Te uniste al aula correctamente.',
        'id_aula' => (int) $aula['id_aula'],
        'nombre' => $aula['nombre'],
        'codigo' => $codigo,
    ], 201);
});

Router::add('GET', '/aulas/{id_aula}/miembros', static function (): void {
    $idAula = (int) ($_GET['id_aula'] ?? 0);
    $usuario = normalizeString($_GET['usuario'] ?? '', 100);
    $rol = normalizeString($_GET['rol'] ?? '', 20);

    if (($usuario === '') !== ($rol === '')) {
        Response::error('usuario y rol deben enviarse juntos.', 422);
    }

    try {
        $pdo = Database::connection();
        ensureAulaTables($pdo);
        if ($usuario !== '') {
            validateUserAndRole($pdo, $usuario, $rol);
        }

        $stmt = $pdo->prepare('SELECT id_aula FROM aulas WHERE id_aula = ?');
        $stmt->execute([$idAula]);
        if (!$stmt->fetch()) {
            Response::error('El aula no existe.', 404);
        }

        $stmt = $pdo->prepare("SELECT u.id_usuario, u.Nombre, u.Apellido, u.Institucion, u.Rol, am.rol_aula, am.unido_en FROM aula_miembros AS am INNER JOIN usuarios AS u ON u.id_usuario = am.id_usuario WHERE am.id_aula = ? ORDER BY am.rol_aula, u.Apellido, u.Nombre");
        $stmt->execute([$idAula]);
        $miembros = $stmt->fetchAll();
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json(['miembros' => $miembros]);
});

Router::add('POST', '/crearproyecto', static function (): void {
    $project = $_POST;
    $usuario = normalizeString((string) ($project['Usuario'] ?? ''), 100);
    $titulo = normalizeString((string) ($project['Titulo'] ?? ''), 200);
    $descripcion = normalizeString((string) ($project['Descripcion'] ?? ''), 5000);

    if ($usuario === '' || $titulo === '') {
        Response::error('Validación fallida.', 422);
    }

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('INSERT INTO proyectos (Usuario, Titulo, Descripcion) VALUES (?, ?, ?)');
        $stmt->execute([$usuario, $titulo, $descripcion]);
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json(['mensaje' => 'Proyecto creado correctamente'], 201);
});

Router::add('POST', '/crearconfig', static function (): void {
    $config = $_POST;
    $idProyecto = (int) ($config['Id_proyecto'] ?? 0);
    $dataMediciones = (int) ($config['Data_mediciones'] ?? 0);
    $dataGuardado = (int) ($config['Data_guardado'] ?? 0);
    $nombre = normalizeString((string) ($config['Nombre'] ?? ''), 150);
    $descripcion = normalizeString((string) ($config['Descripcion'] ?? ''), 5000);

    if ($idProyecto <= 0 || $nombre === '') {
        Response::error('Validación fallida.', 422);
    }

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('INSERT INTO conf_modulos (Id_proyecto, Data_mediciones, Data_guardado, Nombre, Descripcion) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$idProyecto, $dataMediciones, $dataGuardado, $nombre, $descripcion]);
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json(['mensaje' => 'Configuración creada correctamente'], 201);
});

Router::add('POST', '/proyectos/{id_proyecto}/dispositivos', static function (): void {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    preg_match('#/proyectos/([0-9]+)/dispositivos$#', $path, $matches);
    $idProyecto = (int) ($matches[1] ?? 0);
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);

    if ($idProyecto <= 0 || !is_array($input)) {
        Response::error('Validación fallida.', 422);
    }

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT Id_proyecto FROM proyectos WHERE Id_proyecto = ?');
        $stmt->execute([$idProyecto]);
        if (!$stmt->fetch()) {
            Response::error('El aula no existe.', 404);
        }

        $nombre = normalizeString((string) ($input['nombre'] ?? ''), 150);
        $descripcion = normalizeString((string) ($input['descripcion'] ?? ''), 5000);
        $dataMediciones = (int) ($input['data_mediciones'] ?? 0);
        $dataGuardado = (int) ($input['data_guardado'] ?? 0);
        $sensores = $input['sensores'] ?? [];

        $stmt = $pdo->prepare('INSERT INTO conf_modulos (Id_proyecto, Data_mediciones, Data_guardado, Nombre, Descripcion) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$idProyecto, $dataMediciones, $dataGuardado, $nombre, $descripcion]);
        $moduloId = (int) $pdo->lastInsertId();

        foreach ($sensores as $sensor) {
            $stmt = $pdo->prepare('INSERT INTO sensores_proyecto (id_proyecto, Id_modulo, id_ts, t_registro, t_muestra, descripcion) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $idProyecto,
                $moduloId,
                (int) ($sensor['id_ts'] ?? 0),
                (string) ($sensor['t_registro'] ?? '00:05:00'),
                (string) ($sensor['t_muestra'] ?? '00:00:30'),
                normalizeString((string) ($sensor['descripcion'] ?? ''), 1000),
            ]);
        }
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json([
        'id_modulo' => $moduloId,
        'id_proyecto' => $idProyecto,
        'nombre' => $nombre,
        'cantidad_sensores' => count($sensores),
    ], 201);
});

Router::add('GET', '/proyectos/{id_proyecto}/dispositivos', static function (): void {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    preg_match('#/proyectos/([0-9]+)/dispositivos$#', $path, $matches);
    $idProyecto = (int) ($matches[1] ?? 0);

    try {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT m.Id_modulo, m.Nombre, m.Data_mediciones, m.Data_guardado, m.Descripcion, s.id_sp, s.id_ts, s.t_registro, s.t_muestra, s.descripcion AS sensor_descripcion, t.nombre AS tipo_sensor FROM conf_modulos AS m LEFT JOIN sensores_proyecto AS s ON s.id_proyecto = m.Id_proyecto AND s.Id_modulo = m.Id_modulo LEFT JOIN tipo_sensor AS t ON t.id_ts = s.id_ts WHERE m.Id_proyecto = ? ORDER BY m.Id_modulo, s.id_sp");
        $stmt->execute([$idProyecto]);
        $rows = $stmt->fetchAll();
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    $dispositivos = [];
    foreach ($rows as $row) {
        $moduloId = (int) $row['Id_modulo'];
        if (!isset($dispositivos[$moduloId])) {
            $dispositivos[$moduloId] = [
                'id_modulo' => $moduloId,
                'nombre' => $row['Nombre'],
                'data_mediciones' => (int) $row['Data_mediciones'],
                'data_guardado' => (int) $row['Data_guardado'],
                'descripcion' => $row['Descripcion'],
                'sensores' => [],
            ];
        }

        if ($row['id_sp'] !== null) {
            $dispositivos[$moduloId]['sensores'][] = [
                'id_sp' => (int) $row['id_sp'],
                'id_ts' => (int) $row['id_ts'],
                'tipo' => $row['tipo_sensor'],
                't_registro' => $row['t_registro'],
                't_muestra' => $row['t_muestra'],
                'descripcion' => $row['sensor_descripcion'],
            ];
        }
    }

    Response::json(['dispositivos' => array_values($dispositivos)]);
});

Router::add('GET', '/veruser', static function (): void {
    try {
        $pdo = Database::connection();
        $stmt = $pdo->query('SELECT id_usuario, Nombre, Apellido, Institucion, Rol FROM usuarios');
        $usuarios = $stmt->fetchAll();
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    Response::json(['usuarios' => $usuarios]);
});

Router::add('POST', '/sensores', static function (): void {
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    $idProyecto = (int) ($input['id_proyecto'] ?? 0);
    $idModulo = (int) ($input['id_modulo'] ?? 0);
    $mediciones = $input['mediciones'] ?? [];

    if ($idProyecto <= 0 || $idModulo <= 0 || !is_array($mediciones) || $mediciones === []) {
        Response::error('Validación fallida.', 422);
    }

    $sensorIds = [];
    foreach ($mediciones as $medicion) {
        $sensorIds[] = (int) ($medicion['id_sp'] ?? 0);
    }

    try {
        $pdo = Database::connection();
        if (count($sensorIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($sensorIds), '?'));
            $stmt = $pdo->prepare("SELECT id_sp FROM sensores_proyecto WHERE id_proyecto = ? AND Id_modulo = ? AND id_sp IN ($placeholders)");
            $params = [$idProyecto, $idModulo, ...$sensorIds];
            $stmt->execute($params);
            $validSensors = array_map('intval', array_column($stmt->fetchAll(), 'id_sp'));
            $invalid = array_values(array_diff($sensorIds, $validSensors));
            if ($invalid !== []) {
                Response::error('Los sensores no pertenecen al proyecto: ' . implode(', ', array_map('strval', $invalid)), 422);
            }
        }

        foreach ($mediciones as $medicion) {
            $stmt = $pdo->prepare('INSERT INTO mediciones (Id_proyecto, Id_modulo, Valor, id_sp) VALUES (?, ?, ?, ?)');
            $stmt->execute([$idProyecto, $idModulo, (float) ($medicion['valor'] ?? 0), (int) ($medicion['id_sp'] ?? 0)]);
        }
    } catch (ApiException $exception) {
        throw $exception;
    } catch (PDOException $exception) {
        throw Database::handleException($exception);
    }

    $fecha = gmdate('c');
    Response::json([
        'ok' => true,
        'mensaje' => 'Mediciones guardadas',
        'cantidad' => count($mediciones),
        'fecha' => $fecha,
    ], 201);
});

Router::add('GET', '/sensores/actual', static function (): void {
    Response::error('No hay mediciones todavía.', 404);
});
