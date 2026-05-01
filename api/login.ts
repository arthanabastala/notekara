import mongoose from "mongoose";

// Caching koneksi agar tidak reconnect setiap request
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("[DB] Menggunakan koneksi yang sudah ada (cached)");
    return cached.conn;
  }

  if (!cached.promise) {
    const MONGO_URI = process.env.MONGO_URI || "";
    if (!MONGO_URI) {
      throw new Error("Silakan tentukan MONGO_URI di environment variables");
    }

    console.log("[DB] Membuat koneksi baru ke MongoDB...");
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log("[DB] Berhasil terhubung ke MongoDB Atlas!");
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default async function handler(req: any, res: any) {
  console.log(`[API /api/login] Method: ${req.method} called`);

  try {
    // Memanggil koneksi database
    await connectDB();

    if (req.method === "GET") {
      return res.status(200).json({ message: "DB connected" });
    }

    if (req.method === "POST") {
      console.log("[API /api/login] Request body:", req.body);
      return res.status(200).json({ message: "Login endpoint hit" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[API /api/login] Error:", error);
    return res.status(500).json({ message: "DB error", error: String(error) });
  }
}

