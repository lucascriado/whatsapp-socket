
## Instalação

Instale as depedências

```bash
  npm install -g typescript 
  npm i
  npm run dev
```

Configuração da .ENV na raiz do projeto

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

  CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participante VARCHAR(255),
    voce BOOLEAN,
    texto TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
``` 