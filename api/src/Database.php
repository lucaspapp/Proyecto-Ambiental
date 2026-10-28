<?php

declare(strict_types=1);

class Database
{
    public static function connection(): PDO
    {
        $dsn = Config::dbDsn();
        $username = (string) Config::get('DB_USER', 'root');
        $password = (string) Config::get('DB_PASSWORD', '');

        $pdo = new PDO(
            $dsn,
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
            ]
        );

        return $pdo;
    }

    public static function handleException(PDOException $exception): ApiException
    {
        $errno = (int) $exception->getCode();
        if ($errno === 1062 || $errno === 23000) {
            return new ApiException('El recurso ya existe o referencia datos inexistentes.', 409);
        }

        if (in_array($errno, [1045, 1049], true)) {
            return new ApiException('No se pudo autenticar con la base de datos. Revisa DB_USER, DB_PASSWORD y DB_NAME.', 503);
        }

        if (in_array($errno, [2003, 2005], true)) {
            return new ApiException('No se pudo conectar con MySQL/MariaDB. Revisa que el servicio esté iniciado y que DB_HOST y DB_PORT sean correctos.', 503);
        }

        return new ApiException('No fue posible completar la operación con la base de datos.', 503);
    }
}
