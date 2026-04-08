import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Health Check API
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running perfectly on Render" });
  });

  // User API
  app.get("/api/user", (req, res) => {
    res.status(200).json({ message: "User endpoint active" });
  });

  // Spin Logic API
  app.post("/api/spin", (req, res) => {
    const { betAmount } = req.body;
    
    const validBets = [10, 40, 100, 1000];
    if (!validBets.includes(betAmount)) {
      return res.status(400).json({ error: "Invalid bet amount" });
    }

    // 30% chance of winning, 70% chance of losing
    const isWin = Math.random() < 0.30;
    let winAmount = 0;

    if (isWin) {
      switch (betAmount) {
        case 10: winAmount = 10 * 3; break;
        case 40: winAmount = 40 * 7; break;
        case 100: winAmount = 100 * 10; break;
        case 1000: winAmount = 1000 * 100; break;
      }
    }

    res.json({ winAmount });
  });

  // Real Razorpay Order API
  app.post("/api/create-order", async (req, res) => {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SaafYvBkRgohX4",
        key_secret: process.env.RAZORPAY_SECRET || "GMsguCFPdn7bpCi3oYZ9pM3q",
      });

      const { amount } = req.body;
      const options = {
        amount: amount * 100, // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: "receipt_" + Math.random().toString(36).substring(7),
      };
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      console.error("Razorpay order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Razorpay Payment Verification API
  app.post("/api/verify-payment", (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET || "GMsguCFPdn7bpCi3oYZ9pM3q")
        .update(body.toString())
        .digest("hex");
        
      if (expectedSignature === razorpay_signature) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, error: "Invalid signature" });
      }
    } catch (error) {
      console.error("Razorpay verify error:", error);
      res.status(500).json({ success: false, error: "Verification failed" });
    }
  });

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
