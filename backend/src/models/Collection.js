import mongoose from "mongoose";

const RequestItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: "Untitled Request" },
  method: { type: String, default: "GET" },
  url: { type: String, default: "" },
  headers: { type: Array, default: [] },
  params: { type: Array, default: [] },
  bodyType: { type: String, default: "none" },
  body: { type: String, default: "" },
  formFields: { type: Array, default: [] },
  auth: { type: Object, default: {} },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FolderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  requests: [RequestItemSchema],
  folders: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
});

const CollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#6366f1" },
    requests: [RequestItemSchema],
    folders: [FolderSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Collection", CollectionSchema);
