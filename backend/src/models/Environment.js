import mongoose from "mongoose";

const VariableSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, default: "" },
  initialValue: { type: String, default: "" },
  enabled: { type: Boolean, default: true },
  secret: { type: Boolean, default: false },
});

const EnvironmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    color: { type: String, default: "#10b981" },
    variables: [VariableSchema],
    isGlobal: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Environment", EnvironmentSchema);
