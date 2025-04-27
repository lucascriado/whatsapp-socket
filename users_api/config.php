<?php
require_once __DIR__ . '/vendor/autoload.php'; // Certifique-se de que o autoload do Composer está incluído

use Swoole\Http\Server;
use Dotenv\Dotenv;

// Carregar o arquivo .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$Config = [
    'BIND' => '0.0.0.0',
    'DAEMONS' => [
        6 => [
            'BACKUP_SQL' => [
                'PORT' => 9501
            ]
        ]
    ],
    'DB' => [
        'HOST' => $_ENV['DB_HOST'],
        'PORT' => $_ENV['DB_PORT'],
        'USER' => $_ENV['DB_USER'],
        'PASS' => $_ENV['DB_PASSWORD'],
        'NAME' => $_ENV['DB_NAME']
    ]
];

return new Server($Config['BIND'], $Config['DAEMONS'][6]['BACKUP_SQL']['PORT']);