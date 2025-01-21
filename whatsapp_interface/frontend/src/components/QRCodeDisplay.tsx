import React, { useEffect, useState } from 'react';
import { fetchQRCode } from '../services/api';

const QRCodeDisplay: React.FC = () => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    useEffect(() => {
        const getQRCode = async () => {
            try {
                const response = await fetchQRCode();
                setQrCodeUrl(response.data.qrCodeUrl);
            } catch (error) {
                console.error('Failed to fetch QR code', error);
            }
        };

        getQRCode();

        const ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.event === 'qrCodeCleared') {
                setQrCodeUrl(null);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">QR Code</h1>
            {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-[35rem]" /> : <p>Usuário Conectado!</p>}
        </div>
    );
};

export default QRCodeDisplay;