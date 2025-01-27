<?php
declare(strict_types=1);

require 'vendor/autoload.php';

use Ramsey\Uuid\Uuid;
use Swoole\Constant;
use Swoole\Coroutine;
use Swoole\Http\Request;
use Swoole\Http\Response;
use Swoole\Http\Server;

$PATH = dirname(__FILE__);
include("$PATH/config.php");

$Servidor = new Server($Config['BIND'], $Config['DAEMONS'][6]['BACKUP_SQL']['PORT']);

$Servidor->set(
    [
        Constant::OPTION_HTTP_COMPRESSION       => true,
        Constant::OPTION_HTTP_COMPRESSION_LEVEL => 5,
        Constant::OPTION_DOCUMENT_ROOT            => dirname(__DIR__),
        Constant::OPTION_ENABLE_STATIC_HANDLER    => true,
        Constant::OPTION_STATIC_HANDLER_LOCATIONS => [
            '/clients',
            '/servers',
        ],
    ]
);

$Servidor->on('request', function (Request $Request, Response $Response) {
    $mysqli = new mysqli('192.168.3.120', 'admin', 'password', 'users_api', 3306);
    if ($mysqli->connect_error) {
        $Response->status(500);
        $Response->end("Database connection failed: " . $mysqli->connect_error);
        return;
    }

    switch($Request->server['request_uri']){
        case '/user/register':
            $username = $Request->post['username'] ?? '';
            $password = $Request->post['password'] ?? '';

            if (empty($username) || empty($password)) {
                $Response->status(400);
                $Response->end("Username, and password are required.");
                return;
            }

            $uuid = Uuid::uuid4()->toString();
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $mysqli->prepare("INSERT INTO users (uuid, username, password) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $uuid, $username, $hashedPassword);

            try {
                if ($stmt->execute()) {
                    $Response->status(201);
                    $Response->end("User registered successfully.");
                } else {
                    $Response->status(500);
                    $Response->end("User registration failed: " . $stmt->error);
                }
            } catch (mysqli_sql_exception $e) {
                if ($e->getCode() == 1062) {
                    $Response->status(409);
                    $Response->end("Username already in use.");
                } else {
                    $Response->status(500);
                    $Response->end("User registration failed: " . $e->getMessage());
                }
            }

            

            $stmt->close();
            break;

        case '/user/login':
            $username = $Request->post['username'] ?? '';
            $password = $Request->post['password'] ?? '';

            if (empty($username) || empty($password)) {
                $Response->status(400);
                $Response->end("Username and password are required.");
                return;
            }

            $stmt = $mysqli->prepare("SELECT password FROM users WHERE username = ?");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows > 0) {
                $stmt->bind_result($hashedPassword);
                $stmt->fetch();

                if (password_verify($password, $hashedPassword)) {
                    $Response->status(200);
                    $Response->end("Login successful.");
                } else {
                    $Response->status(401);
                    $Response->end("Invalid username or password.");
                }
            } else {
                $Response->status(401);
                $Response->end("Invalid username or password.");
            }

            $stmt->close();
            break;

        default:
            $Response->status(404);
            $Response->end("Not Found");
            break;
    }

    $mysqli->close();
});

$Servidor->start();

function scan_dir_ordered_data_modified($dir) {
    $ignored = array('.', '..', '.svn', '.htaccess');
    $files = array();
    foreach (scandir($dir) as $file) {
        if ($file[0] === '.') continue;
        if (in_array($file, $ignored)) continue;
        $files[$file] = filemtime($dir . '/' . $file);
    }
    arsort($files);
    $files = array_reverse(array_keys($files));
    return ($files) ? $files : false;
}
?>