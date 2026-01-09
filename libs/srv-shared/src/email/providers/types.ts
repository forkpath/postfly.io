export type EmailSender = (args: { to: string; subject: string; html?: string; text?: string }) => Promise<void>
