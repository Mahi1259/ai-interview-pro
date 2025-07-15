import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resume, responses, currentPhase, questionCount } = await request.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    let prompt = ""

    if (currentPhase === "introduction") {
      prompt = `
You are an expert interview coach conducting an introduction phase interview.

Job Description: ${jobDescription}
Resume: ${resume}
Previous responses: ${JSON.stringify(responses)}
Current question count in this phase: ${questionCount}

Generate the next introduction question. Focus ONLY on getting to know the candidate personally and professionally. Do NOT ask technical questions.

Good introduction questions:
- Personal background and career journey
- Motivation and interest in the role
- Knowledge about the company
- Career goals and aspirations
- What drives them professionally

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "question": "Your next introduction question here",
  "category": "introduction",
  "reasoning": "Why you chose this question"
}
`
    } else if (currentPhase === "technical") {
      prompt = `
You are an expert interview coach conducting a technical phase interview.

Job Description: ${jobDescription}
Resume: ${resume}
Previous responses: ${JSON.stringify(responses)}
Current question count in this phase: ${questionCount}

Generate the next technical question based on the job requirements and candidate's background.

IMPORTANT: If this is one of the first 2 technical questions (questionCount < 2), focus on specific projects from the candidate's resume. Ask about technical challenges, technology choices, and implementation details.

For later questions, focus on: programming concepts, system design, problem-solving, debugging, code quality, industry best practices.

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "question": "Your next technical question here - if questionCount < 2, make it about a specific project from their resume",
  "category": "technical",
  "reasoning": "Why you chose this question"
}
`
    } else if (currentPhase === "behavioral") {
      prompt = `
You are an expert interview coach conducting a behavioral phase interview.

Job Description: ${jobDescription}
Resume: ${resume}
Previous responses: ${JSON.stringify(responses)}
Current question count in this phase: ${questionCount}

Generate the next behavioral question using STAR method scenarios.

Focus on: leadership, teamwork, challenges, problem-solving, achievements, learning experiences

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "question": "Your next behavioral question here",
  "category": "behavioral",
  "reasoning": "Why you chose this question"
}
`
    }

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
    })

    let cleanedText = text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    const responseData = JSON.parse(cleanedText)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error generating next question:", error)

    // Return fallback question based on phase
    const fallbackQuestions = {
      introduction: "What motivates you in your career and why did you choose this field?",
      technical: "How do you approach debugging complex issues in your code?",
      behavioral: "Describe a time when you had to adapt to a significant change at work.",
    }

    // Get currentPhase from request body for fallback
    const requestBody = await request.json().catch(() => ({ currentPhase: "introduction" }))
    const phase = requestBody.currentPhase || "introduction"

    return NextResponse.json({
      question: fallbackQuestions[phase as keyof typeof fallbackQuestions] || "Tell me more about your experience.",
      category: phase,
      reasoning: "Fallback question due to technical issue",
    })
  }
}
