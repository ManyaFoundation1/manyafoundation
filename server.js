const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // required to make API calls
const path = require("path");

const app = express();
const PORT = 3000;

// Middlewares
app.use(bodyParser.json());
app.use(express.static("public")); // Serve HTML, CSS, JS files from /public

// Replace this with your latest access token from Postman (OAuth call)
require("dotenv").config();

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
// Redirect URL after payment
const REDIRECT_URL = "https://themanyafoundation.org/thankyou"; // update if hosted

// Payment API
app.post("/initiate-payment", async (req, res) => {
  try {
    const transactionId = "TXN_" + Date.now();
    const amountInPaise = parseInt(req.body.amount) * 100;

    const payload = {
      merchantOrderId: transactionId,
      amount: amountInPaise,
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Donation to Manya Foundation",
        merchantUrls: {
          redirectUrl: REDIRECT_URL
        }
      }
    };

    const response = await fetch("https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "O-Bearer " + ACCESS_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.redirectUrl || (result.data && result.data.redirectUrl)) {
      return res.json({
        success: true,
        redirectUrl: result.redirectUrl || result.data.redirectUrl
      });
    } else {
      console.error("PhonePe error:", result);
      return res.json({ success: false, error: result });
    }
  } catch (err) {
    console.error("Payment initiation error:", err);
    return res.json({ success: false, error: err.message });
  }
});

// Optional route for thank-you page (if needed)
app.get("/thankyou", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "thankyou.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
