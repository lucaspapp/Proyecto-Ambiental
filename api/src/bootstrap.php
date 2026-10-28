<?php

declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/ApiException.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Http/Response.php';

Config::load();

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
            Response::json([], 204);
        }

        foreach (self::$routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (self::routeMatchesPattern($route['route'], $path)) {
                try {
                    ($route['handler'])();
                    return;
                } catch (ApiException $exception) {
                    Response::error($exception->getMessage(), $exception->status);
                } catch (PDOException $exception) {
                    $apiException = Database::handleException($exception);
                    Response::error($apiException->getMessage(), $apiException->status);
                }
            }
        }

        Response::error('Ruta no encontrada.', 404);
    }

    private static function routeMatchesPattern(string $registered, string $request): bool
    {
        if ($registered === $request) {
            return true;
        }

        $pattern = preg_quote($registered, '/');
        $pattern = preg_replace('/\\\{[a-zA-Z0-9_]+\\\}/', '([^/]+)', $pattern);
        if ($pattern === null) {
            return false;
        }

        return preg_match('#^' . $pattern . '$#', $request) === 1;
    }
}

require_once __DIR__ . '/../routes/api.php';
