"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Video, VideoOff, Clock, User, AlertCircle, Eye, Monitor, Camera } from "lucide-react"
import InterviewTimer from "./interview-timer"
import SpeechRecognition from "./speech-recognition"
import InterviewFeedback from "./interview-feedback"
import AIAvatar from "./ai-avatar"
import AnimatedBackground from "./animated-background"
import InterviewInstructions from "./interview-instructions"

interface InterviewSessionProps {
  jobDescription: string
  resume: string
  onEnd: () => void
}

interface Question {
  id: number
  text: string
  category: "introduction" | "technical" | "behavioral" | "follow-up"
  asked: boolean
}

interface Response {
  questionId: number
  question: string
  answer: string
  timestamp: Date
  duration: number
}

type InterviewPhase =
  | "instructions"
  | "voice-intro"
  | "introduction"
  | "technical"
  | "behavioral"
  | "ending"
  | "feedback"

export default function InterviewSession({ jobDescription, resume, onEnd }: InterviewSessionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Response[]>([])
  const [isListening, setIsListening] = useState(false)
  const [interviewPhase, setInterviewPhase] = useState<InterviewPhase>("instructions")
  const [isLoading, setIsLoading] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [microphoneError, setMicrophoneError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [windowFocused, setWindowFocused] = useState(true)
  const [postureWarnings, setPostureWarnings] = useState(0)
  const [isPostureGood, setIsPostureGood] = useState(true)
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<"granted" | "denied" | "prompt" | "unknown">(
    "unknown",
  )
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isInterviewEnded, setIsInterviewEnded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const postureCheckRef = useRef<NodeJS.Timeout | null>(null)

  // Keep track of all timeouts to clear them when ending interview
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  // Question counters for each phase
  const [questionCounts, setQuestionCounts] = useState({
    introduction: 0,
    technical: 0,
    behavioral: 0,
  })

  // Current question index within phase
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const fallbackQuestions: Record<string, Question[]> = {
    introduction: [
      {
        id: 1,
        text: "Please introduce yourself - tell me your name, educational background, and a brief overview of your professional experience.",
        category: "introduction",
        asked: false,
      },
      {
        id: 2,
        text: "Can you walk me through your current role and what you do on a day-to-day basis?",
        category: "introduction",
        asked: false,
      },
      {
        id: 3,
        text: "Tell me about your educational background and how it led you to your current field.",
        category: "introduction",
        asked: false,
      },
    ],
    technical: [
      {
        id: 4,
        text: "Describe your experience with the main technologies mentioned in the job description.",
        category: "technical",
        asked: false,
      },
      {
        id: 5,
        text: "How would you approach solving a complex technical problem?",
        category: "technical",
        asked: false,
      },
      {
        id: 6,
        text: "What programming languages are you most comfortable with?",
        category: "technical",
        asked: false,
      },
      { id: 7, text: "Explain a technical project you're proud of.", category: "technical", asked: false },
      { id: 8, text: "How do you stay updated with new technologies?", category: "technical", asked: false },
    ],
    behavioral: [
      {
        id: 9,
        text: "What attracted you to this specific position and our company?",
        category: "behavioral",
        asked: false,
      },
      {
        id: 10,
        text: "Tell me about a challenging project you worked on and how you overcame obstacles.",
        category: "behavioral",
        asked: false,
      },
      {
        id: 11,
        text: "Describe a situation where you had to work with a difficult team member or handle conflict.",
        category: "behavioral",
        asked: false,
      },
      {
        id: 12,
        text: "Where do you see yourself in the next 3-5 years, and how does this role align with your career goals?",
        category: "behavioral",
        asked: false,
      },
    ],
  }

  // Helper function to create tracked timeouts
  const createTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId)
      if (!isInterviewEnded) {
        callback()
      }
    }, delay)
    timeoutsRef.current.add(timeoutId)
    return timeoutId
  }

  // Helper function to clear all timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    timeoutsRef.current.clear()
  }

  useEffect(() => {
    // Initialize camera when component mounts
    const initCamera = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay to ensure DOM is ready
      initializeCamera()
    }

    initCamera()
    setupWindowMonitoring()

    return () => {
      console.log("Component unmounting - cleaning up all resources")

      // Stop speech synthesis
      speechSynthesis.cancel()
      if (speechSynthRef.current) {
        speechSynthRef.current.onend = null
        speechSynthRef.current.onerror = null
      }

      // Stop all media streams - ENHANCED
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
          streamRef.current?.removeTrack(track)
        })
        streamRef.current = null
      }

      // Clear video element - ENHANCED with proper event cleanup
      if (videoRef.current) {
        // Remove ALL event listeners first
        videoRef.current.onloadedmetadata = null
        videoRef.current.onerror = null
        videoRef.current.onended = null
        videoRef.current.onplay = null
        videoRef.current.onpause = null

        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.src = ""
        videoRef.current.load()
      }

      // Clear all timeouts and intervals
      clearAllTimeouts()
      if (postureCheckRef.current) {
        clearInterval(postureCheckRef.current)
      }

      // Reset states
      setAiSpeaking(false)
      setIsListening(false)
    }
  }, [])

  useEffect(() => {
    // Cleanup function when component unmounts
    console.log("Component unmounting - cleaning up all resources")

    // Stop speech synthesis
    speechSynthesis.cancel()
    if (speechSynthRef.current) {
      speechSynthRef.current.onend = null
      speechSynthRef.current.onerror = null
    }

    // Stop all media streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Clear all timeouts and intervals
    clearAllTimeouts()
    if (postureCheckRef.current) {
      clearInterval(postureCheckRef.current)
    }

    // Reset states
    setAiSpeaking(false)
    setIsListening(false)
  }, [])

  const setupWindowMonitoring = () => {
    const handleFocus = () => setWindowFocused(true)
    const handleBlur = () => setWindowFocused(false)

    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }

  const initializeCamera = async () => {
    try {
      console.log("Requesting camera and microphone access...")
      setCameraError(null)
      setMicrophoneError(null)
      setIsVideoLoaded(false)

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser")
      }

      // Request user media with fallback constraints
      let stream: MediaStream

      try {
        // Try with ideal constraints first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (error) {
        console.log("Trying with basic constraints...")
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
      }

      console.log("Camera and microphone access granted")
      console.log(
        "Stream tracks:",
        stream.getTracks().map((track) => ({ kind: track.kind, enabled: track.enabled, readyState: track.readyState })),
      )

      streamRef.current = stream
      setCameraPermissionStatus("granted")

      // Wait for video element to be ready and set up the stream
      if (videoRef.current && !isInterviewEnded) {
        const video = videoRef.current

        // Clear any existing source first
        video.srcObject = null
        video.src = ""

        // Set the new stream
        video.srcObject = stream

        // Wait for the video to be ready
        await new Promise<void>((resolve, reject) => {
          let isResolved = false

          const onLoadedMetadata = () => {
            if (isResolved || isInterviewEnded) return
            isResolved = true

            console.log("Video metadata loaded")
            console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight)

            // Clean up listeners
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            video.removeEventListener("error", onError)

            setIsVideoLoaded(true)
            resolve()
          }

          const onError = (e: Event) => {
            if (isResolved || isInterviewEnded) return
            isResolved = true

            console.error("Video element error during initialization:", e)

            // Clean up listeners
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            video.removeEventListener("error", onError)

            reject(new Error("Video playback error"))
          }

          // Add listeners
          video.addEventListener("loadedmetadata", onLoadedMetadata)
          video.addEventListener("error", onError)

          // Force video to load and play
          video.load()

          // Try to play the video
          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise.catch((playError) => {
              if (isResolved || isInterviewEnded) return

              console.error("Video play error:", playError)

              // Try again after a short delay
              setTimeout(() => {
                if (!isResolved && !isInterviewEnded && video) {
                  video.play().catch((e) => {
                    if (!isResolved && !isInterviewEnded) {
                      console.error("Second play attempt failed:", e)
                      // Don't reject here, the video might still work
                      setIsVideoLoaded(true)
                      resolve()
                    }
                  })
                }
              }, 500)
            })
          }

          // Fallback timeout to prevent hanging
          setTimeout(() => {
            if (!isResolved && !isInterviewEnded) {
              console.log("Video loading timeout - proceeding anyway")
              isResolved = true
              video.removeEventListener("loadedmetadata", onLoadedMetadata)
              video.removeEventListener("error", onError)
              setIsVideoLoaded(true)
              resolve()
            }
          }, 5000)
        })
      }

      if (!isInterviewEnded) {
        startPostureMonitoring()
      }
    } catch (error: any) {
      if (isInterviewEnded) return // Don't process errors if interview has ended

      console.error("Error accessing camera/microphone:", error)

      let errorMessage = "Unable to access camera/microphone. "

      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone permissions and refresh the page."
        setCameraPermissionStatus("denied")
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found on this device."
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera/microphone is already in use by another application."
      } else if (error.name === "OverconstrainedError") {
        errorMessage += "Camera constraints could not be satisfied."
      } else if (error.message.includes("getUserMedia")) {
        errorMessage += "Your browser doesn't support camera access."
      } else {
        errorMessage += `Error: ${error.message}`
      }

      setCameraError(errorMessage)
      setMicrophoneError(errorMessage)
      setIsVideoLoaded(false)
    }
  }

  const requestCameraPermission = async () => {
    console.log("Retrying camera permission...")
    setCameraError(null)
    setMicrophoneError(null)
    setIsVideoLoaded(false)

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ""
    }

    // Wait a moment then reinitialize
    setTimeout(() => {
      initializeCamera()
    }, 100)
  }

  const startPostureMonitoring = () => {
    postureCheckRef.current = setInterval(() => {
      if (videoRef.current && streamRef.current && isVideoLoaded && !isInterviewEnded) {
        const randomCheck = Math.random()
        if (randomCheck < 0.1) {
          setIsPostureGood(false)
          setPostureWarnings((prev) => prev + 1)
          setTimeout(() => setIsPostureGood(true), 3000)
        }
      }
    }, 10000)
  }

  const startInterview = () => {
    setInterviewPhase("voice-intro")
    giveVoiceInstructions()
  }

  const giveVoiceInstructions = () => {
    if (isInterviewEnded) return

    const instruction = `
      Welcome to your AI-powered mock interview! I'm your virtual interviewer today. 
      
      This interview has three phases: First, I'll ask some introduction questions to get to know you personally and professionally. Then, we'll move to technical questions about your skills. Finally, I'll ask behavioral questions about your experience.
      
      Please speak clearly. When you finish answering, stop speaking for 2 seconds and I'll move to the next question.
      
      Let's begin with the introduction phase. I'm excited to learn about you!
    `

    speakQuestion(instruction, () => {
      if (!isInterviewEnded) {
        setInterviewPhase("introduction")
        generateQuestionsForPhase("introduction")
      }
    })
  }

  const generateQuestionsForPhase = async (phase: "introduction" | "technical" | "behavioral") => {
    if (isInterviewEnded) return

    setIsLoading(true)
    console.log(`Generating questions for phase: ${phase}`)

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resume, phase }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Generated questions for ${phase}:`, data)

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setCurrentQuestion(data.questions[0])
        setCurrentQuestionIndex(0)

        // Only speak immediately for introduction phase
        // For technical and behavioral, the transition message will handle speaking
        if (phase === "introduction") {
          createTimeout(() => {
            speakQuestion(data.questions[0].text)
          }, 1000)
        }
      } else {
        console.error("No questions received from API")
        // Use fallback questions
        const fallbackQuestionsForPhase = fallbackQuestions[phase] || fallbackQuestions.introduction
        setQuestions(fallbackQuestionsForPhase)
        setCurrentQuestion(fallbackQuestionsForPhase[0])
        setCurrentQuestionIndex(0)

        // Only speak immediately for introduction phase
        if (phase === "introduction") {
          createTimeout(() => {
            speakQuestion(fallbackQuestionsForPhase[0].text)
          }, 1000)
        }
      }
    } catch (error) {
      console.error("Error generating questions:", error)
      // Use fallback questions
      const fallbackQuestionsForPhase = fallbackQuestions[phase] || fallbackQuestions.introduction
      setQuestions(fallbackQuestionsForPhase)
      setCurrentQuestion(fallbackQuestionsForPhase[0])
      setCurrentQuestionIndex(0)

      // Only speak immediately for introduction phase
      if (phase === "introduction") {
        createTimeout(() => {
          speakQuestion(fallbackQuestionsForPhase[0].text)
        }, 1000)
      }
    }
    setIsLoading(false)
  }

  const speakQuestion = (text: string, onComplete?: () => void) => {
    // Check if interview has ended before starting speech
    if (isInterviewEnded) {
      console.log("Interview ended - not speaking")
      return
    }

    console.log("AI speaking:", text.substring(0, 50) + "...")
    setAiSpeaking(true)

    // Stop any existing speech
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onend = () => {
      console.log("AI finished speaking")
      setAiSpeaking(false)

      // Double-check interview status before proceeding
      if (isInterviewEnded) {
        console.log("Interview ended during speech - stopping")
        return
      }

      if (onComplete) {
        onComplete()
      } else if (isMicOn && interviewPhase !== "voice-intro") {
        console.log("Starting to listen for user response...")
        createTimeout(() => {
          if (!isInterviewEnded) {
            setIsListening(true)
          }
        }, 1000)
      }
    }

    utterance.onerror = (event) => {
      // Only log actual errors, not cancellation events
      if (event.error !== "canceled" && event.error !== "interrupted") {
        console.error("Speech synthesis error:", event.error)
      } else {
        console.log("Speech synthesis was cancelled")
      }

      setAiSpeaking(false)

      // Don't proceed if interview has ended
      if (isInterviewEnded) return

      if (onComplete) {
        onComplete()
      } else if (isMicOn && interviewPhase !== "voice-intro") {
        createTimeout(() => {
          if (!isInterviewEnded) {
            setIsListening(true)
          }
        }, 1000)
      }
    }

    speechSynthRef.current = utterance
    speechSynthesis.speak(utterance)
  }

  const handleResponse = async (answer: string) => {
    if (!currentQuestion || isInterviewEnded) return

    console.log("User response received:", answer.substring(0, 50) + "...")

    const response: Response = {
      questionId: currentQuestion.id,
      question: currentQuestion.text,
      answer,
      timestamp: new Date(),
      duration: 0,
    }

    const newResponses = [...responses, response]
    setResponses(newResponses)
    setIsListening(false)

    // Update question counts
    const newCounts = { ...questionCounts }
    if (currentQuestion.category === "introduction") newCounts.introduction++
    else if (currentQuestion.category === "technical") newCounts.technical++
    else if (currentQuestion.category === "behavioral") newCounts.behavioral++
    setQuestionCounts(newCounts)

    console.log("Updated counts:", newCounts, "Current phase:", interviewPhase)

    // Mark current question as asked
    const updatedQuestions = questions.map((q) => (q.id === currentQuestion.id ? { ...q, asked: true } : q))
    setQuestions(updatedQuestions)

    // Add a brief pause before next question
    createTimeout(() => {
      determineNextStep(newCounts, newResponses)
    }, 2000)
  }

  const determineNextStep = async (counts: typeof questionCounts, allResponses: Response[]) => {
    if (isInterviewEnded) return

    console.log("Determining next step - Phase:", interviewPhase, "Counts:", counts)

    // Introduction phase: Ask exactly 3 questions
    if (interviewPhase === "introduction") {
      if (counts.introduction < 3) {
        // Ask next question in current phase
        const nextIndex = currentQuestionIndex + 1
        if (nextIndex < questions.length) {
          console.log("Moving to next question in introduction phase:", nextIndex)
          setCurrentQuestionIndex(nextIndex)
          setCurrentQuestion(questions[nextIndex])
          createTimeout(() => {
            speakQuestion(questions[nextIndex].text)
          }, 1000)
        } else {
          // Generate more questions if needed
          console.log("Generating additional introduction question")
          await generateNextQuestionInPhase("introduction", allResponses)
        }
      } else {
        // Move to technical phase - FIRST generate questions, THEN transition
        console.log("Moving to technical phase - generating questions first")
        setInterviewPhase("technical")
        setCurrentQuestionIndex(0)

        // Generate technical questions and wait for them to be ready
        try {
          setIsLoading(true)
          const response = await fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription, resume, phase: "technical" }),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          console.log("Generated technical questions:", data)

          let technicalQuestions = []
          if (data.questions && data.questions.length > 0) {
            technicalQuestions = data.questions
          } else {
            // Use fallback technical questions
            technicalQuestions = fallbackQuestions.technical
          }

          // Update questions state and set current question
          setQuestions(technicalQuestions)
          setCurrentQuestion(technicalQuestions[0])
          setIsLoading(false)

          // Now speak the transition message
          const transitionMessage =
            "Great! Thank you for that introduction. Now let's move to the technical questions. These will focus on your technical skills and knowledge relevant to the position."

          speakQuestion(transitionMessage, () => {
            if (!isInterviewEnded && technicalQuestions[0]) {
              // Speak the first technical question after transition
              createTimeout(() => {
                console.log("Speaking first technical question:", technicalQuestions[0].text)
                speakQuestion(technicalQuestions[0].text)
              }, 1000)
            }
          })
        } catch (error) {
          console.error("Error generating technical questions:", error)
          setIsLoading(false)

          // Use fallback questions
          const technicalQuestions = fallbackQuestions.technical
          setQuestions(technicalQuestions)
          setCurrentQuestion(technicalQuestions[0])

          const transitionMessage =
            "Great! Thank you for that introduction. Now let's move to the technical questions. These will focus on your technical skills and knowledge relevant to the position."

          speakQuestion(transitionMessage, () => {
            if (!isInterviewEnded && technicalQuestions[0]) {
              createTimeout(() => {
                console.log("Speaking first technical question (fallback):", technicalQuestions[0].text)
                speakQuestion(technicalQuestions[0].text)
              }, 1000)
            }
          })
        }
      }
    }
    // Technical phase: Ask exactly 5 questions
    else if (interviewPhase === "technical") {
      if (counts.technical < 5) {
        const nextIndex = currentQuestionIndex + 1
        if (nextIndex < questions.length) {
          console.log("Moving to next question in technical phase:", nextIndex)
          setCurrentQuestionIndex(nextIndex)
          setCurrentQuestion(questions[nextIndex])
          createTimeout(() => {
            speakQuestion(questions[nextIndex].text)
          }, 1000)
        } else {
          console.log("Generating additional technical question")
          await generateNextQuestionInPhase("technical", allResponses)
        }
      } else {
        // Move to behavioral phase - FIRST generate questions, THEN transition
        console.log("Moving to behavioral phase - generating questions first")
        setInterviewPhase("behavioral")
        setCurrentQuestionIndex(0)

        // Generate behavioral questions and wait for them to be ready
        try {
          setIsLoading(true)
          const response = await fetch("/api/generate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescription, resume, phase: "behavioral" }),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          console.log("Generated behavioral questions:", data)

          let behavioralQuestions = []
          if (data.questions && data.questions.length > 0) {
            behavioralQuestions = data.questions
          } else {
            // Use fallback behavioral questions
            behavioralQuestions = fallbackQuestions.behavioral
          }

          // Update questions state and set current question
          setQuestions(behavioralQuestions)
          setCurrentQuestion(behavioralQuestions[0])
          setIsLoading(false)

          // Now speak the transition message
          const transitionMessage =
            "Excellent! Now for the final phase, I'll ask you some behavioral questions. These will help me understand your experience and how you handle different situations."

          speakQuestion(transitionMessage, () => {
            if (!isInterviewEnded && behavioralQuestions[0]) {
              // Speak the first behavioral question after transition
              createTimeout(() => {
                console.log("Speaking first behavioral question:", behavioralQuestions[0].text)
                speakQuestion(behavioralQuestions[0].text)
              }, 1000)
            }
          })
        } catch (error) {
          console.error("Error generating behavioral questions:", error)
          setIsLoading(false)

          // Use fallback questions
          const behavioralQuestions = fallbackQuestions.behavioral
          setQuestions(behavioralQuestions)
          setCurrentQuestion(behavioralQuestions[0])

          const transitionMessage =
            "Excellent! Now for the final phase, I'll ask you some behavioral questions. These will help me understand your experience and how you handle different situations."

          speakQuestion(transitionMessage, () => {
            if (!isInterviewEnded && behavioralQuestions[0]) {
              createTimeout(() => {
                console.log("Speaking first behavioral question (fallback):", behavioralQuestions[0].text)
                speakQuestion(behavioralQuestions[0].text)
              }, 1000)
            }
          })
        }
      }
    }
    // Behavioral phase: Ask exactly 4 questions
    else if (interviewPhase === "behavioral") {
      if (counts.behavioral < 4) {
        const nextIndex = currentQuestionIndex + 1
        if (nextIndex < questions.length) {
          console.log("Moving to next question in behavioral phase:", nextIndex)
          setCurrentQuestionIndex(nextIndex)
          setCurrentQuestion(questions[nextIndex])
          createTimeout(() => {
            speakQuestion(questions[nextIndex].text)
          }, 1000)
        } else {
          console.log("Generating additional behavioral question")
          await generateNextQuestionInPhase("behavioral", allResponses)
        }
      } else {
        // End interview
        console.log("Ending interview")
        endInterview()
      }
    }
  }

  const generateNextQuestionInPhase = async (phase: string, allResponses: Response[]) => {
    if (isInterviewEnded) return

    setIsLoading(true)
    console.log(`Generating next question for phase: ${phase}`)

    try {
      const response = await fetch("/api/generate-next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          resume,
          responses: allResponses,
          currentPhase: phase,
          questionCount: questionCounts[phase as keyof typeof questionCounts],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Generated next question for ${phase}:`, data)

      if (data.question) {
        const newQuestion: Question = {
          id: Date.now(),
          text: data.question,
          category: phase as any,
          asked: false,
        }
        setCurrentQuestion(newQuestion)
        setQuestions((prev) => [...prev, newQuestion])
        setCurrentQuestionIndex(questions.length)

        createTimeout(() => {
          speakQuestion(newQuestion.text)
        }, 1000)
      }
    } catch (error) {
      console.error("Error generating next question:", error)
    }
    setIsLoading(false)
  }

  const endInterview = () => {
    if (isInterviewEnded) return

    setInterviewPhase("ending")
    setCurrentQuestion(null)
    setIsListening(false)

    const thankYouMessage = `
      Congratulations! You have successfully completed your mock interview. 
      
      You answered all the questions across the three phases - introduction, technical, and behavioral. 
      
      Thank you for your time and effort today. You demonstrated great professionalism throughout the interview process.
      
      I will now analyze all of your responses and provide you with detailed feedback, including your strengths, areas for improvement, and specific recommendations to help you excel in your future interviews.
      
      Please wait a moment while I prepare your comprehensive performance report.
    `

    speakQuestion(thankYouMessage, () => {
      if (!isInterviewEnded) {
        createTimeout(() => {
          setInterviewPhase("feedback")
        }, 2000)
      }
    })
  }

  const handleEndInterview = () => {
    console.log("Ending interview - immediately stopping all resources")

    // Set interview ended flag first to prevent any new actions
    setIsInterviewEnded(true)

    // 1. IMMEDIATELY stop all speech synthesis
    speechSynthesis.cancel()
    if (speechSynthRef.current) {
      speechSynthRef.current.onend = null
      speechSynthRef.current.onerror = null
    }

    // 2. IMMEDIATELY stop all media streams (camera and microphone)
    if (streamRef.current) {
      console.log("Stopping all media tracks...")
      streamRef.current.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track - readyState: ${track.readyState}`)
        track.stop()
        streamRef.current?.removeTrack(track)
      })
      streamRef.current = null
    }

    // 3. Clear video element completely with comprehensive cleanup
    if (videoRef.current) {
      console.log("Clearing video element...")

      // Remove ALL possible event listeners
      const video = videoRef.current
      video.onloadedmetadata = null
      video.onerror = null
      video.onended = null
      video.onplay = null
      video.onpause = null
      video.onloadstart = null
      video.onloadeddata = null
      video.oncanplay = null
      video.oncanplaythrough = null
      video.onstalled = null
      video.onsuspend = null
      video.onwaiting = null
      video.onabort = null
      video.onemptied = null

      // Remove event listeners using removeEventListener as well
      const events = [
        "loadedmetadata",
        "error",
        "ended",
        "play",
        "pause",
        "loadstart",
        "loadeddata",
        "canplay",
        "canplaythrough",
        "stalled",
        "suspend",
        "waiting",
        "abort",
        "emptied",
      ]
      events.forEach((eventType) => {
        video.removeEventListener(eventType, () => {})
      })

      // Pause and clear sources
      video.pause()
      video.srcObject = null
      video.src = ""
      video.load() // Force reload to clear any cached data
    }

    // 4. Clear all pending timeouts immediately
    clearAllTimeouts()

    // 5. Stop posture monitoring
    if (postureCheckRef.current) {
      clearInterval(postureCheckRef.current)
      postureCheckRef.current = null
    }

    // 6. Reset all states immediately
    setAiSpeaking(false)
    setIsListening(false)
    setCurrentQuestion(null)
    setIsLoading(false)
    setIsCameraOn(false)
    setIsMicOn(false)
    setIsVideoLoaded(false)
    setCameraError(null)
    setMicrophoneError(null)
    setCameraPermissionStatus("unknown")

    // 7. Call the parent onEnd function immediately
    onEnd()
  }

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn
        setIsCameraOn(!isCameraOn)
      }
    }
  }

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isMicOn
        setIsMicOn(!isMicOn)

        if (!isMicOn && isListening) {
          setIsListening(false)
        }
      }
    }
  }

  const handleManualNext = () => {
    if (currentQuestion && !isInterviewEnded) {
      // Cancel any ongoing speech synthesis
      speechSynthesis.cancel()
      setAiSpeaking(false)

      // Process the skip
      handleResponse("User skipped this question")
    }
  }

  if (interviewPhase === "instructions") {
    return <InterviewInstructions onStart={startInterview} />
  }

  if (interviewPhase === "feedback") {
    return (
      <InterviewFeedback
        responses={responses}
        jobDescription={jobDescription}
        resume={resume}
        onRestart={() => {
          setIsInterviewEnded(false)
          setInterviewPhase("instructions")
          setResponses([])
          setQuestions([])
          setQuestionCounts({ introduction: 0, technical: 0, behavioral: 0 })
          setCurrentQuestionIndex(0)
          clearAllTimeouts()
        }}
        onEnd={onEnd}
      />
    )
  }

  const getCurrentPhaseInfo = () => {
    switch (interviewPhase) {
      case "voice-intro":
        return { name: "Getting Started" }
      case "introduction":
        return { name: "Introduction Phase" }
      case "technical":
        return { name: "Technical Phase" }
      case "behavioral":
        return { name: "Behavioral Phase" }
      case "ending":
        return { name: "Ending" }
      default:
        return { name: "Interview" }
    }
  }

  const isCameraWorking = streamRef.current && isVideoLoaded && isCameraOn && !cameraError

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AnimatedBackground />
      <div className="container mx-auto p-4 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              {getCurrentPhaseInfo().name}
            </Badge>
            <InterviewTimer />
          </div>
          <Button
            variant="outline"
            onClick={handleEndInterview}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive"
          >
            End Interview
          </Button>
        </div>

        {/* Warnings */}
        <div className="space-y-2 mb-4">
          {!windowFocused && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center">
              <Monitor className="h-5 w-5 text-destructive mr-2" />
              <p className="text-destructive text-sm">⚠️ Please stay focused on the interview window</p>
            </div>
          )}

          {!isPostureGood && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center">
              <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                📐 Please maintain good posture and look at the camera
              </p>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center mb-2">
                <Camera className="h-5 w-5 text-destructive mr-2" />
                <p className="text-destructive text-sm font-semibold">Camera Issue</p>
              </div>
              <p className="text-destructive text-sm mb-3">{cameraError}</p>
              <Button
                onClick={requestCameraPermission}
                size="sm"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Try Again
              </Button>
            </div>
          )}

          {microphoneError && !cameraError && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{microphoneError}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Section */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            {/* User Video */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">You</h3>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-64 bg-muted rounded-lg object-cover"
                  />
                  {!isCameraWorking && (
                    <div className="absolute inset-0 bg-muted rounded-lg flex flex-col items-center justify-center">
                      <User size={48} className="text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm text-center">
                        {cameraError ? "Camera not available" : !isVideoLoaded ? "Loading camera..." : "Camera off"}
                      </p>
                      {cameraPermissionStatus === "denied" && (
                        <p className="text-destructive text-xs text-center mt-1">
                          Please enable camera permissions in your browser
                        </p>
                      )}
                      {!cameraError && !isVideoLoaded && (
                        <Button
                          onClick={requestCameraPermission}
                          size="sm"
                          className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          Retry Camera
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Status Indicators */}
                  <div className="absolute top-2 left-2 space-y-1">
                    {isListening && (
                      <div className="bg-destructive px-2 py-1 rounded-full text-xs animate-pulse text-destructive-foreground">
                        🎤 Listening
                      </div>
                    )}
                    {!isPostureGood && (
                      <div className="bg-yellow-600 px-2 py-1 rounded-full text-xs text-white">📐 Posture</div>
                    )}
                    {cameraError && (
                      <div className="bg-destructive px-2 py-1 rounded-full text-xs text-destructive-foreground">
                        📷 Error
                      </div>
                    )}
                    {!isVideoLoaded && !cameraError && (
                      <div className="bg-yellow-600 px-2 py-1 rounded-full text-xs text-white">📷 Loading</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Avatar */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">AI Interviewer</h3>
                <div className="relative h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg overflow-hidden">
                  <AIAvatar
                    isActive={aiSpeaking}
                    isListening={isListening}
                    currentQuestion={currentQuestion?.text || ""}
                  />

                  {/* AI Status Indicators */}
                  <div className="absolute top-2 left-2 space-y-1">
                    {aiSpeaking && (
                      <div className="bg-primary px-2 py-1 rounded-full text-xs text-primary-foreground">
                        🤖 Speaking
                      </div>
                    )}
                    {isLoading && (
                      <div className="bg-yellow-600 px-2 py-1 rounded-full text-xs text-white">🧠 Thinking</div>
                    )}
                    {interviewPhase === "ending" && (
                      <div className="bg-green-600 px-2 py-1 rounded-full text-xs text-white">✅ Ending</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-4 mt-4">
            <Button variant={isMicOn ? "default" : "destructive"} size="lg" onClick={toggleMic}>
              {isMicOn ? <Mic /> : <MicOff />}
            </Button>
            <Button variant={isCameraOn ? "default" : "destructive"} size="lg" onClick={toggleCamera}>
              {isCameraOn ? <Video /> : <VideoOff />}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleManualNext}
              disabled={
                !currentQuestion ||
                isLoading ||
                interviewPhase === "ending" ||
                interviewPhase === "voice-intro" ||
                isInterviewEnded
              }
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            >
              Skip Question
            </Button>
          </div>
        </div>

        {/* Question Panel */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
                <Clock className="mr-2" size={20} />
                Current Status
              </h3>
              {interviewPhase === "voice-intro" ? (
                <div className="text-center py-8">
                  <div className="text-primary mb-4 text-4xl">🎤</div>
                  <h4 className="text-lg font-semibold mb-2 text-foreground">Getting Started</h4>
                  <p className="text-muted-foreground">AI is providing voice instructions...</p>
                </div>
              ) : interviewPhase === "ending" ? (
                <div className="text-center py-8">
                  <div className="text-green-600 dark:text-green-400 mb-4 text-4xl">🎉</div>
                  <h4 className="text-lg font-semibold mb-2 text-foreground">Interview Complete!</h4>
                  <p className="text-muted-foreground">Thank you for your time. Preparing your feedback...</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Generating question...</p>
                </div>
              ) : currentQuestion ? (
                <div>
                  <Badge className="mb-3" variant="outline">
                    {currentQuestion.category}
                  </Badge>
                  <p className="text-foreground leading-relaxed">{currentQuestion.text}</p>
                  {isListening && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        🎤 I'm listening for your response...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No question available</p>
              )}
            </CardContent>
          </Card>

          {/* Interview Stats */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Interview Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Camera Status:</span>
                  <span className={isCameraWorking ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {isCameraWorking ? "✅ Active" : "❌ Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window Focus:</span>
                  <span className={windowFocused ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {windowFocused ? "✅ Good" : "❌ Lost"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posture Warnings:</span>
                  <span
                    className={
                      postureWarnings < 3
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }
                  >
                    {postureWarnings}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Phase:</span>
                  <span className="text-primary">{getCurrentPhaseInfo().name}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Speech Recognition Component */}
      <SpeechRecognition isListening={isListening} onResult={handleResponse} onStop={() => setIsListening(false)} />
    </div>
  )
}
