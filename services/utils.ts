/**
 * robustly parses JSON from AI responses, handling potential Markdown formatting and common syntax errors.
 */
export function cleanAndParseJSON<T>(text: string): T {
  if (!text) throw new Error("Received empty response from AI.");

  // 1. Remove markdown code blocks
  let clean = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

  // 2. Extract JSON object/array if surrounded by conversational text
  const firstOpenBrace = clean.indexOf('{');
  const firstOpenBracket = clean.indexOf('[');
  
  let start = -1;
  let end = -1;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      start = firstOpenBrace;
      end = clean.lastIndexOf('}');
  } else if (firstOpenBracket !== -1) {
      start = firstOpenBracket;
      end = clean.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }

  // 3. Remove trailing commas (common LLM error: {"a": 1,})
  clean = clean.replace(/,(\s*[}\]])/g, '$1');

  // 4. Attempt Parse
  try {
      const result = JSON.parse(clean);
      if (result === null || typeof result !== 'object') {
          return {} as T;
      }
      return result as T;
  } catch (e) {
      // 5. Repair Attempt: Replace newlines in strings with spaces
      try {
        const repaired = clean.replace(/[\n\r]/g, ' '); 
        const result = JSON.parse(repaired);
        if (result === null || typeof result !== 'object') {
            return {} as T;
        }
        return result as T;
      } catch (e2) {
        console.error("JSON Parse Failed:", e2);
        console.error("Raw Text:", text);
        // Return empty object on failure to prevent app crash, 
        // letting the UI handle empty states gracefully.
        return {} as T;
      }
  }
}

/**
 * Executes a promise-returning function with exponential backoff retry logic.
 * Useful for handling 503 (Service Unavailable) or 429 (Rate Limit) errors.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isRetryable = e.message?.includes('503') || e.message?.includes('429') || e.status === 503 || e.status === 429;
      
      if (isRetryable && i < retries - 1) {
         console.warn(`API Attempt ${i + 1} failed. Retrying in ${delayMs}ms...`);
         await new Promise(res => setTimeout(res, delayMs * Math.pow(2, i))); // Exponential backoff
         continue;
      }
      throw e;
    }
  }
  throw lastError;
}