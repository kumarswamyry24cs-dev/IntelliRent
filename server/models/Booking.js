import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
    car: {type: ObjectId, ref: "Car", required: true},
    user: {type: ObjectId, ref: "User", required: true},
    owner: {type: ObjectId, ref: "User", required: true},
    pickupDate: {type: Date, required: true},
    returnDate: {type: Date, required: true},
    status: {type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending"},
    paymentStatus: {type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid"},
    paymentProvider: {type: String, default: "razorpay"},
    paymentId: {type: String, default: ""},
    paymentOrderId: {type: String, default: ""},
    confirmationEmailSentAt: {type: Date},
    confirmationEmailStatus: {type: String, enum: ["pending", "sent", "preview", "failed"], default: "pending"},
    confirmationEmailError: {type: String, default: ""},
    cancellationReason: {type: String, default: ""},
    cancelledAt: {type: Date},
    price: {type: Number, required: true}
},{timestamps: true})

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking
