const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendVerificationEmail(userEmail, verificationCode) {
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
    to: userEmail,
    subject: "Sprin Verification Code",
    html: `<html>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" alt="Sprin Logo" style="width: 120px; margin-bottom: 20px;">
          <h1 style="color: #333;">Sprin Email Verification</h1>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom: 20px; color: #555;">
          <p>Thank you for signing up with Sprin!</p>
          <p>Your verification code is:</p>
          <h2 style="color: #007bff; background-color: #f0f0f0; padding: 10px; border-radius: 4px; display: inline-block;">${verificationCode}</h2>
          <p>This verification code is valid for 10 minutes. Please use it to complete your registration within this time frame.</p>
          <p>If you did not request this, please ignore this email.</p>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
          <p style="margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Sprin Technologies. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = sendVerificationEmail;
