import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
    booking: {type: mongoose.Schema.Types.ObjectId, ref: "Booking"},
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    invoiceNumber: {type: String, required: true, unique: true},
    amount: {type: Number, required: true},
    currency: {type: String, default: "INR"},
    status: {type: String, enum: ["issued", "void"], default: "issued"},
    issuedAt: {type: Date, default: Date.now}
}, {timestamps: true});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
