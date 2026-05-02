import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
    booking: {type: mongoose.Schema.Types.ObjectId, ref: "Booking"},
    paymentId: {type: String, default: ""},
    refundId: {type: String, default: ""},
    amount: {type: Number, required: true},
    reason: {type: String, default: ""},
    status: {type: String, enum: ["initiated", "processed", "failed"], default: "initiated"}
}, {timestamps: true});

const Refund = mongoose.model("Refund", refundSchema);

export default Refund;
