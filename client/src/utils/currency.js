const indianLocations = new Set([
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Goa',
  'Jaipur',
  'Kochi',
  'Chandigarh',
])

export const getCurrencyForLocation = (location = '') => {
  if (indianLocations.has(location)) {
    return { code: 'INR', symbol: '₹', locale: 'en-IN' }
  }
  return { code: 'USD', symbol: '$', locale: 'en-US' }
}

export const formatLocationPrice = (amount = 0, location = '') => {
  const currency = getCurrencyForLocation(location)
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export const formatBookingPrice = (booking = {}) => formatLocationPrice(booking.price, booking.car?.location)
export const formatCarPrice = (car = {}) => formatLocationPrice(car.pricePerDay, car.location)
