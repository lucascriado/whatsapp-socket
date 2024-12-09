
## Instalação

Configuração da .ENV no backend, criar no diretório um arquivo .env -> /backend -> arquivo.env

```bash
    DB_HOST=localhost
    DB_USER=admin
    DB_PASSWORD=password
    DB_NAME=whatsapp
```



Configuração do Banco de Dados

```bash
  CREATE DATABASE whatsapp;
  CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
  GRANT ALL ON whatsapp.* TO 'admin'@'localhost';
  FLUSH PRIVILEGES;
  ALTER USER 'admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

Configuração da Tabela de mensagens no Banco de Dados

```bash
    USE whatsapp;

    CREATE TABLE imagens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id VARCHAR(255),
        hash VARCHAR(40),
        midia_url VARCHAR(255)
    );
    
    CREATE TABLE mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participante VARCHAR(255),
    voce BOOLEAN,
    texto TEXT,
    tipo ENUM('enviada', 'recebida', 'audio', 'imagem'),  
    usuario_id VARCHAR(255),           
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grupo_id VARCHAR(255) DEFAULT NULL,
    midia_url VARCHAR(255)
    );

    CREATE TABLE audios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id VARCHAR(255),
        hash VARCHAR(40),
        midia_url VARCHAR(255)
    );
```

Instale as depedências para backend e rode o projeto

```bash
  npm install -g typescript 
  npm i
  npm run dev
```

Abre um terminal ao lado e mantenha o backend executando, instale as depedências para frontend e rode o projeto

```bash
  npm i
  npm run dev
```
# Uso da Aplicação 
Acessar: http://localhost:5173/
Escanear o QRCode
Qualquer número que enviar mensagem deve aparecer uma lista no canto superior esquerdo
Qualquer número que queira mandar mensagem deve ser adicionado nesse formato: 
exemplo: 5517988887777 (código do brasil + ddd + numero)
