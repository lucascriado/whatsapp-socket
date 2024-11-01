import React from 'react';
import WhatsAppForm from './components/WhatsAppForm';
import QRCodeDisplay from './components/QRCodeDisplay';

const App: React.FC = () => {
    return (
        <div>
            <h1>WhatsApp Interface</h1>
            <QRCodeDisplay />
            <WhatsAppForm />
        </div>
    );
};

export default App;