import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import mammoth from "mammoth"
import PDFParser from "pdf2json"
import { writeFile, unlink, readFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file
    const validation = validateFile(file)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Generate unique filename with UUID
    const fileId = uuidv4()
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf("."))
    const tempFileName = `${fileId}${fileExtension}`
    tempFilePath = join(tmpdir(), tempFileName)

    // Save file temporarily
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(tempFilePath, buffer)

    let extractedText = ""

    // Extract text based on file type
    switch (fileExtension) {
      case ".txt":
        extractedText = await extractTextFromTxt(tempFilePath)
        break
      case ".pdf":
        extractedText = await extractTextFromPdf(tempFilePath)
        break
      case ".doc":
      case ".docx":
        extractedText = await extractTextFromWord(tempFilePath)
        break
      default:
        throw new Error("Unsupported file type")
    }

    // Clean up extracted text
    const cleanedText = cleanExtractedText(extractedText)

    if (!cleanedText || cleanedText.length < 10) {
      return NextResponse.json(
        {
          error: "No meaningful text could be extracted from the file. Please check the file content.",
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      text: cleanedText,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      extractedLength: cleanedText.length,
    })
  } catch (error) {
    console.error("Text extraction error:", error)
    return NextResponse.json(
      {
        error: `Failed to process the file: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error("Failed to cleanup temp file:", cleanupError)
      }
    }
  }
}

function validateFile(file: File): { error?: string } {
  const validTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]

  const fileName = file.name.toLowerCase()
  const validExtensions = [".pdf", ".doc", ".docx", ".txt"]
  const fileExtension = fileName.substring(fileName.lastIndexOf("."))

  // Check file extension
  if (!validExtensions.includes(fileExtension)) {
    return { error: "Please upload a PDF, Word document (.doc/.docx), or text file (.txt)" }
  }

  // Check file type (MIME type)
  if (!validTypes.includes(file.type) && file.type !== "") {
    // Some browsers don't set MIME type correctly, so we allow empty MIME type if extension is valid
    console.warn(`File MIME type not recognized: ${file.type}, but extension ${fileExtension} is valid`)
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return { error: "File size must be less than 10MB" }
  }

  // Check if file is empty
  if (file.size === 0) {
    return { error: "File appears to be empty" }
  }

  return {}
}

async function extractTextFromTxt(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath)

    // Try UTF-8 first
    let text = buffer.toString("utf-8")

    // If UTF-8 fails (contains replacement characters), try other encodings
    if (text.includes("")) {
      try {
        text = buffer.toString("latin1")
      } catch {
        text = buffer.toString("ascii")
      }
    }

    return text
  } catch (error) {
    throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1)

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(new Error(`PDF parsing error: ${errData.parserError}`))
    })

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        let extractedText = ""

        // Extract text from each page
        if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts && Array.isArray(page.Texts)) {
              page.Texts.forEach((textItem: any) => {
                if (textItem.R && Array.isArray(textItem.R)) {
                  textItem.R.forEach((textRun: any) => {
                    if (textRun.T) {
                      // Decode URI component to handle special characters
                      try {
                        const decodedText = decodeURIComponent(textRun.T)
                        extractedText += decodedText + " "
                      } catch {
                        extractedText += textRun.T + " "
                      }
                    }
                  })
                }
              })
              extractedText += "\n" // Add line break after each text block
            }
          })
        }

        if (!extractedText.trim()) {
          reject(new Error("No text content found in PDF"))
        } else {
          resolve(extractedText)
        }
      } catch (error) {
        reject(new Error(`Failed to process PDF data: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    })

    // Load and parse the PDF
    pdfParser.loadPDF(filePath)
  })
}

async function extractTextFromWord(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath)

    // Use mammoth to extract text from Word documents
    const result = await mammoth.extractRawText({ buffer })

    if (result.messages && result.messages.length > 0) {
      console.warn("Word extraction warnings:", result.messages)
    }

    if (!result.value || result.value.trim().length === 0) {
      throw new Error("No text content found in Word document")
    }

    return result.value
  } catch (error) {
    throw new Error(
      `Failed to extract text from Word document: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}

function cleanExtractedText(text: string): string {
  return (
    text
      // Normalize line breaks
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive whitespace
      .replace(/[ \t]+/g, " ")
      // Remove excessive line breaks (more than 2 consecutive)
      .replace(/\n{3,}/g, "\n\n")
      // Remove leading/trailing whitespace from each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Remove leading/trailing whitespace from entire text
      .trim()
  )
}
