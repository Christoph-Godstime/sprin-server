const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");

const allowedOrigins = [
  "http://localhost:3000", // Development
  "https://www.sprinapp.com", // Production
  "https://sprinapp.com",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Preflight request
  }
  next();
});

const adminRoute = require("./routes/admin");
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const restRoute = require("./routes/restaurant");
const catRoute = require("./routes/category");
const foodRoute = require("./routes/food");
const cartRoute = require("./routes/cart");
const addressRoute = require("./routes/address");
const orderRoute = require("./routes/order");
const ratingRoute = require("./routes/rating");
const paymentRoute = require("./routes/payment");
const bankDetails = require("./routes/bankDetails");
const riderPaymentRoute = require("./routes/riderPayment");
const riderBankDetails = require("./routes/riderBankDetails");
const rider = require("./routes/rider");
const groceryCategory = require("./routes/groceryCategory");
const groceryStore = require("./routes/groceryStore");
const { fireBaseConnection } = require("./utils/fbConnect");
const dataBaseConnection = require("./utils/mongoConn");

const http = require("http").createServer(app);
const io = require("socket.io")(http);

// {"userId" : "socket ID"}

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("a user is connected", socket.id);

  const userId = socket.handshake.query.userId;

  console.log("userId", userId);

  if (userId !== "undefined") {
    userSocketMap[userId] = socket.id;
  }

  console.log("user socket data", userSocketMap);

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    delete userSocketMap[userId];
  });

  socket.on("sendOrder", ({ senderId, restaurantId, orderId }) => {
    const receiverSocketId = userSocketMap[restaurantId];

    console.log("restaurant Id", restaurantId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveOrder", {
        senderId,
        orderId,
      });
    }
  });

  socket.on("sendRiderOrder", ({ restaurantId, riderId, orderId }) => {
    const receiverSocketId = userSocketMap[riderId];

    console.log("rider Id", riderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveRiderOrder", {
        restaurantId,
        orderId,
      });
    }
  });

  socket.on("sendDeleteRiderOrder", ({ restaurantId, riderId, orderId }) => {
    const receiverSocketId = userSocketMap[riderId];

    console.log("rider Id", riderId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveDeleteRiderOrder", {
        restaurantId,
        orderId,
      });
    }
  });

  socket.on(
    "sendOrderStatus",
    ({ customerId, restaurantId, orderId, newStatus }) => {
      const receiverSocketId = userSocketMap[customerId];

      console.log("client Id from server", customerId);
      console.log("client socket id from server: ", receiverSocketId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("recieveOrderStatus", {
          restaurantId,
          orderId,
        });
      }
    }
  );
});

dotenv.config();

fireBaseConnection();

dataBaseConnection();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/admin", adminRoute);
app.use("/", authRoute);
app.use("/api/users", userRoute);
app.use("/api/restaurant", restRoute);
app.use("/api/category", catRoute);
app.use("/api/grocery-category", groceryCategory);
app.use("/api/grocery-store", groceryStore);
app.use("/api/foods", foodRoute);
app.use("/api/cart", cartRoute);
app.use("/api/address", addressRoute);
app.use(
  "/api/orders",
  (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    next();
  },
  orderRoute
);
app.use("/api/rating", ratingRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/bank-details", bankDetails);
app.use("/api/rider-payment", riderPaymentRoute);
app.use("/api/rider-bank-details", riderBankDetails);
app.use("/api/rider", rider);

http.listen(process.env.PORT || 6000, () =>
  console.log(`Sprin backend app listening on port ${process.env.PORT}!`)
);

// After server and socket.io are initialized, pass io and userSocketMap to the cron jobs
const {
  reassignUnacceptedOrders,
  updateRestaurantAvailability,
  updateRiderAvailability,
} = require("./controllers/scheduler");

const cron = require("node-cron");
cron.schedule("* * * * *", reassignUnacceptedOrders(io, userSocketMap));
cron.schedule("* * * * *", updateRestaurantAvailability);
cron.schedule("* * * * *", updateRiderAvailability);
