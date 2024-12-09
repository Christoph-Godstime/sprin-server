// restaurantVerification.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function restaurantVerification(userEmail, subject, htmlContent) {
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
    subject: subject,
    html: htmlContent,
  };

  // Sending email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Restaurant verification email sent successfully");
  } catch (error) {
    console.log("Email send failed with error:", error);
  }
}

module.exports = restaurantVerification;
