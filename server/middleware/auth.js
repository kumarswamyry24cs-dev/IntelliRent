import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isDbConnected } from "../utils/demoData.js";

export const protect = async (req, res, next)=>{
    const token = req.headers.authorization;
    if(!token){
        return res.json({success: false, message: "not authorized"})
    }
    try {
        const userId = jwt.verify(token, process.env.JWT_SECRET || "demo-secret")

        if(!userId || typeof userId !== "string"){
            return res.json({success: false, message: "not authorized"})
        }
        if(!isDbConnected()){
            return res.status(503).json({success: false, message: "Database is offline. Real user authentication requires MongoDB."})
        }
        req.user = await User.findById(userId).select("-password")
        if(!req.user){
            return res.json({success: false, message: "not authorized"})
        }
        next();
    } catch (error) {
        return res.json({success: false, message: "not authorized"})
    }
}
