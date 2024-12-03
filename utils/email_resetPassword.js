const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendResetPasswordEmail(email, otp) {
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
    subject: "SprinFare Password Reset OTP",
    text: `You are receiving this email because you (or someone else) have requested the reset of a password.\n\n
    Please use the following OTP to complete the process:\n\n
    OTP: ${otp}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = sendResetPasswordEmail;
