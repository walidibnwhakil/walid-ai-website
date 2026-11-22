// Film-era knowledge must describe professional recognition, NOT birth decade.
// Only fact-checked Bangladesh film careers are recorded. Unknown people remain
// unknown; an unverified person must never be marked "no" by default.
//
// Shabnur: The Daily Star, 2006/12/23 and The Independent, 2018.
// Salman Shah: The Daily Star, 2026 anniversary coverage.
// Shabnaz: The Daily Star, 2021 interview.
// Moushumi: The Daily Star, 2019 film-industry anniversary.
// Riaz: Dhaka Tribune, 2019 interview.
// Puja Cherry: The Daily Star, film debut as a lead in 2018.
export const SCREEN_STAR_1990S = Object.freeze({
  Q7460127: 2,   // Shabnur, 1993
  Q7405420: 2,   // Salman Shah, 1993
  Q13059781: 2,  // Shabnaz, 1991
  Q6926134: 2,   // Moushumi, 1993
  Q7322180: 2,   // Riaz, recognition in late 1990s
  Q52149647: 1,  // Puja Cherry, became a lead film star in 2018
});

// Historical film-career records; these are not live "still acting" claims.
// The Daily Star: Shabana's career began in 1967; Alamgir began in 1972.
export const SCREEN_STAR_PRE1990 = Object.freeze({
  Q7460022: 2,    // Shabana
  Q13057124: 2,   // Alamgir
  Q7460127: 1,    // Shabnur rose to fame in the 1990s
  Q7405420: 1,    // Salman Shah first appeared as film lead in 1993
  Q52149647: 1,  // Puja Cherry became a leading actress in the 2010s
});

// Distinguishing career facts, rather than another stream of actor names.
 // Reference sources:
 // Riaz's 1995 debut, Banglar Nayok, awards and later films:
 // https://www.tbsnews.net/splash/acting-gave-me-fulfillment-riaz-617178
 // https://www.arabnews.com/archive/406267
 // Salman Shah's 1993 debut, 27 films and 1996 death:
 // https://online.thedailystar.net/entertainment/tv-film/news/salman-shah-brand-will-never-be-forgotten-3123071
 // Shabnur's 1993 debut, National Film Award and later films:
 // https://theindependentbd.com/printversion/details/170459
 // Do not fill other people's unknown attributes with guessed "no"s.
export const SCREEN_CAREER_DETAILS = Object.freeze({
  screen_film_debut_pre1995: Object.freeze({
    Q7405420: 2, Q7460127: 2, Q13059781: 2, Q6926134: 2,
    Q7322180: 1,
  }),
  screen_over_100_films: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2,
  }),
  screen_films_after_2000: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2,
  }),
  screen_national_film_award: Object.freeze({
    Q7322180: 2, Q7460127: 2,
  }),
  screen_air_force_before_films: Object.freeze({
    Q7322180: 2,
  }),
  screen_first_film_keyamat: Object.freeze({
    Q7405420: 2, Q6926134: 2, Q7322180: 1, Q7460127: 1,
  }),
  screen_first_film_banglar_nayok: Object.freeze({
    Q7322180: 2, Q7405420: 1, Q7460127: 1,
  }),
});

export const EXTRA_SCREEN_QUESTIONS = Object.freeze([
  {
    id: "screen_star_pre1990",
    group: "job",
    en: "Did they become a known film star before 1990?",
    bn: "তিনি কি ১৯৯০ সালের আগেই চলচ্চিত্রে পরিচিত তারকা হয়েছিলেন?",
  },
  {
    id: "screen_star_1990s",
    group: "job",
    en: "Did they become a known film star during 1990–1999?",
    bn: "তিনি কি ১৯৯০ থেকে ১৯৯৯ সালের মধ্যে চলচ্চিত্রে পরিচিত তারকা হন?",
  },
  {
    id: "screen_film_debut_pre1995", group: "job",
    en: "Did they first appear in films before 1995?",
    bn: "তিনি কি ১৯৯৫ সালের আগে চলচ্চিত্রে অভিনয় শুরু করেন?",
  },
  {
    id: "screen_over_100_films", group: "job",
    en: "Have they acted in more than 100 feature films?",
    bn: "তিনি কি ১০০টির বেশি পূর্ণদৈর্ঘ্য চলচ্চিত্রে অভিনয় করেছেন?",
  },
  {
    id: "screen_films_after_2000", group: "job",
    en: "Did they act in feature films after the year 2000?",
    bn: "তিনি কি ২০০০ সালের পরেও চলচ্চিত্রে অভিনয় করেছেন?",
  },
  {
    id: "screen_national_film_award", group: "job",
    en: "Have they won a Bangladesh National Film Award for acting?",
    bn: "তিনি কি অভিনয়ের জন্য জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন?",
  },
  {
    id: "screen_air_force_before_films", group: "job",
    en: "Did they serve in the Bangladesh Air Force before films?",
    bn: "চলচ্চিত্রে আসার আগে তিনি কি বাংলাদেশ বিমানবাহিনীতে কাজ করেছেন?",
  },
  {
    id: "screen_first_film_keyamat", group: "job",
    en: "Was their debut film Keyamat Theke Keyamat?",
    bn: "তাঁর প্রথম চলচ্চিত্র কি ‘কেয়ামত থেকে কেয়ামত’?",
  },
  {
    id: "screen_first_film_banglar_nayok", group: "job",
    en: "Was their debut film Banglar Nayok?",
    bn: "তাঁর প্রথম চলচ্চিত্র কি ‘বাংলার নায়ক’?",
  },
]);
