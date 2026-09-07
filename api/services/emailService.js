const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      transporter = {
        sendMail: async (options) => {
          console.log(`[Email Notification -> ${options.to}] Subject: ${options.subject}`);
          return { messageId: 'mock-' + Date.now() };
        },
      };
    }
  }
  return transporter;
}

async function sendTicketNotification({ to, subject, ticket, action, extraMessage }) {
  if (!to) return;
  const client = getTransporter();

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const trackUrl = `${appUrl}/track?ticket=${ticket.ticket_number}&code=${ticket.tracking_code || ''}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d5c3a; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">NDMU MIS Support</h2>
        <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">Management Information Systems Office</p>
      </div>
      <div style="padding: 24px; color: #374151;">
        <h3 style="margin-top: 0; color: #111827;">${subject}</h3>
        <p><strong>Ticket Number:</strong> <span style="color: #0d5c3a; font-weight: bold;">${ticket.ticket_number}</span></p>
        <p><strong>Subject:</strong> ${ticket.title}</p>
        <p><strong>Status:</strong> <span style="text-transform: capitalize;">${(ticket.status || '').replace('_', ' ')}</span></p>
        <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${ticket.priority || 'Medium'}</span></p>
        ${extraMessage ? `<div style="background: #f3f4f6; padding: 12px; border-left: 4px solid #0d5c3a; margin: 16px 0; border-radius: 4px;">${extraMessage}</div>` : ''}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${trackUrl}" style="background-color: #0d5c3a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Ticket Details</a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 12px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
        Notre Dame of Marbel University &bull; MIS Operations Support
      </div>
    </div>
  `;

  try {
    await client.sendMail({
      from: `"NDMU MIS Support" <${process.env.MIS_CONTACT_EMAIL || 'mis@ndmu.edu.ph'}>`,
      to,
      subject: `[${ticket.ticket_number}] ${subject}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error('[Email Notification Error]:', error.message);
  }
}

module.exports = { sendTicketNotification };
