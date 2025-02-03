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
include("$PATH/config.php");

$Servidor = new Server($Config['BIND'], $Config['DAEMONS'][6]['BACKUP_SQL']['PORT']);

$Servidor->set(
    [
        Constant::OPTION_HTTP_COMPRESSION       => true,
        Constant::OPTION_HTTP_COMPRESSION_LEVEL => 5,
    ]
);

function isAuthenticated($mysqli, $authToken) {
    echo "[Auth Check] Verificando token: " . ($authToken ?: 'Nenhum token') . "\n";
    
    if (empty($authToken)) {
        echo "[Auth Check] Token vazio - Acesso negado\n";
        return false;
    }

    $authStmt = $mysqli->prepare("SELECT uuid FROM auth_users WHERE auth_token = ? LIMIT 1");
    $authStmt->bind_param("s", $authToken);
    $authStmt->execute();
    $authStmt->store_result();

    $isAuthenticated = $authStmt->num_rows > 0;
    echo "[Auth Check] Resultado: " . ($isAuthenticated ? "Autenticado" : "Não autenticado") . "\n";
    
    $authStmt->close();
    return $isAuthenticated;
}

function serveFile($filename, $response) {
    if (file_exists($filename)) {
        $contents = file_get_contents($filename);
        $response->end($contents);
    } else {
        $response->status(404);
        $response->end("File not found");
    }
}

$Servidor->on('request', function (Request $Request, Response $Response) use ($PATH) {
    $mysqli = new mysqli($_ENV['DB_HOST'], $_ENV['DB_USER'], $_ENV['DB_PASS'], $_ENV['DB_NAME'], (int)$_ENV['DB_PORT']);
    if ($mysqli->connect_error) {
        $Response->status(500);
        $Response->end("Database connection failed: " . $mysqli->connect_error);
        return;
    }

    $Response->header('Access-Control-Allow-Origin', '*');
    $Response->header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    $Response->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if ($Request->server['request_method'] === 'OPTIONS') {
        $Response->status(204);
        $Response->end();
        return;
    }

    $uri = $Request->server['request_uri'];

    if ($uri === '/dashboard') {
        echo "\n=== TENTATIVA DE ACESSO AO DASHBOARD ===\n";
        echo "IP: " . $Request->server['remote_addr'] . "\n";
        echo "Hora: " . date('Y-m-d H:i:s') . "\n";
        
        $authToken = $Request->cookie['auth_token'] ?? '';
        
        if (!isAuthenticated($mysqli, $authToken)) {
            echo "ACESSO NEGADO - Token inválido ou ausente\n";
            echo "=====================================\n\n";
            $Response->status(401); 
            $Response->end("Acesso não autorizado. Faça login primeiro.");
            return;
        }
        
        echo "ACESSO AUTORIZADO\n";
        echo "=====================================\n\n";
        serveFile("$PATH/dashboard.html", $Response);
        return;
    }

    switch($uri){
        case '/user/register':
            if ($Request->server['request_method'] === 'GET') {
                serveFile("$PATH/register.html", $Response);
                return;
            }

            $data = json_decode($Request->getContent(), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

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
                    $Response->header('Location', '/user/login');
                    $Response->end("User registered successfully. Redirecting to login...");
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
            if ($Request->server['request_method'] === 'GET') {
                serveFile("$PATH/login.html", $Response);
                return;
            }

            $data = json_decode($Request->getContent(), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                $Response->status(400);
                $Response->end("Username and password are required.");
                return;
            }

            $stmt = $mysqli->prepare("SELECT uuid, password FROM users WHERE username = ?");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows > 0) {
                $stmt->bind_result($uuid, $hashedPassword);
                $stmt->fetch();

                if (password_verify($password, $hashedPassword)) {
                    $authToken = sha1($password . $uuid);
                    $authStmt = $mysqli->prepare("INSERT INTO auth_users (uuid, auth_token) VALUES (?, ?) ON DUPLICATE KEY UPDATE auth_token = VALUES(auth_token)");
                    $authStmt->bind_param("ss", $uuid, $authToken);
                    $authStmt->execute();
                    $authStmt->close();

                    $Response->cookie('auth_token', $authToken, time() + 3600, '/'); // Adiciona o cookie de autenticação
                    $Response->status(200);                    
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

        case '/protected':
            $authToken = $Request->cookie['auth_token'] ?? '';

            if (empty($authToken)) {
                $Response->status(401);
                $Response->end("Auth token is required.");
                return;
            }

            $authStmt = $mysqli->prepare("SELECT uuid FROM auth_users WHERE auth_token = ? LIMIT 1");
            $authStmt->bind_param("s", $authToken);
            $authStmt->execute();
            $authStmt->store_result();

            if ($authStmt->num_rows === 0) {
                $Response->status(401);
                $Response->end("Invalid auth token.");
                $authStmt->close();
                return;
            }

            $authStmt->close();
            break;

        case '/logout':
            $authToken = $Request->cookie['auth_token'] ?? '';

            if (empty($authToken)) {
                $Response->status(400);
                $Response->end("Auth token is required.");
                return;
            }

            $authStmt = $mysqli->prepare("DELETE FROM auth_users WHERE auth_token = ?");
            $authStmt->bind_param("s", $authToken);
            $authStmt->execute();

            if ($authStmt->affected_rows > 0) {
                $Response->cookie('auth_token', '', time() - 3600, '/');
                $Response->status(200);
                $Response->end("Logout successful.");
            } else {
                $Response->status(400);
                $Response->end("Invalid auth token.");
            }

            $authStmt->close();
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
    $files = array_keys($files);

    return ($files) ? $files : false;
}
?>