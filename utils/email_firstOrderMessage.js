const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendFirstOrderThankYouEmail(userEmail, userName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_USER,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.AUTH_USER,
    to: userEmail,
    subject: "Thank You for Your First Order with Us!",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="text-align: center; padding-bottom: 20px;">
                <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" alt="Logo" style="width: 120px; margin-bottom: 20px;" />
                <h1 style="color: #333;">Thank You, ${userName}!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 20px; color: #555;">
               <p>We appreciate you for trusting our food and grocery delivery app with your first order here!</p>
                <p>As a token of our gratitude, your next delivery fee is on us!</p>
              <p>We’d love to hear your feedback! On the app, you can drop your reviews and rate:</p>
                <ul>
                <li>The food</li>
                <li>The rider</li>
                <li>The store</li>
                </ul>
                <p>If you have feedback about our app, please visit the Customer Support section in the app to share your thoughts. Your feedback is invaluable in helping us improve and ensure a great experience for you and others.</p>
                <p>Thank you for letting us be a part of your dining experience!</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
                <p style="margin: 0;">Best regards,</p>
                <p style="margin: 0; font-weight: bold;">The Delivery Team</p>
              </td>
            </tr>
             <tr>
              <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
                <p style="margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Sprin Technologies. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("First order thank-you email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

module.exports = sendFirstOrderThankYouEmail;
