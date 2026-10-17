// Guardrails around the AI Companion, on top of its system prompt:
//  1. `seeksConclusion` — questions that only ask for a verdict never reach
//     the model; the reader gets a guiding question back instead (and it
//     doesn't count against their daily limit).
//  2. `givesConclusion` — a last check on the model's answer; if it slipped
//     into giving a verdict, the answer is replaced.
// Both are deliberately narrow so ordinary comprehension questions pass.

import type { Locale } from "@/i18n/routing";

const ASKS_FOR_VERDICT: RegExp[] = [
  /\bwhat (should|do|would) (i|we) (think|believe|conclude|answer)\b/i,
  /\bwhat('?s| is) the (right|correct|real|true|best) answer\b/i,
  /\b(tell|give) me the answer\b/i,
  /\b(who|which side|which view) is (right|correct)\b/i,
  /\bis (plato|socrates|the author|he) (right|correct|wrong)\b/i,
  /\b(do|would) you agree\b/i,
  /\bwhat('?s| is) your (own |personal )?(opinion|view|position|take|conclusion)\b/i,
  /\bwhich side are you on\b/i,
  /\b(write|draft) (my|the|a) (reflection|answer|essay|response) (for me)?/i,
  /我應該(點|怎樣|怎麼|如何)(諗|想|看|答)/,
  /(正確|標準|真正|最好的)答案/,
  /答案(是|係)(甚麼|什麼|乜|咩)/,
  /(誰|邊個|哪一方|哪個觀點)(才)?(是)?(對(?![手方象話照應比待於])|啱|正確)/,
  /(柏拉圖|蘇格拉底|作者)(說得|講得)?(對|啱)(不對|唔啱|嗎|嘛|唔|？|\?)/,
  /你(的|個人)?(立場|個人意見|結論)/,
  /你(同意|支持|贊成)(邊|哪|誰|那)/,
  /(幫|替|代)我寫(反思|答案|看法)/,
];

const GIVES_VERDICT: RegExp[] = [
  /\bthe (correct|right|true) answer (is|would be)\b/i,
  /\byou should (believe|conclude|agree|think that)\b/i,
  /\b(in my (own )?(view|opinion)|i (personally )?(believe|think) (that )?(the (best|right|correct)|plato is right|philosophers should rule|democracy is))/i,
  /\bthe answer to (this|the|your) question is\b/i,
  /(正確|標準)答案(是|係)/,
  /我(個人)?(認為|覺得)(應該|最好|柏拉圖是對的|民主)/,
  /你應該(相信|認同|同意|得出)/,
  /(這|呢)個問題的答案(是|係)/,
];

export function seeksConclusion(question: string): boolean {
  return ASKS_FOR_VERDICT.some((re) => re.test(question));
}

export function givesConclusion(answer: string): boolean {
  return GIVES_VERDICT.some((re) => re.test(answer));
}

/** A friendly redirect back to the text, used whenever a verdict is asked for or slips out. */
export function guidingReply(locale: Locale): string {
  return locale === "en"
    ? "That part is yours to decide — I won't give you an answer or my own view, because the point is for you to form one. Try going back to the text: which sentence or image in it do you most agree with, or feel uneasy about? Why that one?"
    : "這一題要由你自己判斷，我不會給你答案或我的看法，因為重點是你自己形成觀點。不如回到原文看看：文中哪一句話或哪個比喻，最令你認同、或者最令你不安？為甚麼是那一句？";
}
