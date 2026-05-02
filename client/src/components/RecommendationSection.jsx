import React, { useEffect, useState } from 'react'
import CarCard from './CarCard'
import { useAppContext } from '../context/AppContext'

const RecommendationSection = () => {
  const { axios } = useAppContext()
  const [cars, setCars] = useState([])

  useEffect(() => {
    const load = async () => {
      let visitorId = localStorage.getItem('intellirent_visitor_id')
      if (!visitorId) {
        visitorId = crypto.randomUUID()
        localStorage.setItem('intellirent_visitor_id', visitorId)
      }
      const { data } = await axios.get('/api/user/recommendations', {params: {visitorId, seed: Date.now()}})
      if (data.success) setCars(data.recommendations)
    }
    load()
  }, [axios])

  if (!cars.length) return null

  return (
    <section className="px-6 py-16 md:px-16 lg:px-24 xl:px-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">Smart picks</p>
        <h2 className="mt-3 text-4xl font-semibold text-gray-950 md:text-5xl">Recommended cars for fast booking</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cars.slice(0, 4).map((car) => <CarCard key={car._id} car={car} />)}
        </div>
      </div>
    </section>
  )
}

export default RecommendationSection
