require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

const admin = require("firebase-admin");
console.log("✅ Firebase Admin initialized successfully");

const firebaseConfigBase64 = process.env.FIREBASE_KEY_BASE64;
if (!firebaseConfigBase64) {
  throw new Error("❌ Missing FIREBASE_KEY_BASE64 env variable");
}

const firebaseKey = JSON.parse(
  Buffer.from(firebaseConfigBase64, "base64").toString("utf-8")
);
console.log("✅ Decoded Firebase project ID:", firebaseKey.project_id);

admin.initializeApp({
  credential: admin.credential.cert(firebaseKey),
});

const db = admin.firestore();
const subscribersRef = db.collection("subscribers");

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

// subscribe API
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Invalid email" });

  try {
    const snapshot = await subscribersRef.where("email", "==", email).get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: "Email already subscribed" });
    }

    await subscribersRef.add({ email });
    res.json({ message: "✅ Subscribed successfully!" });
  } catch (err) {
    console.error("❌ Firestore error:", err);
    res.status(500).json({ message: "Server error" });
  }
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

  if (!subject || !text) {
    return res.status(400).json({ message: "❌ Missing data" });
  }

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const snapshot = await subscribersRef.get();

    if (snapshot.empty) {
      return res.status(400).json({ message: "❌ No subscribers" });
    }

    for (const doc of snapshot.docs) {
      const email = doc.data().email;
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
    console.error("❌ Email error:", err);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mailer running on http://localhost:${PORT}`);
});
