import { Boom } from '@hapi/boom'
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import readline from 'readline'
import connection from './db/connection'

const logger: P.Logger | undefined = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const socks: { [key: string]: ReturnType<typeof makeWASocket> } = {}

const startSock = async (userId: string, retryCount = 0) => {
    const { state, saveCreds } = await useMultiFileAuthState(`baileys_auth_info_${userId}`)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Usando a versão do WhatsApp em v.${version.join('.')}, última versão: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
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
                const { connection, lastDisconnect } = update
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
                    if (shouldReconnect && retryCount < 5) {
                        console.log(`Tentando reconectar para o usuário ${userId}... Tentativa ${retryCount + 1}`)
                        setTimeout(() => startSock(userId, retryCount + 1), 5000)
                    } else {
                        console.log(`Conexão fechada para o usuário ${userId}, usuário deslogado ou limite de tentativas atingido`)
                    }
                }

                console.log(`Conexão atualizada para o usuário ${userId}`, update)
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
            if (text) {
                console.log(`${fromMe}: ${text}`)
    
                await conn.execute(
                    'INSERT INTO mensagens (participante, voce, texto, tipo, usuario_id) VALUES (?, ?, ?, ?, ?)',
                    [participant, message.key.fromMe, text, fromMe, userId]
                )
            }
        })
    })    
    return sock
}

startSock('user1')
startSock('user2')

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

rl.on('line', async (input) => {
    const [userId, number, ...messageParts] = input.split(' ')
    const message = messageParts.join(' ')
    if (userId && number && message) {
        await sendMessage(userId, number, message)
    } else {
        console.log('Formato inválido. Use: <usuário> <número> <mensagem>')
    }
})
