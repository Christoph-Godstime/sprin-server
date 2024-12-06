const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendBankDetailsEmail(email, otp) {
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
    subject: "Sprin - Bank Details Verification OTP",
    text: `Dear User,\n\n
    To ensure the security of your account, we require verification before updating your bank details.\n\n
    Please use the following One-Time Password (OTP) to confirm your request:\n\n
    OTP: ${otp}\n\n
    If you did not initiate this request, please disregard this email.\n\n
    Thank you for using Sprin!\n
    Best regards,\n
    Sprin Support Team`,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Bankd details OTP email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = sendBankDetailsEmail;
