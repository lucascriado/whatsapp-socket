import React, { useEffect, useState } from 'react';
import axios from 'axios';
import WhatsAppForm from './WhatsAppForm';

export const fetchMessages = async (number: string, setMessages: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
        const response = await axios.get(`http://localhost:3000/messages/${number}`);
        if (Array.isArray(response.data)) {
            console.log('Mensagens recebidas:', response.data);
            setMessages(response.data);
        } else {
            console.error('A resposta da API não é um array:', response.data);
        }
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
    }
};

const ChatWindow: React.FC<{ number: string }> = ({ number }) => {
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Mensagem recebida via WebSocket:', data);
            if (data.event === 'newMessage' && (data.message.key.remoteJid === number || data.message.key.remoteJid === `${number}@s.whatsapp.net` || data.message.key.remoteJid === number)) {
                fetchMessages(number, setMessages);
            }
        };

        fetchMessages(number, setMessages);

        return () => {
            ws.close();
        };
    }, [number]);

    return (
        <div className="">
            <div className="">
                {messages.map((message, index) => {
                    const fromMe = message.voce;
                    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.text || message.texto;
                    const imageUrl = message.tipo === 'imagem' ? `http://localhost:3000/${message.midia_url}` : null;
                    const audioUrl = message.tipo === 'audio' ? `http://localhost:3000/${message.midia_url}` : null;
                    const isGroup = message.grupo_id;
                    const sender = isGroup ? `Grupo: ${message.participante}` : message.participante;

                    return (
                        <div key={`${message.id}-${index}`} className={`p-2 my-2 rounded ${fromMe ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`}>
                            <p className="text-xs text-gray-500">{sender}</p>
                            {text ? (
                                <p>{text}</p>
                            ) : imageUrl ? (
                                <img src={imageUrl} alt="Imagem" />
                            ) : audioUrl ? (
                                <audio controls src={audioUrl} className="w-full" />
                            ) : null}
                        </div>
                    );
                })}
            </div>
            <WhatsAppForm number={number} fetchMessages={() => fetchMessages(number, setMessages)} />
        </div>
    );
};

export default ChatWindow;