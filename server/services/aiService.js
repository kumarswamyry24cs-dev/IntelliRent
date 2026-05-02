import OpenAI from "openai";

const GITHUB_MODELS_BASE_URL = "https://models.github.ai/inference";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const normalizeGitHubModel = (model = "") => {
    const trimmed = model.trim();
    if(!trimmed) return "openai/gpt-5";
    return trimmed.includes("/") ? trimmed : `openai/${trimmed}`;
};

const getAIProvider = () => {
    if(process.env.GROQ_API_KEY){
        return {
            name: "groq",
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            client: new OpenAI({
                apiKey: process.env.GROQ_API_KEY,
                baseURL: process.env.GROQ_BASE_URL || GROQ_BASE_URL
            })
        };
    }

    if(process.env.GITHUB_TOKEN){
        return {
            name: "github-models",
            model: normalizeGitHubModel(process.env.GITHUB_MODEL || process.env.OPENAI_MODEL || "gpt-5"),
            client: new OpenAI({
                apiKey: process.env.GITHUB_TOKEN,
                baseURL: process.env.GITHUB_MODELS_BASE_URL || GITHUB_MODELS_BASE_URL,
                defaultHeaders: {
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION || "2026-03-10"
                }
            })
        };
    }

    if(process.env.OPENAI_API_KEY){
        return {
            name: "openai",
            model: process.env.OPENAI_MODEL || "gpt-5",
            client: new OpenAI({apiKey: process.env.OPENAI_API_KEY})
        };
    }

    return null;
};

const localFleetReply = ({message, cars}) => {
    const lower = message.toLowerCase();
    if (/^(hi|hello|hey|how are you|how r u|good morning|good afternoon|good evening)\b/i.test(message.trim())) {
        return {
            reply: "I am ready to help with IntelliRent. You can ask me to find cars by city, budget, brand, fuel type, explain booking steps, guide license upload, or help with payments and cancellations.",
            cars: [],
            provider: "local-rag"
        };
    }
    if (/(book|reserve|rent|checkout)/.test(lower)) {
        return {
            reply: "To book a car, open a vehicle, choose pickup and return dates, upload your driver license if it is not already verified, then click Book & Pay. IntelliRent creates a Razorpay order and confirms the booking after payment verification.",
            cars: [],
            provider: "local-rag"
        };
    }
    if (/(cancel|refund)/.test(lower)) {
        return {
            reply: "To cancel, go to My Bookings and use Cancel + refund on an active booking. Paid bookings move to refunded status after cancellation is processed.",
            cars: [],
            provider: "local-rag"
        };
    }
    if (/(license|document|upload)/.test(lower)) {
        return {
            reply: "A driver license is required before payment. Open the License Upload page from the booking panel, choose your license image, preview it, and submit it before checkout.",
            cars: [],
            provider: "local-rag"
        };
    }
    if (/(payment|razorpay|pay)/.test(lower)) {
        return {
            reply: "Payments are handled through Razorpay Checkout. After payment, IntelliRent verifies the Razorpay signature on the server before marking the booking confirmed.",
            cars: [],
            provider: "local-rag"
        };
    }
    const budgetMatch = lower.match(/(?:under|below|less than|max|budget|within)\s*(?:rs\.?|inr|₹|\$)?\s*(\d+)/i) || lower.match(/(\d+)\s*(?:per day|\/day|day)/i);
    const maxBudget = budgetMatch ? Number(budgetMatch[1]) : null;
    const requestedFuel = ["Electric", "Hybrid", "Diesel", "Petrol"].find((fuel) => lower.includes(fuel.toLowerCase()));
    const requestedLocation = [...new Set(cars.map((car) => car.location))]
        .find((location) => lower.includes(location.toLowerCase()));
    const requestedCategory = [...new Set(cars.map((car) => car.category))]
        .find((category) => lower.includes(category.toLowerCase()));
    const requestedBrand = [...new Set(cars.map((car) => car.brand))]
        .find((brand) => lower.includes(brand.toLowerCase()));

    const exactMatches = cars.filter((car) =>
        (!requestedLocation || car.location === requestedLocation) &&
        (!requestedFuel || car.fuel_type === requestedFuel) &&
        (!requestedCategory || car.category === requestedCategory) &&
        (!requestedBrand || car.brand === requestedBrand) &&
        (!maxBudget || car.pricePerDay <= maxBudget)
    );

    let sourceCars = exactMatches.length ? exactMatches : cars;
    if(!exactMatches.length && requestedFuel){
        const fuelMatches = cars.filter((car) =>
            car.fuel_type === requestedFuel &&
            (!maxBudget || car.pricePerDay <= maxBudget)
        );
        if(fuelMatches.length) sourceCars = fuelMatches;
    }
    const scored = sourceCars
        .map((car) => {
            let score = 0;
            if(requestedLocation && car.location === requestedLocation) score += 5;
            if(requestedFuel && car.fuel_type === requestedFuel) score += 8;
            if(requestedCategory && car.category === requestedCategory) score += 4;
            if(requestedBrand && car.brand === requestedBrand) score += 4;
            if(maxBudget && car.pricePerDay <= maxBudget) score += 3;
            if(lower.includes(car.model.toLowerCase())) score += 4;
            if(!maxBudget || car.pricePerDay <= maxBudget) score += 1;
            return {car, score};
        })
        .filter(({score}) => score > 0)
        .sort((a, b) => b.score - a.score || a.car.pricePerDay - b.car.pricePerDay);
    const picks = (scored.length ? scored.map(({car}) => car) : sourceCars.slice().sort((a, b) => a.pricePerDay - b.pricePerDay)).slice(0, 3);
    if(!picks.length){
        return {
            reply: "I can help with booking steps, license upload, Razorpay payments, cancellations, refunds, and car recommendations. Add cars from the owner dashboard, then ask for a city, budget, brand, fuel type, or trip purpose for tailored fleet matches.",
            cars: [],
            provider: "local-rag"
        };
    }
    const exactPrefix = exactMatches.length
        ? ""
        : "I could not find an exact match for every requested filter, so here are the closest available options: ";
    return {
        reply: `${exactPrefix}Best fleet matches for your question: ${picks.map((car) => `${car.brand} ${car.model} in ${car.location} at ${car.pricePerDay}/day (${car.fuel_type}, ${car.category})`).join("; ")}. Tell me pickup dates or passenger count if you want me to narrow it further.`,
        cars: picks,
        provider: "local-rag"
    };
};

export const answerWithFleetContext = async ({message, cars, policies = []}) => {
    const context = [
        "Fleet:",
        ...cars.map((car) => `${car.brand} ${car.model}, ${car.category}, ${car.location}, ${car.fuel_type}, ${car.pricePerDay}/day, ${car.isAvaliable ? "available" : "unavailable"}`),
        "Policies:",
        ...policies
    ].join("\n");

    const provider = getAIProvider();
    if (!provider) {
        return localFleetReply({message, cars});
    }

    try {
        const response = await provider.client.chat.completions.create({
            model: provider.model,
            messages: [
                {
                    role: "system",
                    content: "You are IntelliRent's concise car rental assistant. Answer the user's exact question. Use the provided fleet and policy context for recommendations, booking steps, payment, cancellation, refund, license, and availability questions. Do not repeat a generic recommendation if the user asks how to use the app."
                },
                {
                    role: "user",
                    content: `${context}\n\nUser question: ${message}`
                }
            ],
            temperature: 0.4,
            max_tokens: 700
        });
        const reply = response.choices?.[0]?.message?.content?.trim();
        if(!reply) throw new Error("AI provider returned an empty response");
        return {reply, cars: [], provider: `${provider.name}:${provider.model}`};
    } catch (error) {
        console.error(`AI provider failed (${provider.name}:${provider.model}):`, error.message);
        return {
            ...localFleetReply({message, cars}),
            provider: "local-rag",
            aiProviderError: error.message
        };
    }
};
