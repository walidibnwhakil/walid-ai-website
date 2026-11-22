// Source-checked, historical career evidence for individual Bangladeshi actors.
// "Unknown" is deliberate for everyone not listed: it is never proof of "no".
// Keep questions about dated events, rather than brittle current employment.
// Riaz: Daily Sun (2020): Air Force and Dui Duari, Daruchini Dwip, Moner Majhe Tumi.
// https://www.daily-sun.com/printversion/details/491983
// Amin Khan: The Business Standard (January 2026): senior executive director at Walton.
// https://www.tbsnews.net/economy/corporates/walton-signs-taskin-ahmed-brand-ambassador-1338306
// The Daily Star (2024): 1993 debut in Obujh Duti Mon.
// https://www.thedailystar.net/entertainment/tv-film/news/amin-khan-reflects-30-years-achievements-the-industry-3723031
// Daily Messenger (2024): featured in Walton television commercial.
// https://www.dailymessenger.net/entertainment/news/20046

// Shabnur: The Independent (2018) Chandni Raate and Tumi Amar.
// https://theindependentbd.com/printversion/details/170459
// Salman Shah/Shabnur: The Daily Star, Shopner Thikana and Anondo Osru.
// https://www.thedailystar.net/entertainment/tv-film/news/salman-shah-was-carefree-person-shabnur-3422741
// Moushumi: The Daily Star (2007) and The Independent (2017).
// https://archive.thedailystar.net/2007/01/12/d701121401114.htm
// https://theindependentbd.com/home/printnews/86897
// Shabana: documented films Janani, Bhat De, Moroner Pore.
// https://en.wikipedia.org/wiki/Shabana_(actress)

export const ACTOR_PROOF_QUESTIONS = Object.freeze([
  { id: "actor_film_chandni_raate", group: "actor_proof",
    en: "Did their film debut come with Chandni Raate?",
    bn: "তাঁর চলচ্চিত্রে অভিষেক কি 'চাঁদনী রাতে' দিয়ে হয়েছিল?" },
  { id: "actor_film_tumi_amar", group: "actor_proof",
    en: "Did they act in the film Tumi Amar?",
    bn: "তিনি কি 'তুমি আমার' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_dui_noyoner_alo", group: "actor_proof",
    en: "Did they receive national recognition for the film Dui Noyoner Alo?",
    bn: "তিনি কি 'দুই নয়নের আলো' চলচ্চিত্রের জন্য জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন?" },
  { id: "actor_film_keyamat", group: "actor_proof",
    en: "Did they act in the 1993 film Keyamat Theke Keyamat?",
    bn: "তিনি কি ১৯৯৩ সালের 'কেয়ামত থেকে কেয়ামত' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_anondo_osru", group: "actor_proof",
    en: "Did they act in Anondo Osru?",
    bn: "তিনি কি 'আনন্দ অশ্রু' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_meghla_akash", group: "actor_proof",
    en: "Did they act in Meghla Akash?",
    bn: "তিনি কি 'মেঘলা আকাশ' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_devdas_2013", group: "actor_proof",
    en: "Did they win a National Film Award for the 2013 film Devdas?",
    bn: "তিনি কি ২০১৩ সালের 'দেবদাস' চলচ্চিত্রের জন্য জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন?" },
  { id: "actor_film_janani", group: "actor_proof",
    en: "Did they act in the film Janani?",
    bn: "তিনি কি 'জননী' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_bhat_de", group: "actor_proof",
    en: "Did they act in the film Bhat De?",
    bn: "তিনি কি 'ভাত দে' চলচ্চিত্রে অভিনয় করেছেন?" },
  { id: "actor_film_moroner_pore", group: "actor_proof",
    en: "Did they act in Moroner Pore?",
    bn: "তিনি কি 'মরণের পরে' চলচ্চিত্রে অভিনয় করেছেন?" },
  {
    id: "actor_film_dui_duari",
    group: "actor_proof",
    en: "Did they act in the film Dui Duari?",
    bn: "তিনি কি 'দুই দুয়ারী' চলচ্চিত্রে অভিনয় করেছেন?",
  },
  {
    id: "actor_film_daruchini_dwip",
    group: "actor_proof",
    en: "Did they act in the film Daruchini Dwip?",
    bn: "তিনি কি 'দারুচিনি দ্বীপ' চলচ্চিত্রে অভিনয় করেছেন?",
  },
  {
    id: "actor_air_force",
    group: "actor_proof",
    en: "Did they serve in the Bangladesh Air Force before becoming a film actor?",
    bn: "চলচ্চিত্রে অভিনয়ের আগে কি তিনি বাংলাদেশ বিমানবাহিনীতে কাজ করেছেন?",
  },
  {
    id: "actor_film_moner_majhe_tumi",
    group: "actor_proof",
    en: "Did they act in Moner Majhe Tumi?",
    bn: "তিনি কি 'মনের মাঝে তুমি' চলচ্চিত্রে অভিনয় করেছেন?",
  },
  {
    id: "actor_walton_senior_exec",
    group: "actor_proof",
    en: "Have they served as a senior executive director at Walton?",
    bn: "তিনি কি ওয়ালটনে সিনিয়র এক্সিকিউটিভ ডিরেক্টর হিসেবে কাজ করেছেন?",
  },
  {
    id: "actor_film_obujh_duti_mon",
    group: "actor_proof",
    en: "Did their film career begin with Obujh Duti Mon?",
    bn: "তাঁর চলচ্চিত্রজীবন কি 'অবুঝ দুটি মন' দিয়ে শুরু হয়েছিল?",
  },
  {
    id: "actor_walton_ad",
    group: "actor_proof",
    en: "Have they appeared in advertisements for Walton products?",
    bn: "তিনি কি ওয়ালটনের পণ্যের বিজ্ঞাপনে অভিনয় করেছেন?",
  },
]);

export const ACTOR_PROOFS = Object.freeze({
  Q7322180: Object.freeze([
    "actor_film_dui_duari",
    "actor_film_daruchini_dwip",
    "actor_air_force",
    "actor_film_moner_majhe_tumi",
  ]), // Riaz
  Q21066842: Object.freeze([
    "actor_walton_senior_exec",
    "actor_film_obujh_duti_mon",
    "actor_walton_ad",
  ]), // Amin Khan
  Q7460127: Object.freeze([
    "actor_film_chandni_raate",
    "actor_film_tumi_amar",
    "actor_film_dui_noyoner_alo",
  ]), // Shabnur
  Q7405420: Object.freeze([
    "actor_film_keyamat",
    "actor_film_tumi_amar",
    "actor_film_anondo_osru",
  ]), // Salman Shah
  Q6926134: Object.freeze([
    "actor_film_keyamat",
    "actor_film_meghla_akash",
    "actor_film_devdas_2013",
  ]), // Moushumi
  Q7460022: Object.freeze([
    "actor_film_janani",
    "actor_film_bhat_de",
    "actor_film_moroner_pore",
  ]), // Shabana
});

export const ACTOR_PROOF_IDS = new Set(ACTOR_PROOF_QUESTIONS.map((question) => question.id));
export const ACTOR_PROOF_FACTS = Object.freeze(Object.fromEntries(
  Object.entries(ACTOR_PROOFS).map(([personId, questionIds]) => [
    personId, Object.freeze(Object.fromEntries(questionIds.map((id) => [id, 2]))),
  ]),
));
