import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import healthRouter from "./routes/healthRoutes.js";
import supportRouter from "./routes/supportRoutes.js";
import { setSocketServer } from "./services/socketService.js";

// Initialize Express App
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {origin: process.env.CLIENT_URL || "*"}
})
setSocketServer(io);

// Connect Database
await connectDB()

// Middleware
app.use(cors({origin: process.env.CLIENT_URL || "*", credentials: true}));
app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({windowMs: 15 * 60 * 1000, max: 300}));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve('uploads')));
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

io.on("connection", (socket) => {
    socket.emit("availability:connected", {timestamp: new Date().toISOString()});
});

app.get('/', (req, res)=> res.send("Server is running"))
app.use('/api/health', healthRouter)
app.use('/api/user', userRouter)
app.use('/api/owner', ownerRouter)
app.use('/api/bookings', bookingRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/support', supportRouter)

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Server running on port ${PORT}`))
