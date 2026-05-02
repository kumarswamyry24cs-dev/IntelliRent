import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from "crypto"
import Car from "../models/Car.js";
import Review from "../models/Review.js";
import { uploadImage } from "../configs/cloudUpload.js";
import { demoCars, isDbConnected } from "../utils/demoData.js";
import { answerWithFleetContext } from "../services/aiService.js";
import { withDynamicCarImage } from "../services/carImageService.js";


// Generate JWT Token
const generateToken = (userId)=>{
    const payload = userId;
    return jwt.sign(payload, process.env.JWT_SECRET)
}
const generateRefreshToken = (userId)=> jwt.sign({userId, type: "refresh"}, process.env.JWT_SECRET || "demo-secret", {expiresIn: "7d"})

// Register User
export const registerUser = async (req, res)=>{
    try {
        const {name, email, password} = req.body

        if(!name || !email || !password || password.length < 8){
            return res.json({success: false, message: 'Fill all the fields'})
        }

        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Connect MongoDB to create a real user account."})
        }

        const userExists = await User.findOne({email})
        if(userExists){
            return res.json({success: false, message: 'User already exists'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({name, email, password: hashedPassword})
        const token = generateToken(user._id.toString())
        const refreshToken = generateRefreshToken(user._id.toString())
        user.refreshToken = refreshToken;
        user.emailVerificationToken = crypto.randomBytes(24).toString("hex");
        await user.save();
        res.json({success: true, token, refreshToken, message: "Account created. Email verification token generated."})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Login User 
export const loginUser = async (req, res)=>{
    try {
        const {email, password} = req.body
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Real user login requires MongoDB."})
        }
        const user = await User.findOne({email})
        if(!user){
            return res.json({success: false, message: "User not found" })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.json({success: false, message: "Invalid Credentials" })
        }
        const token = generateToken(user._id.toString())
        const refreshToken = generateRefreshToken(user._id.toString())
        user.refreshToken = refreshToken;
        await user.save();
        res.json({success: true, token, refreshToken})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Get User data using Token (JWT)
export const getUserData = async (req, res) =>{
    try {
        const {user} = req;
        res.json({success: true, user})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Get All Cars for the Frontend
export const getCars = async (req, res) =>{
    try {
        const {location, brand, fuel_type, minPrice, maxPrice, sort = ""} = req.query;
        if(!isDbConnected()){
            let cars = demoCars
                .filter((car) => !location || car.location === location)
                .filter((car) => !brand || car.brand.toLowerCase().includes(brand.toLowerCase()))
                .filter((car) => !fuel_type || car.fuel_type === fuel_type)
                .filter((car) => !minPrice || car.pricePerDay >= Number(minPrice))
                .filter((car) => !maxPrice || car.pricePerDay <= Number(maxPrice));
            if(sort === "price_asc") cars = cars.sort((a,b) => a.pricePerDay - b.pricePerDay);
            if(sort === "price_desc") cars = cars.sort((a,b) => b.pricePerDay - a.pricePerDay);
            return res.json({success: true, cars: cars.map(withDynamicCarImage)})
        }
        const query = {isAvaliable: true};
        if(location) query.location = location;
        if(brand) query.brand = new RegExp(brand, "i");
        if(fuel_type) query.fuel_type = fuel_type;
        if(minPrice || maxPrice) query.pricePerDay = {};
        if(minPrice) query.pricePerDay.$gte = Number(minPrice);
        if(maxPrice) query.pricePerDay.$lte = Number(maxPrice);
        let request = Car.find(query);
        if(sort === "price_asc") request = request.sort({pricePerDay: 1});
        if(sort === "price_desc") request = request.sort({pricePerDay: -1});
        const cars = await request;
        res.json({success: true, cars: cars.map(withDynamicCarImage)})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const refreshAuthToken = async (req, res)=>{
    try {
        const {refreshToken} = req.body;
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "demo-secret");
        if(!decoded?.userId){
            return res.json({success: false, message: "Invalid refresh token"})
        }
        const user = await User.findById(decoded.userId);
        if(!user || user.refreshToken !== refreshToken){
            return res.json({success: false, message: "Invalid refresh token"})
        }
        res.json({success: true, token: generateToken(user._id.toString())})
    } catch (error) {
        res.json({success: false, message: "Invalid refresh token"})
    }
}

export const verifyEmail = async (req, res)=>{
    try {
        const user = await User.findOne({emailVerificationToken: req.body.token});
        if(!user) return res.json({success: false, message: "Invalid verification token"})
        user.isEmailVerified = true;
        user.emailVerificationToken = "";
        await user.save();
        res.json({success: true, message: "Email verified"})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const forgotPassword = async (req, res)=>{
    try {
        if(!isDbConnected()) return res.status(503).json({success: false, message: "Database is offline. Password reset requires MongoDB."})
        const user = await User.findOne({email: req.body.email});
        if(!user) return res.json({success: true, message: "If the account exists, reset instructions were generated"})
        user.passwordResetToken = crypto.randomBytes(24).toString("hex");
        user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        res.json({success: true, message: "Password reset token generated", resetToken: user.passwordResetToken})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const resetPassword = async (req, res)=>{
    try {
        const {token, password} = req.body;
        const user = await User.findOne({passwordResetToken: token, passwordResetExpires: {$gt: new Date()}});
        if(!user) return res.json({success: false, message: "Invalid or expired reset token"})
        user.password = await bcrypt.hash(password, 10);
        user.passwordResetToken = "";
        user.passwordResetExpires = undefined;
        await user.save();
        res.json({success: true, message: "Password reset successful"})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getRecommendations = async (req, res) =>{
    try {
        const {location = "", brand = "", maxPrice = "", visitorId = "", seed = ""} = req.query;
        const recommendationSeed = `${visitorId || req.headers["x-visitor-id"] || ""}-${seed || new Date().toISOString().slice(0, 10)}`;
        const seededRank = (car) => {
            const value = `${recommendationSeed}-${car._id}-${car.brand}-${car.location}`;
            let hash = 2166136261;
            for (let index = 0; index < value.length; index += 1) {
                hash ^= value.charCodeAt(index);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        };
        if(!isDbConnected()){
            const recommendations = demoCars
                .filter((car) => !location || car.location === location)
                .filter((car) => !brand || car.brand.toLowerCase().includes(brand.toLowerCase()))
                .filter((car) => !maxPrice || car.pricePerDay <= Number(maxPrice))
                .sort((a, b) => seededRank(a) - seededRank(b))
                .map(withDynamicCarImage)
                .map((car) => ({...car, reason: `${car.location} pickup, ${car.category} body, ${car.pricePerDay}/day`}));
            return res.json({success: true, recommendations})
        }
        const query = {isAvaliable: true};
        if(location) query.location = location;
        if(brand) query.brand = new RegExp(brand, "i");
        if(maxPrice) query.pricePerDay = {$lte: Number(maxPrice)};

        const cars = await Car.find(query).limit(30);
        const recommendations = cars.map(car => ({
            ...withDynamicCarImage(car),
            reason: `${car.location} pickup, ${car.category} body, ${car.pricePerDay}/day`
        })).sort((a, b) => seededRank(a) - seededRank(b)).slice(0, 8);
        res.json({success: true, recommendations})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const chatbotReply = async (req, res) =>{
    try {
        const {message = ""} = req.body;
        const cars = (isDbConnected() ? await Car.find({isAvaliable: true}).limit(150) : demoCars).map(withDynamicCarImage);
        const result = await answerWithFleetContext({
            message,
            cars,
            policies: [
                "Driver license upload is required before booking.",
                "Paid bookings can be cancelled and refunded from My Bookings.",
                "Razorpay is used for payment confirmation."
            ]
        });
        res.json({success: true, ...result})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const uploadDriverLicense = async (req, res)=>{
    try {
        const {_id} = req.user;
        const imageFile = req.file;
        if(!imageFile){
            return res.json({success: false, message: "License image is required"})
        }
        const driverLicense = await uploadImage({file: imageFile, folder: "driver-licenses", width: 1000});
        await User.findByIdAndUpdate(_id, {driverLicense});
        res.json({success: true, message: "Driver license uploaded", driverLicense})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const getCarReviews = async (req, res)=>{
    try {
        if(!isDbConnected()){
            return res.json({success: true, reviews: [], averageRating: 0})
        }
        const reviews = await Review.find({car: req.params.carId}).populate("user", "name image").sort({createdAt: -1});
        const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
        res.json({success: true, reviews, averageRating})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

export const upsertCarReview = async (req, res)=>{
    try {
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Reviews require a real user account."})
        }
        const {rating, comment} = req.body;
        const review = await Review.findOneAndUpdate(
            {car: req.params.carId, user: req.user._id},
            {rating, comment},
            {new: true, upsert: true, runValidators: true}
        ).populate("user", "name image");
        res.json({success: true, message: "Review saved", review})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}
