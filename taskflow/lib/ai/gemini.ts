import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIProvider,
  BoardHealthReport,
  BoardPayload,
  RawBoardHealthReport,
  RawBoardHealthReportSchema,
} from "./types";
import { buildHealthReportPrompt, PROMPT_VERSION } from "./prompts";

const DEFAULT_MODEL = "gemini-2.0-flash-lite";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateHealthReport(payload: BoardPayload): Promise<BoardHealthReport> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const prompt = buildHealthReportPrompt(payload);

    let rawText: string;
    try {
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Gemini API call failed: ${msg}`);
    }

    // Gemini sometimes wraps output in ```json ... ``` — strip it
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const cleaned = (fenceMatch ? fenceMatch[1] : rawText).trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`AI returned non-JSON response: ${detail}`);
    }

    let validated: RawBoardHealthReport;
    try {
      validated = RawBoardHealthReportSchema.parse(parsed);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`AI returned unexpected response format: ${detail}`);
    }

    return {
      ...validated,
      generatedAt: new Date().toISOString(),
      provider: this.name,
      model: this.model,
      promptVersion: PROMPT_VERSION,
    };
  }
}
