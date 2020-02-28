import { createTransport, Transporter, TransportOptions } from 'nodemailer'
import { Options as MailMessage } from 'nodemailer/lib/mailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import SMTPPool from 'nodemailer/lib/smtp-pool'
import SendmailTransport from 'nodemailer/lib/sendmail-transport'
import SESTransport from 'nodemailer/lib/ses-transport'

export { MailMessage }

export interface SentInfo {
	error?: any
	messageId?: string
	envelope?: any
	accepted?: string[]
	rejected?: string[]
	pending?: string[]
}

export type MailerOptions = Partial<
	(SMTPTransport.Options | SMTPPool.Options | SendmailTransport.Options | SESTransport.Options | TransportOptions) & {
		from?: string
	}
>

export interface Mailer {
	send(message: MailMessage): Promise<SentInfo>
}

export class NodeMailer implements Mailer {
	constructor(private readonly from: string | undefined, private readonly transport: Transporter) {}

	public async send(message: MailMessage): Promise<SentInfo> {
		try {
			return await this.transport.sendMail({ ...message, from: message.from || this.from })
		} catch (e) {
			console.log('Failed to send an email: \n' + JSON.stringify(message))
			console.error(e)
			return { error: e }
		}
	}
}

export const createMailer = (options: MailerOptions): Mailer => {
	const { from, ...transportOptions } = options
	return new NodeMailer(from, createTransport(transportOptions as any))
}