import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resume, phase } = await request.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    let prompt = ""

    if (phase === "introduction") {
      prompt = `
You are an expert interview coach. Generate exactly 3 introduction questions for a job interview.

Job Description: ${jobDescription}
Resume: ${resume}

Generate ONLY basic introduction questions that help the interviewer get to know the candidate personally and professionally. Focus on background, experience, and current situation.

Good introduction questions should cover:
- Name and personal introduction
- Educational background and qualifications
- Current role and professional experience
- Brief overview of their background
- What they do in their current/recent position

AVOID asking about:
- Future career goals (save for behavioral phase)
- Why they want the job (save for behavioral phase)
- Long-term aspirations

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "questions": [
    {
      "id": 1,
      "text": "Please introduce yourself - tell me your name, educational background, and a brief overview of your professional experience.",
      "category": "introduction",
      "asked": false
    },
    {
      "id": 2,
      "text": "Can you walk me through your current role and what you do on a day-to-day basis?",
      "category": "introduction", 
      "asked": false
    },
    {
      "id": 3,
      "text": "Tell me about your educational background and how it led you to your current field.",
      "category": "introduction",
      "asked": false
    }
  ]
}
`
    } else if (phase === "technical") {
      prompt = `
You are an expert interview coach. Generate exactly 5 technical questions based on:

Job Description: ${jobDescription}
Resume: ${resume}

IMPORTANT: Generate questions that test technical competency relevant to the role. Include 2 questions specifically about projects mentioned in the candidate's resume.

Focus on:
- Programming languages and frameworks mentioned in job description
- Technical projects from the resume (ask about 2 specific projects)
- System design concepts relevant to the role
- Problem-solving approaches
- Technical tools and methodologies
- Code review and debugging practices

Example project questions:
- "I see you worked on [specific project from resume]. Can you walk me through the technical challenges you faced and how you solved them?"
- "Tell me about the technology stack you used in [project name] and why you chose those particular technologies."

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "questions": [
    {
      "id": 4,
      "text": "Tell me about [specific project from resume] - what technologies did you use and what challenges did you overcome?",
      "category": "technical",
      "asked": false
    },
    {
      "id": 5,
      "text": "Describe another project from your experience - [another project] - and explain the technical decisions you made.",
      "category": "technical",
      "asked": false
    },
    {
      "id": 6,
      "text": "How would you approach solving a complex technical problem in [relevant technology from job description]?",
      "category": "technical",
      "asked": false
    },
    {
      "id": 7,
      "text": "What programming languages and frameworks are you most comfortable with and why?",
      "category": "technical",
      "asked": false
    },
    {
      "id": 8,
      "text": "How do you ensure code quality and what testing practices do you follow?",
      "category": "technical",
      "asked": false
    }
  ]
}
`
    } else if (phase === "behavioral") {
      prompt = `
You are an expert interview coach. Generate exactly 4 behavioral questions based on:

Job Description: ${jobDescription}
Resume: ${resume}

Focus on behavioral questions using STAR method scenarios and include motivation/career questions:
- Leadership experience
- Problem-solving situations
- Team collaboration
- Handling challenges/conflicts
- Career motivation and goals
- Interest in the role and company

IMPORTANT: Return ONLY a valid JSON object without markdown formatting.

{
  "questions": [
    {
      "id": 9,
      "text": "What attracted you to this specific position and our company?",
      "category": "behavioral",
      "asked": false
    },
    {
      "id": 10,
      "text": "Tell me about a challenging project you worked on and how you overcame obstacles.",
      "category": "behavioral",
      "asked": false
    },
    {
      "id": 11,
      "text": "Describe a situation where you had to work with a difficult team member or handle conflict.",
      "category": "behavioral",
      "asked": false
    },
    {
      "id": 12,
      "text": "Where do you see yourself in the next 3-5 years, and how does this role align with your career goals?",
      "category": "behavioral",
      "asked": false
    }
  ]
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

    const questionsData = JSON.parse(cleanedText)

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      throw new Error("Invalid response structure from AI")
    }

    return NextResponse.json(questionsData)
  } catch (error) {
    console.error("Error generating questions:", error)

    // Return phase-specific fallback questions
    const fallbackQuestions = {
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

    // Get phase from request body for fallback
    const requestBody = await request.json().catch(() => ({ phase: "introduction" }))
    const currentPhase = requestBody.phase || "introduction"

    return NextResponse.json({
      questions: fallbackQuestions[currentPhase as keyof typeof fallbackQuestions] || fallbackQuestions.introduction,
    })
  }
}
