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

function isAuthenticated($mysqli, $authToken, $response) {
    try {
        $authStmt = $mysqli->prepare("SELECT uuid, blockedsession FROM auth_users WHERE auth_token = ? LIMIT 1");
        $authStmt->bind_param("s", $authToken);
        $authStmt->execute();
        $authStmt->store_result();
        $authStmt->bind_result($uuid, $blockedsession);
        $authStmt->fetch();

        if ($blockedsession >= 3) {
            $response->status(403);
            $response->end("Conta bloqueada devido a múltiplas tentativas de login falhas.");
            return false;
        }

        $isAuthenticated = $authStmt->num_rows > 0;
        $authStmt->close();
        return $isAuthenticated;
    } catch (Exception $e) {
        $response->status(500);
        $response->end("Erro interno no servidor");
    }
}

function getUserPermissions($mysqli, $userId) {
    $permissions = [];
    $stmt = $mysqli->prepare("SELECT p.name FROM permissions p JOIN user_permissions up ON p.id = up.permission_id WHERE up.user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->bind_result($permissionName);
    while ($stmt->fetch()) {
        $permissions[] = $permissionName;
    }
    $stmt->close();
    return $permissions;
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
                $fullname = $data['fullname'] ?? '';
                $email    = $data['email'] ?? '';
                $password = $data['password'] ?? '';
                
                $uuid = Uuid::uuid4()->toString();
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $stmt = $mysqli->prepare("INSERT INTO users (uuid, username, fullname, email, password) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $uuid, $username, $fullname, $email, $hashedPassword);

                if ($stmt->execute()) {
                    $Response->status(201);
                } else {
                    $Response->status(500);
                    $Response->end("Falha ao registrar o usuário: " . $stmt->error);
                }

                $stmt->close();
                break;
            } catch (Exception $e) {
                echo $e->getMessage();

                $Response->status(500);
                $Response->end("Erro interno no servidor");
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

                $stmt = $mysqli->prepare("SELECT id, uuid, password, fullname, username, email FROM users WHERE username = ?");
                $stmt->bind_param("s", $username);
                $stmt->execute();
                $stmt->store_result();
                $stmt->bind_result($userId, $uuid, $hashedPassword, $fullname, $username, $email);
                $stmt->fetch();

                if(password_verify($password, $hashedPassword)) {
                    $authToken = sha1($password . $uuid);
                    $remoteIP = $Request->server['remote_addr'];
                    $remoteOS = php_uname('s');
                    $pcName = gethostname();
                    $APPVersion = 1;
                    $timelogon = time();
                    $expirylogon = $timelogon + (60 * 60 * 24);
                
                    $authStmt = $mysqli->prepare("INSERT INTO auth_users (user_id, uuid, auth_token, remoteIP, remoteOS, pcName, APPVersion, timelogon, expirylogon, fullname, email, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE auth_token = VALUES(auth_token), remoteIP = VALUES(remoteIP), remoteOS = VALUES(remoteOS), pcName = VALUES(pcName), APPVersion = VALUES(APPVersion), timelogon = VALUES(timelogon), expirylogon = VALUES(expirylogon), fullname = VALUES(fullname), email = VALUES(email), pessoa_id = VALUES(pessoa_id)");
                    $authStmt->bind_param("isssssiisssi", $userId, $uuid, $authToken, $remoteIP, $remoteOS, $pcName, $APPVersion, $timelogon, $expirylogon, $fullname, $email, $pessoa_id);
                    $authStmt->execute();
                    $authStmt->close();
                
                    $_SESSION['auth_token'] = $authToken;
                    $_SESSION['username'] = $username;
                    $_SESSION['uuid'] = $uuid;
                    $_SESSION['fullname'] = $fullname;
                    $_SESSION['email'] = $email;
                    $_SESSION['user_id'] = $userId;
                
                    $Response->status(200);
                
                    $stmt->close();
                } else {
                    $stmt = $mysqli->prepare("UPDATE auth_users SET blockedsession = blockedsession + 1 WHERE uuid = ?");
                    $stmt->bind_param("s", $uuid);
                    $stmt->execute();
                    $stmt->close();

                    $Response->status(401);
                    $Response->end("Usuário ou senha inválidos.");
                }

            } catch (Exception $e) {
                echo $e->getMessage();

                $Response->status(500);
                $Response->end("Erro interno no servidor");
            }
            break;

        case '/dashboard':
            $authToken = $_SESSION['auth_token'] ?? '';

            if (isAuthenticated($mysqli, $authToken, $Response)) {
                serveFile("$PATH/dashboard.html", $Response);
            } else {
                $Response->status(401);
                $Response->header('Location', '/login');
            }
            break;
        
        case '/user-info':
            $authToken = $_SESSION['auth_token'] ?? '';
        
            if (isAuthenticated($mysqli, $authToken, $Response)) {
                $userId = $_SESSION['user_id'] ?? 0;
                $permissions = getUserPermissions($mysqli, $userId);
                $userInfo = [
                    "uuid" => $_SESSION['uuid'] ?? '',
                    "username" => $_SESSION['username'] ?? '',
                    "fullname" => $_SESSION['fullname'] ?? '',
                    "email" => $_SESSION['email'] ?? '',
                    "permissions" => $permissions
                ];
                $Response->header('Content-Type', 'application/json');
                $Response->end(json_encode($userInfo));
            } else {
                $Response->status(401);
                $Response->end(json_encode(["error" => "Usuário não autenticado."]));
            }
            break;
        
        case '/logout':
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