import { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";

export function createAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "gemini";

  switch (providerName) {
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER value: "${providerName}". Supported: "gemini".`
      );
  }
}
