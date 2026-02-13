import { MongoClient } from "mongodb";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function startWatcher() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("test"); // explicitly set DB
    console.log("Using database:", db.databaseName);

    const orders = db.collection("orders");

    const changeStream = orders.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" }
    );

    console.log("👀 Watching for new orders...");

    changeStream.on("change", async (change) => {
      console.log("🔥 Change detected");

      const order = change.fullDocument;

      const itemList = order.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join("\n");

      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: process.env.ADMIN_WHATSAPP_NUMBER,
        body: `🛒 New Order!

Order ID: ${order._id}
Total: ₹${order.total}

Items:
${itemList}`
      });

      console.log("📲 WhatsApp notification sent!");
    });

    // Prevent process from exiting
    process.stdin.resume();

  } catch (err) {
    console.error("Watcher error:", err);
  }
}

startWatcher();
