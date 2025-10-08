// FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type RefineContentType = 'meeting' | 'sermon' | 'interview' | 'lecture' | 'note' | 'team-meeting';
export type RefineOutputFormat = 'report' | 'article' | 'key-points' | 'action-items' | 'meeting-report';
export type PreferredLanguage = 'pt' | 'en' | 'sn';

/**
 * A generic function to handle streaming content generation from the Gemini API.
 * It centralizes the API call, streaming loop, and error handling.
 * @param request The complete request object for the `generateContentStream` API call.
 * @returns An async generator that yields the text chunks from the response.
 */
// FIX: Replaced deprecated `GenerateContentRequest` with `GenerateContentParameters`.
async function* generateStream(request: GenerateContentParameters): AsyncGenerator<string> {
    try {
        const responseStream = await ai.models.generateContentStream(request);
        for await (const chunk of responseStream) {
            // Ensure we only yield non-empty text parts
            if (chunk.text) {
                yield chunk.text;
            }
        }
    } catch (error) {
        // Log the original error here for context, but re-throw it so the UI layer
        // can use the full error details to generate a user-friendly message.
        console.error("Error during Gemini API stream:", error);
        throw error;
    }
}


const transcribePrompt = `
As a state-of-the-art speech recognition model, your primary task is a literal audio transcription. Auto-detect the spoken language (likely Mozambican Portuguese).

**Core Rules:**
- Transcribe every utterance exactly as spoken. This includes filler words ("uhm," "ah," "tipo"), stutters, repetitions, and grammatical mistakes.
- Do not summarize, rephrase, correct grammar, or censor any content. Your output must be a pure, unfiltered representation of the audio.
- Use punctuation like commas, periods, hyphens (-), and ellipses (...) to accurately reflect speech patterns, pauses, and hesitations.
- Create short paragraphs for natural breaks in thought or when a different speaker might be talking (if discernible).
- If a word or phrase is unclear or impossible to understand, mark it as [inaudible].
- For significant pauses (longer than a few seconds), mark it as [pause].
- The final output must be only the raw transcript text. Do not add any commentary or introductory phrases.
`;

const cleanPromptTemplate = (rawTranscript: string) => `
You are an expert editor specializing in transforming raw, verbatim transcripts into professionally structured and readable documents. Your task is to convert the raw transcript below into a clean, well-formatted HTML document.

**Raw Transcript:**
---
${rawTranscript}
---

**Instructions:**
1.  **Crucial Language Rule:** The input transcript is in Portuguese. Your entire output **MUST** also be in Portuguese. Do not translate any part of the text to another language.
2.  **Analyze and Structure:** Identify the main topics, arguments, and logical flow of the conversation. Create a clear structure using appropriate HTML headings (\`<h2>\`, \`<h3>\`, \`<h4>\`). DO NOT use \`<h1>\`. The structure should make the content easy to navigate and understand.
3.  **Format Lists:** Where appropriate, format items into bulleted lists using \`<ul>\` or numbered lists using \`<ol>\`.
4.  **Refine Content:** Meticulously correct grammar, spelling, and punctuation. Remove filler words (e.g., "uhm," "ah," "tipo"), false starts, and unnecessary repetitions. Rewrite sentences for better clarity and flow, but **you must strictly preserve the original meaning, intent, and voice of the speaker(s)**. Use standard paragraph tags (\`<p>\`).
5.  **Add Emphasis:** Use \`<strong>\` tags to highlight key terms, conclusions, or important statements. Use \`<em>\` for more subtle emphasis where natural.
6.  **Output Requirements:** Provide ONLY the HTML body content. Do not include \`<html>\`, \`<body>\`, or markdown fences like \`\`\`html\`\`\`. The output must be ready to be injected directly into a webpage.
`;

const translatePromptTemplate = (textToTranslate: string, targetLanguageName: string) => `
You are an expert linguist and professional translator specializing in Mozambican Portuguese and ${targetLanguageName}. Your translations are celebrated for being not just accurate, but culturally resonant and indistinguishable from content written by a native speaker.

**Your single most important directive is this: The final translation must read as if it were originally written by a native speaker of ${targetLanguageName}.** This supersedes all other instructions if there is a conflict.

**Source Portuguese Text (HTML format):**
---
${textToTranslate}
---

**Core Instructions:**

1.  **Prioritize Natural Flow over Literal Accuracy:**
    *   **Strictly avoid word-for-word translation.**
    *   Freely restructure sentences, rephrase idioms, and choose culturally appropriate analogies to make the text sound natural and fluid in ${targetLanguageName}. The goal is to capture the *spirit and intent* of the original text, not just its literal words.

2.  **Master Idioms and Cultural Nuances:**
    *   Identify and translate idiomatic expressions from Portuguese to their natural-sounding equivalents in ${targetLanguageName}. Do not translate them literally.
    *   Adapt cultural references to be understandable and relevant to a ${targetLanguageName}-speaking audience.

3.  **Maintain Original Meaning and Tone:**
    *   While rephrasing, you must strictly preserve the original message's core meaning, intent, and tone (e.g., formal, informal, technical, persuasive).

4.  **Ensure Flawless Grammar and Syntax:**
    *   The final output must be grammatically perfect, using correct syntax and punctuation standards for ${targetLanguageName}.

5.  **Preserve HTML Structure:**
    *   The source text uses HTML tags (e.g., \`<h2>\`, \`<p>\`, \`<ul>\`, \`<strong>\`). You MUST preserve this HTML structure perfectly.
    *   Translate only the text *within* the tags. Do not alter, add, or remove any HTML tags.

6.  **Output Requirements:**
    *   Provide ONLY the translated HTML body content.
    *   Do not include \`<html>\`, \`<body>\`, or markdown fences like \`\`\`html\`\`\`. The output must be ready for direct injection into a webpage.
`;

const getRefinePrompt = (rawTranscript: string, contentType: RefineContentType, outputFormat: RefineOutputFormat, targetLanguage: PreferredLanguage): string => {
  const languageMap = { pt: 'Português', en: 'English', sn: 'Shona' };
  const languageName = languageMap[targetLanguage];

  let prompt = `You are a world-class AI assistant specialized in text transformation. Your task is to process a raw audio transcript and reformat it into a specific document type. The output must be clean, professional, and structured as valid HTML body content. **The final output must be written in ${languageName}.** Do not include \`<html>\`, \`<body>\`, or markdown fences. Use headings (h2, h3), paragraphs, lists, and emphasis (strong, em) where appropriate.\n\n`;
  prompt += `**Raw Transcript:**\n---\n${rawTranscript}\n---\n\n`;
  prompt += `**Instructions:**\n`;

  // Base instruction based on content type
  switch (contentType) {
    case 'meeting':
      prompt += `The transcript is from a business meeting or discussion. Analyze the conversation to identify key topics, decisions, and outcomes. If possible, distinguish between different speakers (e.g., Speaker 1, Speaker 2, or by name if mentioned). `;
      break;
    case 'team-meeting':
      prompt += `The transcript is from a team meeting. Analyze the conversation to identify the main summary, key discussion points, and all concrete action items. `;
      break;
    case 'sermon':
      prompt += `The transcript is from a sermon, speech, or monologue. Identify the main message, supporting points, and any concluding remarks. The tone should be engaging and reflective of a spoken address. `;
      break;
    case 'interview':
      prompt += `The transcript is an interview. Structure the content in a question-and-answer format (Q&A). Identify the interviewer and the interviewee if possible. `;
      break;
    case 'lecture':
      prompt += `The transcript is from a lecture or presentation. The structure should be educational, breaking down complex topics into understandable sections. `;
      break;
    case 'note':
      prompt += `The transcript is a personal voice note. Organize the thoughts into a coherent and structured format. `;
      break;
  }

  // Specific output format instruction
  switch (outputFormat) {
    case 'report':
      prompt += `Format the output as a detailed report. Include a title, a brief summary, sections for each major topic discussed, and a concluding list of key decisions and action items.`;
      break;
    case 'meeting-report':
      prompt += `Format the output as a professional meeting report, structured as valid HTML. It MUST contain the following sections, in this order:
      1.  A main heading (\`<h2>\`) with the title "Relatório da Reunião".
      2.  A section under an \`<h3>\` titled "Sumário" with a concise summary of the meeting's purpose and key outcomes.
      3.  A section under an \`<h3>\` titled "Pontos de Discussão" with a bulleted list (\`<ul>\`) of the main topics discussed.
      4.  A section under an \`<h3>\` titled "Ações a Tomar" with a numbered list (\`<ol>\`) of all specific action items or tasks assigned. Each action item should be clear and actionable. If no action items are found, state "Nenhuma ação específica foi definida." in this section.`;
      break;
    case 'article':
      prompt += `Format the output as an engaging article or blog post. Create a compelling title and use subheadings to structure the content into logical sections. The language should be polished and readable.`;
      break;
    case 'key-points':
      prompt += `IGNORE all previous formatting instructions. Your SOLE task is to extract the most important key points, ideas, and conclusions from the transcript. Present these as a concise, easy-to-read bulleted list using \`<ul>\` and \`<li>\` tags.`;
      break;
    case 'action-items':
      prompt += `IGNORE all previous formatting instructions. Your SOLE task is to identify and extract any specific action items, tasks, or decisions from the transcript. If no action items are found, state that clearly. Present the findings as a bulleted or numbered list.`;
      break;
  }

  return prompt;
};

export function transcribeAudio(audioBase64: string, audioMimeType: string): AsyncGenerator<string> {
    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: audioMimeType,
        },
    };

    // FIX: The `contents` property should be a single `Content` object for a single-turn request, not an array containing one.
    const request: GenerateContentParameters = {
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, { text: transcribePrompt }] },
        config: {
            temperature: 0.1, // Lower temperature for more deterministic, literal transcription
            thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster, direct transcription
        }
    };
    
    return generateStream(request);
};

export function cleanTranscript(rawTranscript: string): AsyncGenerator<string> {
    if (!rawTranscript.trim()) {
        // Return an empty generator instead of just returning
        return (async function*() {})();
    }

    const prompt = cleanPromptTemplate(rawTranscript);
    // FIX: The `contents` property should be a single `Content` object for a single-turn request, not an array containing one.
    const request: GenerateContentParameters = {
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            temperature: 0.5, // Allow for some creativity in formatting
        }
    };

    return generateStream(request);
};

export function translateText(textToTranslate: string, targetLanguage: 'en' | 'sn'): AsyncGenerator<string> {
    if (!textToTranslate.trim()) {
        return (async function*() {})();
    }

    const targetLanguageName = targetLanguage === 'en' ? 'English' : 'Shona';
    const prompt = translatePromptTemplate(textToTranslate, targetLanguageName);

    // FIX: The `contents` property should be a single `Content` object for a single-turn request, not an array containing one.
    const request: GenerateContentParameters = {
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            temperature: 0.5, // Increased temperature to allow for more natural, less literal phrasing.
        }
    };

    return generateStream(request);
}

export function refineTranscript(rawTranscript: string, contentType: RefineContentType, outputFormat: RefineOutputFormat, targetLanguage: PreferredLanguage): AsyncGenerator<string> {
  if (!rawTranscript.trim()) {
      return (async function*() {})();
  }

  const prompt = getRefinePrompt(rawTranscript, contentType, outputFormat, targetLanguage);
  
  // FIX: The `contents` property should be a single `Content` object for a single-turn request, not an array containing one.
  const request: GenerateContentParameters = {
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
          temperature: 0.6, // Allow more creativity for structuring
      }
  };

  return generateStream(request);
}