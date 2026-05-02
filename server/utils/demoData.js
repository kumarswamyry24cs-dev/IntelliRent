import mongoose from "mongoose";

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const demoCars = [
    {
        _id: "sample-bmw-x5",
        brand: "BMW",
        model: "X5",
        image: "",
        year: 2024,
        category: "SUV",
        seating_capacity: 5,
        fuel_type: "Hybrid",
        transmission: "Automatic",
        pricePerDay: 220,
        location: "Chicago",
        description: "Executive SUV with premium cabin, luggage space, and city-ready comfort.",
        isAvaliable: true
    },
    {
        _id: "sample-audi-a6",
        brand: "Audi",
        model: "A6",
        image: "",
        year: 2023,
        category: "Sedan",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 180,
        location: "New York",
        description: "Polished business sedan for airport pickups, client visits, and weekend drives.",
        isAvaliable: true
    },
    {
        _id: "sample-tesla-model-3",
        brand: "Tesla",
        model: "Model 3",
        image: "",
        year: 2025,
        category: "Electric",
        seating_capacity: 5,
        fuel_type: "Electric",
        transmission: "Automatic",
        pricePerDay: 200,
        location: "Los Angeles",
        description: "Electric rental with instant pickup, low running cost, and a quiet cabin.",
        isAvaliable: true
    }
];
