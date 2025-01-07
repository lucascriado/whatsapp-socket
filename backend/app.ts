import { Boom } from '@hapi/boom'
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
import readline from 'readline'
import connection from './db/connection'
import fs from 'fs'
import path from 'path'
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { Server } from 'ws';

const logger: P.Logger | undefined = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const socks: { [key: string]: ReturnType<typeof makeWASocket> } = {}
let qrCode: string | null = null;

const wss = new Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Cliente conectado ao WebSocket');
});

const notifyConnectionStatus = (userId: string, status: string) => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ userId, status }));
        }
    });
};

const notifyQRCodeCleared = () => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ event: 'qrCodeCleared' }));
        }
    });
};

const startSock = async (userId: string, retryCount = 0) => {
    const authDir = `baileys_auth_info_${userId}`
    const authExists = fs.existsSync(authDir)

    if (authExists) {
        console.log(`Usuário ${userId} já está conectado.`)
    } else {
        console.log('Conectando no WhatsApp... por favor leia o QR code abaixo.')
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    const { version, isLatest } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !authExists,
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
    })

    socks[userId] = sock

    sock.ev.process(
        async (events) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, qr, lastDisconnect } = update
    
                if (connection === 'connecting' && !authExists) {
                    console.log('Conectando no WhatsApp... por favor leia o QR code abaixo.')
                }
    
                if (qr) {
                    console.log(`QR Code: ${qr}`)
                    qrCode = qr;
                }

                if (connection === 'open') {
                    console.log(`Conexão estabelecida para o usuário ${userId}`);
                    qrCode = null;
                    notifyQRCodeCleared();
                    notifyConnectionStatus(userId, 'connected');
                }
    
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                    if (shouldReconnect && retryCount < 5) {
                        console.log(`Tentando reconectar para o usuário ${userId}... Tentativa ${retryCount + 1}`)
                        setTimeout(() => startSock(userId, retryCount + 1), 5000)
                    } else {
                        console.log(`Conexão fechada para o usuário ${userId}, usuário deslogado ou limite de tentativas atingido`)
                        notifyConnectionStatus(userId, 'disconnected');
                    }
                }
            }
    
            if (events['creds.update']) {
                await saveCreds()
            }
        }
    )

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (msg) => {
        const conn = await connection;
        msg.messages.forEach(async message => {
            const participant = message.key.participant?.replace('@s.whatsapp.net', '') || message.key.remoteJid?.replace('@s.whatsapp.net', '') || 'desconhecido';
            const fromMe = message.key.fromMe ? 'enviada' : 'recebida';
            const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
            const audio = message.message?.audioMessage;
            const image = message.message?.imageMessage;
            const grupoId = message.key.remoteJid?.includes('@g.us') ? message.key.remoteJid : null;
    
            if (text) {
                console.log(`${fromMe}: ${text}`);
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, texto, tipo, usuario_id, grupo_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, text, fromMe, userId, grupoId]
                );
            }
    
            if (audio) {
                const audioBuffer = await downloadMediaMessage(message, 'buffer', {});
                console.log(`${fromMe}: Áudio recebido`);
    
                const audioDir = path.join(__dirname, 'path', 'audios');
                const audioPath = path.join(audioDir, message.key.id + '.ogg');
    
                if (!fs.existsSync(audioDir)) {
                    fs.mkdirSync(audioDir, { recursive: true });
                }
                await fs.promises.writeFile(audioPath, audioBuffer);
    
                const relativeAudioPath = `audios/${message.key.id}.ogg`;
    
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, tipo, usuario_id, midia_url, grupo_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, 'audio', userId, relativeAudioPath, grupoId]
                );
            }
    
            if (image) {
                const imageBuffer = await downloadMediaMessage(message, 'buffer', {});
                console.log(`${fromMe}: Imagem recebida`);
    
                const imageDir = path.join(__dirname, 'path', 'images');
                const tempImagePath = path.join(imageDir, message.key.id + '.jpg');
    
                if (!fs.existsSync(imageDir)) {
                    fs.mkdirSync(imageDir, { recursive: true });
                }
                await fs.promises.writeFile(tempImagePath, imageBuffer);
    
                const extension = '.jpg';
                const newPath = await saveImageWithHash(tempImagePath, userId, conn, extension);
    
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, tipo, usuario_id, midia_url, grupo_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, 'imagem', userId, newPath, grupoId]
                );
    
                fs.unlinkSync(tempImagePath);
            }
    
            wss.clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(JSON.stringify({ event: 'newMessage', message }));
                }
            });
        });
    });
    return sock;
}

startSock('3f68955c-99e8-4adb-9368-c3cbdd4fa54c')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const calculateSHA1 = (filePath: string): string => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha1');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
};

const saveImageWithHash = async (imagePath: string, userId: string, conn: any, extension: string): Promise<string> => {
    const imageHash = calculateSHA1(imagePath);

    const [existingImages] = await conn.query(
        'SELECT midia_url FROM imagens WHERE hash = ? AND usuario_id = ?',
        [imageHash, userId]
    );

    if (existingImages.length > 0) {
        const existingImage = existingImages[0];
        console.log('Imagem já existe, reutilizando caminho:', existingImage.midia_url);
        return existingImage.midia_url;
    }

    const imageDir = path.join(__dirname, 'path', 'images');
    const newPath = path.join(imageDir, `${imageHash}${extension}`);
    const relativePath = `images/${imageHash}${extension}`;

    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

        fs.copyFileSync(imagePath, newPath);
        console.log('Nova imagem salva em:', newPath);

        await conn.execute(
            'INSERT INTO imagens (usuario_id, hash, midia_url) VALUES (?, ?, ?)',
        [userId, imageHash, relativePath]
    );

    return relativePath;
};

const saveAudioWithHash = async (audioPath: string, userId: string, conn: any, extension: string): Promise<string> => {
    const audioHash = calculateSHA1(audioPath);

    const [existingAudios] = await conn.query(
        'SELECT midia_url FROM audios WHERE hash = ? AND usuario_id = ?',
        [audioHash, userId]
    );

    if (existingAudios.length > 0) {
        const existingAudio = existingAudios[0];
        console.log('Áudio já existe, reutilizando caminho:', existingAudio.midia_url);
        return existingAudio.midia_url;
    }

    const audioDir = path.join(__dirname, 'path', 'audios');
    const newPath = path.join(audioDir, `${audioHash}${extension}`);
    const relativePath = `audios/${audioHash}${extension}`;

    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
    }

    fs.copyFileSync(audioPath, newPath);
    console.log('Novo áudio salvo em:', newPath);

    await conn.execute(
        'INSERT INTO audios (usuario_id, hash, midia_url) VALUES (?, ?, ?)',
        [userId, audioHash, relativePath]
    );

    return relativePath;
};

const sendImage = async (userId: string, number: string, imagePath: string, caption: string) => {
    await ensureConnection(userId);
    const sock = socks[userId];
    if (sock) {
        const formattedNumber = number.includes('@g.us') ? number : `${number}@s.whatsapp.net`;
        const conn = await connection;
        const extension = path.extname(imagePath) || '.jpg';
        const newPath = await saveImageWithHash(imagePath, userId, conn, extension);
        const absolutePath = path.join(__dirname, 'path', newPath);

        const imageBuffer = fs.readFileSync(absolutePath);
        try {
            await sock.sendMessage(formattedNumber, { image: imageBuffer, caption: caption });
            console.log(`Imagem enviada de ${userId} para ${number}`);
        } catch (error) {
            console.error(`Erro ao enviar imagem de ${userId} para ${number}:`, error);
        }
    } else {
        console.log(`Conexão não encontrada para o usuário ${userId}`);
        throw new Error(`Conexão não encontrada para o usuário ${userId}`);
    }
};


const ensureConnection = async (userId: string) => {
    const sock = socks[userId];
    if (!sock) {
        await startSock(userId);
    }
};

const sendMessage = async (userId: string, number: string, message: string) => {
    await ensureConnection(userId);
    const sock = socks[userId];
    if (sock) {
        const formattedNumber = number.includes('@g.us') ? number : `${number}@s.whatsapp.net`;
        try {
            await sock.sendMessage(formattedNumber, { text: message });
            console.log(`Mensagem enviada de ${userId} para ${number}: ${message}`);
        } catch (error) {
            console.error(`Erro ao enviar mensagem de ${userId} para ${number}:`, error);
        }
    } else {
        console.log(`Conexão não encontrada para o usuário ${userId}`);
    }
};

const sendAudio = async (userId: string, number: string, audioPath: string) => {
    await ensureConnection(userId);
    const sock = socks[userId];
    if (sock) {
        const formattedNumber = number.includes('@g.us') ? number : `${number}@s.whatsapp.net`;
        const conn = await connection;
        const extension = path.extname(audioPath) || '.ogg';
        const newPath = await saveAudioWithHash(audioPath, userId, conn, extension);
        const relativePath = `audios/${path.basename(newPath)}`;

        const audioBuffer = fs.readFileSync(path.join(__dirname, 'path', relativePath));
        try {
            await sock.sendMessage(formattedNumber, { 
                audio: audioBuffer, 
                mimetype: 'audio/mp4' 
            });
            console.log(`Áudio enviado de ${userId} para ${number}`);
        } catch (error) {
            console.error(`Erro ao enviar áudio de ${userId} para ${number}:`, error);
        }
    } else {
        console.log(`Conexão não encontrada para o usuário ${userId}`);
    }
};

rl.on('line', async (input) => {
    const [userId, number, ...messageParts] = input.split(' ')
    const message = messageParts.join(' ')
    if (userId && number && message) {
        if (message.startsWith('img:')) {
            const match = message.match(/^img:(\S+)\s+(.+)$/)
            if (match) {
                const imagePath = match[1]
                const caption = match[2]
                await sendImage(userId, number, imagePath, caption)
            } else {
                console.log('Formato inválido para envio de imagem. Use: <usuário> <número> img:<caminho_da_imagem> <legenda>')
            }
        } else if (message.startsWith('audio:')) {
            const match = message.match(/^audio:(\S+)$/)
            if (match) {
                const audioPath = match[1]
                await sendAudio(userId, number, audioPath)
            } else {
                console.log('Formato inválido para envio de áudio. Use: <usuário> <número> audio:<caminho_do_audio>')
            }
        } else {
            await sendMessage(userId, number, message)
        }
    } else {
        console.log('Formato inválido. Use: <usuário> <número> <mensagem> ou <usuário> <número> img:<caminho_da_imagem> <legenda> ou <usuário> <número> audio:<caminho_do_audio>')
    }
})

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.use('/images', express.static(path.join(__dirname, 'path', 'images')));
app.use('/audios', express.static(path.join(__dirname, 'path', 'audios')));

app.post('/connect', async (req, res) => {
    const { userId } = req.body;
    try {
        await startSock(userId);
        res.status(200).send(`Conectado com sucesso para o usuário ${userId}`);
    } catch (error) {
        res.status(500).send(`Erro ao conectar para o usuário ${userId}`);
    }
});

app.post('/sendMessage', async (req, res) => {
    const { userId, number, message } = req.body;
    try {
        await sendMessage(userId, number, message);
        res.status(200).send('Mensagem enviada com sucesso');
    } catch (error) {
        res.status(500).send('Erro ao enviar mensagem');
    }
});

app.post('/sendImage', upload.single('image'), async (req, res) => {
    console.log('Arquivo recebido:', req.file?.filename);
    console.log('Dados recebidos:', req.body);
    const { userId, number, caption } = req.body;
    const imagePath = req.file?.path;
    try {
        if (imagePath) {
            await sendImage(userId, number, imagePath, caption);
            res.status(200).json({
                success: true,
                message: 'Imagem enviada com sucesso'
            });
        } else {
            res.status(400).send('Imagem não encontrada');
        }
    } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        res.status(500).send('Erro ao enviar imagem');
    }
});

app.post('/sendAudio', upload.single('audio'), async (req, res) => {
    const { userId, number } = req.body;
    const audioPath = req.file?.path;
    try {
        if (audioPath) {
            await sendAudio(userId, number, audioPath);
            res.status(200).send('Áudio enviado com sucesso');
        } else {
            res.status(400).send('Áudio não encontrado');
        }
    } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        res.status(500).send('Erro ao enviar áudio');
    }
});

app.get('/numbers', async (req, res) => {
    const conn = await connection;
    try {
        const [rows]: any[] = await conn.query(
            'SELECT DISTINCT participante, grupo_id FROM mensagens'
        );
        const numbers = rows.map((row: any) => ({
            participante: row.participante,
            grupo_id: row.grupo_id
        }));
        res.json(numbers);
    } catch (error) {
        console.error('Erro ao buscar números:', error);
        res.status(500).send('Erro ao buscar números');
    }
});

app.get('/generate-qrcode', async (req, res) => {
    try {
        if (qrCode) {
            const qrCodeUrl = await QRCode.toDataURL(qrCode);
            res.json({ qrCodeUrl });
        } else {
            res.status(404).json({ error: 'QR code não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Falha ao gerar QR code' });
    }
});

app.get('/messages/:number', async (req, res) => {
    const { number } = req.params;
    console.log(number, "number")
    const conn = await connection;

    if (number.length <= 13 ) {
        const [messages] = await conn.query(
            'SELECT * FROM mensagens WHERE (participante = ? OR participante = ?) AND grupo_id IS NULL ORDER BY data ASC',
            [number, `${number}@s.whatsapp.net`]
        );
        res.json(messages);
    } else {
        const [messages] = await conn.query(
            'SELECT * FROM mensagens WHERE (participante = ? OR participante = ? OR grupo_id = ?) ORDER BY data ASC',
            [number, `${number}@s.whatsapp.net`, number]
        );
        res.json(messages);
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});