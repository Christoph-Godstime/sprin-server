const fs = require("fs");
const cheerio = require("cheerio");

// Load your HTML file
const html = fs.readFileSync("products.html", "utf-8");

// Load HTML into cheerio
const $ = cheerio.load(html);

// Extract new products
const newProducts = [];

$('section[data-test-id="grid-elements"]').each((index, element) => {
  const title = $(element).find(".tile__description span").text().trim();
  const price = $(element).find(".product-price__effective").text().trim();
  const imageUrl = $(element).find(".tile__image").attr("src");

  newProducts.push({ title, price, imageUrl });
});

// **Overwrite** products.json with new data
fs.writeFileSync(
  "products.json",
  JSON.stringify(newProducts, null, 2),
  "utf-8"
);

console.log("Extraction complete. products.json has been updated.");
