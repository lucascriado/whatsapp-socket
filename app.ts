import { Boom } from '@hapi/boom'
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'
import P from 'pino'
import connection from './db/connection'

const logger: P.Logger | undefined = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const startSock = async() => {
	const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
	const { version, isLatest } = await fetchLatestBaileysVersion()
	console.log(`usando a versão do whatsapp em v.${version.join('.')}, última versão: ${isLatest}`)

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
						console.log('conexão fechada, usuário deslogado')
					}
				}

				console.log('conexão atualizada', update)
			}

			if(events['creds.update']) {
				await saveCreds()
			}
		}
	)

	sock.ev.on('creds.update', saveCreds)

	sock.ev.on('messages.upsert', async(msg) => {
		const conn = await connection
		msg.messages.forEach(async message => {
			const participant = message.key.participant?.replace('@s.whatsapp.net', '') || message.key.remoteJid?.replace('@s.whatsapp.net', '') || 'desconhecido'
			const fromMe = message.key.fromMe ? 'você' : `nova mensagem de ${participant}`
			const text = message.message?.conversation || message.message?.extendedTextMessage?.text

			if(text) {
				console.log(`${fromMe}: ${text}`)

				await conn.execute(
					'INSERT INTO mensagens (participante, voce, texto) VALUES (?, ?, ?)',
					[participant, message.key.fromMe, text]
				)
			} else {
				console.log(`${fromMe}: [mensagem sem texto]`)
			}
		})
	})
	return sock
}

startSock()