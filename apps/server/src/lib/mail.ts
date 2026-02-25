import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

function requireSmtpConfig() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.REGISTER_SMTP_FROM) {
    throw new HttpError(500, "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, REGISTER_SMTP_FROM");
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.REGISTER_SMTP_FROM,
  };
}

function requireInquirySmtpConfig() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.INQUIRY_SMTP_FROM || !env.CONTACT_EMAIL) {
    throw new HttpError(500, "SMTP is not fully configured for inquiries. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, INQUIRY_SMTP_FROM, CONTACT_EMAIL");
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.INQUIRY_SMTP_FROM,
    to: env.CONTACT_EMAIL,
  };
}

export interface InquiryPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export async function sendInquiryMail(inquiry: InquiryPayload) {
  const smtp = requireInquirySmtpConfig();

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const receivedAt = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;width:140px;vertical-align:top;color:#6b7280;font-size:13px;font-weight:600;white-space:nowrap;border-bottom:1px solid #f3f4f6;">${label}</td>
      <td style="padding:10px 16px;vertical-align:top;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#041D9D;padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">ICP-FNET Engineering</p>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;">New Website Inquiry</p>
                </td>
                <td align="right">
                  <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;display:inline-block;">
                    <p style="margin:0;color:#4ADE80;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">&#9679; Incoming</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Subject banner -->
        <tr>
          <td style="background:#f8f9ff;border-bottom:3px solid #041D9D;padding:16px 36px;">
            <p style="margin:0;color:#041D9D;font-size:16px;font-weight:700;">${inquiry.subject}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">Received on ${receivedAt} (PHT)</p>
          </td>
        </tr>

        <!-- Sender details -->
        <tr>
          <td style="padding:24px 36px 8px;">
            <p style="margin:0 0 12px;color:#374151;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Sender Information</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;">
              ${row("Full Name", inquiry.name)}
              ${row("Company", inquiry.company || "<span style='color:#9ca3af;font-style:italic;'>Not provided</span>")}
              ${row("Email", `<a href="mailto:${inquiry.email}" style="color:#041D9D;text-decoration:none;">${inquiry.email}</a>`)}
              ${row("Phone", inquiry.phone || "<span style='color:#9ca3af;font-style:italic;'>Not provided</span>")}
            </table>
          </td>
        </tr>

        <!-- Message -->
        <tr>
          <td style="padding:16px 36px 32px;">
            <p style="margin:0 0 12px;color:#374151;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Message</p>
            <div style="background:#f8f9ff;border-left:4px solid #041D9D;border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${inquiry.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
          </td>
        </tr>

        <!-- Reply CTA -->
        <tr>
          <td style="padding:0 36px 32px;">
            <a href="mailto:${inquiry.email}?subject=Re: ${encodeURIComponent(inquiry.subject)}" style="display:inline-block;background:#041D9D;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">Reply to ${inquiry.name}</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9ff;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">This message was submitted via the contact form on the ICP-FNET Engineering website. Do not reply directly to this email — use the button above to reply to the sender.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `New Inquiry — ${inquiry.subject}`,
    `Received: ${receivedAt} (PHT)`,
    ``,
    `From:    ${inquiry.name}`,
    `Company: ${inquiry.company || "—"}`,
    `Email:   ${inquiry.email}`,
    `Phone:   ${inquiry.phone || "—"}`,
    ``,
    `Message:`,
    inquiry.message,
  ].join("\n");

  await transport.sendMail({
    from: smtp.from,
    to: smtp.to,
    replyTo: inquiry.email,
    subject: `[Inquiry] ${inquiry.subject} — ${inquiry.name}`,
    text,
    html,
  });
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const smtp = requireSmtpConfig();

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transport.sendMail({
    from: smtp.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
