import mongoose from "mongoose";
import twilio from "twilio";
import { NextResponse } from "next/server";

await mongoose.connect(process.env.MONGO_URI);

const orderSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  items: Array,
  total: Number,
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export async function GET() {
  const newOrders = await Order.find({ notified: false });

  if (newOrders.length === 0) {
    return NextResponse.json({ message: "No new orders" });
  }

  const client = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  for (const order of newOrders) {
    const itemList = order.items
      .map(item => `${item.name} x${item.quantity}`)
      .join("\n");

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.ADMIN_WHATSAPP_NUMBER,
      body: `🛒 New Order!

Customer: ${order.customerName}
Phone: ${order.customerPhone}

Items:
${itemList}

Total: ₹${order.total}`
    });

    order.notified = true;
    await order.save();
  }

  return NextResponse.json({ success: true });
}

