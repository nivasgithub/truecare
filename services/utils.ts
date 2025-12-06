/**
 * robustly parses JSON from AI responses, handling potential Markdown formatting.
 */
export function cleanAndParseJSON<T>(text: string): T {
  try {
    // Remove markdown code blocks
    let clean = text.replace(/```json\s*|```/g, '').trim();
    // Extract JSON object if surrounded by other text
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }
    return JSON.parse(clean) as T;
  } catch (error) {
    console.error("JSON Parse Failed:", error);
    console.error("Raw Text:", text);
    throw new Error("Failed to read the AI response. Please try again with a clearer image.");
  }
}
