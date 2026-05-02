import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const SupportChat = () => {
  const { socket, user } = useAppContext()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [thread, setThread] = useState([])
  const [callActive, setCallActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [typing, setTyping] = useState(false)
  const recognitionRef = useRef(null)
  const callActiveRef = useRef(false)
  const agentSpeakingRef = useRef(false)
  const silenceTimerRef = useRef(null)
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
      setThread((items) => items.length ? items : [{ from: 'support-ai', message: payload.message }])
    }
    const handleTyping = () => setTyping(true)
    const handleMessage = (payload) => {
      setTyping(false)
      setThread((items) => [...items, payload])
      if (payload.from === 'support-ai' && callActiveRef.current && 'speechSynthesis' in window) {
        agentSpeakingRef.current = true
        setListening(false)
        window.speechSynthesis.cancel()
        recognitionRef.current?.stop()
        const utterance = new SpeechSynthesisUtterance(payload.message)
        utterance.onend = () => {
          agentSpeakingRef.current = false
          if (callActiveRef.current) startListening()
        }
        utterance.onerror = () => {
          agentSpeakingRef.current = false
          if (callActiveRef.current) startListening()
        }
        window.speechSynthesis.speak(utterance)
      } else if (payload.from === 'support-ai' && callActiveRef.current) {
        startListening()
      }
    }
    const handleCall = (payload) => {
      setOpen(true)
      setThread((items) => [...items, { from: 'support-ai', message: payload.message }])
    }
    socket.on('support:status', handleStatus)
    socket.on('support:typing', handleTyping)
    socket.on('support:message', handleMessage)
    socket.on('support:call:started', handleCall)
    return () => {
      socket.off('support:status', handleStatus)
      socket.off('support:typing', handleTyping)
      socket.off('support:message', handleMessage)
      socket.off('support:call:started', handleCall)
    }
  }, [socket, sessionId, user?.name])

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

  const resetSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      if (callActiveRef.current) {
        setThread((items) => [...items, { from: 'support-ai', message: 'I did not hear anything for one minute, so I am ending the support call. You can start a new call anytime.' }])
        endCall()
      }
    }, 60000)
  }

  const startCall = () => {
    if (!socket) return
    setCallActive(true)
    callActiveRef.current = true
    setCallStatus('Waiting for your voice...')
    socket.emit('support:call', { sessionId, userName: user?.name || 'Guest' })
    resetSilenceTimer()
    setTimeout(() => {
      if (callActiveRef.current) startListening()
    }, 700)
  }

  const startListening = () => {
    if (!socket || !callActiveRef.current || agentSpeakingRef.current) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setCallStatus('Voice recognition is not supported in this browser. Type your message below.')
      return
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => {
      setListening(true)
      setCallStatus('Listening...')
    }
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        resetSilenceTimer()
        setCallStatus('Agent is preparing a response...')
        socket.emit('support:message', {
          sessionId,
          userName: user?.name || 'Guest',
          message: transcript,
        })
      }
    }
    recognition.onerror = () => {
      setListening(false)
      if (callActiveRef.current && !agentSpeakingRef.current) {
        setCallStatus('Waiting for your voice...')
        setTimeout(startListening, 700)
      }
    }
    recognition.onend = () => {
      setListening(false)
      if (callActiveRef.current && !agentSpeakingRef.current && !typing) {
        setCallStatus('Waiting for your voice...')
        setTimeout(startListening, 700)
      }
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  const endCall = () => {
    setCallActive(false)
    setListening(false)
    setCallStatus('')
    callActiveRef.current = false
    agentSpeakingRef.current = false
    clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
    recognitionRef.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  useEffect(() => () => {
    clearTimeout(silenceTimerRef.current)
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

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
            {callActive && (
              <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                <p>AI support call is live. Speak when you need help; the call ends automatically after 1 minute of silence.</p>
                <p className="mt-2 font-semibold">{callStatus || (listening ? 'Listening...' : 'Waiting for your voice...')}</p>
              </div>
            )}
            {thread.map((item, index) => (
              <p key={item.id || index} className={`rounded-2xl px-4 py-2 text-sm ${item.from === 'customer' ? 'ml-10 bg-primary text-white' : 'mr-10 bg-light text-gray-700'}`}>
                {item.message}
              </p>
            ))}
            {typing && <p className="mr-10 rounded-2xl bg-light px-4 py-2 text-sm text-gray-500">Support is checking this...</p>}
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
