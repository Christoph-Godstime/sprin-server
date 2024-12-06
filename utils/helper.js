const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

exports.hash = function hash(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
};

exports.verify = (password, hash) => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
};

exports.getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
};

// exports.mailTransporterObj = {
//   host: "smtp-relay.sendinblue.com",
//   port: 587,
//   auth: {
//     user: "promiseihunna@gmail.com",
//     pass: "y7CkRUtAQTb806mh",
//   },
// };

exports.mailTransporterObj = {
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
};

exports.mailSource = '"Sprin" <sprinapp@gmail.com>';
exports.sourceMail = "sprinapp@gmail.com";

exports.capitalizeFirstLetter = (arg) => {
  const firstLetter = arg.charAt(0).toUpperCase();
  return firstLetter + arg.slice(1);
};

exports.decapitalize = (arg) => {
  const firstLetter = arg.charAt(0).toLowerCase();
  return firstLetter + arg.slice(1).toLowerCase();
};

exports.deleteFile = (filePath) => {
  filePath = path.join(__dirname, "..", "public", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};

exports.unique = (arr) => {
  let result = [];

  for (let str of arr) {
    if (!result.includes(str)) {
      result.push(str);
    }
  }

  return result;
};

exports.removeItemsFromArray = (array, itemsToRemove) => {
  return array.filter((v) => {
    return !itemsToRemove.includes(v);
  });
};

exports.rollBackDate = (number_of_months) => {
  const now = new Date();
  const result = new Date(now.setMonth(now.getMonth() - number_of_months));
  return result;
};

exports.shuffle = (array) => {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
};
