import mongoose from "mongoose";

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
  color: { type: String },
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

export const User = mongoose.models.User || mongoose.model<any>("User", userSchema);
export const Note = mongoose.models.Note || mongoose.model<any>("Note", noteSchema);
