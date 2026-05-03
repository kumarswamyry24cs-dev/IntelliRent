import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { uploadImage } from "../configs/cloudUpload.js";
import { isDbConnected } from "../utils/demoData.js";
import { emitAvailabilityUpdate } from "../services/socketService.js";
import { withDynamicCarImage } from "../services/carImageService.js";


// API to Change Role of User
export const changeRoleToOwner = async (req, res)=>{
    try {
        const {_id} = req.user;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Owner setup requires MongoDB."})
        }
        await User.findByIdAndUpdate(_id, {role: "owner"})
        res.json({success: true, message: "Now you can list cars"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to List Car

export const addCar = async (req, res)=>{
    try {
        const {_id} = req.user;
        let car = JSON.parse(req.body.carData);
        const imageFile = req.file;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Adding cars requires MongoDB."})
        }

        const image = await uploadImage({file: imageFile, folder: "cars", width: 1280});
        await Car.create({...car, owner: _id, image})
        emitAvailabilityUpdate({type: "car_added", car: {...car, owner: _id, image}});

        res.json({success: true, message: "Car Added"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to List Owner Cars
export const getOwnerCars = async (req, res)=>{
    try {
        const {role} = req.user;
        if(role !== 'owner'){
            return res.json({ success: false, message: "Unauthorized" });
        }
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Owner cars require MongoDB."})
        }
        const cars = await Car.find({}).sort({createdAt: -1})
        res.json({success: true, cars: cars.map(withDynamicCarImage)})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to Toggle Car Availability
export const toggleCarAvailability = async (req, res) =>{
    try {
        const {_id} = req.user;
        const {carId} = req.body
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Availability changes require MongoDB."})
        }
        const car = await Car.findById(carId)

        // Checking is car belongs to the user
        if(req.user.role !== "owner"){
            return res.json({ success: false, message: "Unauthorized" });
        }

        car.isAvaliable = !car.isAvaliable;
        await car.save()
        emitAvailabilityUpdate({type: "availability_toggled", carId, isAvaliable: car.isAvaliable});

        res.json({success: true, message: "Availability Toggled"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Api to delete a car
export const deleteCar = async (req, res) =>{
    try {
        const {_id} = req.user;
        const {carId} = req.body
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Removing cars requires MongoDB."})
        }
        const car = await Car.findById(carId)

        // Checking is car belongs to the user
        if(req.user.role !== "owner"){
            return res.json({ success: false, message: "Unauthorized" });
        }

        car.owner = null;
        car.isAvaliable = false;

        await car.save()
        emitAvailabilityUpdate({type: "car_removed", carId});

        res.json({success: true, message: "Car Removed"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to get Dashboard Data
export const getDashboardData = async (req, res) =>{
    try {
        const { _id, role } = req.user;

        if(role !== 'owner'){
            return res.json({ success: false, message: "Unauthorized" });
        }
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Dashboard metrics require MongoDB."});
        }

        const cars = await Car.find({})
        const bookings = await Booking.find({}).populate('car').sort({ createdAt: -1 });

        const pendingBookings = await Booking.find({status: "pending" })
        const completedBookings = await Booking.find({status: "confirmed" })

        // Calculate monthlyRevenue from bookings where status is confirmed
        const monthlyRevenue = bookings.slice().filter(booking => booking.status === 'confirmed').reduce((acc, booking)=> acc + booking.price, 0)
        const primaryRevenueLocation = bookings.find((booking) => booking.car?.location)?.car.location || "Mumbai";

        const dashboardData = {
            totalCars: cars.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: bookings.slice(0,3).map((booking) => ({...booking._doc, car: booking.car ? withDynamicCarImage(booking.car) : booking.car})),
            monthlyRevenue,
            primaryRevenueLocation
        }

        res.json({ success: true, dashboardData });

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to update user image

export const updateUserImage = async (req, res)=>{
    try {
        const { _id } = req.user;

        const imageFile = req.file;
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Profile uploads require MongoDB." })
        }

        const image = await uploadImage({file: imageFile, folder: "users", width: 400});

        await User.findByIdAndUpdate(_id, {image});
        res.json({success: true, message: "Image Updated" })

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}   
