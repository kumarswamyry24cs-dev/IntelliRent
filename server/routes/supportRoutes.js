import express from "express";
import multer from "multer";
import OpenAI from "openai";

const supportRouter = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 8 * 1024 * 1024}
});

const getGroqClient = () => process.env.GROQ_API_KEY
    ? new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
    })
    : null;

supportRouter.post("/transcribe", upload.single("audio"), async (req, res) => {
    try {
        if(!req.file){
            return res.status(400).json({success: false, message: "Audio file is required"});
        }
        const groq = getGroqClient();
        if(!groq){
            return res.status(503).json({success: false, message: "GROQ_API_KEY is required for deployed voice support"});
        }

        const audioFile = new File(
            [req.file.buffer],
            req.file.originalname || "support-call.webm",
            {type: req.file.mimetype || "audio/webm"}
        );

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
            language: process.env.SUPPORT_TRANSCRIPTION_LANGUAGE || "en"
        });
        const text = (transcription.text || "").trim();
        res.json({success: true, text});
    } catch (error) {
        console.error("Support transcription failed:", error.message);
        res.status(500).json({success: false, message: "Unable to transcribe audio"});
    }
});

export default supportRouter;
