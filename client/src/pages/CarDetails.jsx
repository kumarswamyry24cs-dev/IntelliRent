import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets'
import Loader from '../components/Loader'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { getDisplayCarImage, getFallbackCarImage } from '../utils/carImages'
import CarLocationMap from '../components/CarLocationMap'
import { formatCarPrice } from '../utils/currency'

const CarDetails = () => {

  const {id} = useParams()

  const {cars, axios, pickupDate, setPickupDate, returnDate, setReturnDate, user, fetchUser} = useAppContext()

  const navigate = useNavigate()
  const [car, setCar] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewForm, setReviewForm] = useState({rating: 5, comment: ''})

  const confirmPayment = async (bookingId, razorpayOrder, razorpayKeyId) => {
    const key = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!key) {
      toast.error('Razorpay key is missing. Set RAZORPAY_KEY_ID in server .env')
      return
    }
    if (!window.Razorpay) {
      toast.error('Razorpay Checkout script is not loaded')
      return
    }
    if (key && window.Razorpay) {
      const checkout = new window.Razorpay({
        key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'IntelliRent',
        description: `${car.brand} ${car.model}`,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          const { data } = await axios.post('/api/bookings/confirm-payment', {
            bookingId,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          })
          if (data.success) {
            toast.success('Payment confirmed')
            navigate('/my-bookings')
          } else {
            toast.error(data.message)
          }
        },
      })
      checkout.open()
      return
    }
  }

  const handleSubmit = async (e)=>{
    e.preventDefault();
    try {
      const {data} = await axios.post('/api/bookings/create', {
        car: id,
        pickupDate, 
        returnDate
      })

      if (data.success){
        toast.success(data.message)
        await confirmPayment(data.booking._id, data.razorpayOrder, data.razorpayKeyId)
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    setCar(cars.find(car => car._id === id))
  },[cars, id])

  useEffect(() => {
    const loadReviews = async () => {
      const { data } = await axios.get(`/api/user/cars/${id}/reviews`)
      if (data.success) setReviews(data.reviews)
    }
    loadReviews()
  }, [axios, id])

  const submitReview = async (e) => {
    e.preventDefault()
    const { data } = await axios.post(`/api/user/cars/${id}/reviews`, reviewForm)
    if (data.success) {
      toast.success(data.message)
      setReviewForm({rating: 5, comment: ''})
      const reviewsData = await axios.get(`/api/user/cars/${id}/reviews`)
      if (reviewsData.data.success) setReviews(reviewsData.data.reviews)
    } else {
      toast.error(data.message)
    }
  }

  return car ? (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>

      <button onClick={()=> navigate(-1)} className='flex items-center gap-2 mb-6 text-gray-500 cursor-pointer'>
        <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65'/>
        Back to all cars
       </button>

       <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
          {/* Left: Car Image & Details */}
          <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}

          className='lg:col-span-2'>
              <motion.img 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}

              src={getDisplayCarImage(car)} onError={(event) => { event.currentTarget.src = getFallbackCarImage(car) }} alt={`${car.brand} ${car.model}`} className='w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md'/>
              <motion.div className='space-y-6'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div>
                  <h1 className='text-3xl font-bold'>{car.brand} {car.model}</h1>
                  <p className='text-gray-500 text-lg'>{car.category} • {car.year}</p>
                </div>
                <hr className='border-borderColor my-6'/>

                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                  {[
                    {icon: assets.users_icon, text: `${car.seating_capacity} Seats`},
                    {icon: assets.fuel_icon, text: car.fuel_type},
                    {icon: assets.car_icon, text: car.transmission},
                    {icon: assets.location_icon, text: car.location},
                  ].map(({icon, text})=>(
                    <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    
                    key={text} className='flex flex-col items-center bg-light p-4 rounded-lg'>
                      <img src={icon} alt="" className='h-5 mb-2'/>
                      {text}
                    </motion.div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <h1 className='text-xl font-medium mb-3'>Description</h1>
                  <p className='text-gray-500'>{car.description}</p>
                </div>

                <CarLocationMap car={car} />

                {/* Features */}
                <div>
                  <h1 className='text-xl font-medium mb-3'>Features</h1>
                  <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    {
                      ["360 Camera", "Bluetooth", "GPS", "Heated Seats", "Rear View Mirror"].map((item)=>(
                        <li key={item} className='flex items-center text-gray-500'>
                          <img src={assets.check_icon} className='h-4 mr-2' alt="" />
                          {item}
                        </li>
                      ))
                    }
                  </ul>
                </div>

              </motion.div>
          </motion.div>

          {/* Right: Booking Form */}
          <motion.form 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}

          onSubmit={handleSubmit} className='shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6 text-gray-500'>

            <p className='flex items-center justify-between text-2xl text-gray-800 font-semibold'>{formatCarPrice(car)}<span className='text-base text-gray-400 font-normal'>per day</span></p> 

            <hr className='border-borderColor my-6'/>

            <div className='flex flex-col gap-2'>
              <label htmlFor="pickup-date">Pickup Date</label>
              <input value={pickupDate} onChange={(e)=>setPickupDate(e.target.value)}
              type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id='pickup-date' min={new Date().toISOString().split('T')[0]}/>
            </div>

            <div className='flex flex-col gap-2'>
              <label htmlFor="return-date">Return Date</label>
              <input value={returnDate} onChange={(e)=>setReturnDate(e.target.value)}
              type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id='return-date'/>
            </div>

            {!user?.driverLicense && (
              <div className='rounded-xl bg-light p-4'>
                <p className='mb-2 font-medium text-gray-800'>Driver license required</p>
                <p className='text-sm text-gray-500'>Upload your license on the verification page before checkout.</p>
                <button type="button" onClick={() => navigate('/license-upload')} className='mt-3 rounded-full bg-gray-900 px-4 py-2 text-sm text-white'>Go to license upload</button>
              </div>
            )}

            <button className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer'>Book & Pay</button>

            <p className='text-center text-sm'>Razorpay checkout enabled when keys are configured</p>

          </motion.form>
       </div>

       <section className='mt-14 rounded-3xl border border-borderColor bg-white p-6'>
        <div className='flex flex-col gap-6 lg:flex-row'>
          <div className='flex-1'>
            <h2 className='text-2xl font-semibold text-gray-900'>Reviews and ratings</h2>
            <div className='mt-5 space-y-4'>
              {reviews.length === 0 && <p className='text-gray-500'>No reviews yet.</p>}
              {reviews.map((review) => (
                <div key={review._id} className='rounded-2xl bg-light p-4'>
                  <p className='font-medium'>{review.user?.name || 'Customer'} - {review.rating}/5</p>
                  <p className='mt-1 text-gray-600'>{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={submitReview} className='flex-1 space-y-3'>
            <label className='block text-sm text-gray-600'>Rating</label>
            <select value={reviewForm.rating} onChange={(e) => setReviewForm({...reviewForm, rating: Number(e.target.value)})} className='w-full rounded-xl border border-borderColor px-4 py-3'>
              {[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
            </select>
            <label className='block text-sm text-gray-600'>Review</label>
            <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})} className='h-28 w-full rounded-xl border border-borderColor px-4 py-3' placeholder='Share your rental experience' />
            <button className='rounded-full bg-primary px-6 py-3 font-medium text-white'>Save review</button>
          </form>
        </div>
       </section>

    </div>
  ) : <Loader />
}

export default CarDetails
