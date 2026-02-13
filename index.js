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

        // Format items
        const itemList = order.items
          .map((item, index) => {
