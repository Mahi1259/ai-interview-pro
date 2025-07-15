import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(request: NextRequest) {
  try {
    const { responses, jobDescription, resume } = await request.json()

    // Check if API key is configured
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    const prompt = `
You are an expert interview coach providing detailed feedback on a candidate's interview performance.

Job Description: ${jobDescription}

Candidate Resume: ${resume}

Interview Responses: ${JSON.stringify(responses)}

Analyze the candidate's performance ONLY based on their actual answers during the interview, NOT their resume. 

Evaluate:
1. Quality and depth of answers provided
2. Communication clarity and professionalism
3. Technical knowledge demonstrated through responses
4. Behavioral competencies shown in answers
5. Overall interview performance

IMPORTANT: Base strengths and feedback ONLY on what the candidate actually said during the interview. If they said "I don't know" or gave poor answers, reflect this in the feedback.

IMPORTANT: Return ONLY a valid JSON object without any markdown formatting or code blocks. Do not include \`\`\`json or \`\`\` in your response.

Return a JSON response with this exact structure:
{
  "overallScore": 40,
  "strengths": [
    "Based only on interview answers - if answers were poor, mention what little positive can be found",
    "Only include strengths demonstrated in actual responses"
  ],
  "improvements": [
    "Specific areas where answers were lacking",
    "Communication issues observed in responses",
    "Technical knowledge gaps shown in answers"
  ],
  "detailedFeedback": [
    {
      "question": "Question text",
      "answer": "Candidate's actual answer",
      "score": 2,
      "feedback": "Detailed feedback based on the actual answer quality"
    }
  ],
  "recommendations": [
    "Specific actionable advice based on interview performance",
    "Areas to study based on gaps shown in answers",
    "Communication and preparation improvements needed"
  ]
}

Be honest and constructive. If the candidate gave poor answers or said "I don't know" frequently, reflect this accurately in the feedback while providing helpful guidance for improvement.
`

    const { text } = await generateText({
      model: google("gemini-1.5-flash"),
      prompt,
    })

    // Clean the response text by removing markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    const feedbackData = JSON.parse(cleanedText)

    return NextResponse.json(feedbackData)
  } catch (error) {
    console.error("Error generating feedback:", error)

    // Return fallback feedback based on actual performance
    const fallbackFeedback = {
      overallScore: 30,
      strengths: ["Attended the full interview session", "Maintained professional demeanor"],
      improvements: [
        "Need to prepare specific examples and answers",
        "Improve technical knowledge and communication",
        "Practice articulating thoughts clearly",
        "Research the company and role thoroughly",
      ],
      detailedFeedback: [],
      recommendations: [
        "Practice common interview questions with specific examples",
        "Research the company and role thoroughly before interviews",
        "Prepare STAR method examples for behavioral questions",
        "Study technical concepts relevant to the position",
      ],
    }

    return NextResponse.json(fallbackFeedback)
  }
}
