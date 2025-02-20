const puppeteer = require("puppeteer-core");

const url = "https://glovoapp.com/"; // Replace with the target URL

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Path to Chrome executable
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36"
  );

  // Set timeout to 0 to avoid timeout errors
  await page.goto(url, { waitUntil: "load", timeout: 0 }); // No timeout, waits for page to fully load

  // Get all image URLs
  const images = await page.evaluate(() => {
    const imgElements = document.querySelectorAll("img");
    const imgUrls = [];
    imgElements.forEach((img) => {
      if (img.src) imgUrls.push(img.src);
    });
    return imgUrls;
  });

  // Log all image URLs
  console.log(images);

  await browser.close();
})();
