import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import Refund from "../models/Refund.js";
import { demoCars, isDbConnected } from "../utils/demoData.js";

export const getOwnerAnalytics = async (req, res) => {
    try {
        if(!isDbConnected()){
            return res.json({
                success: true,
                analytics: {
                    revenueSeries: [
                        {label: "Jan", revenue: 1200},
                        {label: "Feb", revenue: 1800},
                        {label: "Mar", revenue: 2400},
                        {label: "Apr", revenue: 3200}
                    ],
                    utilizationRate: 67,
                    topLocations: [
                        {location: "Chicago", bookings: 8},
                        {location: "New York", bookings: 6},
                        {location: "Los Angeles", bookings: 5}
                    ],
                    cancellationRate: 12,
                    refundTotal: 280
                }
            })
        }

        const cars = await Car.find({owner: req.user._id});
        const carIds = cars.map((car) => car._id);
        const bookings = await Booking.find({car: {$in: carIds}}).populate("car");
        const confirmed = bookings.filter((booking) => booking.status === "confirmed");
        const cancelled = bookings.filter((booking) => booking.status === "cancelled");
        const revenueByMonth = confirmed.reduce((acc, booking) => {
            const label = booking.createdAt.toLocaleString("en", {month: "short"});
            acc[label] = (acc[label] || 0) + booking.price;
            return acc;
        }, {});
        const locationMap = bookings.reduce((acc, booking) => {
            const location = booking.car?.location || "Unknown";
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {});
        const refunds = await Refund.find({booking: {$in: bookings.map((booking) => booking._id)}});
        res.json({
            success: true,
            analytics: {
                revenueSeries: Object.entries(revenueByMonth).map(([label, revenue]) => ({label, revenue})),
                utilizationRate: cars.length ? Math.round((confirmed.length / cars.length) * 100) : 0,
                topLocations: Object.entries(locationMap).map(([location, count]) => ({location, bookings: count})).sort((a,b) => b.bookings - a.bookings).slice(0, 5),
                cancellationRate: bookings.length ? Math.round((cancelled.length / bookings.length) * 100) : 0,
                refundTotal: refunds.reduce((sum, refund) => sum + refund.amount, 0)
            }
        })
    } catch (error) {
        res.json({success: false, message: error.message})
    }
};
