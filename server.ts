import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
const targetProjectId = firebaseConfig.projectId || "gen-lang-client-0163892992";

// CRITICAL: Set the project ID in environment variables to avoid cross-project API errors
process.env.GOOGLE_CLOUD_PROJECT = targetProjectId;
process.env.GCLOUD_PROJECT = targetProjectId;

console.log(`Initializing Firebase Admin for project: ${targetProjectId}`);

let firebaseApp: any;
try {
  // Use default app initialization with explicit projectId
  if (admin.apps.length === 0) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: targetProjectId,
    });
  } else {
    firebaseApp = admin.app();
  }
  console.log("Firebase initialized successfully.");
} catch (err: any) {
  console.error("Error initializing Firebase Admin:", err);
  throw err;
}

let db: any;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    console.log(`Connecting to Firestore database: ${firebaseConfig.firestoreDatabaseId}`);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  } else {
    console.log("Connecting to default Firestore database");
    db = getFirestore(firebaseApp);
  }
  console.log("Firestore targeting project:", targetProjectId);
} catch (err) {
  console.error("Error connecting to Firestore:", err);
  throw err;
}

const app = express();
app.use(express.json());

const PORT = 3000;

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API Routes
app.get("/api/test-email", async (req, res) => {
  console.log("Test email request received.");
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(400).json({ success: false, error: "Email credentials missing in Settings." });
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'bijoymahmudmunna@gmail.com',
      subject: "Test Email from Inventory System",
      text: "This is a test email to verify your configuration. If you receive this, your email settings are correct!",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Test email sent. MessageId: ${info.messageId}`);
    res.json({ success: true, message: "Test email sent successfully to bijoymahmudmunna@gmail.com" });
  } catch (error: any) {
    console.error("Test email failed:", error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

app.post("/api/notify", async (req, res) => {
  const { action, category, itemName, details } = req.body;
  console.log(`Received notification request: ${action} ${category} ${itemName}`);

  try {
    // Get all approved users
    console.log("Fetching approved users...");
    let usersSnapshot;
    try {
      usersSnapshot = await db.collection('users').where('status', '==', 'approved').get();
      console.log(`Found ${usersSnapshot.size} approved users.`);
    } catch (dbErr: any) {
      console.error("Firestore query failed:", dbErr.message || dbErr);
      if (dbErr.code === 7) {
        console.error("Permission Denied. This service account may not have access to the database.");
      }
      // Fallback: only notify supreme admin if DB fails
      usersSnapshot = { docs: [], size: 0 };
    }
    
    const approvedEmails = usersSnapshot.docs.map((doc: any) => doc.data().email).filter((email: string) => !!email);
    
    // Always include supreme admin if not already present
    const supremeAdminEmail = 'bijoymahmudmunna@gmail.com';
    if (!approvedEmails.includes(supremeAdminEmail)) {
      approvedEmails.push(supremeAdminEmail);
      console.log(`Added supreme admin ${supremeAdminEmail} to notification list.`);
    }

    console.log(`Final notification list: ${approvedEmails.join(', ')}`);

    if (approvedEmails.length === 0) {
      console.log("No emails to notify.");
      return res.json({ success: true, message: "No users to notify." });
    }

    const isMaster = details?.isMasterSheet;
    const userEmail = details?.userEmail || 'Unknown';
    const userName = details?.userName || 'Unknown User';

    const subject = `${isMaster ? '[MASTER SHEET] ' : ''}Inventory Update: ${action.toUpperCase()} - ${category.toUpperCase()}`;
    const text = `
      Inventory Notification:
      ${isMaster ? 'CRITICAL: Action performed in MASTER SHEET' : ''}
      
      Action: ${action}
      Category: ${category}
      Item Name: ${itemName}
      Performed By: ${userName} (${userEmail})
      
      Details:
      ${JSON.stringify(details, null, 2)}
      
      Time: ${new Date().toLocaleString()}
      
      This is an automated notification from the Inventory Management System.
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: approvedEmails.join(', '),
      subject: subject,
      text: text,
    };

    console.log("Attempting to send email...");
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Notification email sent. MessageId: ${info.messageId}`);
      res.json({ success: true });
    } else {
      console.warn("Email credentials missing (EMAIL_USER or EMAIL_PASS). Notification not sent.");
      res.json({ success: false, error: "Email credentials missing" });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
