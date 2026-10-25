
/**
 * TradeMind Email Service
 * Sends OTP emails using the Brevo HTTPS API.
 */

function getTransporter() {
  // Kept for compatibility with any existing imports.
  // Brevo HTTPS API does not require a Nodemailer transporter.
  return null;
}

/**
 * Send a 6-digit OTP email.
 * OTP validity is handled by your existing registration/verification logic.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit verification code
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
async function sendOtpEmail(toEmail, otp) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const sender = (process.env.EMAIL_USER || '').trim();

    if (!apiKey || !sender) {
      const error =
        'BREVO_API_KEY or EMAIL_USER is missing in backend environment variables.';

      console.warn(`[EmailService WARNING] ${error}`);

      return {
        success: false,
        error,
        unconfigured: true,
      };
    }

    if (!toEmail || !otp) {
      return {
        success: false,
        error: 'Recipient email or OTP is missing.',
      };
    }

    const mailOptions = {
      subject: `Your TradeMind Verification Code: ${otp} (Valid for 5 Minutes)`,

      text: `Your TradeMind verification code is: ${otp}

This code is valid for exactly 5 minutes.
Do not share this code with anyone.

TradeMind — Master Your Trades. Master Your Mind.`,

      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TradeMind Verification Code</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #030712;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                Roboto, Helvetica, Arial, sans-serif;
              color: #f8fafc;
            }
            .container {
              max-width: 500px;
              margin: 30px auto;
              background: #0f172a;
              border-radius: 18px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              overflow: hidden;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
            }
            .header {
              padding: 32px 24px 20px;
              text-align: center;
              background: linear-gradient(
                180deg,
                rgba(16, 185, 129, 0.12) 0%,
                transparent 100%
              );
              border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .logo {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #ffffff;
            }
            .logo span {
              color: #10b981;
            }
            .tagline {
              font-size: 13px;
              color: #94a3b8;
              margin-top: 4px;
              font-weight: 500;
            }
            .content {
              padding: 28px 32px;
              text-align: center;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 8px;
            }
            .desc {
              font-size: 14px;
              color: #94a3b8;
              line-height: 1.5;
              margin-bottom: 24px;
            }
            .otp-box {
              background: rgba(16, 185, 129, 0.08);
              border: 2px dashed #10b981;
              border-radius: 14px;
              padding: 20px;
              margin: 20px 0;
            }
            .otp-code {
              font-family: 'Courier New', Courier, monospace;
              font-size: 38px;
              font-weight: 800;
              letter-spacing: 12px;
              color: #10b981;
              text-align: center;
            }
            .timer-badge {
              display: inline-block;
              background: rgba(244, 63, 94, 0.12);
              color: #f43f5e;
              border: 1px solid rgba(244, 63, 94, 0.3);
              font-size: 12px;
              font-weight: 600;
              padding: 6px 14px;
              border-radius: 20px;
              margin-top: 8px;
            }
            .notice {
              font-size: 12px;
              color: #64748b;
              margin-top: 24px;
              line-height: 1.5;
            }
            .footer {
              padding: 18px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              background: rgba(0, 0, 0, 0.2);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Trade<span>Mind</span></div>
              <div class="tagline">
                Master Your Trades. Master Your Mind.
              </div>
            </div>

            <div class="content">
              <div class="title">Confirm Your Registration</div>

              <div class="desc">
                Enter this 6-digit verification code in TradeMind to verify
                your email and unlock your trading journal.
              </div>

              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>

              <div class="timer-badge">
                ⏳ Valid for strictly 5 minutes
              </div>

              <div class="notice">
                If you did not attempt to register on TradeMind, you can
                safely ignore this email. Never disclose this code to anyone.
              </div>
            </div>

            <div class="footer">
              © 2026 TradeMind. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'TradeMind Security',
            email: sender,
          },
          to: [{ email: toEmail }],
          subject: mailOptions.subject,
          textContent: mailOptions.text,
          htmlContent: mailOptions.html,
        }),
      }
    );

    const responseText = await response.text();
    let result = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { message: responseText };
    }

    if (!response.ok) {
      throw new Error(
        `Brevo API error (${response.status}): ${JSON.stringify(result)}`
      );
    }

    console.log(
      `[EmailService] OTP email accepted by Brevo for ${toEmail}`
    );

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err) {
    console.error(
      `[EmailService ERROR] Failed to send OTP email to ${toEmail}:`,
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  sendOtpEmail,
  getTransporter,
};
