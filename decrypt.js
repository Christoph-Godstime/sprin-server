require("dotenv").config();
const CryptoJS = require("crypto-js");

// Replace with your actual encrypted password and secret
const encryptedPassword = "U2FsdGVkX1/PKosrYNdOqJnKcvBxXGUdRefDaScwQaU=";
const secret = process.env.SECRET; // or use process.env.SECRET

function decryptPassword(encrypted, secretKey) {
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
  const originalPassword = bytes.toString(CryptoJS.enc.Utf8);

  if (!originalPassword) {
    console.log("❌ Failed to decrypt. Check the encrypted value or secret.");
  } else {
    console.log("✅ Decrypted password:", originalPassword);
  }
}

decryptPassword(encryptedPassword, secret);
