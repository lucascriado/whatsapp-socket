import React, { useState } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import QRCodeDisplay from './components/QRCodeDisplay';
import './App.css';

const App: React.FC = () => {
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

    return (
        <div className="app">
            <QRCodeDisplay />
            <ChatList onSelectNumber={setSelectedNumber} />
            {selectedNumber && <ChatWindow number={selectedNumber} />}
        </div>
    );
};

export default App;