<?php

declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Http/Response.php';
require_once __DIR__ . '/Auth.php';

Config::load();
ini_set('display_errors', '0');

final class Router
{
    private static array $routes = [];

    public static function add(string $method, string $route, callable $handler): void
    {
        self::$routes[] = ['method' => strtoupper($method), 'route' => $route, 'handler' => $handler];
    }

    public static function exists(string $route): bool
    {
        $normalized = trim($route);
        $method = null;
        $pattern = $normalized;

        if (str_contains($normalized, ':')) {
            [$method, $pattern] = explode(':', $normalized, 2);
        }

        foreach (self::$routes as $registered) {
            if ($method !== null && strtoupper((string) $registered['method']) !== strtoupper($method)) {
                continue;
            }

            if (self::routeMatchesPattern($registered['route'], $pattern)) {
                return true;
            }
        }

        return false;
    }

    public static function dispatch(): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1048576) {
            Response::error('La solicitud supera el tamaño máximo permitido.', 413);
        }
        $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $path = $requestPath;

        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
        $scriptDir = rtrim((string) dirname($scriptName), '/');

        if ($scriptDir !== '' && $scriptDir !== '.' && $scriptDir !== '/') {
            if ($requestPath === $scriptDir || $requestPath === $scriptDir . '/') {
                $path = '/';
            } elseif (str_starts_with($requestPath, $scriptDir . '/')) {
                $path = substr($requestPath, strlen($scriptDir));
            }
        }

        if ($path === '') {
            $path = '/';
        }

        if ($method === 'OPTIONS') {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $allowedOrigins = array_filter(array_map('trim', explode(',', (string) Config::get('CORS_ALLOWED_ORIGINS', ''))));
            if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
                Response::error('Origen no permitido.', 403);
            }
            Response::json([], 204);
        }

        foreach (self::$routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $parameters = self::captureRouteParameters($route['route'], $path);
            if ($parameters !== null) {
                try {
                    foreach ($parameters as $name => $value) {
                        $_GET[$name] = $value;
                    }
                    Auth::authorizeRoute($method, $path);
                    ($route['handler'])();
                    return;
                } catch (ApiException $exception) {
                    Response::error($exception->getMessage(), $exception->status);
                } catch (PDOException $exception) {
                    $apiException = Database::handleException($exception);
                    Response::error($apiException->getMessage(), $apiException->status);
                } catch (Throwable $exception) {
                    error_log('EcoLab API unexpected error: ' . $exception->getMessage());
                    Response::error('Ocurrió un error interno. Intenta nuevamente más tarde.', 500);
                }
            }
        }

        Response::error('Ruta no encontrada.', 404);
    }

    private static function routeMatchesPattern(string $registered, string $request): bool
    {
        return self::captureRouteParameters($registered, $request) !== null;
    }

    private static function captureRouteParameters(string $registered, string $request): ?array
    {
        if ($registered === $request) {
            return [];
        }
        $pattern = preg_quote($registered, '/');
        $names = [];
        $pattern = preg_replace_callback(
            '/\\\\\{([a-zA-Z0-9_]+)\\\\\}/',
            static function (array $matches) use (&$names): string {
                $names[] = $matches[1];
                return '([^/]+)';
            },
            $pattern
        );
        if ($pattern === null) {
            return null;
        }

        if (preg_match('#^' . $pattern . '$#', $request, $matches) !== 1) {
            return null;
        }

        $parameters = [];
        foreach ($names as $index => $name) {
            $parameters[$name] = rawurldecode($matches[$index + 1]);
        }
        return $parameters;
    }
}

require_once __DIR__ . '/../routes/api.php';
