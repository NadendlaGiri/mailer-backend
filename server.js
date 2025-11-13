require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 8081;

// ------------------------------
// CORS (Allow your frontend)
// ------------------------------
app.use(
  cors({
    origin: [
      "https://jobportal-frontend.web.app",
      "https://careerconnect-jobportal.web.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// ------------------------------
// PostgreSQL Connection (Render Compatible)
// ------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ❤️ main fix
  ssl: { rejectUnauthorized: false },
});

// Test connection on startup
pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ PostgreSQL Startup Error:", err));

// ------------------------------
// 📌 Subscribe Route
// ------------------------------
app.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "❌ Invalid email" });

    const result = await pool.query(
      "INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *",
      [email]
    );

    if (result.rowCount === 0)
      return res.status(400).json({ message: "⚠️ Email already subscribed" });

    return res.json({ message: "✅ Subscribed successfully!" });
  } catch (error) {
    console.error("❌ Subscribe Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// 📌 Unsubscribe Route
// ------------------------------
app.post("/unsubscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "❌ Email required" });

    const result = await pool.query(
      "DELETE FROM subscribers WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "⚠️ Email not found" });

    return res.json({ message: "✅ Unsubscribed successfully!" });
  } catch (error) {
    console.error("❌ Unsubscribe Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// 📌 Send Email Alert to Everyone
// ------------------------------
app.post("/send-alert", async (req, res) => {
  try {
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

    const subs = await pool.query("SELECT email FROM subscribers");

    if (subs.rows.length === 0)
      return res.status(400).json({ message: "⚠️ No subscribers found" });

    for (const sub of subs.rows) {
      await transporter.sendMail({
        from: `"CareerConnect Alerts" <${process.env.EMAIL_USER}>`,
        to: sub.email,
        subject,
        html: `
          <h2>${subject}</h2>
          <p>${text}</p>
          <p>
            🔗 <a href="https://careerconnect-jobportal.web.app" target="_blank">Visit CareerConnect</a>
          </p>
        `,
      });
    }

    return res.json({ message: "✅ Emails sent successfully!" });
  } catch (error) {
    console.error("❌ Email Sending Error:", error);
    return res.status(500).json({ message: "Failed to send emails" });
  }
});

// ------------------------------
// 📌 Get All Subscribers
// ------------------------------
app.get("/subscribers", async (req, res) => {
  try {
    const result = await pool.query("SELECT email FROM subscribers");
    return res.json(result.rows.map((r) => r.email));
  } catch (error) {
    console.error("❌ Fetch Subscribers Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => console.log(`🚀 Mailer backend live on port ${PORT}`));
