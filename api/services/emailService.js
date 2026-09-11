const nodemailer = require("nodemailer");

let transporter;

function notificationsEnabled() {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
}

function getEmailConfiguration() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "");

  return {
    enabled: notificationsEnabled(),
    configured: Boolean(host),
    host,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    from:
      process.env.SMTP_FROM ||
      user ||
      process.env.MIS_CONTACT_EMAIL ||
      "mis@ndmu.edu.ph",
    auth: user && pass ? { user, pass } : undefined,
  };
}

function getTransporter() {
  const configuration = getEmailConfiguration();
  if (!configuration.enabled || !configuration.configured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      auth: configuration.auth,
      requireTLS: process.env.SMTP_REQUIRE_TLS === "true",
      tls:
        process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ticketUrl(ticket) {
  const baseUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  if (ticket.guest_token)
    return `${baseUrl}/guest/ticket/${encodeURIComponent(ticket.guest_token)}`;
  if (ticket.tracking_code)
    return `${baseUrl}/track?ticket=${encodeURIComponent(ticket.ticket_number)}&code=${encodeURIComponent(ticket.tracking_code)}`;
  return `${baseUrl}/tickets/${encodeURIComponent(ticket.ticket_number)}`;
}

async function verifyEmailTransport() {
  const configuration = getEmailConfiguration();
  if (!configuration.enabled) {
    console.log("[Email] Ticket notifications are disabled.");
    return { available: false, reason: "disabled" };
  }
  if (!configuration.configured) {
    console.warn(
      "[Email] Ticket notifications are enabled but SMTP_HOST is not configured.",
    );
    return { available: false, reason: "unconfigured" };
  }
  try {
    await getTransporter().verify();
    console.log("[Email] SMTP connection verified for ticket notifications.");
    return { available: true };
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error.message);
    return { available: false, reason: "verification_failed" };
  }
}

async function sendTicketNotification({ to, subject, ticket, extraMessage }) {
  if (!to || !ticket?.ticket_number) return { sent: false, reason: "invalid" };

  const client = getTransporter();
  if (!client) {
    const reason = notificationsEnabled() ? "unconfigured" : "disabled";
    console.warn(
      `[Email] Ticket notification for ${ticket.ticket_number} was not sent (${reason}).`,
    );
    return { sent: false, reason };
  }

  const cleanSubject = String(subject || "").replace(/[\r\n]+/g, " ");
  const safeSubject = escapeHtml(cleanSubject);
  const safeMessage = escapeHtml(extraMessage).replace(/\n/g, "<br>");
  const safeStatus = escapeHtml(String(ticket.status || "").replace("_", " "));
  const safePriority = escapeHtml(ticket.priority || "Medium");
  const url = ticketUrl(ticket);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#1e293b">
      <div style="background:#004d35;color:#fff;padding:24px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.6px">ICT-MIS SERVICE DESK</p>
        <h1 style="margin:0;font-size:22px">Ticket update</h1>
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 18px;font-size:18px;color:#0f172a">${safeSubject}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:7px 0;color:#64748b;width:120px">Ticket</td><td style="padding:7px 0;font-weight:700;color:#006747">${escapeHtml(ticket.ticket_number)}</td></tr>
          <tr><td style="padding:7px 0;color:#64748b">Subject</td><td style="padding:7px 0;font-weight:600">${escapeHtml(ticket.title)}</td></tr>
          <tr><td style="padding:7px 0;color:#64748b">Status</td><td style="padding:7px 0;text-transform:capitalize">${safeStatus}</td></tr>
          <tr><td style="padding:7px 0;color:#64748b">Priority</td><td style="padding:7px 0;text-transform:capitalize">${safePriority}</td></tr>
        </table>
        ${safeMessage ? `<div style="margin:20px 0;padding:14px;border-left:4px solid #007a55;background:#f0fdf4;line-height:1.6">${safeMessage}</div>` : ""}
        <p style="margin:24px 0 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#006747;color:#fff;padding:11px 18px;border-radius:7px;text-decoration:none;font-weight:700">View ticket</a></p>
      </div>
      <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">Notre Dame of Marbel University · ICT-MIS Service Desk</div>
    </div>`;

  try {
    const info = await client.sendMail({
      from: `"NDMU ICT-MIS Service Desk" <${getEmailConfiguration().from}>`,
      to,
      subject: `[${ticket.ticket_number}] ${cleanSubject}`,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `[Email] Ticket notification for ${ticket.ticket_number} failed:`,
      error.message,
    );
    return { sent: false, reason: "send_failed" };
  }
}

module.exports = {
  getEmailConfiguration,
  sendTicketNotification,
  verifyEmailTransport,
};
