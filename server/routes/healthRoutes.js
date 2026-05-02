import express from "express";
import mongoose from "mongoose";

const healthRouter = express.Router();

healthRouter.get("/", (req, res) => {
    res.json({
        success: true,
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? "connected" : "offline",
        version: process.env.npm_package_version || "1.0.0"
    });
});

export default healthRouter;
