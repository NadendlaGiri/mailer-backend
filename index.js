const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Subscribers saved in a JSON file
const FILE = "subscribers.json";
let subscribers = [];

// Load saved subscribers if file exists
if (fs.existsSync(FILE)) {
  subscribers = JSON.parse(fs.readFileSync(FILE));
}

// Nodemailer setup (using Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// Subscribe endpoint
app.post("/subscribe", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Email required");
  if (subscribers.includes(email))
    return res.status(400).send("Already subscribed");

  subscribers.push(email);
  fs.writeFileSync(FILE, JSON.stringify(subscribers));
  res.send("Subscribed successfully!");
});

// Unsubscribe endpoint
app.post("/unsubscribe", (req, res) => {
  const { email } = req.body;
  subscribers = subscribers.filter((e) => e !== email);
  fs.writeFileSync(FILE, JSON.stringify(subscribers));
  res.send("Unsubscribed successfully!");
});

// Send alert emails (triggered by your Spring Boot backend)
app.post("/send-alert", async (req, res) => {
  const { title, link } = req.body;

  if (subscribers.length === 0) return res.send("No subscribers");

  try {
    for (const email of subscribers) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `New Job Alert: ${title}`,
        text: `New job posted: ${title}\nApply here: ${link}\n\nTo unsubscribe, reply with UNSUBSCRIBE or visit your account.`,
      });
    }
    res.send("Emails sent!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send emails");
  }
});

app.listen(PORT, () => console.log(`Mailer backend running on port ${PORT}`));
