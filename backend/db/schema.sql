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
  midia_url VARCHAR(255)
);

CREATE TABLE audios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(255),
    hash VARCHAR(40),
    midia_url VARCHAR(255)
);