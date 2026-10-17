// A deliberately small first-line profanity filter. It blocks obvious abuse
// and asks the writer to rephrase; reports + admin review catch the rest.
// Extend the lists as the community needs.

// Whole words only, so "Scunthorpe" or "shiitake" are not caught.
const ENGLISH = /\b(fuck\w*|f+u+c+k+|shit|shitty|bullshit|cunt\w*|bitch\w*|asshole\w*|dickhead\w*|motherfuck\w*|wanker\w*)\b/i;

// Cantonese / Chinese profanity, matched anywhere (no word boundaries in Chinese).
const CHINESE = ["屌", "撚", "閪", "仆街", "冚家鏟", "戇鳩", "柒頭", "on9", "食屎", "頂你個肺"];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return ENGLISH.test(lower) || CHINESE.some((word) => lower.includes(word));
}
