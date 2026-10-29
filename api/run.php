<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }
        [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
        $_ENV[trim($key)] = trim($value);
        putenv(trim($key) . '=' . trim($value));
    }
}

$host = getenv('API_HOST') ?: '0.0.0.0';
$port = (int) (getenv('API_PORT') ?: 8003);
$router = __DIR__ . '/public/index.php';

$command = sprintf('php -S %s:%d -t %s %s', escapeshellarg($host), $port, escapeshellarg(__DIR__ . '/public'), escapeshellarg($router));

passthru($command);
