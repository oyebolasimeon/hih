export const AI_CHAT_LANGUAGES = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { value: "ha", label: "Hausa", nativeLabel: "Hausa" },
  { value: "pcm", label: "Pidgin", nativeLabel: "Naija Pidgin" },
  { value: "ar", label: "Arabic", nativeLabel: "العربية" },
  { value: "ig", label: "Igbo", nativeLabel: "Igbo" },
] as const;

export type AiChatLanguage = (typeof AI_CHAT_LANGUAGES)[number]["value"];

export const AI_CHAT_LANGUAGE_VALUES = AI_CHAT_LANGUAGES.map((l) => l.value);

export function isAiChatLanguage(value: string): value is AiChatLanguage {
  return (AI_CHAT_LANGUAGE_VALUES as readonly string[]).includes(value);
}

export function languageInstruction(lang: AiChatLanguage) {
  const meta = AI_CHAT_LANGUAGES.find((l) => l.value === lang) || AI_CHAT_LANGUAGES[0];
  const urlRule =
    " Never invent or rewrite URLs — paste absolute links from tools/APP_LINKS exactly.";
  if (lang === "en") {
    return `Respond in clear English.${urlRule}`;
  }
  if (lang === "pcm") {
    return `Respond in Nigerian Pidgin (Naija Pidgin). Keep property names, rents, cities, URLs and numbers accurate in their original form.${urlRule}`;
  }
  if (lang === "ar") {
    return `Respond in Modern Standard Arabic (العربية). Keep property names, rents, cities, URLs and numbers accurate. You may keep brand name “House In Hands” in Latin script.${urlRule}`;
  }
  return `Respond entirely in ${meta.label} (${meta.nativeLabel}). Keep property titles, rents, city/state names, currency amounts, and URLs accurate — do not invent translations that change meaning. Brand name may stay “House In Hands”.${urlRule}`;
}
