import dbConnect from "./utils/db";
import { User } from "./utils/models";
import bcrypt from "bcryptjs";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error: any) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
