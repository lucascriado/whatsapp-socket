import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WhatsAppForm from './WhatsAppForm';

const ChatWindow: React.FC<{ number: string }> = ({ number }) => {
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await axios.get(`http://localhost:3000/messages/${number}`);
                if (Array.isArray(response.data)) {
                    setMessages(response.data);
                } else {
                    console.error('A resposta da API não é um array:', response.data);
                }
            } catch (error) {
                console.error('Erro ao buscar mensagens:', error);
            }
        };

        fetchMessages();
    }, [number]);

    return (
        <div className="chat-window">
            <div className="messages">
                {messages.map((message) => (
                    <div key={message.id} className={`message ${message.voce ? 'sent' : 'received'}`}>
                        {message.tipo === 'enviada' || message.tipo === 'recebida' ? (
                            <p>{message.texto}</p>
                        ) : message.tipo === 'imagem' ? (
                            <img src={`http://localhost:3000/${message.midia_url}`} alt="Imagem" />
                        ) : message.tipo === 'audio' ? (
                            <audio controls src={`http://localhost:3000/${message.midia_url}`} />
                        ) : null}
                    </div>
                ))}
            </div>
            <WhatsAppForm number={number} />
        </div>
    );
};

export default ChatWindow;