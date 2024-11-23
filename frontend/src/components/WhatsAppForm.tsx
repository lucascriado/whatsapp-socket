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
            console.error('Detalhes do erro:', (error as any).response?.data);
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
        <div className="p-4">
            <form className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Digite uma mensagem"
                        className="flex-1 p-2 border rounded"
                    />
                    <button type="button" onClick={handleSendMessage} className="p-2 bg-blue-500 text-white rounded">
                        Enviar
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="file"
                        ref={imageInputRef}
                        onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                        className="flex-1"
                    />
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Legenda"
                        className="flex-1 p-2 border rounded"
                    />
                    <button type="button" onClick={handleSendImage} className="p-2 bg-blue-500 text-white rounded">
                        Enviar Imagem
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="file"
                        ref={audioInputRef}
                        onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)}
                        className="flex-1"
                    />
                    <button type="button" onClick={handleSendAudio} className="p-2 bg-blue-500 text-white rounded">
                        Enviar Áudio
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WhatsAppForm;