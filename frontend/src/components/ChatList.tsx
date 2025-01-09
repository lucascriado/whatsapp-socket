import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface ChatListProps {
    onSelectNumber: (number: string) => void;
    selectedNumber: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectNumber, selectedNumber }) => {
    const [contacts, setContacts] = useState<{ participante: string, grupo_id: string | null }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [manualNumber, setManualNumber] = useState<string>('');

    const fetchNumbers = async () => {
        try {
            const response = await axios.get<{ participante: string, grupo_id: string | null }[]>('http://localhost:3000/numbers');
            
            const uniqueContacts = Array.from(
                new Map(
                    response.data.map((contact) => [
                        contact.grupo_id || contact.participante,
                        contact
                    ])
                ).values()
            );
    
            setContacts(uniqueContacts);
        } catch (err: any) {
            setError('Failed to fetch numbers');
            console.error('Error fetching numbers:', err);
        }
    };

    useEffect(() => {
        fetchNumbers();

        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Mensagem recebida via WebSocket:', data);
            if (data.event === 'newMessage') {
                fetchNumbers();
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    const handleManualNumberSubmit = () => {
        if (manualNumber) {
            onSelectNumber(manualNumber);
            setManualNumber('');
        }
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex">
                <input
                    type="text"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="Digite um número"
                    className="flex-1 p-2 border rounded"
                />
                <button onClick={handleManualNumberSubmit} className="ml-2 p-2 bg-blue-500 text-white rounded">
                    Adicionar Contato
                </button>
            </div>
            <ul className="mb-4">
                {contacts.map((contact) => (
                    <li
                        key={contact.grupo_id || contact.participante}
                        className={`cursor-pointer p-2 hover:bg-gray-200 ${selectedNumber === (contact.grupo_id || contact.participante) ? 'bg-blue-200' : ''}`}
                        onClick={() => onSelectNumber(contact.grupo_id || contact.participante)}
                    >
                        {contact.grupo_id ? `Grupo: ${contact.grupo_id}` : contact.participante}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ChatList;