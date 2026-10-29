<?php

declare(strict_types=1);

$bootstrap = __DIR__ . '/../src/bootstrap.php';
if (!is_file($bootstrap)) {
    fwrite(STDERR, "Missing PHP bootstrap: {$bootstrap}\n");
    exit(1);
}

require $bootstrap;

$requiredRouters = [
    'GET:/health',
    'POST:/auth/login',
    'GET:/auth/me',
    'POST:/auth/logout',
    'POST:/auth/change-password',
    'POST:/crearuser',
    'GET:/aulas',
    'POST:/aulas',
    'POST:/aulas/unirse',
    'GET:/aulas/{id_aula}/miembros',
    'POST:/sensores',
    'GET:/sensores/actual',
];

foreach ($requiredRouters as $route) {
    if (!Router::exists($route)) {
        fwrite(STDERR, "Missing route: {$route}\n");
        exit(1);
    }
}

echo "PHP API contract smoke test passed.\n";
