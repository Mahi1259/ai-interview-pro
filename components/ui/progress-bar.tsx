"use client"

interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  return (
    <div className={`w-full bg-gray-700 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}
