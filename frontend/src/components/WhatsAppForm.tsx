import React, { useState, useEffect, useRef } from 'react';
import { fetchQRCode, sendMessage, sendImage, sendAudio } from '../services/api';

interface WhatsAppFormProps {
    number: string;
}

const WhatsAppForm: React.FC<WhatsAppFormProps> = ({ number }) => {
    const [userId] = useState('user1');
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [qrCode, setQrCode] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const getQRCode = async () => {
            try {
                const response = await fetchQRCode();
                setQrCode(response.data.qrCode);
            } catch (error) {
                console.error('Erro ao obter QR code:', error);
            }
        };

        getQRCode();

        // Conectar ao WebSocket
        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.userId === userId && data.status === 'connected') {
                setIsConnected(true);
                setQrCode('');
            }
        };

        return () => {
            ws.close();
        };
    }, [userId]);

    const handleSendMessage = async () => {
        try {
            await sendMessage(userId, number, message);
            alert('Mensagem enviada!');
            setMessage('');
            setIsConnected(true);
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            alert('Erro ao enviar mensagem');
        }
    };

    const handleSendImage = async () => {
        if (!imageFile) return;
        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('number', number);
            formData.append('image', imageFile);
            formData.append('caption', caption);
            await sendImage(formData);
            alert('Imagem enviada!');
            setImageFile(null);
            setCaption('');
            setIsConnected(true);
            if (imageInputRef.current) {
                imageInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            alert('Erro ao enviar imagem');
        }
    };

    const handleSendAudio = async () => {
        if (!audioFile) return;
        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('number', number);
            formData.append('audio', audioFile);
            await sendAudio(formData);
            alert('Áudio enviado!');
            setAudioFile(null);
            setIsConnected(true);
            if (audioInputRef.current) {
                audioInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Erro ao enviar áudio:', error);
            alert('Erro ao enviar áudio');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
            <h2>Escaneie o QR Code para conectar ao WhatsApp</h2>
            {!isConnected && qrCode ? (
                <img src={qrCode} alt="QR Code" />
            ) : (
                <p>Conectado com sucesso!</p>
            )}
            <form>
                <div>
                    <label>Mensagem:</label>
                    <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <button type="button" onClick={handleSendMessage}>Enviar Mensagem</button>
                <div>
                    <label>Imagem:</label>
                    <input type="file" ref={imageInputRef} onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <div>
                    <label>Legenda:</label>
                    <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} />
                </div>
                <button type="button" onClick={handleSendImage}>Enviar Imagem</button>
                <div>
                    <label>Áudio:</label>
                    <input type="file" ref={audioInputRef} onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <button type="button" onClick={handleSendAudio}>Enviar Áudio</button>
            </form>
        </div>
    );
};

export default WhatsAppForm;