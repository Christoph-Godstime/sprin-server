const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function sendNewOrderNotificationEmail(email, storeName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_USER,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.AUTH_USER,
    to: email,
    subject: "Sprin - New Order Received 🚀",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table align="center" width="600" style="background-color: #ffffff; padding: 20px; border-radius: 8px;">
            <tr>
              <td style="text-align: center;">
                <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" style="width: 120px;" />
                <h2>New Order Notification 🚀</h2>
              </td>
            </tr>
            <tr>
              <td>
                <p>Hi,</p>
                <p>You have received a new order for your store: <strong>${storeName}</strong></p>
                <p>Please check your dashboard to view and process the order.</p>
                <p>Thank you for using Sprin!</p>
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
    console.log("New order notification email sent successfully");
  } catch (error) {
    console.log("Failed to send new order notification email:", error);
  }
}

module.exports = sendNewOrderNotificationEmail;
