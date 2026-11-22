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

export const ACTOR_PROOF_QUESTIONS = Object.freeze([
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
});

export const ACTOR_PROOF_IDS = new Set(ACTOR_PROOF_QUESTIONS.map((question) => question.id));
export const ACTOR_PROOF_FACTS = Object.freeze(Object.fromEntries(
  Object.entries(ACTOR_PROOFS).map(([personId, questionIds]) => [
    personId, Object.freeze(Object.fromEntries(questionIds.map((id) => [id, 2]))),
  ]),
));
