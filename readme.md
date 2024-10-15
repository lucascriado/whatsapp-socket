
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
    tipo ENUM('enviada', 'recebida', 'audio', 'imagem'),  
    usuario_id VARCHAR(255),           
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    midia_url VARCHAR(255) -- Adiciona a coluna para armazenar URLs de mídia
  );
```
# Uso da Aplicação 
Enviar Mensagem de Texto
Para enviar uma mensagem de texto, você pode usar o comando no terminal da seguinte forma:
```user1 5517996743063 Olá, esta é uma mensagem de teste!```

Enviar Imagem
Para enviar uma imagem, você pode usar o comando no terminal da seguinte forma:
```user1 5517996743063 img:C:\path\imagem.jpg Legenda da imagem```

Enviar Áudio
Para enviar um áudio, você pode usar o comando no terminal da seguinte forma:
```user1 5517996743063 audio:C:\path\audio.ogg```

Parar a aplicação (Windows)
```Ctrl + C```