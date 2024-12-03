const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendPayoutApprovalEmail(email) {
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
    subject: "SprinFare - Payout Request Approved",
    text: `Dear Restaurant Partner,\n\n
    We are pleased to inform you that your recent payout request has been successfully approved. The requested amount will be credited to your bank account within the next few hours.\n\n
    If you have any questions or concerns, please feel free to reach out to our support team at any time.\n\n
    Thank you for partnering with SprinFare!\n\n
    Best regards,\n
    SprinFare Finance Team`,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Payout approval email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = sendPayoutApprovalEmail;
