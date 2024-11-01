import React, { useEffect, useState } from 'react';
import { fetchQRCode } from '../services/api'; // Ajuste o caminho conforme necessário

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
    }, []);

    return (
        <div>
            <h1>QR Code</h1>
            {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" /> : <p>Loading...</p>}
        </div>
    );
};

export default QRCodeDisplay;