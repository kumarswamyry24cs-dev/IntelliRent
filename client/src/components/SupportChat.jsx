import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const SupportChat = () => {
  const { socket, user } = useAppContext()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [thread, setThread] = useState([])
  const [callActive, setCallActive] = useState(false)
  const recognitionRef = useRef(null)
  const callActiveRef = useRef(false)
  const sessionId = useMemo(() => {
    let id = localStorage.getItem('intellirent_support_session')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('intellirent_support_session', id)
    }
    return id
  }, [])

  useEffect(() => {
    if (!socket) return
    const userName = user?.name || 'Guest'
    socket.emit('support:join', { sessionId, userName })
    const handleStatus = (payload) => {
      setThread((items) => [...items, { from: 'support-ai', message: payload.message }])
    }
    const handleMessage = (payload) => {
      setThread((items) => [...items, payload])
      if (payload.from === 'support-ai' && callActive && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.message))
      }
    }
    const handleCall = (payload) => {
      setOpen(true)
      setThread((items) => [...items, { from: 'support-ai', message: payload.message }])
    }
    socket.on('support:status', handleStatus)
    socket.on('support:message', handleMessage)
    socket.on('support:call:started', handleCall)
    return () => {
      socket.off('support:status', handleStatus)
      socket.off('support:message', handleMessage)
      socket.off('support:call:started', handleCall)
    }
  }, [socket, sessionId, user, callActive])

  const send = (event) => {
    event.preventDefault()
    if (!message.trim() || !socket) return
    socket.emit('support:message', {
      sessionId,
      userName: user?.name || 'Guest',
      message: message.trim(),
    })
    setMessage('')
  }

  const startCall = () => {
    if (!socket) return
    setCallActive(true)
    callActiveRef.current = true
    socket.emit('support:call', { sessionId, userName: user?.name || 'Guest' })
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        socket.emit('support:message', {
          sessionId,
          userName: user?.name || 'Guest',
          message: transcript,
        })
      }
    }
    recognition.onend = () => {
      if (callActiveRef.current) recognition.start()
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const endCall = () => {
    setCallActive(false)
    callActiveRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open && (
        <div className="mb-3 w-[min(92vw,390px)] rounded-2xl border border-borderColor bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-borderColor p-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">Live Support</p>
              <p className="text-sm text-gray-500">Socket.IO chat and AI call agent</p>
            </div>
            <button onClick={callActive ? endCall : startCall} className={`rounded-full px-3 py-2 text-sm font-medium text-white ${callActive ? 'bg-red-600' : 'bg-gray-900'}`}>
              {callActive ? 'End call' : 'Call AI'}
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-auto p-4">
            {thread.length === 0 && <p className="rounded-2xl bg-light px-4 py-2 text-sm text-gray-600">Support is ready for booking, payment, refund, license, or pickup questions.</p>}
            {callActive && <p className="rounded-2xl bg-green-50 px-4 py-2 text-sm text-green-700">AI support call is live. Speak naturally or type below.</p>}
            {thread.map((item, index) => (
              <p key={item.id || index} className={`rounded-2xl px-4 py-2 text-sm ${item.from === 'customer' ? 'ml-10 bg-primary text-white' : 'mr-10 bg-light text-gray-700'}`}>
                {item.message}
              </p>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-borderColor p-3">
            <input value={message} onChange={(event) => setMessage(event.target.value)} className="min-w-0 flex-1 rounded-full border border-borderColor px-4 py-2 outline-none" placeholder="Message support..." />
            <button className="rounded-full bg-primary px-4 py-2 text-white">Send</button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="rounded-full bg-gray-900 px-5 py-3 font-semibold text-white shadow-xl">
        Support
      </button>
    </div>
  )
}

export default SupportChat
