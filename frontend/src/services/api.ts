import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
});

export const connectUser = (userId: string) => api.post('/connect', { userId });
export const sendMessage = (userId: string, number: string, message: string) => 
    api.post('/sendMessage', { userId, number, message });
export const sendImage = (formData: FormData) => 
    api.post('/sendImage', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
export const sendAudio = (formData: FormData) => 
    api.post('/sendAudio', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
export const fetchQRCode = () => api.get('/generate-qrcode');

console.log('API:', api);
console.log(fetchQRCode);