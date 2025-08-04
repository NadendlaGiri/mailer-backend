require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

let subscribers = [];
app.use(
  cors({
    origin: "https://jobportal-frontend.web.app", // your React app's URL
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Subscribe API
app.post("/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email || subscribers.includes(email)) {
    return res.status(400).json({ message: "Invalid or duplicate email" });
  }
  subscribers.push(email);
  res.json({ message: "✅ Subscribed successfully!" });
});

// Unsubscribe API
app.post("/unsubscribe", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "❌ Email is required" });
  }

  const index = subscribers.indexOf(email);
  if (index === -1) {
    return res
      .status(404)
      .json({ message: "❌ Email not found in subscribers" });
  }

  subscribers.splice(index, 1); // Remove the email
  return res.json({ message: "✅ Unsubscribed successfully!" });
});

// Send Email Alert API
app.post("/send-alert", async (req, res) => {
  const { subject, text } = req.body;

  if (!subject || !text || subscribers.length === 0) {
    return res
      .status(400)
      .json({ message: "❌ Missing data or no subscribers" });
  }

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    for (const email of subscribers) {
      await transporter.sendMail({
        from: `"CareerConnect Alerts" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: `
          <h2>${subject}</h2>
          <p>${text}</p>
          <p>🔗 <a href="https://careerconnect-jobportal.web.app" target="_blank">Visit CareerConnect</a></p>
        `,
      });
    }
    // Make sure to respond here with success!
    return res
      .status(200)
      .json({ message: "✅ Emails sent to all subscribers!" });
  } catch (error) {
    console.error("❌ Email error:", error);
    return res.status(500).json({ message: "Failed to send emails" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer running on http://localhost:${PORT}`);
});
