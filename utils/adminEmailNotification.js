const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();

async function adminEmailNotification(order) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_USER,
      pass: process.env.AUTH_PASSWORD,
    },
  });

  const itemsHTML = order.orderItems
    .map(
      (item) => `
    <tr>
      <td>${item.title}</td>
      <td>${item.quantity}</td>
      <td>₦${item.price}</td>
      <td>${item?.additives?.join(", ") || "None"}</td>
      <td>${item.instructions || "None"}</td>
    </tr>
  `
    )
    .join("");

  const mailOptions = {
    from: process.env.AUTH_USER,
    bcc: ["christophergodstime45@gmail.com", "simeonalex29@gmail.com"],
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
                <p><strong>Store:</strong> ${order.storeId.title}</p>
               <p><strong>Customer:</strong> ${
                 order.userId?.firstName && order.userId?.lastName
                   ? `${order.userId.firstName} ${order.userId.lastName}`
                   : "N/A"
               }</p>
                <p><strong>Phone:</strong> ${order.userId.phone}</p>
                <p><strong>Order Date:</strong> ${new Date(
                  order.orderDate
                ).toLocaleString()}</p>
                <p><strong>Delivery Address:</strong> ${
                  order.deliveryAddress?.addressLine1
                }</p>
                <p><strong>Delivery Instructions:</strong> ${
                  order.deliveryAddress?.deliveryInstructions
                }</p>
                <p><strong>Free Delivery:</strong> ${
                  order.freeDelivery ? "Yes" : "No"
                }</p>
                <p><strong>Service Fee:</strong> ₦${order.serviceFee}</p>
                <p><strong>Delivery Fee:</strong> ₦${order.deliveryFee}</p>
                <p><strong>Order Total:</strong> ₦${order.orderTotal}</p>
                <p><strong>Grand Total:</strong> ₦${order.grandTotal}</p>
              </td>
            </tr>
            <tr>
              <td>
                <h3>Order Items</h3>
                <table width="100%" border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse;">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Additives</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>
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
    console.log("Admin email sent successfully.");
  } catch (error) {
    console.log("Error sending admin email:", error.message);
  }
}

module.exports = adminEmailNotification;
