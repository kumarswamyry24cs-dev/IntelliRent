import Car from "../models/Car.js";
import { answerWithFleetContext } from "./aiService.js";
import { withDynamicCarImage } from "./carImageService.js";
import { demoCars, isDbConnected } from "../utils/demoData.js";

let ioInstance = null;

const supportThreads = new Map();

const getSupportThread = (sessionId) => {
    if(!supportThreads.has(sessionId)){
        supportThreads.set(sessionId, []);
    }
    return supportThreads.get(sessionId);
};

export const setSocketServer = (io) => {
    ioInstance = io;

    io.on("connection", (socket) => {
        socket.on("support:join", ({sessionId = socket.id, userName = "Guest"} = {}) => {
            socket.join(`support:${sessionId}`);
            socket.emit("support:status", {
                sessionId,
                status: "connected",
                message: `Support connected for ${userName}.`
            });
        });

        socket.on("support:message", async ({sessionId = socket.id, message = "", userName = "Guest"} = {}) => {
            const cleanMessage = message.toString().trim();
            if(!cleanMessage) return;
            const thread = getSupportThread(sessionId);
            const customerMessage = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                from: "customer",
                userName,
                message: cleanMessage,
                createdAt: new Date().toISOString()
            };
            thread.push(customerMessage);
            io.to(`support:${sessionId}`).emit("support:message", customerMessage);

            const typingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            io.to(`support:${sessionId}`).emit("support:typing", {id: typingId, from: "support-ai"});
            const reply = await buildSupportReply(cleanMessage, thread);
            const assistantMessage = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                from: "support-ai",
                userName: "IntelliRent Support",
                message: reply,
                createdAt: new Date().toISOString()
            };
            thread.push(assistantMessage);
            io.to(`support:${sessionId}`).emit("support:message", assistantMessage);
        });

        socket.on("support:call", ({sessionId = socket.id, userName = "Guest"} = {}) => {
            socket.join(`support:${sessionId}`);
            io.to(`support:${sessionId}`).emit("support:call:started", {
                sessionId,
                userName,
                message: "AI support agent is ready. Describe your booking, payment, license, refund, or pickup issue."
            });
        });
    });
};

export const emitAvailabilityUpdate = (payload) => {
    if (ioInstance) {
        ioInstance.emit("availability:updated", payload);
    }
};

const buildSupportReply = async (message, thread = []) => {
    try {
        const cars = (isDbConnected() ? await Car.find({isAvaliable: true}).limit(80) : demoCars).map(withDynamicCarImage);
        const recent = thread.slice(-8).map((item) => `${item.from}: ${item.message}`).join("\n");
        const result = await answerWithFleetContext({
            message: [
                "You are IntelliRent live customer support, not a generic chatbot.",
                "Respond naturally in 2-5 concise sentences. Do not repeat greetings or ask the same question twice.",
                "Directly solve the user's current support issue. If information is missing, ask for exactly one next detail.",
                "Handle booking, availability, Razorpay payment, confirmation email, refunds, license upload, maps, filters, search, account, owner dashboard, and support-call issues.",
                `Recent support transcript:\n${recent}`,
                `Current customer message: ${message}`
            ].join("\n\n"),
            cars,
            policies: [
                "Ask for booking ID only when it is needed.",
                "Payments are confirmed only after Razorpay signature verification.",
                "Confirmation email is sent after successful payment confirmation when SMTP is configured.",
                "Driver license upload is required before checkout.",
                "Cancelled paid bookings are marked refunded in My Bookings.",
                "Google Maps uses car coordinates first and then city pickup fallback.",
                "If the user says the call or microphone is unstable, tell them to keep the browser tab focused, allow microphone permission, and speak after the Listening status appears."
            ]
        });
        if(result.provider === "local-rag"){
            return buildSupportFallback(message);
        }
        return result.reply;
    } catch (error) {
        console.error("Support AI failed:", error.message);
    }

    return buildSupportFallback(message);
};

const buildSupportFallback = (message) => {
    const lower = message.toLowerCase();
    if(/email|mail|confirmation|receipt|invoice/.test(lower)){
        return "For confirmation email issues, first confirm the payment is marked paid in My Bookings. The server sends email only after Razorpay signature verification or payment.captured webhook success. Also check that SMTP_HOST, SMTP_USER, SMTP_PASS, and MAIL_FROM are configured on the backend; without SMTP the app records the email as preview instead of sending it.";
    }
    if(/microphone|mic|listen|voice|call|agent|repeat|unstable|glitch/.test(lower)){
        return "For the AI support call, keep this browser tab focused, allow microphone permission, and speak only when the status says Listening. I pause listening while the agent speaks, then resume automatically. If no voice is detected for one minute, the call ends by itself.";
    }
    if(/map|google|location|pickup|coordinate|direction/.test(lower)){
        return "For pickup maps, open the car details page and check the Pickup map section. IntelliRent uses the car's saved coordinates first, then falls back to the city pickup location, and the Open in Google Maps link opens the same pickup point externally.";
    }
    if(/sort|filter|search|price|low|high|fuel/.test(lower)){
        return "For filtering cars, open Cars, choose a max price, fuel type, and sort order. Low to high sorts by daily price ascending, High to low sorts descending, and search works with brand, model, category, transmission, or location.";
    }
    if(/payment|razorpay|paid|pay/.test(lower)){
        return "I can help with payment issues. Please confirm the booking ID, payment status, and whether Razorpay opened successfully. If payment was captured, IntelliRent verifies the signature before confirming the booking.";
    }
    if(/cancel|refund/.test(lower)){
        return "For cancellation and refunds, open My Bookings and use Cancel + refund on an active booking. Paid bookings are marked refunded after cancellation processing.";
    }
    if(/license|document|upload/.test(lower)){
        return "A driver license is required before checkout. Open License Upload, select the license image, preview it, and submit it. After upload, return to the car page and continue booking.";
    }
    if(/car|vehicle|pickup|location|map/.test(lower)){
        return "Tell me the city, dates, budget, and fuel preference. I can help you find available cars and confirm the pickup map on the car details page.";
    }
    return "I am here with IntelliRent support. Share your booking ID or describe the issue, and I will guide you through the next step.";
};
