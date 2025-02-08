<?php
declare(strict_types=1);

require 'vendor/autoload.php';

use Ramsey\Uuid\Uuid;
use Swoole\Constant;
use Swoole\Coroutine;
use Swoole\Http\Request;
use Swoole\Http\Response;
use Swoole\Http\Server;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$PATH = __DIR__;
$Servidor = include "$PATH/config.php";

$Servidor->set(
    [
        Constant::OPTION_HTTP_COMPRESSION       => true,
        Constant::OPTION_HTTP_COMPRESSION_LEVEL => 5,
    ]
);

function isAuthenticated($mysqli, $authToken) {
    try {
        $authStmt = $mysqli->prepare("SELECT uuid FROM auth_users WHERE auth_token = ? LIMIT 1");
        $authStmt->bind_param("s", $authToken);
        $authStmt->execute();
        $authStmt->store_result();

        $isAuthenticated = $authStmt->num_rows > 0;
        $authStmt->close();
        return $isAuthenticated;
    } catch (Exception $e) {
        $response->status(500);
        $response->end("Erro interno no servidor");
    }
}

function serveFile($filename, $response) {
    try {
        $contents = file_get_contents($filename);
        $response->end($contents);
    } catch (Exception $e) {
        $response->status(500);
        $response->end("Erro interno no servidor");
    }
}

$Servidor->on('request', function (Request $Request, Response $Response) use ($PATH) {
    $Response->header('Access-Control-Allow-Origin', '*');
    $Response->header('Access-Control-Allow-Methods', 'POST, GET, PUT, OPTIONS');
    $Response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    $mysqli = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);

    $uri = $Request->server['request_uri'];

    switch($uri){
        case '/register':
            try {
                if ($Request->server['request_method'] === 'GET') {
                    serveFile("$PATH/register.html", $Response);
                    return;
                } 

                $data = json_decode($Request->getContent(), true);
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';
                
                $uuid = Uuid::uuid4()->toString();
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $mysqli->prepare("INSERT INTO users (uuid, username, password) VALUES (?, ?, ?)");
                $stmt->bind_param("sss", $uuid, $username, $hashedPassword);

                if ($stmt->execute()) {
                    $Response->status(201);
                } else {
                    $Response->status(500);
                    $Response->end("Falha ao registrar o usuário: " . $stmt->error);
                }

                $stmt->close();
                break;
            } catch (Exception $e) {
                $response->status(500);
                $response->end("Erro interno no servidor");
            }

        case '/login':
            try {
                if ($Request->server['request_method'] === 'GET') {
                    serveFile("$PATH/login.html", $Response);
                    return;
                }

                $data = json_decode($Request->getContent(), true);
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';

                $stmt = $mysqli->prepare("SELECT uuid, password FROM users WHERE username = ?");
                $stmt->bind_param("s", $username);
                $stmt->execute();
                $stmt->store_result();

                $stmt->bind_result($uuid, $hashedPassword);
                $stmt->fetch();

                if(password_verify($password, $hashedPassword)) {
                    $authToken = sha1($password . $uuid);
                    $remoteIP = $Request->server['remote_addr'];
                    $remoteOS = php_uname('s');
                    $pcName = gethostname();
                    $APPVersion = 1;
                    $timelogon = time();
                    $expirylogon = $timelogon + (60 * 60 * 24);

                    $authStmt = $mysqli->prepare("INSERT INTO auth_users (uuid, auth_token, remoteIP, remoteOS, pcName, APPVersion, timelogon, expirylogon) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE auth_token = VALUES(auth_token), remoteIP = VALUES(remoteIP), remoteOS = VALUES(remoteOS), pcName = VALUES(pcName), APPVersion = VALUES(APPVersion), timelogon = VALUES(timelogon), expirylogon = VALUES(expirylogon)");
                    $authStmt->bind_param("sssssiis", $uuid, $authToken, $remoteIP, $remoteOS, $pcName, $APPVersion, $timelogon, $expirylogon);
                    $authStmt->execute();
                    $authStmt->close();

                    $_SESSION['auth_token'] = $authToken;
                    $_SESSION['username'] = $username;
                    $_SESSION['uuid'] = $uuid;

                    $Response->status(200);

                    $stmt->close();
                } else {
                    $Response->status(401);
                    $Response->end("Usuário ou senha inválidos.");
                }
            } catch (Exception $e) {
                $response->status(500);
                $response->end("Erro interno no servidor");
            }
            break;

        case '/dashboard':
            $authToken = $_SESSION['auth_token'] ?? '';

            if (isAuthenticated($mysqli, $authToken)) {
                serveFile("$PATH/dashboard.html", $Response);
            } else {
                $Response->status(401);
                $Response->header('Location', '/login');
            }
            break;

        case '/logout':
            session_start();
            session_unset();
            session_destroy();
        
            $Response->status(302);
            $Response->header('Location', '/login');
            $Response->end();
            break;
            

        default:
            echo "";

            $Response->status(302);
            $Response->header('Location', '/login');
            $Response->end();
            break;
        
        $mysqli->close();
    }
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
    $files = array_keys($files);

    return ($files) ? $files : false;
}
?>