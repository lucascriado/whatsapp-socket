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
                    console.log('Mensagens recebidas:', response.data); // Log para depuração
                    setMessages(response.data);
                } else {
                    console.error('A resposta da API não é um array:', response.data);
                }
            } catch (error) {
                console.error('Erro ao buscar mensagens:', error);
            }
        };

        fetchMessages();

        // Conectar ao WebSocket
        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Mensagem recebida via WebSocket:', data); // Log para depuração
            if (data.event === 'newMessage' && (data.message.key.remoteJid === number || data.message.key.remoteJid === `${number}@s.whatsapp.net`)) {
                setMessages((prevMessages) => [...prevMessages, data.message]);
            }
        };

        return () => {
            ws.close();
        };
    }, [number]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
                {messages.map((message, index) => {
                

                    // const fromMe = message.voce;
                    // const text = message.tipo === 'enviada' ? message.mensagem : null;
                    // const imageUrl = message.tipo === 'imagem' ? `http://localhost:3000/${message.midia_url}` : null;
                    // const audioUrl = message.tipo === 'audio' ? `http://localhost:3000/${message.midia_url}` : null;

                    // return (
                    //     <div key={message.id || index} className={`p-2 my-2 rounded ${fromMe ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`}>
                    //         {text ? (
                    //             <p>{text}</p>
                    //         ) : imageUrl ? (
                    //             <img src={imageUrl} alt="Imagem" />
                    //         ) : audioUrl ? (
                    //             <audio controls src={audioUrl} className="w-full" />
                    //         ) : null}
                    //     </div>
                    // );

                    const fromMe = message.voce;
                    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || message.message?.text || message.texto;
                    const imageUrl = message.tipo === 'imagem' ? `http://localhost:3000/${message.midia_url}` : null;
                    const audioUrl = message.tipo === 'audio' ? `http://localhost:3000/${message.midia_url}` : null;

                    return (
                        <div key={message.id || index} className={`p-2 my-2 rounded ${fromMe ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`}>
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
            <WhatsAppForm number={number} />
        </div>
    );
};

export default ChatWindow;