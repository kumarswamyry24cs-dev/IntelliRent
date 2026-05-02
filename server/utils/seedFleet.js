import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { buildSeedFleet } from "./fleetSeedData.js";

const connect = async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
    if(!mongoUri){
        throw new Error("Missing MONGO_URI or MONGODB_URI in server/.env");
    }
    const databaseUri = mongoUri.endsWith("/car-rental") ? mongoUri : `${mongoUri.replace(/\/$/, "")}/car-rental`;
    mongoose.set("bufferCommands", false);
    await mongoose.connect(databaseUri, {serverSelectionTimeoutMS: 10000});
};

const seedFleet = async () => {
    await connect();

    const ownerEmail = process.env.SEED_OWNER_EMAIL || "fleet-owner@intellirent.local";
    const owner = await User.findOneAndUpdate(
        {email: ownerEmail},
        {
            name: "IntelliRent Fleet",
            email: ownerEmail,
            password: await bcrypt.hash(process.env.SEED_OWNER_PASSWORD || "FleetOwner@123", 10),
            role: "owner",
            isEmailVerified: true
        },
        {new: true, upsert: true, setDefaultsOnInsert: true}
    );

    const fleet = buildSeedFleet();
    const operations = fleet.map((car) => ({
        updateOne: {
            filter: {
                brand: car.brand,
                model: car.model,
                location: car.location,
                year: car.year
            },
            update: {
                $set: {
                    ...car,
                    owner: owner._id
                }
            },
            upsert: true
        }
    }));

    const result = await Car.bulkWrite(operations, {ordered: false});
    const totalCars = await Car.countDocuments({isAvaliable: true});
    console.log(JSON.stringify({
        success: true,
        requestedFleetSize: fleet.length,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        matched: result.matchedCount,
        totalAvailableCars: totalCars
    }, null, 2));
};

seedFleet()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
