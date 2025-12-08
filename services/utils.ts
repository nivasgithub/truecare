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