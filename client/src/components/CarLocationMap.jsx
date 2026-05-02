import React from 'react'

const CarLocationMap = ({ car }) => {
  const hasCoordinates = Number(car.coordinates?.lat) && Number(car.coordinates?.lng)
  const coordinateQuery = hasCoordinates ? `${car.coordinates.lat},${car.coordinates.lng}` : ''
  const labelQuery = `${car.location} IntelliRent ${car.brand} ${car.model} pickup`
  const query = encodeURIComponent(coordinateQuery || labelQuery)
  const src = `https://www.google.com/maps?q=${query}&z=13&output=embed`

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium">Pickup map</h2>
        <a className="text-sm font-medium text-primary" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
      </div>
      <p className="mb-3 text-sm text-gray-500">
        {car.location} pickup{hasCoordinates ? ` at ${car.coordinates.lat}, ${car.coordinates.lng}` : ''}
      </p>
      <div className="overflow-hidden rounded-xl border border-borderColor bg-light">
        <iframe
          title={`${car.brand} ${car.model} pickup map`}
          src={src}
          className="h-72 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  )
}

export default CarLocationMap
