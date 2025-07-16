"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Brain, Camera, FileText, MessageSquare, BarChart3, Shield, Target } from "lucide-react"
import AnimatedBackground from "./animated-background"

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Questions",
      description: "Personalized interview questions generated from your resume and job description using advanced AI",
    },
    {
      icon: <Camera className="h-8 w-8" />,
      title: "Real-Time Video Interview",
      description: "Practice with live video recording and professional interview simulation",
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: "Voice Recognition",
      description: "Advanced speech-to-text technology captures and analyzes your responses",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Detailed Feedback",
      description: "Comprehensive performance analysis with strengths and improvement recommendations",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Professional Monitoring",
      description: "Posture tracking and focus monitoring for authentic interview experience",
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Structured Process",
      description: "Three-phase interview: Introduction → Technical → Behavioral questions",
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AI Interview Pro</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">AI-Powered Interview Practice</h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Practice interviews with our AI system that generates personalized questions based on your resume and job
              description, then provides detailed feedback to help you improve.
            </p>

            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
            >
              Start Interview Practice
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple process to get started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Documents</h3>
              <p className="text-muted-foreground">Upload your resume and job description</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Practice Interview</h3>
              <p className="text-muted-foreground">Answer AI-generated questions with video recording</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Feedback</h3>
              <p className="text-muted-foreground">Receive detailed analysis and improvement suggestions</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need for interview practice</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50">
                <CardHeader>
                  <div className="text-primary mb-4">{feature.icon}</div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Interview Structure */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Interview Structure</h2>
            <p className="text-lg text-muted-foreground">Three phases of comprehensive interview practice</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Phase 1</span>
                  <span className="text-sm text-muted-foreground"></span>
                </div>
                <CardTitle className="text-lg">Introduction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Personal background, education, and professional experience
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Phase 2</span>
                  <span className="text-sm text-muted-foreground"></span>
                </div>
                <CardTitle className="text-lg">Technical</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Skills assessment and technical knowledge evaluation</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Phase 3</span>
                  <span className="text-sm text-muted-foreground"></span>
                </div>
                <CardTitle className="text-lg">Behavioral</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">STAR method scenarios and situational questions</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Practice?</h2>
            <p className="text-lg text-muted-foreground mb-8">Start your AI-powered interview practice session now</p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
