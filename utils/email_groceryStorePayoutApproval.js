const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendGroceyStorePayoutApprovalEmail(email) {
  // SMTP configuration
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_USER,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  // Email content
  const mailOptions = {
    from: process.env.AUTH_USER,
    to: email,
    subject: "Sprin - Payout Request Approved",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="text-align: center; padding-bottom: 20px;">
                <!-- Company Logo -->
                <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" alt="Sprin Logo" style="width: 120px; margin-bottom: 20px;" />
                <h1 style="color: #333;">Payout Request Approved</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 20px; color: #555;">
                <p>Dear Grocery Store Partner,</p>
                <p>We are pleased to inform you that your recent payout request has been successfully approved.</p>
                <p>The requested amount will be credited to your bank account within the next few hours.</p>
                <p>If you have any questions or concerns, please <a href="tel:+2348135289984" style="color: #007bff; text-decoration: none;">contact support at +2348135289984</a>.</p>
                <p>Thank you for partnering with Sprin!</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
                <p style="margin: 0;">Best regards,</p>
                <p style="margin: 0; font-weight: bold;">Sprin Finance Team</p>
                <p style="margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Sprin Technologies. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Payout approval email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = sendGroceyStorePayoutApprovalEmail;
