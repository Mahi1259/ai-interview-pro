"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface AIAvatarProps {
  isActive: boolean
  isListening: boolean
  currentQuestion: string
}

export default function AIAvatar({ isActive, isListening }: AIAvatarProps) {
  const [eyeBlinkAnimation, setEyeBlinkAnimation] = useState(false)
  const [mouthAnimation, setMouthAnimation] = useState(0)

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(
      () => {
        setEyeBlinkAnimation(true)
        setTimeout(() => setEyeBlinkAnimation(false), 150)
      },
      3000 + Math.random() * 2000,
    )

    return () => clearInterval(blinkInterval)
  }, [])

  // Mouth animation when speaking
  useEffect(() => {
    let mouthInterval: NodeJS.Timeout

    if (isActive) {
      mouthInterval = setInterval(() => {
        setMouthAnimation(Math.random())
      }, 100)
    } else {
      setMouthAnimation(0)
    }

    return () => {
      if (mouthInterval) clearInterval(mouthInterval)
    }
  }, [isActive])

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main Avatar */}
      <motion.div
        className="relative z-10"
        animate={{
          scale: isActive ? [1, 1.05, 1] : 1,
          rotateY: isListening ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.5, repeat: isActive ? Number.POSITIVE_INFINITY : 0 },
          rotateY: { duration: 2, repeat: isListening ? Number.POSITIVE_INFINITY : 0 },
        }}
      >
        {/* Avatar Head */}
        <div className="relative">
          {/* Head Circle */}
          <motion.div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-2xl border-4 border-white/20"
            animate={{
              boxShadow: isActive
                ? [
                    "0 0 20px rgba(59, 130, 246, 0.5)",
                    "0 0 40px rgba(147, 51, 234, 0.8)",
                    "0 0 20px rgba(59, 130, 246, 0.5)",
                  ]
                : "0 0 20px rgba(59, 130, 246, 0.3)",
            }}
            transition={{ duration: 1, repeat: isActive ? Number.POSITIVE_INFINITY : 0 }}
          />

          {/* Face Features */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Eyes */}
              <div className="flex space-x-4 mb-2">
                <motion.div
                  className="w-3 h-3 bg-white rounded-full"
                  animate={{
                    scaleY: eyeBlinkAnimation ? 0.1 : 1,
                  }}
                  transition={{ duration: 0.1 }}
                />
                <motion.div
                  className="w-3 h-3 bg-white rounded-full"
                  animate={{
                    scaleY: eyeBlinkAnimation ? 0.1 : 1,
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Mouth */}
              <motion.div
                className="w-6 h-2 bg-white rounded-full mx-auto"
                animate={{
                  scaleX: isActive ? 0.5 + mouthAnimation * 0.5 : 1,
                  scaleY: isActive ? 0.8 + mouthAnimation * 0.4 : 0.3,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Voice Waves */}
          <AnimatePresence>
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute border-2 border-blue-300 rounded-full"
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{
                      scale: [0, 2, 3],
                      opacity: [0.8, 0.4, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.3,
                    }}
                    style={{
                      width: "128px",
                      height: "128px",
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Body */}
        <motion.div
          className="mt-4 w-20 h-16 bg-gradient-to-b from-blue-500 to-purple-600 rounded-t-full mx-auto"
          animate={{
            scale: isActive ? [1, 1.02, 1] : 1,
          }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Number.POSITIVE_INFINITY : 0,
          }}
        />
      </motion.div>

      {/* Listening Animation */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="absolute inset-0 border-4 border-green-400 rounded-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [0.9, 1, 0.9],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
