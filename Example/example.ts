import { Boom } from '@hapi/boom'
import makeWASocket, { delay, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '../src'
import P from 'pino'

const logger: P.Logger | undefined = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const startSock = async() => {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
    })

    sock.ev.process(
        async(events) => {
            if(events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect } = update
                if(connection === 'close') {
                    if((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        startSock()
                    } else {
                        console.log('Connection closed. You are logged out.')
                    }
                }
                console.log('connection update', update)
            }

            if(events['creds.update']) {
                await saveCreds()
            }
        }
    )

	sock.ev.on('messages.upsert', async (msg) => {
		if (msg.type === 'notify') {
			for (const message of msg.messages) {
				if (message.key.fromMe) {
					console.log(`You sent a message to ${message.key.remoteJid}:`, message.message?.conversation || message.message?.extendedTextMessage?.text)
				} else {
					console.log(`New message from ${message.key.remoteJid}:`, message.message?.conversation || message.message?.extendedTextMessage?.text)
				}
			}
		}
	})

    return sock
}

startSock()