import nodemailer from 'nodemailer';

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  // Si no hay configuración SMTP, mostrar el enlace en consola para desarrollo
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('='.repeat(50));
    console.log('📧 EMAIL NO CONFIGURADO - Modo desarrollo');
    console.log('='.repeat(50));
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Content:', html);
    console.log('='.repeat(50));
    return { messageId: 'dev-mode' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'CRM'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error enviando email:', error);
    throw error;
  }
}

export async function sendInvitationEmail(email: string, inviteToken: string, invitedBy?: string) {
  const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/invite/${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h1 style="color: #2563eb; margin-top: 0;">Invitación al CRM</h1>
          
          <p>Hola,</p>
          
          <p>Has sido invitado a unirte a nuestra plataforma CRM.</p>
          
          ${invitedBy ? `<p><strong>Invitado por:</strong> ${invitedBy}</p>` : ''}
          
          <p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Activar mi cuenta
            </a>
          </div>
          
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="background-color: #e5e7eb; padding: 10px; border-radius: 3px; word-break: break-all;">
            ${inviteUrl}
          </p>
          
          <p><small style="color: #666;">Este enlace expirará en 7 días.</small></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; margin: 0;">
            Si no solicitaste esta invitación, puedes ignorar este correo.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendMail({
    to: email,
    subject: 'Invitación al CRM - Activa tu cuenta',
    html,
  });
}
