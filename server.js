const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const dotenv = require("dotenv");

dotenv.config();

const PORT = Number(process.env.PORT) || 6000;
const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

// Ensure raw body parsing for Paystack webhook
app.use("/api/v1/paystack-webhook", express.raw({ type: "application/json" }));

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000", // Development
  "http://127.0.0.1:3000", // Development (alt)
  "https://www.sprinapp.com", // Production
  "https://sprinapp.com",
  "https://restaurant.sprinapp.com",
];

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...parseOrigins(process.env.CORS_ORIGINS),
]);

const isAllowedOrigin = (origin) => {
  if (!origin || origin === "null") return false;
  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    // Convenience: if both services run on Render, allow Render's default domains.
    // This avoids having to hardcode every `*.onrender.com` URL in env vars.
    if (
      process.env.RENDER === "true" &&
      url.protocol === "https:" &&
      hostname.endsWith(".onrender.com")
    ) {
      return true;
    }

    // Local non-Cra ports (e.g., serving `build/` locally) during development.
    if (
      process.env.NODE_ENV !== "production" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    // Ignore invalid Origin values
  }

  return false;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin);

  // Bypass CORS for Paystack Webhooks
  if (req.path === "/api/v1/paystack-webhook") {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins for webhooks
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS.join(",")
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Preflight request
  }
  next();
});

const getDatabaseStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    state: states[mongoose.connection.readyState] || "unknown",
    readyState: mongoose.connection.readyState,
  };
};

const getHealthPayload = () => {
  const database = getDatabaseStatus();
  const firebaseConnected = fireBaseConnection && require("firebase-admin").apps.length > 0;

  return {
    status: database.readyState === 1 ? "ok" : "degraded",
    message: "Sprin backend is running",
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    database,
    firebase: {
      connected: firebaseConnected,
    },
  };
};

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
const groceryStorePaymentRoute = require("./routes/groceryStorePayment");
const groceryStoreBankDetails = require("./routes/groceryStoreBankDetails");
const rider = require("./routes/rider");
const grocery = require("./routes/grocery");
const groceryCategory = require("./routes/groceryCategory");
const groceryStore = require("./routes/groceryStore");
const paystackRoute = require("./routes/paystackRoutes");
const { fireBaseConnection } = require("./utils/fbConnect");
const dataBaseConnection = require("./utils/mongoConn");

const http = require("http").createServer(app);
const socketCorsOrigin = (origin, callback) => {
  // Non-browser clients might not send an Origin header.
  if (!origin) return callback(null, true);

  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
};

const io = require("socket.io")(http, {
  cors: {
    origin: socketCorsOrigin, // Allowed origins (kept in sync with HTTP CORS logic)
    methods: ALLOWED_METHODS, // Allowed methods
    credentials: true, // Allow credentials (cookies, authentication)
  },
});

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

// Store io and userSocketMap in the app instance
app.set("io", io);
app.set("userSocketMap", userSocketMap);

fireBaseConnection().catch((error) => {
  console.error("Firebase initialization failed:", error.message);
});

dataBaseConnection().catch((error) => {
  console.error("MongoDB initialization failed:", error.message);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.status(200).json(getHealthPayload());
});
app.get("/health", (req, res) => {
  res.status(200).json(getHealthPayload());
});
app.get("/api/health", (req, res) => {
  const payload = getHealthPayload();
  res.status(payload.status === "ok" ? 200 : 503).json(payload);
});
app.use("/api/admin", adminRoute);
app.use("/", authRoute);
app.use("/api/users", userRoute);
app.use("/api/restaurant", restRoute);
app.use("/api/category", catRoute);
app.use("/api/grocery", grocery);
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
app.use("/api/grocery-store-payment", groceryStorePaymentRoute);
app.use("/api/grocery-store-bank-details", groceryStoreBankDetails);
app.use("/api/rider", rider);
// app.use("/api/v1", paystackRoute);
app.use(
  "/api/v1",
  (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    next();
  },
  paystackRoute
);

app.use("/api", (req, res) => {
  res.status(404).json({
    status: false,
    message: `API route not found: ${req.originalUrl}`,
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

http.listen(PORT, () =>
  console.log(`Sprin backend app listening on port ${PORT}`)
);

// After server and socket.io are initialized, pass io and userSocketMap to the cron jobs
const {
  reassignUnacceptedOrders,
  updateRestaurantAvailability,
  updateRiderAvailability,
  updateGroceryStoreAvailability,
} = require("./controllers/scheduler");

const cron = require("node-cron");
cron.schedule("* * * * *", reassignUnacceptedOrders(io, userSocketMap));
cron.schedule("* * * * *", updateRestaurantAvailability);
cron.schedule("* * * * *", updateGroceryStoreAvailability);
cron.schedule("* * * * *", updateRiderAvailability);
