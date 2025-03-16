const express = require("express");
const router = express.Router();
const { paystackWebhook } = require("../controllers/paystackController");

router.post("/paystack-webhook", paystackWebhook);

module.exports = router;
