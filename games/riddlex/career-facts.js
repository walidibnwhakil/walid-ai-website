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
  // Shakib Khan: Anonto Bhalobasha debut and two publicly reported marriages.
  // https://www.imdb.com/name/nm3492497/
  // https://online.thedailystar.net/entertainment/tv-film/news/shakib-khan-get-remarried-year-when-3597406
  // Manna: Bir Soinik (2003), died on 17 February 2008.
  // https://www.dhakatribune.com/amp/showtime/129172/manna-film-festival-on-rtv
  // https://bdnews24.com/entertainment/film-actor-manna-dies
  // Salman Shah died 6 September 1996. The cause remains disputed;
  // do not turn an allegation about suicide into a definite yes/no.
  // https://www.tbsnews.net/bangladesh/court/salman-shah-murder-case-probe-report-submission-deferred-8-december-1593486
  screen_known_multiple_marriages: Object.freeze({
    Q7462919: 2,
  }),
  screen_debut_anonto_bhalobasha: Object.freeze({
    Q7462919: 2, Q7405420: 1, Q7322180: 1,
  }),
  screen_acted_bir_soinik: Object.freeze({
    Q4244083: 2,
  }),
  screen_died_1996: Object.freeze({
    Q7405420: 2, Q4244083: 1, Q7462919: 1,
  }),
  screen_died_2008: Object.freeze({
    Q4244083: 2, Q7405420: 1, Q7462919: 1,
  }),
  screen_film_debut_pre1995: Object.freeze({
    Q7405420: 2, Q7460127: 2, Q13059781: 2, Q6926134: 2,
    Q7322180: 1, Q7462919: 1, Q4244083: 2,
  }),
  screen_over_100_films: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2, Q4244083: 2,
  }),
  screen_films_after_2000: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2, Q4244083: 2, Q7462919: 2,
  }),
  screen_national_film_award: Object.freeze({
    Q7322180: 2, Q7460127: 2, Q4244083: 2, Q7462919: 2,
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
  // Role/genre taxonomy: not every actor is a lead or a celebrity. Missing
  // knowledge is UNKNOWN, never assumed to mean "no".
  // Chaplin: https://www.pbs.org/wgbh/americanexperience/features/pickford-charlie-chaplin-1889-1977/
  //          https://www.charliechaplin.com/en/biography/articles/212-Chaplin-at-Keystone-The-Tramp-is-Born
  //          https://www.charliechaplin.com/en/films/7-the-great-dictator/articles/13-Filming-The-Great-Dictator
  // Dildar:  https://www.thedailystar.net/entertainment/tv-film/news/dildar-remembering-dhallywoods-comedy-king-3896091
  //          https://www.thedailystar.net/arts-entertainment/news/comedy-star-dildars-birth-anniversary-today-2027157
  // Dipjol:  https://www.tbsnews.net/splash/nowadays-whoever-invests-money-ends-director-dipjol-650298
  screen_role_lead: Object.freeze({
    Q882: 2, Q18987612: 1, Q7405420: 2, Q7322180: 2,
    Q7460127: 2, Q13059781: 2, Q7462919: 2, Q4244083: 2,
  }),
  screen_role_villain: Object.freeze({
    Q5279795: 2, Q18987612: 1, Q882: 1,
  }),
  screen_role_comedy: Object.freeze({
    Q882: 2, Q18987612: 2,
  }),
  screen_role_supporting: Object.freeze({
    Q18987612: 2, Q882: 1,
  }),
  screen_silent_comedy: Object.freeze({
    Q882: 2, Q18987612: 1,
  }),
  screen_physical_comedy: Object.freeze({
    Q882: 2,
  }),
  screen_short_moustache: Object.freeze({
    Q882: 2,
  }),
  screen_bowler_cane: Object.freeze({
    Q882: 2,
  }),
  screen_hitler_resemblance: Object.freeze({
    Q882: 2,
  }),
  screen_great_dictator: Object.freeze({
    Q882: 2,
  }),
  screen_comedy_award: Object.freeze({
    Q18987612: 2,
  }),
  screen_world_famous: Object.freeze({
    Q882: 2,
  }),
});

export const EXTRA_SCREEN_QUESTIONS = Object.freeze([
  {
    id:"screen_known_multiple_marriages", group:"person",
    en:"Have they been publicly reported to have married more than once?",
    bn:"তাঁর একাধিক বিয়ের তথ্য কি প্রকাশ্যে জানা গেছে?",
  },
  {
    id:"screen_debut_anonto_bhalobasha", group:"job",
    en:"Was their first film Anonto Bhalobasha?",
    bn:"তাঁর প্রথম চলচ্চিত্র কি ‘অনন্ত ভালোবাসা’?",
  },
  {
    id:"screen_acted_bir_soinik", group:"job",
    en:"Did they act in the film Bir Soinik?",
    bn:"তিনি কি ‘বীর সৈনিক’ চলচ্চিত্রে অভিনয় করেছিলেন?",
  },
  {
    id:"screen_died_1996", group:"life",
    en:"Did they die in 1996?",
    bn:"তিনি কি ১৯৯৬ সালে মারা গিয়েছিলেন?",
  },
  {
    id:"screen_died_2008", group:"life",
    en:"Did they die in 2008?",
    bn:"তিনি কি ২০০৮ সালে মারা গিয়েছিলেন?",
  },
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
  {
    id: "screen_role_lead", group: "job",
    en: "Did they usually play the main hero or leading character?",
    bn: "তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন?",
  },
  {
    id: "screen_role_villain", group: "job",
    en: "Were they mainly known for playing villains?",
    bn: "তিনি কি মূলত খলনায়কের চরিত্রে অভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_role_comedy", group: "job",
    en: "Were they particularly known for comic acting?",
    bn: "তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_role_supporting", group: "job",
    en: "Did they usually play supporting rather than lead roles?",
    bn: "তিনি কি সাধারণত প্রধান নায়কের বদলে সহ-চরিত্রে অভিনয় করতেন?",
  },
  {
    id: "screen_silent_comedy", group: "job",
    en: "Were they famous for comedy in silent films?",
    bn: "তিনি কি নির্বাক চলচ্চিত্রের কৌতুকাভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_physical_comedy", group: "job",
    en: "Was expressive movement and physical comedy a signature of their work?",
    bn: "অঙ্গভঙ্গি ও শারীরিক কৌতুক কি তাঁর অভিনয়ের বিশেষ বৈশিষ্ট্য ছিল?",
  },
  {
    id: "screen_short_moustache", group: "person",
    en: "Were they known for a small toothbrush-style moustache?",
    bn: "তাঁর পরিচিত চেহারায় কি ছোট, ব্রাশের মতো গোঁফ ছিল?",
  },
  {
    id: "screen_bowler_cane", group: "person",
    en: "Was a bowler hat and walking cane part of their iconic screen look?",
    bn: "গোল টুপি ও ছড়ি কি তাঁর বিখ্যাত পর্দার সাজের অংশ ছিল?",
  },
  {
    id: "screen_hitler_resemblance", group: "person",
    en: "Did their familiar moustached look resemble Adolf Hitler's?",
    bn: "তাঁর পরিচিত ছোট গোঁফের চেহারার সঙ্গে কি হিটলারের মিল ছিল?",
  },
  {
    id: "screen_great_dictator", group: "job",
    en: "Did they famously satirize a Hitler-like dictator in a film?",
    bn: "তিনি কি চলচ্চিত্রে হিটলারের মতো এক স্বৈরশাসককে ব্যঙ্গ করে অভিনয় করেছিলেন?",
  },
  {
    id: "screen_comedy_award", group: "job",
    en: "Did they win Bangladesh's National Film Award for a comedy role?",
    bn: "কৌতুক চরিত্রে অভিনয়ের জন্য কি তিনি বাংলাদেশের জাতীয় চলচ্চিত্র পুরস্কার পেয়েছিলেন?",
  },
  {
    id: "screen_world_famous", group: "job",
    en: "Was their comedy acclaimed internationally?",
    bn: "তাঁর কৌতুকাভিনয় কি আন্তর্জাতিকভাবেও বিখ্যাত ছিল?",
  },
]);
