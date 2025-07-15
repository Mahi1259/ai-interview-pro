"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, CheckCircle, AlertCircle, type File } from "lucide-react"
import InterviewSession from "@/components/interview-session"
import LandingPage from "@/components/landing-page"

interface FileUploadState {
  file: File | null
  text: string
  fileId: string | null
  isProcessing: boolean
  error: string | null
  extractedLength: number
}

export default function Home() {
  const [showLanding, setShowLanding] = useState(true)
  const [jobDescription, setJobDescription] = useState<FileUploadState>({
    file: null,
    text: "",
    fileId: null,
    isProcessing: false,
    error: null,
    extractedLength: 0,
  })

  const [resume, setResume] = useState<FileUploadState>({
    file: null,
    text: "",
    fileId: null,
    isProcessing: false,
    error: null,
    extractedLength: 0,
  })

  const [isInterviewStarted, setIsInterviewStarted] = useState(false)

  const acceptedFileTypes = ".pdf,.doc,.docx,.txt"
  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
    switch (extension) {
      case ".pdf":
        return "📄"
      case ".doc":
      case ".docx":
        return "📝"
      case ".txt":
        return "📃"
      default:
        return "📄"
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: "jobDescription" | "resume") => {
    const file = event.target.files?.[0]
    if (!file) return

    const setState = type === "jobDescription" ? setJobDescription : setResume

    // Reset state
    setState((prev) => ({
      ...prev,
      file,
      isProcessing: true,
      error: null,
      text: "",
      fileId: null,
      extractedLength: 0,
    }))

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract text from file")
      }

      setState((prev) => ({
        ...prev,
        text: data.text,
        fileId: data.fileId,
        extractedLength: data.extractedLength,
        isProcessing: false,
        error: null,
      }))
    } catch (error) {
      console.error(`Error processing ${type}:`, error)
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : "Failed to process file",
        file: null,
      }))
    }

    // Reset file input
    event.target.value = ""
  }

  const removeFile = (type: "jobDescription" | "resume") => {
    const setState = type === "jobDescription" ? setJobDescription : setResume
    setState({
      file: null,
      text: "",
      fileId: null,
      isProcessing: false,
      error: null,
      extractedLength: 0,
    })
  }

  const handleStartInterview = () => {
    if (jobDescription.text.trim() && resume.text.trim()) {
      setIsInterviewStarted(true)
    }
  }

  const handleGetStarted = () => {
    setShowLanding(false)
  }

  const handleBackToHome = () => {
    setShowLanding(true)
    setIsInterviewStarted(false)
    // Reset file states
    setJobDescription({
      file: null,
      text: "",
      fileId: null,
      isProcessing: false,
      error: null,
      extractedLength: 0,
    })
    setResume({
      file: null,
      text: "",
      fileId: null,
      isProcessing: false,
      error: null,
      extractedLength: 0,
    })
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />
  }

  if (isInterviewStarted) {
    return <InterviewSession jobDescription={jobDescription.text} resume={resume.text} onEnd={handleBackToHome} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            ← Back to Home
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Interview Assistant</h1>
          <p className="text-lg text-gray-600">
            Practice your interview skills with AI-powered questions and real-time feedback
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Setup Your Interview</CardTitle>
            <CardDescription>
              Upload your job description and resume files to get personalized interview questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Job Description Upload */}
            <div>
              <Label htmlFor="job-description-upload" className="text-base font-medium">
                Job Description
              </Label>
              <p className="text-sm text-gray-600 mb-3">Upload the job description (PDF, Word, or Text file)</p>

              {!jobDescription.file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="job-description-upload"
                    type="file"
                    accept={acceptedFileTypes}
                    onChange={(e) => handleFileUpload(e, "jobDescription")}
                    className="hidden"
                    disabled={jobDescription.isProcessing}
                  />
                  <label
                    htmlFor="job-description-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Click to upload job description</span>
                    <span className="text-xs text-gray-500">PDF, DOC, DOCX, or TXT (max 10MB)</span>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getFileIcon(jobDescription.file.name)}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{jobDescription.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(jobDescription.file.size)}
                          {jobDescription.extractedLength > 0 && (
                            <span className="ml-2">• {jobDescription.extractedLength} characters extracted</span>
                          )}
                        </p>
                      </div>
                      {jobDescription.isProcessing ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      ) : jobDescription.text ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : jobDescription.error ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile("jobDescription")}
                      disabled={jobDescription.isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {jobDescription.isProcessing && <div className="mt-3 text-sm text-blue-600">Processing file...</div>}

                  {jobDescription.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {jobDescription.error}
                    </div>
                  )}

                  {jobDescription.text && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      ✅ Text extracted successfully - Ready for interview
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resume Upload */}
            <div>
              <Label htmlFor="resume-upload" className="text-base font-medium">
                Your Resume
              </Label>
              <p className="text-sm text-gray-600 mb-3">Upload your resume (PDF, Word, or Text file)</p>

              {!resume.file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="resume-upload"
                    type="file"
                    accept={acceptedFileTypes}
                    onChange={(e) => handleFileUpload(e, "resume")}
                    className="hidden"
                    disabled={resume.isProcessing}
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Click to upload your resume</span>
                    <span className="text-xs text-gray-500">PDF, DOC, DOCX, or TXT (max 10MB)</span>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getFileIcon(resume.file.name)}</div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{resume.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(resume.file.size)}
                          {resume.extractedLength > 0 && (
                            <span className="ml-2">• {resume.extractedLength} characters extracted</span>
                          )}
                        </p>
                      </div>
                      {resume.isProcessing ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      ) : resume.text ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : resume.error ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile("resume")}
                      disabled={resume.isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {resume.isProcessing && <div className="mt-3 text-sm text-blue-600">Processing file...</div>}

                  {resume.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {resume.error}
                    </div>
                  )}

                  {resume.text && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      ✅ Text extracted successfully - Ready for interview
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleStartInterview}
              disabled={
                !jobDescription.text.trim() || !resume.text.trim() || jobDescription.isProcessing || resume.isProcessing
              }
              className="w-full"
              size="lg"
            >
              {jobDescription.isProcessing || resume.isProcessing ? "Processing Files..." : "Start AI Interview"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎥 Video Interview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Real-time video recording with camera and microphone access</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🤖 AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Intelligent question generation and response analysis using Gemini AI
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Detailed feedback and improvement suggestions after the interview</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
