"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, TrendingUp, RotateCcw, Home } from "lucide-react"

interface Response {
  questionId: number
  question: string
  answer: string
  timestamp: Date
  duration: number
}

interface FeedbackProps {
  responses: Response[]
  jobDescription: string
  resume: string
  onRestart: () => void
  onEnd: () => void
}

interface FeedbackData {
  overallScore: number
  strengths: string[]
  improvements: string[]
  detailedFeedback: {
    question: string
    answer: string
    score: number
    feedback: string
  }[]
  recommendations: string[]
}

export default function InterviewFeedback({ responses, jobDescription, resume, onRestart, onEnd }: FeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateFeedback()
  }, [])

  const generateFeedback = async () => {
    try {
      const response = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, jobDescription, resume }),
      })
      const data = await response.json()
      setFeedback(data)
    } catch (error) {
      console.error("Error generating feedback:", error)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Analyzing Your Performance</h3>
            <p className="text-gray-600">Our AI is reviewing your responses and generating personalized feedback...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Generating Feedback</h3>
            <p className="text-gray-600 mb-4">We couldn't analyze your interview. Please try again.</p>
            <Button onClick={onEnd}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Interview Complete!</h1>
          <p className="text-lg text-gray-600">Here's your detailed performance analysis</p>
        </div>

        {/* Overall Score */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold">Score: {feedback.overallScore}/100</span>
              <Badge
                variant={
                  feedback.overallScore >= 80 ? "default" : feedback.overallScore >= 60 ? "secondary" : "destructive"
                }
                className="text-lg px-4 py-2"
              >
                {feedback.overallScore >= 80 ? "Excellent" : feedback.overallScore >= 60 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
            <Progress value={feedback.overallScore} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Your Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">🎯 Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {feedback.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Question Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📝 Question-by-Question Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {feedback.detailedFeedback.map((item, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold mb-2">
                    Q{index + 1}: {item.question}
                  </h4>
                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <p className="text-sm text-gray-700 italic">"{item.answer}"</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Score: {item.score}/10</span>
                    <Progress value={item.score * 10} className="w-32 h-2" />
                  </div>
                  <p className="text-sm text-gray-600">{item.feedback}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>💡 Recommendations for Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start">
                  <TrendingUp className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button onClick={onRestart} variant="outline" size="lg">
            <RotateCcw className="mr-2 h-4 w-4" />
            Practice Again
          </Button>
          <Button onClick={onEnd} size="lg">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
