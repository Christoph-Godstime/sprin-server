const nodemailer = require("nodemailer");

async function sendPaymentIssueEmail(
  userEmail,
  userName,
  orderId,
  issueType,
  expectedAmount,
  paidAmount,
  paymentLink
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_USER,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  const subject =
    issueType === "underpay"
      ? "Payment Issue: Underpayment Detected"
      : "Payment Issue: Overpayment Detected";

  const message =
    issueType === "underpay"
      ? `<p>We noticed that you underpaid for your order <strong>#${orderId}</strong>.</p>
         <p>Expected Amount: <strong>₦${expectedAmount.toFixed(2)}</strong></p>
         <p>Amount Paid: <strong>₦${paidAmount.toFixed(2)}</strong></p>
         <p>Please complete the remaining payment to process your order.</p>
         <p><a href="${paymentLink}" target="_blank" style="padding: 10px 15px; background: #f97316; color: #fff; text-decoration: none; border-radius: 5px;">Complete Payment</a></p>`
      : `<p>We noticed that you overpaid for your order <strong>#${orderId}</strong>.</p>
         <p>Expected Amount: <strong>₦${expectedAmount.toFixed(2)}</strong></p>
         <p>Amount Paid: <strong>₦${paidAmount.toFixed(2)}</strong></p>
         <p>The excess amount has been added to your wallet balance.</p>`;

  const mailOptions = {
    from: process.env.AUTH_USER,
    to: userEmail,
    subject,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table align="center" width="600" cellpadding="0" cellspacing="0" 
            style="background-color: #ffffff; padding: 20px; border-radius: 8px; 
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="text-align: center; padding-bottom: 20px;">
                <img src="https://firebasestorage.googleapis.com/v0/b/sprinfare2024.appspot.com/o/sprin-images%2Fsprin.png?alt=media&token=09e6548d-6f53-4f93-a42a-faa117abe41f" 
                  alt="Logo" style="width: 120px; margin-bottom: 20px;" />
                <h1 style="color: #333;">Hello, ${userName}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 20px; color: #555;">
                ${message}
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you for using our service!</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777;">
                <p style="margin: 0;">Best regards,</p>
                <p style="margin: 0; font-weight: bold;">The Food Delivery Team</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment issue email (${issueType}) sent successfully.`);
  } catch (error) {
    console.error("Failed to send payment issue email:", error);
  }
}

module.exports = sendPaymentIssueEmail;
