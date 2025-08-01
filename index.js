const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const subscribers = new Set();

// Subscribe endpoint
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email is required.");
  subscribers.add(email);
  res.send("Successfully subscribed!");
});

// Unsubscribe endpoint
app.post("/unsubscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email is required.");
  if (subscribers.has(email)) {
    subscribers.delete(email);
    res.send("Successfully unsubscribed.");
  } else {
    res.status(404).send("Email not found.");
  }
});

// Example: send email to all
app.post("/send", async (req, res) => {
  const { subject, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: Array.from(subscribers),
      subject,
      text: message,
    });

    res.send("Emails sent successfully.");
  } catch (err) {
    console.error("Mail Error:", err);
    res.status(500).send("Failed to send emails.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
