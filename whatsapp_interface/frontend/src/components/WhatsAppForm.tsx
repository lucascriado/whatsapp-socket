import React, { useState, useEffect, useRef } from 'react';
import { fetchQRCode, sendMessage, sendImage, sendAudio } from '../services/api';

interface WhatsAppFormProps {
    number: string;
    fetchMessages: () => void;
}

const WhatsAppForm: React.FC<WhatsAppFormProps> = ({ number, fetchMessages }) => {
    const [userId] = useState('3f68955c-99e8-4adb-9368-c3cbdd4fa54c');
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [, setQrCode] = useState('');
    const [, setIsConnected] = useState(false);

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
            setMessage('');
            setIsConnected(true);
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
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
    
            const response = await sendImage(formData);
            setImageFile(null);
            setCaption('');
            setIsConnected(true);
    
            const ws = new WebSocket('ws://localhost:8080');
            ws.onopen = () => {
                ws.send(JSON.stringify({ event: 'newMessage', message: response.data }));
                ws.close();
            };
    
            if (imageInputRef.current) {
                imageInputRef.current.value = '';
            }

            fetchMessages();
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
        }
    };

    const handleSendAudio = async () => {
        if (!audioFile) return;
        try {
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('number', number);
            formData.append('audio', audioFile);

            const response = await sendAudio(formData);
            setAudioFile(null);
            setIsConnected(true);

            const ws = new WebSocket('ws://localhost:8080');
            ws.onopen = () => {
                ws.send(JSON.stringify({ event: 'newMessage', message: response.data }));
                ws.close();
            };

            if (audioInputRef.current) {
                audioInputRef.current.value = '';
            }

            fetchMessages();
        } catch (error) {
            console.error('Erro ao enviar áudio:', error);
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