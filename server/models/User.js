import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true, unique: true },
    password: {type: String, required: true },
    role: {type: String, enum: ["owner", "user"], default: 'user' },
    image: {type: String, default: ''},
    driverLicense: {type: String, default: ''},
    isEmailVerified: {type: Boolean, default: false},
    refreshToken: {type: String, default: ""},
    emailVerificationToken: {type: String, default: ""},
    passwordResetToken: {type: String, default: ""},
    passwordResetExpires: {type: Date},
},{timestamps: true})

const User = mongoose.model('User', userSchema)

export default User
