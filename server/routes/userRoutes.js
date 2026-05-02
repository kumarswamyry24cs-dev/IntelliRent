import express from "express";
import { chatbotReply, forgotPassword, getCarReviews, getCars, getRecommendations, getUserData, loginUser, refreshAuthToken, registerUser, resetPassword, uploadDriverLicense, upsertCarReview, verifyEmail } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/refresh-token', refreshAuthToken)
userRouter.post('/verify-email', verifyEmail)
userRouter.post('/forgot-password', forgotPassword)
userRouter.post('/reset-password', resetPassword)
userRouter.get('/data', protect, getUserData)
userRouter.get('/cars', getCars)
userRouter.get('/recommendations', getRecommendations)
userRouter.post('/chatbot', chatbotReply)
userRouter.post('/driver-license', protect, upload.single("license"), uploadDriverLicense)
userRouter.get('/cars/:carId/reviews', getCarReviews)
userRouter.post('/cars/:carId/reviews', protect, upsertCarReview)

export default userRouter;
