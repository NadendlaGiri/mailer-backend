const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup (allow your frontend origins)
app.use(
  cors({
    origin: ["https://jobportal-frontend.web.app", "http://localhost:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(bodyParser.json());

const SUBSCRIBERS_FILE = "subscribers.json";
let subscribers = new Set();

// Load subscribers from file at startup
if (fs.existsSync(SUBSCRIBERS_FILE)) {
  try {
    const data = fs.readFileSync(SUBSCRIBERS_FILE, "utf-8");
    const emails = JSON.parse(data);
    subscribers = new Set(emails);
    console.log(`Loaded ${subscribers.size} subscribers from file.`);
  } catch (err) {
    console.error("Failed to load subscribers:", err);
  }
}

// Helper to save subscribers to file
function saveSubscribers() {
  fs.writeFileSync(
    SUBSCRIBERS_FILE,
    JSON.stringify(Array.from(subscribers), null, 2)
  );
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email is required.");
  if (subscribers.has(email))
    return res.status(400).send("Already subscribed.");

  subscribers.add(email);
  saveSubscribers();
  res.send("Successfully subscribed!");
});

// Unsubscribe endpoint
app.post("/unsubscribe", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email is required.");

  if (subscribers.has(email)) {
    subscribers.delete(email);
    saveSubscribers();
    res.send("Successfully unsubscribed.");
  } else {
    res.status(404).send("Email not found.");
  }
});

// Send job alert emails to all subscribers
app.post("/send-alert", async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).send("Job title is required.");
  if (subscribers.size === 0) return res.send("No subscribers to send alerts.");

  const websiteLink = "https://jobportal-frontend.web.app";

  try {
    for (const email of subscribers) {
      await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: email,
        subject: `New Job Alert: ${title}`,
        text: `Hey there!\n\nA new job titled "${title}" has been posted.\nVisit our website to check it out: ${websiteLink}\n\nThanks for staying with us! ❤️\n\nTo unsubscribe, please use the unsubscribe option on our site.`,
      });
    }
    res.send(`Emails sent to ${subscribers.size} subscribers!`);
  } catch (err) {
    console.error("Error sending emails:", err);
    res.status(500).send("Failed to send emails.");
  }
});

app.listen(PORT, () => {
  console.log(`Mailer backend running on port ${PORT}`);
});
