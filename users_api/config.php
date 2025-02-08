<?php
use Swoole\Http\Server;

$Config = [
    'BIND' => '0.0.0.0',
    'DAEMONS' => [
        6 => [
            'BACKUP_SQL' => [
                'PORT' => 9501
            ]
        ]
    ]
];

return new Server($Config['BIND'], $Config['DAEMONS'][6]['BACKUP_SQL']['PORT']);