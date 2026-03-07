import express from "express";
import { readConfig, writeConfig } from "../db/config.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(readConfig());
});

router.post("/db-engine", (req, res) => {
  const { dbEngine } = req.body;
  if (!["mongodb", "sqlite"].includes(dbEngine)) {
    return res
      .status(400)
      .json({ error: "Invalid engine. Use 'mongodb' or 'sqlite'." });
  }
  const config = writeConfig({ dbEngine });
  res.json({
    success: true,
    config,
    message: "Restart the server to apply changes.",
  });
});

export default router;
