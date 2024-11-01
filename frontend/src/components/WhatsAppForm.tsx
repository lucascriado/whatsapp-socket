import React, { useState } from 'react';
import { connectUser, sendMessage, sendImage, sendAudio } from '../services/api';

const WhatsAppForm: React.FC = () => {
    const [userId, setUserId] = useState('');
    const [number, setNumber] = useState('');
    const [message, setMessage] = useState('');
    const [imagePath, setImagePath] = useState('');
    const [caption, setCaption] = useState('');
    const [audioPath, setAudioPath] = useState('');

    const handleConnect = async () => {
        try {
            await connectUser(userId);
            alert('Conectado com sucesso!');
        } catch (error) {
            console.error('Erro ao conectar:', error);
            alert('Erro ao conectar');
        }
    };

    const handleSendMessage = async () => {
        try {
            await sendMessage(userId, number, message);
            alert('Mensagem enviada!');
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem');
        }
    };

    const handleSendImage = async () => {
        try {
            await sendImage(userId, number, imagePath, caption);
            alert('Imagem enviada!');
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            alert('Erro ao enviar imagem');
        }
    };

    const handleSendAudio = async () => {
        try {
            await sendAudio(userId, number, audioPath);
            alert('Áudio enviado!');
        } catch (error) {
            console.error('Erro ao enviar áudio:', error);
            alert('Erro ao enviar áudio');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
            <h2>Conectar ao WhatsApp</h2>
            <input
                type="text"
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
            />
            <button onClick={handleConnect}>Conectar</button>

            <h3>Enviar Mensagem</h3>
            <input
                type="text"
                placeholder="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
            />
            <input
                type="text"
                placeholder="Mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={handleSendMessage}>Enviar Mensagem</button>

            <h3>Enviar Imagem</h3>
            <input
                type="text"
                placeholder="Caminho da Imagem"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
            />
            <input
                type="text"
                placeholder="Legenda"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
            />
            <button onClick={handleSendImage}>Enviar Imagem</button>

            <h3>Enviar Áudio</h3>
            <input
                type="text"
                placeholder="Caminho do Áudio"
                value={audioPath}
                onChange={(e) => setAudioPath(e.target.value)}
            />
            <button onClick={handleSendAudio}>Enviar Áudio</button>
        </div>
    );
};

export default WhatsAppForm;
