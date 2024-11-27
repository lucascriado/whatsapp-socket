import React, { useState } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import QRCodeDisplay from './components/QRCodeDisplay';
import './index.css';

const App: React.FC = () => {
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-screen">
            <div className="flex flex-row flex-1">
                <div className="w-1/3 p-4 border-r">
                    <QRCodeDisplay />
                    <ChatList onSelectNumber={setSelectedNumber} selectedNumber={selectedNumber} />
                </div>
                <div className="w-2/3 p-4">
                    {selectedNumber && <ChatWindow number={selectedNumber} />}
                </div>
            </div>
        </div>
    );
};

export default App;