require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8081;

// CORS setup to allow your React frontend
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin || // allow requests with no origin like curl, Postman
        origin === "https://jobportal-frontend.web.app"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(bodyParser.json());

// PostgreSQL pool setup with SSL for Render or similar providers
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DB,
  password: process.env.PG_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Subscribe endpoint — adds email if not exists
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  console.log("Subscribe request received for email:", email);
  if (!email) return res.status(400).json({ message: "Invalid email" });

  try {
    const result = await pool.query(
      "INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *",
      [email]
    );
    console.log("Insert result:", result.rows);
    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Email already subscribed" });
    }
    res.json({ message: "✅ Subscribed successfully!" });
  } catch (err) {
    console.error("❌ PostgreSQL error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Unsubscribe endpoint — deletes email if exists
app.post("/unsubscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "❌ Email is required" });

  try {
    const result = await pool.query(
      "DELETE FROM subscribers WHERE email = $1",
      [email]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "❌ Email not found" });

    res.json({ message: "✅ Unsubscribed successfully!" });
  } catch (err) {
    console.error("❌ Unsubscribe error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Send alert emails to all subscribers
app.post("/send-alert", async (req, res) => {
  const { subject, text } = req.body;
  if (!subject || !text)
    return res.status(400).json({ message: "❌ Missing subject or text" });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const result = await pool.query("SELECT email FROM subscribers");
    if (result.rows.length === 0)
      return res.status(400).json({ message: "❌ No subscribers" });

    for (const { email } of result.rows) {
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

    res.status(200).json({ message: "✅ Emails sent to all subscribers!" });
  } catch (err) {
    console.error("❌ Email sending error:", err);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

// (Optional) Get all subscribers - for admin use
app.get("/subscribers", async (req, res) => {
  try {
    const result = await pool.query("SELECT email FROM subscribers");
    res.status(200).json(result.rows.map((row) => row.email));
  } catch (err) {
    console.error("❌ Error fetching subscribers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mailer backend running on http://localhost:${PORT}`);
});
