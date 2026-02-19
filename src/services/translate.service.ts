// services/translate.service.ts
export const translateText = async (
  text: string,
  targetLang: string
): Promise<string> => {
  if (targetLang === "en") return text;

  // Force mock translation
  return `[${targetLang}] ${text}`;
};

// services/translate.service.ts

// import { Translate } from "@google-cloud/translate/build/src/v2";
// const translate = new Translate({
//   key: process.env.GOOGLE_TRANSLATE_API_KEY,
// });

// export const translateText = async (
//   text: string,
//   targetLang: string
// ): Promise<string> => {
//   if (!text || targetLang === "en") return text;

//   try {
//     const [translatedText] = await translate.translate(text, targetLang);
//     return translatedText;
//   } catch (error) {
//     console.error("Translation failed:", error);
//     return text; // fallback to original
//   }
// };
