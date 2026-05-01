import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" })); // Increase limit for Base64 images

// --- MongoDB Schemas & Models ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const noteElementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["text", "image", "icon", "sticker"], required: true },
  title: { type: String },
  content: { type: String },
  originalContent: { type: String },
  color: { type: String }, // Optional color field for text notes
  textColor: { type: String },
  fontSize: { type: Number },
  showCaption: { type: Boolean },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  zIndex: { type: Number },
});

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  elements: [noteElementSchema],
});

const User = mongoose.models.User || mongoose.model<any>("User", userSchema);
const Note = mongoose.models.Note || mongoose.model<any>("Note", noteSchema);

// --- Auth Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token missing" });

  jwt.verify(token, process.env.JWT_SECRET || "fallback-secret", (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// --- API Routes ---
const apiRouter = express.Router();

// Middleware to check database connection
apiRouter.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: "Database not connected. Please configure MONGO_URI in your environment secrets to use this application." 
    });
  }
  next();
});

apiRouter.post("/register", async (req, res) => {
  try {
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
    
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.post("/login", async (req, res) => {
  try {
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
    
    res.json({ token, username: user.username });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.get("/notes", authenticateToken, async (req: any, res: any) => {
  try {
    let note = await Note.findOne({ userId: req.user.userId });
    if (!note) {
      note = new Note({ userId: req.user.userId, elements: [] });
      await note.save();
    }
    res.json(note);
  } catch (error) {
    console.error("Get Notes Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

apiRouter.post("/notes", authenticateToken, async (req: any, res: any) => {
  try {
    const { elements } = req.body;
    
    let note = await Note.findOne({ userId: req.user.userId });
    if (!note) {
      note = new Note({ userId: req.user.userId, elements });
    } else {
      note.elements = elements;
    }
    
    await note.save();
    res.json({ message: "Notes saved successfully" });
  } catch (error: any) {
    console.error("Save Notes Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.use("/api", apiRouter);

// --- Vite Middleware & Fallback ---
async function startServer() {
  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGO_URI is not set. Please set it in the environment secrets.");
    console.warn("Database features will not work until MONGO_URI is provided.");
  } else {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB successfully");
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
