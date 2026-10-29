<?php

declare(strict_types=1);

class Response
{
    public static function json(mixed $payload, int $status = 200, array $headers = []): never
    {
        header_remove('X-Powered-By');
        http_response_code($status);

        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }

        $allowedOrigins = array_filter(array_map('trim', explode(',', (string) Config::get('CORS_ALLOWED_ORIGINS', ''))));
        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
            header('Access-Control-Allow-Credentials: true');
        }
        header('Vary: Origin');

        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Usuario-Local');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: no-referrer');
        header('Cache-Control: no-store, private');

        if ($status !== 204) {
            echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
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
