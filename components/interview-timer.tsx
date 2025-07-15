"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

export default function InterviewTimer() {
  const [time, setTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-full border border-border">
      <Clock size={16} className="text-muted-foreground" />
      <span className="font-mono text-sm text-foreground">{formatTime(time)}</span>
    </div>
  )
}
