const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Import User model
const User = require("./models/User");

// Connect to MongoDB
const sendFeedbackEmails = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected...");

    // Fetch verified Clients
    const users = await User.find({ userType: "Client", verified: true });

    if (users.length === 0) {
      console.log("No verified Clients found.");
      return;
    }

    // Configure mail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.AUTH_USER,
        pass: process.env.AUTH_PASSWORD,
      },
    });

    // WhatsApp message link
    const whatsappLink = "https://wa.me/2348135289984"; // <-- Replace with your WhatsApp number

    for (const user of users) {
      const mailOptions = {
        from: `"Sprin Support" <${process.env.AUTH_USER}>`,
        to: user.email,
        subject: "We'd love your feedback – Sprin Monthly Check-in",
        html: `<html>
  <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <tr>
        <td style="text-align: center;">
          <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" alt="Sprin Logo" style="width: 100px;">
          <h2 style="color: #333;">Hello ${user.firstName},</h2>
          <p style="color: #555;">At the start of each month, we check in with our users to hear from you.</p>
          <p style="color: #555;">Do you have any suggestions, feedback, or new features you'd love to see on Sprin?</p>
          <p style="color: #555;">You can simply reply to this email or click the button below to message us on WhatsApp.</p>
          <a href="${whatsappLink}" style="display: inline-block; padding: 10px 20px; background-color: #25D366; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Send Feedback on WhatsApp</a>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 30px; text-align: center; font-size: 12px; color: #aaa;">
          <p>&copy; ${new Date().getFullYear()} Sprin Technologies. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${user.email}`);
      } catch (err) {
        console.log(`Failed to send email to ${user.email}`, err);
      }
    }

    console.log("All emails processed.");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    mongoose.connection.close();
  }
};

sendFeedbackEmails();
