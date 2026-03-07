// backend/models/Collection.js
import mongoose from "mongoose";

// All tree nodes stored as plain Mixed arrays for unlimited recursive depth.
// Shape is enforced on the frontend and API layer.

const CollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#6366f1" },
    icon: { type: String, default: null },
    requests: { type: mongoose.Schema.Types.Mixed, default: [] },
    folders: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Collection", CollectionSchema);
