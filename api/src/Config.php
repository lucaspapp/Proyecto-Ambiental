<?php

declare(strict_types=1);

class Config
{
    public static function load(): void
    {
        $envFile = dirname(__DIR__) . '/.env';
        if (!is_file($envFile)) {
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $trimmed, 2), 2, '');
            $key = trim($key);
            $value = trim($value);
            if ($key === '') {
                continue;
            }

            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, $_ENV)) {
            return $_ENV[$key];
        }

        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        return $default;
    }

    public static function dbDsn(): string
    {
        $host = self::get('DB_HOST', '127.0.0.1');
        $port = (int) self::get('DB_PORT', 3306);
        $dbname = self::get('DB_NAME', 'cnlab');
        $charset = 'utf8mb4';

        return sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $dbname, $charset);
    }
}
