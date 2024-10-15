import { Boom } from '@hapi/boom'
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys'
import P from 'pino'
import readline from 'readline'
import connection from './db/connection'
import fs from 'fs'
import path from 'path'

const logger: P.Logger | undefined = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const socks: { [key: string]: ReturnType<typeof makeWASocket> } = {}

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
                }
    
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                    if (shouldReconnect && retryCount < 5) {
                        console.log(`Tentando reconectar para o usuário ${userId}... Tentativa ${retryCount + 1}`)
                        setTimeout(() => startSock(userId, retryCount + 1), 5000)
                    } else {
                        console.log(`Conexão fechada para o usuário ${userId}, usuário deslogado ou limite de tentativas atingido`)
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
        const conn = await connection
        msg.messages.forEach(async message => {
            const participant = message.key.participant?.replace('@s.whatsapp.net', '') || message.key.remoteJid?.replace('@s.whatsapp.net', '') || 'desconhecido'
            const fromMe = message.key.fromMe ? 'enviada' : 'recebida'
        
            const text = message.message?.conversation || message.message?.extendedTextMessage?.text
        
            const audio = message.message?.audioMessage
        
            const image = message.message?.imageMessage
        
            if (text) {
                console.log(`${fromMe}: ${text}`)
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, texto, tipo, usuario_id) VALUES (?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, text, fromMe, userId]
                )
            }
        
            if (audio) {
                const audioBuffer = await downloadMediaMessage(message, 'buffer', {  })
                console.log(`${fromMe}: Áudio recebido`)
    
                const audioDir = path.join(__dirname, 'path', 'audios')
                const audioPath = path.join(audioDir, message.key.id + '.ogg')
    
                if (!fs.existsSync(audioDir)) {
                    fs.mkdirSync(audioDir, { recursive: true })
                }
                await fs.promises.writeFile(audioPath, audioBuffer)
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, tipo, usuario_id, midia_url) VALUES (?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, 'audio', userId, audioPath]
                )
            }
        
            if (image) {
                const imageBuffer = await downloadMediaMessage(message, 'buffer', {  })
                console.log(`${fromMe}: Imagem recebida`)
                
                const imageDir = path.join(__dirname, 'path', 'images')
                const imagePath = path.join(imageDir, message.key.id + '.jpg')
    
                if (!fs.existsSync(imageDir)) {
                    fs.mkdirSync(imageDir, { recursive: true })
                }
                await fs.promises.writeFile(imagePath, imageBuffer)
    
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, tipo, usuario_id, midia_url) VALUES (?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, 'imagem', userId, imagePath]
                )
            }
        })
    })     
    return sock
}

startSock('user1')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const sendMessage = async (userId: string, number: string, message: string) => {
    const sock = socks[userId]
    if (sock) {
        const formattedNumber = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`
        await sock.sendMessage(formattedNumber, { text: message })
        console.log(`Mensagem enviada de ${userId} para ${number}: ${message}`)
    } else {
        console.log(`Conexão não encontrada para o usuário ${userId}`)
    }
}

const sendImage = async (userId: string, number: string, imagePath: string, caption: string) => {
    const sock = socks[userId]
    if (sock) {
        const formattedNumber = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`
        const imageBuffer = fs.readFileSync(imagePath)
        await sock.sendMessage(formattedNumber, { image: imageBuffer, caption: caption })
        console.log(`Imagem enviada de ${userId} para ${number}: ${caption}`)
    } else {
        console.log(`Conexão não encontrada para o usuário ${userId}`)
    }
}

const sendAudio = async (userId: string, number: string, audioPath: string) => {
    try {
        const sock = socks[userId]
        if (sock) {
            const formattedNumber = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`
            const audioBuffer = fs.readFileSync(audioPath)
            await sock.sendMessage(formattedNumber, { 
                audio: { url: audioPath }, 
                mimetype: 'audio/ogg' 
            })
            console.log(`Áudio enviado de ${userId} para ${number}`)
        } else {
            console.log(`Conexão não encontrada para o usuário ${userId}`)
        }
    } catch (error) {
        console.error('Erro ao enviar áudio:', error)
    }
}


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