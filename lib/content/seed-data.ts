// Demo content. Used by `npm run seed` and as the fallback shown when
// Supabase isn't configured yet.
//
// Copyright: the English excerpt is Benjamin Jowett's 1871 translation
// (public domain). The Chinese text is an original summary written for LORE,
// not a translation, and is labelled as a summary in the UI.

export const SEED_CLASSICS = [
  {
    slug: "republic",
    title_zh: "理想國",
    title_en: "The Republic",
    author_zh: "柏拉圖",
    author_en: "Plato",
    era_zh: "古希臘，約公元前 375 年",
    era_en: "Ancient Greece, c. 375 BCE",
    description_zh:
      "柏拉圖以對話體寫成，借蘇格拉底之口追問：甚麼是正義？怎樣的城邦才算好？誰有資格統治？兩千多年來，它一直是討論政治、教育與權力的起點。",
    description_en:
      "A dialogue in which Socrates asks what justice is, what makes a city good, and who deserves to rule. For more than two thousand years it has been a starting point for arguments about politics, education and power.",
  },
] as const;

export const SEED_EXCERPTS = [
  {
    classic_slug: "republic",
    // Republic, Book VI, 488a–489a — "the ship of state".
    text_en: [
      "Imagine then a fleet or a ship in which there is a captain who is taller and stronger than any of the crew, but he is a little deaf and has a similar infirmity in sight, and his knowledge of navigation is not much better.",
      "The sailors are quarrelling with one another about the steering—every one is of opinion that he has a right to steer, though he has never learned the art of navigation and cannot tell who taught him or when he learned, and will further assert that it cannot be taught, and they are ready to cut in pieces any one who says the contrary.",
      "They throng about the captain, begging and praying him to commit the helm to them; and if at any time they do not prevail, but others are preferred to them, they kill the others or throw them overboard, and having first chained up the noble captain's senses with drink or some narcotic drug, they mutiny and take possession of the ship and make free with the stores; thus, eating and drinking, they proceed on their voyage in such a manner as might be expected of them.",
      "Him who is their partisan and cleverly aids them in their plot for getting the ship out of the captain's hands into their own whether by force or persuasion, they compliment with the name of sailor, pilot, able seaman, and abuse the other sort of man, whom they call a good-for-nothing; but that the true pilot must pay attention to the year and seasons and sky and stars and winds, and whatever else belongs to his art, if he intends to be really qualified for the command of a ship, and that he must and will be the steerer, whether other people like or not—the possibility of this union of authority with the steerer's art has never seriously entered into their thoughts or been made part of their calling.",
      "Now in vessels which are in a state of mutiny and by sailors who are mutineers, how will the true pilot be regarded? Will he not be called by them a prater, a star-gazer, a good-for-nothing?",
    ].join("\n\n"),
    text_zh: [
      "（摘要）蘇格拉底請聽者想像一艘船：船主比所有船員都高大強壯，卻有點耳聾、視力不好，對航海也所知不多。",
      "水手們為了誰來掌舵而爭吵。每個人都認為自己有權掌舵，雖然從未學過航海，也說不出跟誰學過；他們甚至聲稱航海根本不能教，誰反對就要把誰撕成碎片。",
      "他們圍著船主，求他把舵交出來；求不到的話，就把被選中的人殺掉或扔下船，再用酒或藥迷倒船主，奪船、搶物資，一路吃喝，照他們的方式航行。",
      "誰幫他們用武力或遊說把船搶到手，他們就稱讚誰是好水手、好舵手；不幫的人則被罵作無用之人。至於真正的舵手必須懂得四季、天空、星辰和風向，掌舵的權力應該與航海的知識結合——這一點他們從未認真想過。",
      "蘇格拉底於是問：在這樣一艘嘩變的船上，真正的舵手會被怎樣看待？他會不會被罵作只懂空談、望天打卦的無用之人？",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Plato, Republic, Book VI, 488a–489a",
    translator: "Benjamin Jowett (1871), public domain — Project Gutenberg #1497. 中文為古問自撰摘要，並非譯文。",
  },
] as const;

export interface SeedQuestion {
  slug: string;
  question_zh: string;
  question_en: string;
  tags: string[];
  difficulty: 1 | 2 | 3;
  excerpt_classic_slug: string | null;
  featured: boolean;
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  {
    slug: "who-should-rule",
    question_zh: "誰應該統治？",
    question_en: "Who should rule?",
    tags: ["politics"],
    difficulty: 1,
    excerpt_classic_slug: "republic",
    featured: true,
  },
  {
    slug: "majority-rule",
    question_zh: "如果大多數人可能是錯的，還要相信多數決嗎？",
    question_en: "If the majority may be wrong, should we still trust majority rule?",
    tags: ["politics", "society"],
    difficulty: 2,
    excerpt_classic_slug: null,
    featured: true,
  },
  {
    slug: "think-for-ourselves",
    question_zh: "如果 AI 能替我們思考，我們還需要自己思考嗎？",
    question_en: "If AI can think for us, do we still need to think for ourselves?",
    tags: ["technology", "ethics"],
    difficulty: 1,
    excerpt_classic_slug: null,
    featured: true,
  },
  {
    slug: "unjust-law",
    question_zh: "法律不公義時，我們還應該遵守嗎？",
    question_en: "Should we still obey a law that is unjust?",
    tags: ["law", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: null,
    featured: true,
  },
  {
    slug: "good-and-happy",
    question_zh: "做一個好人，會令你更快樂嗎？",
    question_en: "Does being a good person make you happier?",
    tags: ["ethics"],
    difficulty: 1,
    excerpt_classic_slug: null,
    featured: false,
  },
];
