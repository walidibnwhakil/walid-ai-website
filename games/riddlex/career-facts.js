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
]);
