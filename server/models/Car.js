import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const carSchema = new mongoose.Schema({
    owner: {type: ObjectId, ref: 'User'},
    brand: {type: String, required: true},
    model: {type: String, required: true},
    image: {type: String, required: true},
    year: {type: Number, required: true},
    category: {type: String, required: true},
    seating_capacity: {type: Number, required: true},
    fuel_type: { type: String, required: true },
    transmission: { type: String, required: true },
    pricePerDay: { type: Number, required: true },
    location: { type: String, required: true },
    coordinates: {
        lat: {type: Number, default: 0},
        lng: {type: Number, default: 0}
    },
    description: { type: String, required: true },
    isAvaliable: {type: Boolean, default: true}
},{timestamps: true})

carSchema.index({location: 1, brand: 1, category: 1, pricePerDay: 1})

const Car = mongoose.model('Car', carSchema)

export default Car
