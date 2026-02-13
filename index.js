import { MongoClient } from "mongodb";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function startWatcher() {
  try {
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB");

    const db = mongoClient.db("test");
    console.log("Using database:", db.databaseName);

    const orders = db.collection("orders");

    const changeStream = orders.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" }
    );

    console.log("👀 Watching for new orders...");

    changeStream.on("change", async (change) => {
      try {
        console.log("🔥 Change detected");

        const order = change.fullDocument;

        // 🔥 IMPORTANT:
        // Use the EXACT contentSid shown in your Twilio dashboard
        const CONTENT_SID = "HXb5b62575e6e4ff6129ad7c8efe1f983e";

        await twilioClient.messages.create({
          from: "whatsapp:+14155238886", // Twilio sandbox number
          to: process.env.ADMIN_WHATSAPP_NUMBER,
          contentSid: CONTENT_SID,
          contentVariables: JSON.stringify({
            1: `Order ${order._id}`,
            2: `₹${order.total}`
          })
        });

        console.log("📲 WhatsApp notification sent!");
      } catch (err) {
        console.error("Twilio send error:", err);
      }
    });

    // Keep process alive
    process.stdin.resume();

  } catch (err) {
    console.error("Watcher startup error:", err);
  }
}

startWatcher();
