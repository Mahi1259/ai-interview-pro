"use client"

import { useEffect, useRef, useState } from "react"

interface SpeechRecognitionProps {
  isListening: boolean
  onResult: (transcript: string) => void
  onStop: () => void
}

export default function SpeechRecognition({ isListening, onResult, onStop }: SpeechRecognitionProps) {
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRecognitionActive, setIsRecognitionActive] = useState(false)
  const [confidence, setConfidence] = useState(0)

  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef("")
  const isProcessingRef = useRef(false)

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      return
    }

    // Check for required features
    try {
      const testRecognition = new SpeechRecognition()
      if (!testRecognition) {
        throw new Error("Cannot create SpeechRecognition instance")
      }
    } catch (e) {
      setIsSupported(false)
      setError("Speech recognition initialization failed. Please refresh the page.")
      return
    }

    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition()

    // Enhanced configuration for better accuracy
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = "en-US"
    recognitionRef.current.maxAlternatives = 1
    // Remove this line: recognitionRef.current.grammars = null

    // Add these additional configurations for better performance
    if ("webkitSpeechRecognition" in window) {
      // Chrome-specific optimizations
      recognitionRef.current.serviceURI = undefined
    }

    // Event handlers
    recognitionRef.current.onstart = () => {
      console.log("🎤 Speech recognition started")
      setIsRecognitionActive(true)
      setError(null)
      setTranscript("")
      setInterimTranscript("")
      finalTranscriptRef.current = ""
      isProcessingRef.current = false
    }

    recognitionRef.current.onresult = (event: any) => {
      if (isProcessingRef.current) return

      let finalText = ""
      let interimText = ""

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()
        const confidence = result[0].confidence || 0

        if (result.isFinal) {
          finalText += transcript + " "
          setConfidence(confidence)
          console.log(`🎯 Final result: "${transcript}" (confidence: ${confidence.toFixed(2)})`)
        } else {
          interimText += transcript + " "
          console.log(`⏳ Interim result: "${transcript}"`)
        }
      }

      // Update states
      if (finalText.trim()) {
        finalTranscriptRef.current += finalText
        setTranscript(finalTranscriptRef.current.trim())

        // Clear any existing silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }

        // Set new silence timeout for final results
        silenceTimeoutRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim() && !isProcessingRef.current) {
            console.log("🔄 Processing final transcript:", finalTranscriptRef.current.trim())
            processTranscript(finalTranscriptRef.current.trim())
          }
        }, 1500) // Reduced from 2000ms to 1500ms for faster response
      }

      if (interimText.trim()) {
        setInterimTranscript(interimText.trim())
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.log("❌ Speech recognition error:", event.error)

      switch (event.error) {
        case "no-speech":
          setError("No speech detected. Please speak clearly into your microphone.")
          // Auto-restart for no-speech
          if (isListening) {
            scheduleRestart(1000)
          }
          break

        case "audio-capture":
          setError("Microphone not accessible. Please check your microphone permissions.")
          setIsRecognitionActive(false)
          onStop()
          break

        case "not-allowed":
          setError("Microphone permission denied. Please allow microphone access and refresh the page.")
          setIsRecognitionActive(false)
          onStop()
          break

        case "network":
          setError("Network error. Please check your internet connection.")
          if (isListening) {
            scheduleRestart(2000)
          }
          break

        case "aborted":
          console.log("Speech recognition aborted")
          setIsRecognitionActive(false)
          break

        case "service-not-allowed":
          setError("Speech recognition service not allowed. Please check your browser settings.")
          setIsRecognitionActive(false)
          onStop()
          break

        default:
          setError(`Speech recognition error: ${event.error}`)
          if (isListening) {
            scheduleRestart(1500)
          }
          break
      }
    }

    recognitionRef.current.onend = () => {
      console.log("🛑 Speech recognition ended")
      setIsRecognitionActive(false)

      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }

      // Auto-restart if we should still be listening and no error occurred
      if (isListening && !error && !isProcessingRef.current) {
        scheduleRestart(500)
      }
    }

    return () => {
      cleanup()
    }
  }, [isListening, error])

  const processTranscript = (text: string) => {
    if (isProcessingRef.current || !text.trim()) return

    isProcessingRef.current = true
    console.log("✅ Processing transcript:", text)

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Clear all timeouts
    clearAllTimeouts()

    // Send result
    onResult(text.trim())

    // Reset states
    setTranscript("")
    setInterimTranscript("")
    finalTranscriptRef.current = ""
    setIsRecognitionActive(false)
  }

  const scheduleRestart = (delay: number) => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }

    restartTimeoutRef.current = setTimeout(() => {
      if (isListening && recognitionRef.current && !isProcessingRef.current) {
        try {
          console.log("🔄 Restarting speech recognition...")
          recognitionRef.current.start()
        } catch (e) {
          console.log("Restart failed:", e)
        }
      }
    }, delay)
  }

  const clearAllTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
  }

  const cleanup = () => {
    console.log("🧹 Cleaning up speech recognition")

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current.onstart = null
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
    }

    clearAllTimeouts()
    setIsRecognitionActive(false)
    isProcessingRef.current = false
  }

  useEffect(() => {
    if (!isSupported) return

    if (isListening && recognitionRef.current && !isRecognitionActive && !isProcessingRef.current) {
      setError(null)
      try {
        console.log("🎤 Starting speech recognition...")
        recognitionRef.current.start()
      } catch (e) {
        console.log("Start failed:", e)
        setError("Failed to start speech recognition. Please try again.")
      }
    } else if (!isListening && recognitionRef.current && isRecognitionActive) {
      console.log("🛑 Stopping speech recognition...")
      recognitionRef.current.stop()
      cleanup()
    }
  }, [isListening, isSupported, isRecognitionActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive/90 border border-destructive rounded-lg p-4 max-w-md">
        <div className="text-center">
          <div className="text-destructive-foreground mb-2">❌ Speech Recognition Not Supported</div>
          <p className="text-sm text-destructive-foreground/80">
            Please use Chrome, Edge, or Safari for speech recognition features.
          </p>
        </div>
      </div>
    )
  }

  if (!isListening) return null

  const displayText = transcript || interimTranscript || ""
  const hasContent = displayText.length > 0

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-lg p-4 max-w-md shadow-lg z-50">
      <div className="text-center">
        {error ? (
          <div className="text-yellow-600 dark:text-yellow-400 mb-2">⚠️ {error}</div>
        ) : (
          <div className="flex items-center justify-center mb-2">
            <div className="animate-pulse text-destructive mr-2">🎤</div>
            <span className="text-sm font-medium">{isRecognitionActive ? "Listening..." : "Starting..."}</span>
            {confidence > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({Math.round(confidence * 100)}%)</span>
            )}
          </div>
        )}

        <div className="min-h-[40px] p-2 bg-muted rounded border">
          {hasContent ? (
            <div className="text-sm text-foreground">
              <span className="font-medium">{transcript}</span>
              {interimTranscript && <span className="text-muted-foreground italic"> {interimTranscript}</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Speak your answer...</p>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <p className="text-xs text-muted-foreground">Stop speaking for 1.5 seconds to submit</p>
          {error && error.includes("no-speech") && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Reconnecting...</p>
          )}
        </div>

        {/* Enhanced Visual microphone indicator */}
        <div className="flex justify-center mt-2">
          <div className="flex space-x-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isRecognitionActive ? "bg-destructive animate-pulse" : "bg-muted-foreground"
                }`}
                style={{
                  height: isRecognitionActive ? `${Math.random() * 20 + 8}px` : "8px",
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex justify-center mt-2 space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRecognitionActive ? "bg-green-500" : "bg-gray-400"}`} />
          <div className={`w-2 h-2 rounded-full ${hasContent ? "bg-blue-500" : "bg-gray-400"}`} />
          <div
            className={`w-2 h-2 rounded-full ${confidence > 0.7 ? "bg-green-500" : confidence > 0.4 ? "bg-yellow-500" : "bg-gray-400"}`}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Active • Content • Confidence</p>
      </div>
    </div>
  )
}
