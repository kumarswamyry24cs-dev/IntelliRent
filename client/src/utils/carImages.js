import { assets } from '../assets/assets'

const vehicleImages = [
  assets.car_image1,
  assets.car_image2,
  assets.car_image3,
  assets.car_image4,
  assets.banner_car_image,
]

const hash = (value = '') => {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = ((result << 5) - result) + value.charCodeAt(index)
    result |= 0
  }
  return Math.abs(result)
}

export const getFallbackCarImage = (car = {}) => {
  const key = `${car.brand || ''}-${car.model || ''}-${car.category || ''}-${car._id || ''}`
  return vehicleImages[hash(key) % vehicleImages.length]
}

export const getDisplayCarImage = (car = {}) => {
  const image = car.image || ''
  if (!image || image.includes('placehold.co') || image.includes('source.unsplash.com')) {
    return getFallbackCarImage(car)
  }
  return image
}
