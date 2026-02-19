// utils/translateResponse.ts
import { translateText } from "../services/translate.service";

export const translateResponse = async (
  data: any,
  fields: string[],
  lang: string
) => {
  if (lang === "en") return data;

  const translated = { ...data };

  for (const field of fields) {
    if (translated[field]) {
      translated[field] = await translateText(translated[field], lang);
    }
  }

  return translated;
};
