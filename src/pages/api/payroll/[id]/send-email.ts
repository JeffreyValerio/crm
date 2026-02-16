import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { sendMail } from '@/lib/mail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Solo admin puede enviar correos
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      // Verificar que la nómina existe
      const payroll = await prisma.payroll.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      });

      if (!payroll) {
        return res.status(404).json({ error: 'Nómina no encontrada' });
      }

      // Verificar que la nómina esté aprobada
      if (payroll.estado !== 'APROBADO') {
        return res.status(400).json({ 
          error: 'Solo se pueden enviar correos de nóminas aprobadas' 
        });
      }

      // Verificar que el usuario tenga email
      if (!payroll.user.email) {
        return res.status(400).json({ 
          error: 'El usuario no tiene un email registrado' 
        });
      }

      // Formatear el período para mostrar (ej: "Enero 2025")
      const [año, mes] = payroll.periodo.split('-');
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const nombreMes = meses[parseInt(mes) - 1];
      const periodoFormateado = `${nombreMes} ${año}`;

      // Formatear montos en colones
      const formatearColones = (monto: number) => {
        return new Intl.NumberFormat('es-CR', {
          style: 'currency',
          currency: 'CRC',
          minimumFractionDigits: 0,
        }).format(monto);
      };

      // Generar HTML del correo
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
              <h1 style="color: #2563eb; margin-top: 0;">Comprobante de Pago - Nómina</h1>
              
              <p>Estimado/a ${[payroll.user.nombre, payroll.user.apellidos].filter(Boolean).join(' ') || 'vendedor/a'},</p>
              
              <p>Le informamos que su comprobante de pago para la <strong>Quincena ${payroll.quincena}</strong> del período <strong>${periodoFormateado}</strong> ha sido aprobado.</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h2 style="color: #2563eb; margin-top: 0;">Detalles del Pago</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Nombre:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">${[payroll.user.nombre, payroll.user.apellidos].filter(Boolean).join(' ') || payroll.user.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Período:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">${periodoFormateado}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Quincena:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">${payroll.quincena}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Salario Quincenal:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right;">${formatearColones(Number(payroll.salarioBase))}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Total a Pagar:</strong></td>
                    <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #2563eb;">${formatearColones(Number(payroll.total))}</td>
                  </tr>
                </table>
              </div>
              
              <p>Su comprobante de pago está disponible en el sistema. Puede acceder a él desde su panel de nóminas.</p>
              
              <p style="color: #666; font-size: 14px;">
                <strong>Estado:</strong> ${payroll.estado === 'APROBADO' ? 'Aprobado' : payroll.estado}
                ${payroll.aprobadoAt ? `<br><strong>Fecha de Aprobación:</strong> ${new Date(payroll.aprobadoAt).toLocaleDateString('es-CR')}` : ''}
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #666; margin: 0;">
                Este es un correo automático del sistema CRM. Por favor no responda a este mensaje.
              </p>
            </div>
          </body>
        </html>
      `;

      // Enviar el correo
      try {
        await sendMail({
          to: payroll.user.email,
          subject: `Comprobante de Pago - Nómina ${periodoFormateado} - Quincena ${payroll.quincena}`,
          html: html,
          bcc: 'cvalerioa24@gmail.com',
        });

        return res.status(200).json({
          message: 'Correo enviado correctamente',
          sentTo: payroll.user.email,
        });
      } catch (emailError) {
        console.error('Error enviando email:', emailError);
        return res.status(500).json({ 
          error: 'Error al enviar el correo. Por favor intente nuevamente.' 
        });
      }
    } catch (error) {
      console.error('Error sending payroll email:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
