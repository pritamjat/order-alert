import { MongoClient } from "mongodb";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function watchOrders() {
  await mongoClient.connect();
  console.log("✅ Connected to MongoDB");

  const db = mongoClient.db();
  const orders = db.collection("orders");

  const changeStream = orders.watch([
    { $match: { operationType: "insert" } }
  ]);

  console.log("👀 Watching for new orders...");

  changeStream.on("change", async (change) => {
    const order = change.fullDocument;

    const itemList = order.items
      .map((item) => `${item.name} x${item.quantity}`)
      .join("\n");

    const message = `🛒 New Order!

Order ID: ${order._id}

Items:
${itemList}

Total: ₹${order.total}
`;

    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.ADMIN_WHATSAPP_NUMBER,
      body: message
    });

    console.log("📲 WhatsApp notification sent!");
  });
}

watchOrders().catch(console.error);

