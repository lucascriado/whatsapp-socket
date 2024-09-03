-- db/schema.sql
USE whatsapp;

CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participante VARCHAR(255),
  voce BOOLEAN,
  texto TEXT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);