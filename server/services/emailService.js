import nodemailer from "nodemailer";

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
    if(hasSmtpConfig){
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    return nodemailer.createTransport({
        jsonTransport: true
    });
};

const formatDate = (date) => new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
}).format(new Date(date));

export const sendBookingConfirmationEmail = async ({booking}) => {
    const user = booking.user;
    const car = booking.car;
    if(!user?.email || !car) return {sent: false, skipped: true};

    const transporter = getTransporter();
    const currency = process.env.CURRENCY_CODE || "INR";
    const subject = `IntelliRent booking confirmed - ${car.brand} ${car.model}`;
    const text = [
        `Hi ${user.name || "there"},`,
        "",
        "Your IntelliRent booking is confirmed.",
        "",
        `Car: ${car.brand} ${car.model} (${car.year})`,
        `Category: ${car.category}`,
        `Fuel: ${car.fuel_type}`,
        `Transmission: ${car.transmission}`,
        `Seats: ${car.seating_capacity}`,
        `Pickup location: ${car.location}`,
        `Pickup date: ${formatDate(booking.pickupDate)}`,
        `Return date: ${formatDate(booking.returnDate)}`,
        `Total paid: ${currency} ${booking.price}`,
        `Booking ID: ${booking._id}`,
        "",
        "Please carry your original driver license at pickup."
    ].join("\n");

    const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
            <h2>Your IntelliRent booking is confirmed</h2>
            <p>Hi ${user.name || "there"}, your booking payment has been verified.</p>
            <table style="border-collapse:collapse;width:100%;max-width:640px">
                <tr><td><strong>Car</strong></td><td>${car.brand} ${car.model} (${car.year})</td></tr>
                <tr><td><strong>Category</strong></td><td>${car.category}</td></tr>
                <tr><td><strong>Fuel</strong></td><td>${car.fuel_type}</td></tr>
                <tr><td><strong>Transmission</strong></td><td>${car.transmission}</td></tr>
                <tr><td><strong>Seats</strong></td><td>${car.seating_capacity}</td></tr>
                <tr><td><strong>Pickup location</strong></td><td>${car.location}</td></tr>
                <tr><td><strong>Pickup date</strong></td><td>${formatDate(booking.pickupDate)}</td></tr>
                <tr><td><strong>Return date</strong></td><td>${formatDate(booking.returnDate)}</td></tr>
                <tr><td><strong>Total paid</strong></td><td>${currency} ${booking.price}</td></tr>
                <tr><td><strong>Booking ID</strong></td><td>${booking._id}</td></tr>
            </table>
            <p>Please carry your original driver license at pickup.</p>
        </div>
    `;

    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER || "IntelliRent <no-reply@intellirent.local>",
        to: user.email,
        subject,
        text,
        html
    });

    if(!hasSmtpConfig){
        console.log("Booking confirmation email generated. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS to send real email.", info.message);
    }

    return {sent: hasSmtpConfig, preview: !hasSmtpConfig};
};
