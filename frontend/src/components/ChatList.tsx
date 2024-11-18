import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface ChatListProps {
    onSelectNumber: (number: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectNumber }) => {
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
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ul>
                {numbers.map((num) => (
                    <li key={num} onClick={() => onSelectNumber(num)}>{num}</li>
                ))}
            </ul>
            <div>
                <input
                    type="text"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="Digite um número"
                />
                <button onClick={handleManualNumberSubmit}>Enviar</button>
            </div>
        </div>
    );
};

export default ChatList;