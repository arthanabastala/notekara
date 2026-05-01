import dbConnect from "./utils/db";
import { User } from "./utils/models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );
    
    return res.status(200).json({ token, username: user.username });
  } catch (error: any) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
