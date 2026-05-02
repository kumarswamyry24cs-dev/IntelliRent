import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const Chatbot = () => {
  const { axios, navigate } = useAppContext()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [thread, setThread] = useState([{ from: 'bot', text: 'How can I help you this afternoon?' }])
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || loading) return
    const userMessage = message.trim()
    setThread((items) => [...items, { from: 'user', text: userMessage }])
    setMessage('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/user/chatbot', { message: userMessage })
      if (data.success) {
        setThread((items) => [...items, { from: 'bot', text: data.reply }])
        setCars(data.cars || [])
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      const fallback = 'I can help with car search, availability, booking, license upload, payments, cancellations, and recommendations. Try asking: "SUV in Chicago under 250" or "electric car in Los Angeles".'
      setThread((items) => [...items, { from: 'bot', text: fallback }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[min(92vw,380px)] rounded-2xl border border-borderColor bg-white shadow-2xl">
          <div className="border-b border-borderColor p-4">
            <p className="text-lg font-semibold text-gray-900">Rental Assistant</p>
            <p className="text-sm text-gray-500">Recommendations, availability, bookings</p>
          </div>
          <div className="max-h-80 space-y-3 overflow-auto p-4">
            {thread.map((item, index) => (
              <p key={index} className={`rounded-2xl px-4 py-2 text-sm ${item.from === 'user' ? 'ml-10 bg-primary text-white' : 'mr-10 bg-light text-gray-700'}`}>
                {item.text}
              </p>
            ))}
            {cars.map((car) => (
              <button key={car._id} onClick={() => navigate(`/car-details/${car._id}`)} className="block w-full rounded-xl border border-borderColor p-3 text-left text-sm hover:border-primary">
                <span className="font-semibold">{car.brand} {car.model}</span>
                <span className="block text-gray-500">{car.location} - {car.pricePerDay}/day</span>
              </button>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-borderColor p-3">
            <input value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-0 flex-1 rounded-full border border-borderColor px-4 py-2 outline-none" placeholder="Ask for SUV in Chicago..." />
            <button className="rounded-full bg-primary px-4 py-2 text-white">{loading ? '...' : 'Send'}</button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="rounded-full bg-primary px-5 py-3 font-semibold text-white shadow-xl">
        AI Chat
      </button>
    </div>
  )
}

export default Chatbot
