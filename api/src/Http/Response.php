<?php

declare(strict_types=1);

class Response
{
    public static function json(mixed $payload, int $status = 200, array $headers = []): never
    {
        http_response_code($status);

        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }

        $origin = getenv('CORS_ALLOWED_ORIGINS') ?: '*';
        $origins = array_filter(array_map('trim', explode(',', $origin)), static fn ($value): bool => $value !== '');

        if ($origins !== []) {
            $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $allowed = in_array($requestOrigin, $origins, true) ? $requestOrigin : $origins[0];
            header('Access-Control-Allow-Origin: ' . $allowed);
        } else {
            header('Access-Control-Allow-Origin: *');
        }

        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept, X-Usuario-Local');

        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $detail, int $status = 400, array $extra = []): never
    {
        $payload = ['detail' => $detail];
        if ($extra !== []) {
            $payload = array_merge($payload, $extra);
        }

        self::json($payload, $status);
    }
}
