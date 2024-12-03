const User = require("../models/User");

const getAdminPushTokens = async () => {
  try {
    const emails = [
      "christophergodstime45@gmail.com",
      "christopherprosper15@gmail.com",
      "simeonalex29@gmail.com",
    ];

    // Query users with the specified emails and retrieve their Expo push tokens
    const users = await User.find({ email: { $in: emails } }, "expoPushToken");

    // Extract and filter valid tokens
    const adminPushTokens = users
      .map((user) => user.expoPushToken)
      .filter((token) => token); // Filters out null, undefined, and empty strings

    return adminPushTokens;
  } catch (error) {
    console.error("Error retrieving admin push tokens:", error);
    throw new Error("Failed to retrieve admin push tokens.");
  }
};

module.exports = { getAdminPushTokens };
