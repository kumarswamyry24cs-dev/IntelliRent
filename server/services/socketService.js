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

        socket.on("support:message", ({sessionId = socket.id, message = "", userName = "Guest"} = {}) => {
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

            const assistantMessage = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                from: "support-ai",
                userName: "IntelliRent Support",
                message: buildSupportReply(cleanMessage),
                createdAt: new Date().toISOString()
            };
            thread.push(assistantMessage);
            setTimeout(() => io.to(`support:${sessionId}`).emit("support:message", assistantMessage), 350);
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

const buildSupportReply = (message) => {
    const lower = message.toLowerCase();
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
