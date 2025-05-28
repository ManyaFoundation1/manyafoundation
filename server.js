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
const REDIRECT_URL = "https://donate.themanyafoundation.org/thank-you.html"; // update if hosted

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

    const response = await fetch("https://api.phonepe.com/apis/pg/checkout/v2/pay", {
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
  res.sendFile(path.join(__dirname, "public", "thank-you.html"));
});

app.get("/check-payment-status", async (req, res) => {
  const merchantId = "YOUR_MERCHANT_ID"; // e.g. TEST-xxxxxx
  const transactionId = req.query.orderId;
  const saltKey = process.env.SALT_KEY;
  const saltIndex = process.env.SALT_INDEX;

  const path = `/pg/v1/status/${merchantId}/${transactionId}`;
  const xVerify = crypto.createHash("sha256").update(path + saltKey).digest("hex") + "###" + saltIndex;

  const statusUrl = `https://api-preprod.phonepe.com${path}`;

  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify
      }
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
