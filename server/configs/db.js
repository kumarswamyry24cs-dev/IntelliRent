import mongoose from "mongoose";

const connectDB = async ()=>{
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
        if(!mongoUri || mongoUri.includes("Enter your mongoDB URI here")){
            console.log("MongoDB URI is not configured. Add a valid MongoDB Atlas URI to server/.env.");
            return;
        }
        mongoose.connection.on('connected', ()=> console.log("Database Connected"));
        mongoose.set("bufferCommands", false);
        const databaseUri = mongoUri.endsWith("/car-rental") ? mongoUri : `${mongoUri.replace(/\/$/, "")}/car-rental`;
        await mongoose.connect(databaseUri, {
            serverSelectionTimeoutMS: 3000
        })
    } catch (error) {
        console.log(`Database unavailable. Real user features require MongoDB: ${error.message}`);
    }
}

export default connectDB;
