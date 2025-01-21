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
                <div className="p-4 border-r">
                    <QRCodeDisplay />
                    <ChatList onSelectNumber={setSelectedNumber} selectedNumber={selectedNumber} />
                </div>
                <div className="w-[1200px] p-4 h-screen flex flex-col">
                    {selectedNumber && (
                        <div className="flex-1 overflow-y-scroll">
                            <ChatWindow number={selectedNumber} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;