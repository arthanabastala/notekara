import dbConnect from "./utils/db";
import { Note } from "./utils/models";
import { getUserIdFromToken } from "./utils/auth";
import mongoose from "mongoose";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  try {
    // Check connection string before connecting
    if (!process.env.MONGO_URI) {
      return res.status(503).json({ error: "Database not connected. Please configure MONGO_URI in your environment secrets to use this application." });
    }

    await dbConnect();
    
    let userId;
    try {
      userId = getUserIdFromToken(req);
    } catch (e: any) {
      return res.status(401).json({ error: e.message });
    }

    if (req.method === "GET") {
      let note = await Note.findOne({ userId });
      if (!note) {
        note = new Note({ userId, elements: [] });
        await note.save();
      }
      return res.status(200).json(note);
    } 
    
    if (req.method === "POST") {
      const { elements } = req.body;
      
      let note = await Note.findOne({ userId });
      if (!note) {
        note = new Note({ userId, elements });
      } else {
        note.elements = elements;
      }
      
      await note.save();
      return res.status(200).json({ message: "Notes saved successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Notes Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
