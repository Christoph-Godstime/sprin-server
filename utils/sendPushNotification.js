const { Expo } = require("expo-server-sdk");
let expo = new Expo();

const sendPushNotification = async (expoPushTokens, title, message) => {
  const messages = [];

  // Validate that expoPushTokens is an array
  if (!Array.isArray(expoPushTokens)) {
    console.error("expoPushTokens must be an array.");
    return;
  }

  // Loop through each token and create a message
  for (let expoPushToken of expoPushTokens) {
    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Invalid Expo Push Token: ${expoPushToken}`);
      continue; // Skip invalid tokens
    }

    messages.push({
      to: expoPushToken,
      sound: "default",
      body: message,
      title: title,
      data: { message },
    });
  }

  // Send the push notifications if there are valid tokens
  if (messages.length > 0) {
    try {
      let tickets = await expo.sendPushNotificationsAsync(messages);
      console.log(tickets);
    } catch (error) {
      console.error("Error sending push notifications:", error);
    }
  } else {
    console.error("No valid push tokens to send notifications to.");
  }
};

module.exports = sendPushNotification;
