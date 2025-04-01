const fs = require("fs");

// Read the JSON file
fs.readFile("products.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  let products = JSON.parse(data).map((product) => {
    // Extract quantity (handles variations in spacing and case sensitivity)
    const regex = /(\d+(?:\.\d+)?\s*(ml|g|l|mg|kg|un|cl))/i;
    const match = product.title.match(regex);

    if (match) {
      product.quantity = match[0].trim(); // Store extracted quantity
      product.title = product.title.split(match[0])[0].trim(); // Remove everything after quantity
    } else {
      product.quantity = "N/A";
    }

    // Format price (remove ₦, commas, and decimal places)
    product.price = product.price.replace(/₦|,|\.00/g, "");

    // Clean image URL (keep only .jpg, .png, .svg, etc.)
    product.imageUrl = product.imageUrl.replace(/\?.*$/, ""); // Remove query params

    return product;
  });

  // Overwrite updated_products.json with new data
  fs.writeFileSync(
    "updated_products.json",
    JSON.stringify(products, null, 2),
    "utf8"
  );

  console.log("Updated products saved to updated_products.json");
});
