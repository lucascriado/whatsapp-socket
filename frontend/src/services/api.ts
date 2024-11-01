import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000',
});

export const connectUser = (userId: string) => api.post('/connect', { userId });
export const sendMessage = (userId: string, number: string, message: string) => 
    api.post('/sendMessage', { userId, number, message });
export const sendImage = (userId: string, number: string, imagePath: string, caption: string) => 
    api.post('/sendImage', { userId, number, imagePath, caption });
export const sendAudio = (userId: string, number: string, audioPath: string) => 
    api.post('/sendAudio', { userId, number, audioPath });
export const fetchQRCode = () => api.get('/generate-qrcode');

// console.log para debugar
console.log('API:', api);
console.log(fetchQRCode);