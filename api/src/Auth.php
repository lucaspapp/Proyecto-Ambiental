<?php

declare(strict_types=1);

final class Auth
{
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }

        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

        session_name('ECOLABSESSID');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $isHttps || Config::get('APP_ENV') === 'production',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_start();
    }

    public static function login(string $id, string $role, array $profile = []): void
    {
        self::startSession();
        session_regenerate_id(true);
        $_SESSION['user'] = array_merge($profile, ['id' => $id, 'role' => $role]);
        $_SESSION['created_at'] = time();
    }

    public static function user(): ?array
    {
        self::startSession();
        $user = $_SESSION['user'] ?? null;
        if (!is_array($user) || !isset($user['id'], $user['role'])) {
            return null;
        }

        if (time() - (int) ($_SESSION['created_at'] ?? 0) > 7200) {
            self::logout();
            return null;
        }

        return $user;
    }

    public static function requireUser(): array
    {
        $user = self::user();
        if ($user === null) {
            Response::error('Debes iniciar sesión para realizar esta acción.', 401);
        }

        return $user;
    }

    public static function requireRole(string ...$roles): array
    {
        $user = self::requireUser();
        try {
            $stmt = Database::connection()->prepare('SELECT Rol FROM usuarios WHERE id_usuario = ?');
            $stmt->execute([$user['id']]);
            $currentRole = $stmt->fetchColumn();
        } catch (PDOException $exception) {
            throw Database::handleException($exception);
        }

        if (!is_string($currentRole)) {
            self::logout();
            Response::error('La cuenta ya no está disponible.', 401);
        }
        $user['role'] = $currentRole;
        $_SESSION['user']['role'] = $currentRole;

        if (!in_array($user['role'], $roles, true)) {
            Response::error('No tienes permiso para realizar esta acción.', 403);
        }

        return $user;
    }

    public static function logout(): void
    {
        self::startSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $params['path'],
                'domain' => $params['domain'],
                'secure' => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite'] ?? 'Strict',
            ]);
        }
        session_destroy();
    }

    public static function authorizeRoute(string $method, string $path): void
    {
        $public = ($method === 'GET' && in_array($path, ['/', '/health'], true))
            || ($method === 'POST' && in_array($path, ['/auth/login', '/crearuser'], true));

        if ($method === 'POST' && $path === '/sensores') {
            if (self::user() !== null) {
                return;
            }

            $expectedToken = (string) Config::get('DEVICE_API_TOKEN', '');
            $providedToken = preg_replace('/^Bearer\s+/i', '', (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
            if ($expectedToken === '' || $providedToken === '' || !hash_equals($expectedToken, $providedToken)) {
                Response::error('La API requiere una sesión válida o el token del dispositivo.', 401);
            }
            return;
        }

        if (!$public) {
            self::requireUser();
        }

        if ($method !== 'GET' && !$public) {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            if ($origin !== '') {
                $allowed = array_filter(array_map('trim', explode(',', (string) Config::get('CORS_ALLOWED_ORIGINS', ''))));
                if (!in_array($origin, $allowed, true)) {
                    Response::error('Origen no permitido.', 403);
                }
            }
        }

        if ($method === 'POST' && $path === '/auth/login') {
            self::enforceRateLimit('login', 60, 900);
        } elseif ($method === 'POST' && $path === '/crearuser') {
            self::enforceRateLimit('register', 30, 3600);
        } elseif ($method === 'POST' && $path === '/aulas/unirse') {
            self::enforceRateLimit('join', 60, 600);
        }
    }

    private static function enforceRateLimit(string $bucket, int $limit, int $windowSeconds): void
    {
        $client = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        $key = hash('sha256', $bucket . '|' . $client);
        $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'ecolab-rate-' . $key;
        $handle = fopen($file, 'c+');
        if ($handle === false) {
            Response::error('No se pudo validar el límite de solicitudes.', 503);
        }
        @chmod($file, 0600);

        try {
            if (!flock($handle, LOCK_EX)) {
                Response::error('No se pudo validar el límite de solicitudes.', 503);
            }
            $raw = stream_get_contents($handle);
            $attempts = json_decode($raw ?: '[]', true);
            if (!is_array($attempts)) {
                $attempts = [];
            }
            $now = time();
            $attempts = array_values(array_filter($attempts, static fn ($at): bool => is_int($at) && $at > $now - $windowSeconds));
            if (count($attempts) >= $limit) {
                Response::error('Demasiados intentos. Espera antes de volver a probar.', 429);
            }
            $attempts[] = $now;
            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($attempts));
            fflush($handle);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
