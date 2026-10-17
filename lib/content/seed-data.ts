// Seed content for LORE: eight public-domain classics, one focused excerpt
// each, and twenty bilingual questions.
//
// Copyright notes:
//   * English texts are public-domain translations. The Gutenberg URL for
//     each one is in `source_note` and `license_note`.
//   * Chinese text for Western classics is an original LORE summary, not a
//     translation, and is marked text_zh_is_summary = true.
//   * 《論語》 and 《孟子》 use the original Chinese with James Legge's
//     public-domain English translation.
//
// The seed script (`npm run seed`) upserts all of this by slug.

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
  {
    slug: "politics",
    title_zh: "政治學",
    title_en: "Politics",
    author_zh: "亞里士多德",
    author_en: "Aristotle",
    era_zh: "古希臘，約公元前 335 年",
    era_en: "Ancient Greece, c. 335 BCE",
    description_zh:
      "亞里士多德研究城邦、公民與各種政體，追問甚麼樣的政治共同體最能讓人活得好。它把政治從理想拉回現實，是西方政治學的基礎文本。",
    description_en:
      "Aristotle examines the city, citizenship and different constitutions, asking which political community best enables people to live well. It brings political thought down from the ideal to the real, and remains a foundation of Western political science.",
  },
  {
    slug: "leviathan",
    title_zh: "利維坦",
    title_en: "Leviathan",
    author_zh: "霍布斯",
    author_en: "Thomas Hobbes",
    era_zh: "英格蘭，1651 年",
    era_en: "England, 1651",
    description_zh:
      "霍布斯用「自然狀態」和社會契約，論證為甚麼人需要一個強大的主權者來維持和平。它既是近代政治哲學的起點，也是對權力最冷靜的警告之一。",
    description_en:
      "Hobbes uses the idea of a state of nature and a social contract to explain why people need a powerful sovereign to keep the peace. It is both a founding text of modern political philosophy and one of the coldest warnings about power.",
  },
  {
    slug: "social-contract",
    title_zh: "社會契約論",
    title_en: "The Social Contract",
    author_zh: "盧梭",
    author_en: "Jean-Jacques Rousseau",
    era_zh: "法國，1762 年",
    era_en: "France, 1762",
    description_zh:
      "盧梭追問：權力在甚麼時候才算正當？他提出人民主權與「共同意志」，主張自由不是為所欲為，而是服從自己參與訂立的法律。",
    description_en:
      "Rousseau asks when authority is legitimate. He proposes popular sovereignty and the general will, arguing that freedom is not doing whatever one likes but obeying laws one has helped to make.",
  },
  {
    slug: "on-liberty",
    title_zh: "論自由",
    title_en: "On Liberty",
    author_zh: "密爾",
    author_en: "John Stuart Mill",
    era_zh: "英國，1859 年",
    era_en: "Britain, 1859",
    description_zh:
      "密爾為個人自由劃出一條界線：社會只有在防止一個人傷害別人時，才可以違背他的意願干涉他。這是自由主義最重要的經典之一。",
    description_en:
      "Mill draws a boundary around individual liberty: society may interfere with a person against their will only to prevent harm to others. It is one of the central texts of liberalism.",
  },
  {
    slug: "the-prince",
    title_zh: "君主論",
    title_en: "The Prince",
    author_zh: "馬基雅維利",
    author_en: "Niccolò Machiavelli",
    era_zh: "意大利，1532 年",
    era_en: "Italy, 1532",
    description_zh:
      "馬基雅維利從現實而非理想出發，分析統治者如何取得和保住權力。它常被視為現代政治學的開端，也一直引發「政治是否可以沒有道德」的爭論。",
    description_en:
      "Machiavelli analyses how rulers acquire and keep power, starting from how politics actually works rather than how it ought to. Often called the beginning of modern political science, it still provokes the question of whether politics can be separated from morality.",
  },
  {
    slug: "analects",
    title_zh: "論語",
    title_en: "The Analects",
    author_zh: "孔子",
    author_en: "Confucius",
    era_zh: "中國，約公元前 5 世紀",
    era_en: "China, c. 5th century BCE",
    description_zh:
      "《論語》記錄孔子與弟子的言行，討論仁、禮、君子與為政之道。它塑造了東亞兩千多年的教育、政治與日常倫理。",
    description_en:
      "The Analects records the sayings and conversations of Confucius and his disciples, on benevolence, ritual, the noble person and government. It has shaped education, politics and everyday ethics across East Asia for more than two thousand years.",
  },
  {
    slug: "mencius",
    title_zh: "孟子",
    title_en: "Mencius",
    author_zh: "孟子",
    author_en: "Mencius",
    era_zh: "中國，約公元前 4 世紀",
    era_en: "China, c. 4th century BCE",
    description_zh:
      "孟子發展孔子的思想，主張人性本善、施行仁政、以民為本。他與國君的對話，是儒家政治思想最有力的部分之一。",
    description_en:
      "Mencius develops Confucius's thought, arguing that human nature is good, that government should be benevolent, and that the people are the foundation of the state. His dialogues with rulers are among the most forceful parts of Confucian political thought.",
  },
];

export const SEED_EXCERPTS = [
  {
    classic_slug: "republic",
    // Republic, Book VI, 488a–489a — "the ship of state".
    text_en: [
      "Imagine then a fleet or a ship in which there is a captain who is taller and stronger than any of the crew, but he is a little deaf and has a similar infirmity in sight, and his knowledge of navigation is not much better.",
      "The sailors are quarrelling with one another about the steering—every one is of opinion that he has a right to steer, though he has never learned the art of navigation and cannot tell who taught him or when he learned, and will further assert that it cannot be taught, and they are ready to cut in pieces any one who says the contrary.",
      "They throng about the captain, begging and praying him to commit the helm to them; and if at any time they do not prevail, but others are preferred to them, they kill the others or throw them overboard, and having first chained up the noble captain's senses with drink or some narcotic drug, they mutiny and take possession of the ship and make free with the stores; thus, eating and drinking, they proceed on their voyage in such manner as might be expected of them.",
      "Him who is their partisan and cleverly aids them in their plot for getting the ship out of the captain's hands into their own whether by force or persuasion, they compliment with the name of sailor, pilot, able seaman, and abuse the other sort of man, whom they call a good-for-nothing; but that the true pilot must pay attention to the year and seasons and sky and stars and winds, and whatever else belongs to his art, if he intends to be really qualified for the command of a ship, and that he must and will be the steerer, whether other people like or not—the possibility of this union of authority with the steerer's art has never seriously entered into their thoughts or been made part of their calling.",
      "Now in vessels which are in a state of mutiny and by sailors who are mutineers, how will the true pilot be regarded? Will he not be called by them a prater, a star-gazer, a good-for-nothing?",
    ].join("\n\n"),
    text_zh: [
      "（摘要）蘇格拉底請聽者想像一艘船：船主比所有船員都高大強壯，卻有點耳聾、視力不好，對航海也所知不多。",
      "水手們為了誰來掌舵而爭吵。每個人都認為自己有權掌舵，雖然從未學過航海，也說不出跟誰學過；他們甚至聲稱航海根本不能教，誰反對就要把誰撕成碎片。",
      "他們圍著船主，求他把舵交出來；求不到的話，就把被選中的人殺掉或扔下船，再用酒或藥迷倒船主，奪船、搶物資，一路吃喝，照他們的方式航行。",
      "誰幫他們用武力或游說把船搶到手，他們就稱讚誰是好水手、好舵手；不幫的人則被罵作無用之人。至於真正的舵手必須懂得四季、天空、星辰和風向，掌舵的權力應該與航海的知識結合——這一點他們從未認真想過。",
      "蘇格拉底於是問：在這樣一艘嘩變的船上，真正的舵手會被怎樣看待？他會不會被罵作只懂空談、望天打卦的無用之人？",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Plato, Republic, Book VI, 488a–489a. Benjamin Jowett translation (1871), public domain — Project Gutenberg #1497: https://www.gutenberg.org/ebooks/1497",
    translator: "Benjamin Jowett (1871), public domain. 中文為古問自撰摘要，並非譯文。",
    license_note: "Jowett translation is in the public domain. Chinese summary is original to LORE.",
  },
  {
    classic_slug: "politics",
    // Politics, Book III, ch. 15–16 — the multitude as judge.
    text_en: [
      "But whether is it better for the community that those things which cannot possibly come under the cognisance of the law either at all or properly should be under the government of every worthy citizen, as the present method is, when the public community, in their general assemblies, act as judges and counsellors, where all their determinations are upon particular cases, for one individual, be he who he will, will be found, upon comparison, inferior to a whole people taken collectively: but this is what a city is, as a public entertainment is better than one man's portion: for this reason the multitude judge of many things better than any one single person.",
      "They are also less liable to corruption from their numbers, as water is from its quantity: besides, the judgment of an individual must necessarily be perverted if he is overcome by anger or any other passion; but it would be hard indeed if the whole community should be misled by anger.",
    ].join("\n\n"),
    text_zh: [
      "（摘要）亞里士多德問：法律無法處理的具體情況，應該交給一位最優秀的人，還是由全體公民一起判斷？",
      "他認為，把許多人的判斷集合起來，往往比任何一個人更好；就像眾人合資的宴席，比一個人的份量更豐富。",
      "人數多也較不容易被憤怒或私心腐蝕；一個人可能因情緒而判斷失誤，整個共同體卻較難被同一種情緒帶走。",
      "他又問：如果城邦裡有很多同樣善良的人，應該選一位，還是選多數？他的答案是：選多數。",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Aristotle, Politics, Book III, ch. 15. William Ellis translation, public domain — Project Gutenberg #6762: https://www.gutenberg.org/ebooks/6762",
    translator: "William Ellis (19th century), public domain. 中文為古問自撰摘要，並非譯文。",
    license_note: "Ellis translation is in the public domain. Chinese summary is original to LORE. Jowett's translation was not available in a verifiable public-domain file, so Ellis's public-domain translation is used instead.",
  },
  {
    classic_slug: "leviathan",
    // Leviathan, ch. 13 — the state of nature.
    text_en: [
      "Hereby it is manifest, that during the time men live without a common Power to keep them all in awe, they are in that condition which is called Warre; and such a warre, as is of every man, against every man. For WARRE, consisteth not in Battell onely, or the act of fighting; but in a tract of time, wherein the Will to contend by Battell is sufficiently known: and therefore the notion of Time, is to be considered in the nature of Warre; as it is in the nature of Weather. For as the nature of Foule weather, lyeth not in a showre or two of rain; but in an inclination thereto of many dayes together: So the nature of War, consisteth not in actuall fighting; but in the known disposition thereto, during all the time there is no assurance to the contrary. All other time is PEACE.",
      "Whatsoever therefore is consequent to a time of Warre, where every man is Enemy to every man; the same is consequent to the time, wherein men live without other security, than what their own strength, and their own invention shall furnish them withall. In such condition, there is no place for Industry; because the fruit thereof is uncertain; and consequently no Culture of the Earth; no Navigation, nor use of the commodities that may be imported by Sea; no commodious Building; no Instruments of moving, and removing such things as require much force; no Knowledge of the face of the Earth; no account of Time; no Arts; no Letters; no Society; and which is worst of all, continuall feare, and danger of violent death; And the life of man, solitary, poore, nasty, brutish, and short.",
    ].join("\n\n"),
    text_zh: [
      "（摘要）霍布斯想像一個沒有共同權力的狀態：人人彼此為敵，這就是「戰爭狀態」。",
      "戰爭不一定是實際打鬥，而是大家都知道彼此隨時可能動手，沒有一刻安全。",
      "在這種狀態下，沒有農業、航海、建築、藝術或社會；人只有持續的恐懼和暴死的危險。",
      "因此，人生是孤獨、貧窮、污穢、野蠻而短暫的。霍布斯用這個畫面說明，為甚麼人需要一個能令所有人畏懼的共同權力。",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Thomas Hobbes, Leviathan, ch. 13 (1651), public domain — Project Gutenberg #3207: https://www.gutenberg.org/ebooks/3207",
    translator: "English text: Thomas Hobbes (1651), public domain. 中文為古問自撰摘要，並非譯文。",
    license_note: "Original English text is in the public domain. Chinese summary is original to LORE.",
  },
  {
    classic_slug: "social-contract",
    // The Social Contract, Book I, ch. 6–7.
    text_en: [
      "If then we discard from the social compact what is not of its essence, we shall find that it reduces itself to the following terms—",
      "\"Each of us puts his person and all his power in common under the supreme direction of the general will, and, in our corporate capacity, we receive each member as an indivisible part of the whole.\"",
      "At once, in place of the individual personality of each contracting party, this act of association creates a moral and collective body, composed of as many members as the assembly contains votes, and receiving from this act its unity, its common identity, its life and its will.",
      "In order then that the social compact may not be an empty formula, it tacitly includes the undertaking, which alone can give force to the rest, that whoever refuses to obey the general will shall be compelled to do so by the whole body. This means nothing less than that he will be forced to be free; for this is the condition which, by giving each citizen to his country, secures him against all personal dependence.",
    ].join("\n\n"),
    text_zh: [
      "（摘要）盧梭問：怎樣的社會結合，能讓每個人既服從共同體，又仍然只服從自己？",
      "他的答案是一條「社會契約」：每個人都把自身和全部力量，交出來置於「共同意志」的最高指導之下。",
      "共同體接收每個成員作為整體不可分割的一部分；這個公共人格就是共和國、國家或主權者。",
      "契約不是空話：誰拒絕服從共同意志，全體就會強迫他服從。盧梭說，這等於「強迫他自由」。",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Jean-Jacques Rousseau, The Social Contract, Book I, ch. 6–7. G. D. H. Cole translation (1913), public domain in the US and Hong Kong — Project Gutenberg #46333: https://www.gutenberg.org/ebooks/46333",
    translator: "G. D. H. Cole (1913). 中文為古問自撰摘要，並非譯文。",
    license_note: "Cole died in 1959; his translation is public domain in the US (published 1913) and in Hong Kong (life + 50). It may still be protected in the UK/EU until 2030; check your jurisdiction.",
  },
  {
    classic_slug: "on-liberty",
    // On Liberty, ch. 1 — the harm principle.
    text_en: [
      "The object of this Essay is to assert one very simple principle, as entitled to govern absolutely the dealings of society with the individual in the way of compulsion and control, whether the means used be physical force in the form of legal penalties, or the moral coercion of public opinion. That principle is, that the sole end for which mankind are warranted, individually or collectively, in interfering with the liberty of action of any of their number, is self-protection. That the only purpose for which power can be rightfully exercised over any member of a civilised community, against his will, is to prevent harm to others. His own good, either physical or moral, is not a sufficient warrant. He cannot rightfully be compelled to do or forbear because it will be better for him to do so, because it will make him happier, because, in the opinions of others, to do so would be wise, or even right.",
      "These are good reasons for remonstrating with him, or reasoning with him, or persuading him, or entreating him, but not for compelling him, or visiting him with any evil in case he do otherwise. To justify that, the conduct from which it is desired to deter him must be calculated to produce evil to some one else. The only part of the conduct of any one, for which he is amenable to society, is that which concerns others. In the part which merely concerns himself, his independence is, of right, absolute. Over himself, over his own body and mind, the individual is sovereign.",
    ].join("\n\n"),
    text_zh: [
      "（摘要）密爾提出一條簡單原則：社會干涉個人自由，唯一正當的理由是自我保護。",
      "對一個文明社會的成員，違背他的意願行使權力，唯一正當的目的，是防止他傷害別人。",
      "他本人的好處——身體或道德上的——都不足以成為強迫他的理由；我們可以勸告、討論、懇求，但不能強迫。",
      "只有涉及他人的行為，才需要向社會負責；只涉及自己的部分，個人有絕對的獨立，對自己的身體和心靈擁有主權。",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "John Stuart Mill, On Liberty, ch. 1 (1859), public domain — Project Gutenberg #34901: https://www.gutenberg.org/ebooks/34901",
    translator: "English text: John Stuart Mill (1859), public domain. 中文為古問自撰摘要，並非譯文。",
    license_note: "Original English text is in the public domain. Chinese summary is original to LORE.",
  },
  {
    classic_slug: "the-prince",
    // The Prince, ch. 17 — feared or loved.
    text_en: [
      "Upon this a question arises: whether it be better to be loved than feared or feared than loved? It may be answered that one should wish to be both, but, because it is difficult to unite them in one person, it is much safer to be feared than loved, when, of the two, either must be dispensed with. Because this is to be asserted in general of men, that they are ungrateful, fickle, false, cowardly, covetous, and as long as you succeed they are yours entirely; they will offer you their blood, property, life, and children, as is said above, when the need is far distant; but when it approaches they turn against you. And that prince who, relying entirely on their promises, has neglected other precautions, is ruined; because friendships that are obtained by payments, and not by greatness or nobility of mind, may indeed be earned, but they are not secured, and in time of need cannot be relied upon; and men have less scruple in offending one who is beloved than one who is feared, for love is preserved by the link of obligation which, owing to the baseness of men, is broken at every opportunity for their advantage; but fear preserves you by a dread of punishment which never fails.",
    ].join("\n\n"),
    text_zh: [
      "（摘要）馬基雅維利問：領袖應該被愛戴，還是被畏懼？",
      "他說，最好兩者兼備；但如果只能選一個，被畏懼比被愛戴更安全。",
      "因為人通常忘恩負義、善變、虛偽、怯懦、貪婪；你成功時他們屬於你，危難時就轉向。",
      "靠金錢買來的友誼不牢靠；人們冒犯一個被愛的人，比冒犯一個被畏懼的人更少顧忌，因為愛會隨利益斷裂，恐懼卻由刑罰維持。",
    ].join("\n\n"),
    text_zh_is_summary: true,
    source_note: "Niccolò Machiavelli, The Prince, ch. 17. W. K. Marriott translation (1908), public domain — Project Gutenberg #1232: https://www.gutenberg.org/ebooks/1232",
    translator: "W. K. Marriott (1908), public domain. 中文為古問自撰摘要，並非譯文。",
    license_note: "Marriott translation is in the public domain. Chinese summary is original to LORE.",
  },
  {
    classic_slug: "analects",
    // Analects 2.3 and 12.19.
    text_en: [
      "The Master said, 'If the people be led by laws, and uniformity sought to be given them by punishments, they will try to avoid the punishment, but have no sense of shame. If they be led by virtue, and uniformity sought to be given them by the rules of propriety, they will have the sense of shame, and moreover will become good.'",
      "Chi K'ang asked Confucius about government, saying, 'What do you say to killing the unprincipled for the good of the principled?' Confucius replied, 'Sir, in carrying on your government, why should you use killing at all? Let your evinced desires be for what is good, and the people will be good. The relation between superiors and inferiors, is like that between the wind and the grass. The grass must bend, when the wind blows across it.'",
    ].join("\n\n"),
    text_zh: [
      "子曰：「道之以政，齊之以刑，民免而無恥；道之以德，齊之以禮，有恥且格。」（《論語·為政》2.3）",
      "季康子問政於孔子曰：「如殺無道，以就有道，何如？」孔子對曰：「子為政，焉用殺？子欲善，而民善矣。君子之德風，小人之德草。草上之風，必偃。」（《論語·顏淵》12.19）",
    ].join("\n\n"),
    text_zh_is_summary: false,
    source_note: "《論語·為政》2.3 及《論語·顏淵》12.19；James Legge, The Chinese Classics, Vol. I (1861/1893), public domain — Project Gutenberg #3330: https://www.gutenberg.org/ebooks/3330",
    translator: "James Legge (1861/1893), public domain. 中文原文為公共領域經典。",
    license_note: "The Chinese original and Legge's English translation are in the public domain.",
  },
  {
    classic_slug: "mencius",
    // Mencius 1A1 — profit versus righteousness.
    text_en: [
      "Mencius went to see King Hwuy of Lëang. The king said, 'Venerable Sir, since you have not counted it far to come here a distance of a thousand li, may I presume that you are likewise provided with counsels to profit my kingdom?' Mencius replied, 'Why must your Majesty use that word \"profit\"? What I am likewise provided with are counsels to benevolence and righteousness; and these are my only topics.'",
      "If your Majesty say, 'What is to be done to profit my kingdom?' the great officers will say, 'What is to be done to profit our families?' and the inferior officers and the common people will say, 'What is to be done to profit our persons?' Superiors and inferiors will try to take the profit the one from the other, and the kingdom will be endangered. In the kingdom of ten thousand chariots, the murderer of his ruler will be the chief of a family of a thousand chariots. In the State of a thousand chariots, the murderer of his ruler will be the chief of a family of a hundred chariots. To have a thousand in ten thousand, and a hundred in a thousand, cannot be regarded as not a large allowance; but if righteousness be put last and profit first, they will not be satisfied without snatching all.",
      "There never was a man trained to benevolence who neglected his parents. There never was a man trained to righteousness who made his ruler an after consideration. Let your Majesty likewise make benevolence and righteousness your only themes—Why must you speak of profit?",
    ].join("\n\n"),
    text_zh: [
      "孟子見梁惠王。王曰：「叟不遠千里而來，亦將有以利吾國乎？」孟子對曰：「王何必曰利？亦有仁義而已矣。王曰『何以利吾國』？大夫曰『何以利吾家』？士庶人曰『何以利吾身』？上下交征利而國危矣。萬乘之國弒其君者，必千乘之家；千乘之國弒其君者，必百乘之家。萬取千焉，千取百焉，不為不多矣。苟為後義而先利，不奪不饜。未有仁而遺其親者也，未有義而後其君者也。王亦曰仁義而已矣，何必曰利？」（《孟子·梁惠王上》1A1）",
    ].join("\n\n"),
    text_zh_is_summary: false,
    source_note: "《孟子·梁惠王上》1A1；James Legge translation in Chinese Literature (Gutenberg #10056), public domain — https://www.gutenberg.org/ebooks/10056. Chinese original: Project Gutenberg #24178 — https://www.gutenberg.org/ebooks/24178",
    translator: "James Legge, public domain. 中文原文為公共領域經典。",
    license_note: "The Chinese original and Legge's English translation are in the public domain. Obvious OCR errors in the Gutenberg text were corrected.",
  },
];

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
    tags: ["politics", "power"],
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
    excerpt_classic_slug: "republic",
    featured: true,
  },
  {
    slug: "first-duty-of-government",
    question_zh: "一個好政府的首要責任是甚麼？",
    question_en: "What is the first duty of a good government?",
    tags: ["politics", "ethics"],
    difficulty: 1,
    excerpt_classic_slug: "republic",
    featured: false,
  },
  {
    slug: "experts-or-citizens",
    question_zh: "治理國家應該交給專家，還是由公民共同決定？",
    question_en: "Should government be left to experts or decided by citizens?",
    tags: ["politics", "power"],
    difficulty: 2,
    excerpt_classic_slug: "politics",
    featured: false,
  },
  {
    slug: "crowd-versus-expert",
    question_zh: "群眾的判斷一定比專家可靠嗎？",
    question_en: "Is a crowd always wiser than an expert?",
    tags: ["politics", "society"],
    difficulty: 2,
    excerpt_classic_slug: "politics",
    featured: false,
  },
  {
    slug: "strong-state",
    question_zh: "為了避免混亂，我們需要一個強大的國家嗎？",
    question_en: "Do we need a strong state to avoid chaos?",
    tags: ["politics", "power"],
    difficulty: 2,
    excerpt_classic_slug: "leviathan",
    featured: true,
  },
  {
    slug: "obey-unjust-laws",
    question_zh: "人有沒有責任服從不公義的法律？",
    question_en: "Do we have a duty to obey unjust laws?",
    tags: ["law", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: "leviathan",
    featured: false,
  },
  {
    slug: "fear-and-order",
    question_zh: "恐懼可以成為政治秩序的正當基礎嗎？",
    question_en: "Can fear be a legitimate basis for political order?",
    tags: ["politics", "ethics"],
    difficulty: 3,
    excerpt_classic_slug: "leviathan",
    featured: false,
  },
  {
    slug: "legitimate-authority",
    question_zh: "甚麼令權力變得正當？",
    question_en: "What makes authority legitimate?",
    tags: ["politics", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: "social-contract",
    featured: true,
  },
  {
    slug: "general-will-minority",
    question_zh: "多數人可以把「共同意志」強加於少數人嗎？",
    question_en: "Can the majority impose the \"general will\" on a minority?",
    tags: ["politics", "liberty"],
    difficulty: 3,
    excerpt_classic_slug: "social-contract",
    featured: false,
  },
  {
    slug: "freedom-under-law",
    question_zh: "在規則之下，人還可以是自由的嗎？",
    question_en: "Can people be free under rules?",
    tags: ["liberty", "law"],
    difficulty: 2,
    excerpt_classic_slug: "social-contract",
    featured: false,
  },
  {
    slug: "limit-freedom",
    question_zh: "自由應該在甚麼時候受限制？",
    question_en: "When should freedom be limited?",
    tags: ["liberty", "law"],
    difficulty: 1,
    excerpt_classic_slug: "on-liberty",
    featured: true,
  },
  {
    slug: "offensive-speech",
    question_zh: "令人反感的言論應該被禁止嗎？",
    question_en: "Should offensive speech be banned?",
    tags: ["liberty", "law"],
    difficulty: 2,
    excerpt_classic_slug: "on-liberty",
    featured: false,
  },
  {
    slug: "social-pressure",
    question_zh: "社會壓力也可以是一種壓迫嗎？",
    question_en: "Can social pressure be a form of oppression?",
    tags: ["liberty", "society"],
    difficulty: 2,
    excerpt_classic_slug: "on-liberty",
    featured: false,
  },
  {
    slug: "leader-any-means",
    question_zh: "領袖為了大局可以不擇手段嗎？",
    question_en: "May a leader use any means for the greater good?",
    tags: ["power", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: "the-prince",
    featured: true,
  },
  {
    slug: "loved-or-feared",
    question_zh: "領袖應該被愛戴，還是被畏懼？",
    question_en: "Should a leader be loved or feared?",
    tags: ["power", "politics"],
    difficulty: 1,
    excerpt_classic_slug: "the-prince",
    featured: false,
  },
  {
    slug: "virtue-or-law",
    question_zh: "治理社會，靠道德榜樣還是靠法律？",
    question_en: "Should society be governed by moral example or by law?",
    tags: ["politics", "ethics"],
    difficulty: 1,
    excerpt_classic_slug: "analects",
    featured: false,
  },
  {
    slug: "leader-character",
    question_zh: "領袖的品格比制度更重要嗎？",
    question_en: "Does a leader's character matter more than institutions?",
    tags: ["politics", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: "analects",
    featured: false,
  },
  {
    slug: "profit-or-righteousness",
    question_zh: "國家應該先追求利益，還是仁義？",
    question_en: "Should a state pursue profit or righteousness first?",
    tags: ["politics", "ethics"],
    difficulty: 2,
    excerpt_classic_slug: "mencius",
    featured: false,
  },
  {
    slug: "people-first",
    question_zh: "人民的福祉應該是政府的最高標準嗎？",
    question_en: "Should the people's welfare be the supreme test of government?",
    tags: ["politics", "society"],
    difficulty: 1,
    excerpt_classic_slug: "mencius",
    featured: false,
  },
];
