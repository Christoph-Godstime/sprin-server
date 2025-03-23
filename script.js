const fs = require("fs");
const cheerio = require("cheerio");

// Load your HTML file
const html = fs.readFileSync("products.html", "utf-8");

// Load HTML into cheerio
const $ = cheerio.load(html);

// Load existing data from products.json if it exists
let existingProducts = [];
const filePath = "products.json";

if (fs.existsSync(filePath)) {
  const fileData = fs.readFileSync(filePath, "utf-8");
  if (fileData.trim()) {
    existingProducts = JSON.parse(fileData);
  }
}

const newProducts = [];

$('section[data-test-id="grid-elements"]').each((index, element) => {
  const title = $(element).find(".tile__description span").text().trim();
  const price = $(element).find(".product-price__effective").text().trim();
  const imageUrl = $(element).find(".tile__image").attr("src");

  // Check if the product already exists
  const isDuplicate = existingProducts.some(
    (product) =>
      product.title === title &&
      product.price === price &&
      product.imageUrl === imageUrl
  );

  if (!isDuplicate) {
    newProducts.push({ title, price, imageUrl });
  }
});

// Append new products to existing ones
const updatedProducts = [...existingProducts, ...newProducts];

// Save data to JSON file
fs.writeFileSync(filePath, JSON.stringify(updatedProducts, null, 2), "utf-8");

console.log("Extraction complete. New products added to products.json.");
