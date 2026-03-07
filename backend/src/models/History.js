import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
  {
    method: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: Number },
    statusText: { type: String },
    time: { type: Number },
    size: { type: Number },
    request: { type: Object },
    response: { type: Object },
  },
  { timestamps: true },
);

HistorySchema.index({ createdAt: -1 });

export default mongoose.model("History", HistorySchema);
