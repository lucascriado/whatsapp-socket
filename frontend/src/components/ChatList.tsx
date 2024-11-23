import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface ChatListProps {
    onSelectNumber: (number: string) => void;
    selectedNumber: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectNumber, selectedNumber }) => {
    const [numbers, setNumbers] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [manualNumber, setManualNumber] = useState<string>('');

    const fetchNumbers = async () => {
        try {
            const response = await axios.get('http://localhost:3000/numbers');
            setNumbers(response.data);
        } catch (err: any) {
            setError('Failed to fetch numbers');
            console.error('Error fetching numbers:', err);
        }
    };

    useEffect(() => {
        fetchNumbers();
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
            <ul className="mb-4">
                {numbers.map((num) => (
                    <li
                        key={num}
                        className={`cursor-pointer p-2 hover:bg-gray-200 ${selectedNumber === num ? 'bg-blue-200' : ''}`}
                        onClick={() => onSelectNumber(num)}
                    >
                        {num}
                    </li>
                ))}
            </ul>
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
        </div>
    );
};

export default ChatList;