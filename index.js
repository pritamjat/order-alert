import { MongoClient } from "mongodb";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// MongoDB Client
const mongoClient = new MongoClient(process.env.MONGO_URI);

// Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function startWatcher() {
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log("✅ Connected to MongoDB");

    // Explicitly use test database
    const db = mongoClient.db("test");
    console.log("Using database:", db.databaseName);

    const orders = db.collection("orders");

    // Watch for new inserts only
    const changeStream = orders.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" }
    );

    console.log("👀 Watching for new orders...");

 changeStream.on("change", async (change) => {
  try {
    console.log("🔥 Change detected");

    const order = change.fullDocument;

    if (!order || !Array.isArray(order.items)) {
      console.log("❌ No items found in order:", order);
      return;
    }

    const itemList = order.items.map((item, index) => {
      const subtotal = item.price * item.quantity;

      return `${index + 1}. ${item.name}
   Qty: ${item.quantity}
   Price: ₹${item.price}
   Subtotal: ₹${subtotal}`;
    }).join("\n\n");

    const message = `🛒 *NEW ORDER RECEIVED*

🆔 Order ID:
${order._id}

👤 User ID:
${order.userId}

🛍 Items:
${itemList}

💰 *Total Amount:* ₹${order.total}
`;

    await twilioClient.messages.create({
      from: "whatsapp:+14155238886",
      to: process.env.ADMIN_WHATSAPP_NUMBER,
      body: message
    });

    console.log("📲 WhatsApp notification sent!");

  } catch (err) {
    console.error("Twilio send error:", err);
  }
});


    // Keep process alive (important for Railway)
    process.stdin.resume();

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("Shutting down gracefully...");
      await mongoClient.close();
      process.exit(0);
    });

  } catch (err) {
    console.error("Watcher startup error:", err);
  }
}

startWatcher();
