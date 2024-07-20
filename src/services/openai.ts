import { OpenAI } from "openai";
import { logger } from "../utils";
import { prompt } from "../constants/others";
import { labelCategories } from "../constants/emailConfig";

const { OPENAI_API_KEY } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function generateLabelAndReply(
  emailContent: string
): Promise<string[]> {
  const fallback = ["Human Intervention Required", ""];
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt + emailContent,
        },
      ],
      temperature: 0.7,
      // max_tokens: 64,
      top_p: 1,
    });

    const completion = response.choices[0]?.message?.content;

    const result: string[] = completion.split("_");
    if (
      !result ||
      result.length !== 2 ||
      !labelCategories.includes(result[0]) ||
      result[1] === ""
    ) {
      throw new Error("[OPENAI] Response not as expected");
    }

    logger.debug(
      `[OPENAI] Generated label: ${result[0]} and reply: ${result[1]}`
    );

    return result;
  } catch (error) {
    logger.error(`[OPENAI] Error parsing completion: ${error}`);
    return fallback;
  }
}
