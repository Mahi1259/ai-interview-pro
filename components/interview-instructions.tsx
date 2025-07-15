"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Mic, Monitor, Eye, Clock, MessageSquare } from "lucide-react"

interface InterviewInstructionsProps {
  onStart: () => void
}

export default function InterviewInstructions({ onStart }: InterviewInstructionsProps) {
  const instructions = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Camera Setup",
      description: "Ensure your camera is working and you're clearly visible. Maintain good lighting.",
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Microphone Test",
      description: "Test your microphone and speak clearly. The system uses voice recognition.",
    },
    {
      icon: <Monitor className="h-5 w-5" />,
      title: "Stay Focused",
      description: "Keep this window active. Switching windows may be flagged as malpractice.",
    },
    {
      icon: <Eye className="h-5 w-5" />,
      title: "Eye Contact & Posture",
      description: "Look at the camera, maintain good posture. The system monitors your positioning.",
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Voice Responses",
      description: "Answer questions verbally. Stop speaking for 2 seconds to submit your answer.",
    },
  ]

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Mock Interview Instructions</h1>
          <p className="text-lg text-muted-foreground">
            Please read the instructions below before starting your AI-powered mock interview
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Pre-Interview Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-1 gap-4">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border border-border rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 mt-1 text-primary">{instruction.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{instruction.title}</h3>
                    <p className="text-sm text-muted-foreground">{instruction.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Interview Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Badge className="mb-3 bg-primary text-primary-foreground">Phase 1</Badge>
                <h3 className="font-semibold mb-2 text-foreground">Introduction</h3>
                <p className="text-sm text-muted-foreground">
                 questions about yourself, background, and interest in the role
                </p>
              </div>
              <div className="text-center">
                <Badge className="mb-3 bg-secondary text-secondary-foreground">Phase 2</Badge>
                <h3 className="font-semibold mb-2 text-foreground">Technical</h3>
                <p className="text-sm text-muted-foreground">questions testing your technical knowledge and skills</p>
              </div>
              <div className="text-center">
                <Badge className="mb-3 bg-green-600 text-white">Phase 3</Badge>
                <h3 className="font-semibold mb-2 text-foreground">Behavioral</h3>
                <p className="text-sm text-muted-foreground">
                  questions about your experience and problem-solving approach
                </p>
              </div>
            </div>
          </CardContent>
        </Card>


        <div className="text-center">
          <Button onClick={onStart} size="lg" className="px-8">
            Start Mock Interview
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            The AI will provide voice instructions when the interview begins
          </p>
        </div>
      </div>
    </div>
  )
}
