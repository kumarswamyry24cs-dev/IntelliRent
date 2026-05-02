const imageCache = new Map();

const normalize = (value = "") => value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const hashString = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

export const getDynamicCarImage = (car) => {
    const key = `${car.brand || ""}-${car.model || ""}-${car.category || ""}-${car._id || ""}`;
    if (imageCache.has(key)) return imageCache.get(key);

    const query = encodeURIComponent(`${car.brand || ""} ${car.model || ""} ${car.category || "car"} exterior`);
    const signature = hashString(key) % 10000;
    const url = `https://source.unsplash.com/1200x800/?${query}&sig=${signature}`;
    imageCache.set(key, url);
    return url;
};

export const withDynamicCarImage = (car) => {
    const plainCar = car?._doc ? car._doc : car;
    const storedImage = plainCar.image || "";
    return {
        ...plainCar,
        image: storedImage || getDynamicCarImage(plainCar),
        storedImage,
        imageSource: storedImage ? "stored" : "dynamic"
    };
};
