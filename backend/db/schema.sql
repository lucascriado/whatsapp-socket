USE whatsapp;

CREATE TABLE IF NOT EXISTS mensagens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participante VARCHAR(255),
  voce BOOLEAN,
  texto TEXT,
  tipo ENUM('enviada', 'recebida'),  
  usuario_id VARCHAR(255),           
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user2 55179999999999999 Olá, tudo bem?
-- user1 55179999999999999 Olá, tudo bem?

