import crypto from "crypto";
import Razorpay from "razorpay";

const hasRazorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const razorpay = hasRazorpay
    ? new Razorpay({key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET})
    : null;

export const createPaymentOrder = async ({amount, currency = "INR", receipt}) => {
    if (!razorpay) {
        throw new Error("Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.");
    }
    return razorpay.orders.create({
        amount: amount * 100,
        currency,
        receipt,
        payment_capture: 1
    });
};

export const verifyRazorpaySignature = ({orderId, paymentId, signature}) => {
    if (!hasRazorpay) return false;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
    return expected === signature;
};

export const verifyWebhookSignature = (body, signature) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) return true;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");
    return expected === signature;
};
