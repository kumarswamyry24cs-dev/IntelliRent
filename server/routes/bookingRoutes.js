import express from "express";
import { cancelBooking, changeBookingStatus, checkAvailabilityOfCar, confirmBookingPayment, createBooking, getOwnerBookings, getUserBookings, razorpayWebhook } from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', checkAvailabilityOfCar)
bookingRouter.post('/create', protect, createBooking)
bookingRouter.post('/confirm-payment', protect, confirmBookingPayment)
bookingRouter.post('/cancel', protect, cancelBooking)
bookingRouter.get('/user', protect, getUserBookings)
bookingRouter.get('/owner', protect, getOwnerBookings)
bookingRouter.post('/change-status', protect, changeBookingStatus)
bookingRouter.post('/razorpay/webhook', razorpayWebhook)

export default bookingRouter;
