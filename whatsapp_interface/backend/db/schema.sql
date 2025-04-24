CREATE DATABASE whatsapp;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'password';
GRANT ALL ON whatsapp.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
ALTER USER 'admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';

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
  conversa_de_grupo VARCHAR(255) DEFAULT NULL,
  midia_url VARCHAR(255)
);

CREATE TABLE audios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(255),
    hash VARCHAR(40),
    midia_url VARCHAR(255)
);

CREATE TABLE whatsapp_conexoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    grupo_id VARCHAR(255) NOT NULL,
    pasta_auth VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE whatsapp_conexoes MODIFY COLUMN pasta_auth VARCHAR(255) DEFAULT NULL;
