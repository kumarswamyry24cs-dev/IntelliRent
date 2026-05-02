# CarRental Production Runbook

## Required services

- MongoDB Atlas or Docker MongoDB
- Razorpay account with key ID, key secret, and webhook secret
- Cloudinary account for vehicle, profile, and license uploads
- Groq API key for the AI/RAG assistant, with GitHub Models or OpenAI as fallback

## Server env

```env
PORT=3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace-with-strong-secret
CLIENT_URL=https://your-frontend.vercel.app
CURRENCY_CODE=INR
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GITHUB_TOKEN=github_pat_with_models_scope
GITHUB_MODEL=openai/gpt-5
# Optional override, defaults to https://models.github.ai/inference
GITHUB_MODELS_BASE_URL=https://models.github.ai/inference

# Preferred chatbot provider for fast dynamic answers
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo

# Booking confirmation email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
MAIL_FROM=IntelliRent <your-email@example.com>

# Alternative direct OpenAI fallback if GITHUB_TOKEN is not set:
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-5
```

## Client env

```env
VITE_BASE_URL=https://your-api.onrender.com
VITE_CURRENCY=₹
VITE_RAZORPAY_KEY_ID=...
VITE_GOOGLE_MAPS_API_KEY=...
```

## Razorpay setup

1. Log in to the Razorpay Dashboard.
2. Switch to Test Mode while developing, or Live Mode only after KYC and go-live approval.
3. Open Account & Settings -> API Keys.
4. Generate keys and copy both values immediately. Razorpay shows the Key Secret only once.
5. Put the values in `server/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=optional_webhook_secret
```

6. Restart the backend after editing `.env`.
7. The frontend receives the public `RAZORPAY_KEY_ID` from `/api/bookings/create`, so `VITE_RAZORPAY_KEY_ID` is optional for local development.
8. Keep Test keys with Test mode and Live keys with Live mode. Do not mix a Test order with a Live checkout key.
9. Razorpay Checkout must receive an `order_id` created by the server Orders API, then the server must verify `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` before confirming the booking.

## Maps and support

```env
VITE_GOOGLE_MAPS_API_KEY=your_browser_key
```

- Restrict the Google Maps browser key to your frontend domain in production.
- Cars seeded by `npm run seed:fleet` include city coordinates. The car details page uses coordinates first, then falls back to a city pickup search.
- Live support uses Socket.IO events from the existing backend.
- The support agent uses the same AI provider chain as the chatbot: Groq first, then GitHub Models, then OpenAI, then local support fallback.
- The support call agent records short microphone chunks in the browser and transcribes them on the backend with Groq Whisper. This is deployment-safe as long as the frontend is served over HTTPS and `GROQ_API_KEY` is configured on the backend.
- Microphone access requires HTTPS in production. Localhost works during development.
- For real email delivery, `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` must be configured on the backend. Without SMTP, the backend only generates a preview email and reports `confirmationEmailStatus=preview`.

## Verification

```bash
cd server && npm test
cd server && npm run seed:fleet
cd ../client && npm run build
docker compose up --build
```
