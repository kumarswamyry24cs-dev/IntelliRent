import Booking from "../models/Booking.js"
import Car from "../models/Car.js";
import { isDbConnected } from "../utils/demoData.js";
import Invoice from "../models/Invoice.js";
import Refund from "../models/Refund.js";
import { createPaymentOrder, verifyRazorpaySignature, verifyWebhookSignature } from "../services/paymentService.js";
import { writeAuditLog } from "../utils/audit.js";
import { withDynamicCarImage } from "../services/carImageService.js";
import { sendBookingConfirmationEmail } from "../services/emailService.js";


// Function to Check Availability of Car for a given Date
const checkAvailability = async (car, pickupDate, returnDate, {ignoreBookingIds = []} = {})=>{
    const query = {
        car,
        status: {$ne: "cancelled"},
        pickupDate: {$lte: returnDate},
        returnDate: {$gte: pickupDate},
    };
    if(ignoreBookingIds.length){
        query._id = {$nin: ignoreBookingIds};
    }
    const bookings = await Booking.find(query)
    return bookings.length === 0;
}

// API to Check Availability of Cars for the given Date and location
export const checkAvailabilityOfCar = async (req, res)=>{
    try {
        const {location, pickupDate, returnDate} = req.body
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Availability checks require MongoDB."})
        }

        // fetch all available cars for the given location
        const cars = await Car.find({location, isAvaliable: true})

        // check car availability for the given date range using promise
        const availableCarsPromises = cars.map(async (car)=>{
           const isAvailable = await checkAvailability(car._id, pickupDate, returnDate)
           return {...withDynamicCarImage(car), isAvailable: isAvailable}
        })

        let availableCars = await Promise.all(availableCarsPromises);
        availableCars = availableCars.filter(car => car.isAvailable === true)

        res.json({success: true, availableCars})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to Create Booking
export const createBooking = async (req, res)=>{
    try {
        const {_id} = req.user;
        const {car, pickupDate, returnDate} = req.body;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Real bookings require MongoDB."})
        }
        if (!req.user.driverLicense) {
            return res.json({success: false, message: "Upload your driver license before booking"})
        }

        const carData = await Car.findById(car)
        if(!carData || !carData.isAvaliable){
            return res.json({success: false, message: "Car is not available"})
        }

        // Calculate price based on pickupDate and returnDate
        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);
        const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24))
        if(noOfDays <= 0){
            return res.json({success: false, message: "Return date must be after pickup date"})
        }
        const price = carData.pricePerDay * noOfDays;

        let booking = await Booking.findOne({
            car,
            user: _id,
            status: "pending",
            paymentStatus: "unpaid",
            pickupDate: picked,
            returnDate: returned
        });

        const isAvailable = await checkAvailability(car, pickupDate, returnDate, {
            ignoreBookingIds: booking ? [booking._id] : []
        })
        if(!isAvailable){
            return res.json({success: false, message: "Car is not available for the selected dates"})
        }

        const reusedPendingBooking = Boolean(booking);
        if(!booking){
            booking = await Booking.create({car, owner: carData.owner, user: _id, pickupDate, returnDate, price})
        } else {
            booking.price = price;
            booking.owner = carData.owner;
        }
        const razorpayOrder = await createPaymentOrder({amount: price, currency: process.env.CURRENCY_CODE || "INR", receipt: booking._id.toString()});
        booking.paymentOrderId = razorpayOrder.id;
        await booking.save();
        await writeAuditLog(req, "booking.created", "Booking", booking._id.toString(), {price, reusedPendingBooking});

        res.json({
            success: true,
            message: "Booking ready. Complete payment to confirm.",
            booking,
            razorpayOrder,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        })

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to List User Bookings 
export const getUserBookings = async (req, res)=>{
    try {
        const {_id} = req.user;
        const bookings = await Booking.find({ user: _id }).populate("car").sort({createdAt: -1})
        res.json({success: true, bookings: bookings.map((booking) => ({...booking._doc, car: booking.car ? withDynamicCarImage(booking.car) : booking.car}))})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to get Owner Bookings

export const getOwnerBookings = async (req, res)=>{
    try {
        if(req.user.role !== 'owner'){
            return res.json({ success: false, message: "Unauthorized" })
        }
        const bookings = await Booking.find({}).populate('car user').select("-user.password").sort({createdAt: -1 })
        res.json({success: true, bookings: bookings.map((booking) => ({...booking._doc, car: booking.car ? withDynamicCarImage(booking.car) : booking.car}))})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to change booking status
export const changeBookingStatus = async (req, res)=>{
    try {
        const {_id} = req.user;
        const {bookingId, status} = req.body

        const booking = await Booking.findById(bookingId)

        if(req.user.role !== "owner"){
            return res.json({ success: false, message: "Unauthorized"})
        }

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: "Status Updated"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const confirmBookingPayment = async (req, res)=>{
    try {
        const {_id} = req.user;
        const {bookingId, paymentId = "", orderId = "", signature = ""} = req.body;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Payment confirmation requires MongoDB."})
        }
        const booking = await Booking.findOne({_id: bookingId, user: _id});
        if(!booking){
            return res.json({success: false, message: "Booking not found"})
        }
        if(booking.status === "cancelled"){
            return res.json({success: false, message: "Cancelled booking cannot be paid"})
        }
        if(!paymentId || !orderId || !signature){
            return res.json({success: false, message: "Razorpay payment id, order id, and signature are required"})
        }
        if(!verifyRazorpaySignature({orderId, paymentId, signature})){
            return res.json({success: false, message: "Payment signature verification failed"})
        }
        booking.status = "confirmed";
        booking.paymentStatus = "paid";
        booking.paymentId = paymentId;
        booking.paymentOrderId = orderId || booking.paymentOrderId;
        await booking.save();
        await Invoice.create({
            booking: booking._id,
            user: booking.user,
            invoiceNumber: `INV-${Date.now()}-${booking._id.toString().slice(-5)}`,
            amount: booking.price,
            currency: process.env.CURRENCY_CODE || "INR"
        });
        const populatedBooking = await Booking.findById(booking._id).populate("car user");
        let emailResult = {sent: false, preview: false};
        try {
            emailResult = await sendBookingConfirmationEmail({booking: populatedBooking});
            booking.confirmationEmailStatus = emailResult.sent ? "sent" : emailResult.preview ? "preview" : "failed";
            booking.confirmationEmailError = emailResult.reason || "";
            if(emailResult.sent) booking.confirmationEmailSentAt = new Date();
            await booking.save();
        } catch (emailError) {
            console.error("Booking confirmation email failed:", emailError.message);
            booking.confirmationEmailStatus = "failed";
            booking.confirmationEmailError = emailError.message;
            await booking.save();
        }
        await writeAuditLog(req, "payment.confirmed", "Booking", booking._id.toString(), {paymentId});
        const emailMessage = booking.confirmationEmailStatus === "sent"
            ? "Confirmation email sent."
            : booking.confirmationEmailStatus === "preview"
                ? "Payment confirmed. Email SMTP is not configured, so the email was generated in preview mode."
                : "Payment confirmed, but confirmation email failed.";
        res.json({success: true, message: `Payment confirmed. ${emailMessage}`, booking, email: {...emailResult, status: booking.confirmationEmailStatus}})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const cancelBooking = async (req, res)=>{
    try {
        const {_id} = req.user;
        const {bookingId, reason = "Cancelled by user"} = req.body;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Cancellation requires MongoDB."})
        }
        const booking = await Booking.findOne({_id: bookingId, user: _id});
        if(!booking){
            return res.json({success: false, message: "Booking not found"})
        }
        if(booking.status === "cancelled"){
            return res.json({success: false, message: "Booking is already cancelled"})
        }
        booking.status = "cancelled";
        booking.cancellationReason = reason;
        booking.cancelledAt = new Date();
        if(booking.paymentStatus === "paid"){
            booking.paymentStatus = "refunded";
            await Refund.create({
                booking: booking._id,
                paymentId: booking.paymentId,
                refundId: `refund_${Date.now()}`,
                amount: booking.price,
                reason,
                status: "processed"
            });
        }
        await booking.save();
        await writeAuditLog(req, "booking.cancelled", "Booking", booking._id.toString(), {reason});
        res.json({success: true, message: "Booking cancelled and refund processed", booking})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const razorpayWebhook = async (req, res)=>{
    try {
        const rawBody = req.rawBody || JSON.stringify(req.body);
        const signature = req.headers["x-razorpay-signature"];
        if(!verifyWebhookSignature(rawBody, signature)){
            return res.status(400).json({success: false, message: "Invalid webhook signature"})
        }
        const event = req.body.event;
        const payment = req.body.payload?.payment?.entity;
        if(event === "payment.captured" && payment?.order_id){
            const booking = await Booking.findOneAndUpdate(
                {paymentOrderId: payment.order_id},
                {status: "confirmed", paymentStatus: "paid", paymentId: payment.id},
                {new: true}
            ).populate("car user");
            if(booking){
                try {
                    const emailResult = await sendBookingConfirmationEmail({booking});
                    booking.confirmationEmailStatus = emailResult.sent ? "sent" : emailResult.preview ? "preview" : "failed";
                    booking.confirmationEmailError = emailResult.reason || "";
                    if(emailResult.sent) booking.confirmationEmailSentAt = new Date();
                    await booking.save();
                } catch (emailError) {
                    console.error("Webhook booking confirmation email failed:", emailError.message);
                    booking.confirmationEmailStatus = "failed";
                    booking.confirmationEmailError = emailError.message;
                    await booking.save();
                }
            }
        }
        res.json({success: true})
    } catch (error) {
        console.log(error.message);
        res.status(500).json({success: false, message: error.message})
    }
}
