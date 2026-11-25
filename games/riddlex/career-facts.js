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
  Q21066842: 2,  // Amin Khan, 1990s leading actor
  Q5279795: 2, // Dipjol, late-1990s breakthrough in Teji (BMDb https://bmdb.com.bd/person/607/)
  Q15848298: 2,  // Omar Sani, 1993 breakthrough
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
// Verified life facts override incomplete packed profile fields. This avoids
// guessing a deceased star after the player firmly answers "alive=yes".
// Only record documented cases; do not infer life status from an absent entry.
export const SCREEN_LIFE_DETAILS = Object.freeze({
  Q7462919: Object.freeze({ alive:2, dead:1 }), // Shakib Khan, active 2026
  Q7405420: Object.freeze({ alive:1, dead:2 }), // Salman Shah, 1996
  Q4244083: Object.freeze({ alive:1, dead:2 }), // Manna, 2008
  Q5939749: Object.freeze({ alive:1, dead:2 }), // Humayun Faridi, 2012
});

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
  // Source-backed facts. Absence of an entry means unknown, never "no".
  // Amin Khan: https://www.jugantor.com/dhaliwood/1130491
  // https://www.thedailystar.net/culture/entertainment/news/i-wasnt-away-because-any-resentment-amin-khan-his-return-the-silver-screen-4240031
  // https://bmdb.com.bd/person/68/
  // Omar Sani: https://en.prothomalo.com/entertainment/4p4s2itvuo
  // https://www.ajkerpatrika.com/entertainment/cinema/ajpiprq6peptb
  // Dipjol: https://www.tbsnews.net/splash/nowadays-whoever-invests-money-ends-director-dipjol-650298
  // https://www.dhakatribune.com/amp/showtime/181524/dipjol-shakes-up-internet-with-road-safety-advert
  // Misha Sawdagor: https://www.thedailystar.net/video-stories/uncensored-with-rafi-hossain-dhaliwood-villain-misha-sawdagor-to-quit-acting-bangladesh-bd-1482064
  // Humayun Faridi: https://www.thedailystar.net/arts-entertainment/humayun-faridi-man-unmatched-impact-1231345
  // India: date-checked, publicly reported traits. Unknown is not NO.
  // Salman Khan said he remains unmarried (Indian Express, Oct 2026).
  // https://indianexpress.com/article/entertainment/bollywood/salman-khan-koffee-with-karan-season-9-marriage-children-privacy-10921829/
  // Aamir Khan married Gauri Spratt on 5 July 2026 (PTI).
  // https://theprint.in/feature/aamir-khan-marries-longtime-partner-gauri-spratt-in-intimate-ceremony/2978049/
  // Saif Ali Khan's Pataudi family background:
  // https://www.britannica.com/biography/Saif-Ali-Khan
  // Shah Rukh Khan's "King Khan" screen nickname:
  // https://www.britannica.com/biography/Shah-Rukh-Khan
  // New Bangladesh career signatures, verified from The Daily Star.
  // https://www.thedailystar.net/ananta-jalil-back-with-most-welcome-2-37118
  // https://www.thedailystar.net/entertainment/tv-film/news/ananta-jalil-barsha-spend-time-daily-star-3563681
  // https://www.thedailystar.net/news-detail-249763
  // https://www.thedailystar.net/arts-entertainment/bubly-turns-heads-1334353
  // https://www.thedailystar.net/arts-entertainment/news/bubly-her-upcoming-ventures-2105153
  // Viral social-media music videos and screen appearances (Arab News / AFP):
  // https://www.arabnews.com/offbeat/tuneless-bangladeshi-social-media-star-grilled-by-police-2135851
  screen_hero_alom_music_video: Object.freeze({ Q26923194:2 }),
  screen_ananta_khoj_debut: Object.freeze({ Q5299478:2 }),
  screen_ananta_business_producer: Object.freeze({ Q5299478:2 }),
  screen_apu_koti_takar_kabin: Object.freeze({ Q14301448:2 }),
  screen_apu_kal_shokale: Object.freeze({ Q14301448:2 }),
  screen_bubly_bossgiri_debut: Object.freeze({ Q31176164:2 }),
  screen_bubly_news_presenter: Object.freeze({ Q31176164:2 }),
  screen_india_unmarried: Object.freeze({ Q9543: 2, Q9557: 1 }),
  screen_india_third_marriage: Object.freeze({ Q9557: 2, Q9543: 1 }),
  screen_india_pataudi_family: Object.freeze({ Q252290: 2 }),
  screen_india_king_khan: Object.freeze({ Q9535: 2 }),
  screen_india_dabangg: Object.freeze({ Q9543: 2 }),
  screen_india_dangal: Object.freeze({ Q9557: 2 }),
  screen_india_ddlj: Object.freeze({ Q9535: 2 }),
  screen_walton_executive: Object.freeze({ Q21066842: 2 }),
  screen_return_after_long_break: Object.freeze({ Q21066842: 2 }),
  screen_debut_abujh_duti_mon: Object.freeze({ Q21066842: 2 }),
  screen_restaurant_business: Object.freeze({ Q15848298: 2 }),
  screen_film_producer: Object.freeze({ Q5279795: 2, "riddlex-broad-dipjol": 2 }),
  screen_famous_villain_dialogues: Object.freeze({ Q5279795: 2 }),
  screen_800_plus_films: Object.freeze({ Q15868587: 2 }),
  screen_lead_to_villain: Object.freeze({ Q15848298: 2 }),
  screen_theatre_tv_film: Object.freeze({ Q5939749: 2 }),
  screen_new_film_announced_2026: Object.freeze({
    Q21066842: 2, Q15848298: 2, Q15868587: 2,
  }),
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
    Q21066842: 2, Q15848298: 2,
  }),
  screen_over_100_films: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2, Q4244083: 2,
    Q21066842: 2, Q15868587: 2,
  }),
  screen_films_after_2000: Object.freeze({
    Q7405420: 1, Q7322180: 2, Q7460127: 2, Q4244083: 2, Q7462919: 2,
    Q21066842: 2, Q15848298: 2, Q15868587: 2, Q5279795: 2, Q5939749: 2,
  }),
  // Source-verified film awards. An absent attribute for a prominent
  // actress must not be treated as proof that she never received an award.
  // Banglapedia (Women): https://en.banglapedia.org/index.php?title=Women
  // bdnews24 (2017): https://bdnews24.com/bangladesh/sheikh-hasina-assures-film-industry-of-support-for-development
  screen_national_film_award: Object.freeze({
    Q7322180: 2, Q7460127: 2, Q4244083: 2, Q7462919: 2,
    Q7460022: 2, // Shabana, multiple Bangladesh National Film Awards
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
    Q21066842: 2, Q15848298: 2, Q5299478:2,
    Q14301448:2, Q31176164:2,
  }),
  screen_role_villain: Object.freeze({
    Q5279795: 2, Q18987612: 1, Q882: 1,
    Q15868587: 2, Q5939749: 2, Q15848298: 2,
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
  { id:"screen_hero_alom_music_video", group:"job",
    en:"Did this entertainer become well known through online music videos?",
    bn:"এই বিনোদনশিল্পী কি অনলাইনের মিউজিক ভিডিওর মাধ্যমে বিশেষ পরিচিতি পান?" },
  { id:"screen_ananta_khoj_debut", group:"job",
    en:"Was this actor's debut film Khoj: The Search?",
    bn:"এই অভিনয়শিল্পীর প্রথম চলচ্চিত্র কি ‘খোঁজ: দ্য সার্চ’?" },
  { id:"screen_ananta_business_producer", group:"job",
    en:"Did this actor run a business and produce their own feature films?",
    bn:"এই অভিনয়শিল্পী কি ব্যবসার পাশাপাশি নিজেই চলচ্চিত্র প্রযোজনা করেছেন?" },
  { id:"screen_apu_koti_takar_kabin", group:"job",
    en:"Did this actress play the female lead in Koti Takar Kabin?",
    bn:"এই অভিনেত্রী কি ‘কোটি টাকার কাবিন’ চলচ্চিত্রে প্রধান নারী চরিত্রে অভিনয় করেছিলেন?" },
  { id:"screen_apu_kal_shokale", group:"job",
    en:"Did this actress begin her film career in Kal Shokale?",
    bn:"এই অভিনেত্রী কি ‘কাল সকালে’ চলচ্চিত্র দিয়ে চলচ্চিত্রজীবন শুরু করেছিলেন?" },
  { id:"screen_bubly_bossgiri_debut", group:"job",
    en:"Did this actress make her film debut in Bossgiri?",
    bn:"এই অভিনেত্রী কি ‘বসগিরি’ চলচ্চিত্র দিয়ে বড় পর্দায় অভিষেক করেন?" },
  { id:"screen_bubly_news_presenter", group:"job",
    en:"Did this actress work as a TV news presenter before entering films?",
    bn:"এই অভিনেত্রী কি চলচ্চিত্রে আসার আগে টেলিভিশনে সংবাদ উপস্থাপনা করতেন?" },
  { id:"screen_india_unmarried", group:"person",
    en:"Has this actor publicly said that they have never married?",
    bn:"এই অভিনেতা কি প্রকাশ্যে জানিয়েছেন যে তিনি কখনো বিয়ে করেননি?" },
  { id:"screen_india_third_marriage", group:"person",
    en:"Did the actor marry for the third time in 2026?",
    bn:"এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন?" },
  { id:"screen_india_pataudi_family", group:"person",
    en:"Does the actor belong to the historical Pataudi royal family?",
    bn:"এই অভিনেতা কি ঐতিহাসিক পতৌদি নবাব পরিবারের সদস্য?" },
  { id:"screen_india_king_khan", group:"job",
    en:"Is the actor especially known by the nickname King Khan?",
    bn:"এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত?" },
  { id:"screen_india_dabangg", group:"job",
    en:"Did the actor play the lead role in Dabangg?",
    bn:"এই অভিনেতা কি ‘দাবাং’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন?" },
  { id:"screen_india_dangal", group:"job",
    en:"Did the actor play the leading role in Dangal?",
    bn:"এই অভিনেতা কি ‘দঙ্গল’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন?" },
  { id:"screen_india_ddlj", group:"job",
    en:"Did the actor star in Dilwale Dulhania Le Jayenge?",
    bn:"এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন?" },
  { id:"screen_walton_executive", group:"job",
    en:"Have they held a senior executive role at Walton?",
    bn:"তিনি কি ওয়ালটনে উচ্চপদস্থ নির্বাহী হিসেবে কাজ করেছেন?" },
  { id:"screen_return_after_long_break", group:"job",
    en:"Did they plan a film comeback after a long break?",
    bn:"দীর্ঘ বিরতির পর কি তিনি আবার চলচ্চিত্রে ফেরার পরিকল্পনা করেছেন?" },
  { id:"screen_debut_abujh_duti_mon", group:"job",
    en:"Was their first film Abujh Duti Mon?",
    bn:"তাঁর প্রথম চলচ্চিত্র কি ‘অবুঝ দুটি মন’?" },
  { id:"screen_restaurant_business", group:"job",
    en:"Have they run a restaurant business alongside acting?",
    bn:"অভিনয়ের পাশাপাশি কি তিনি রেস্তোরাঁর ব্যবসা করেছেন?" },
  { id:"screen_film_producer", group:"job",
    en:"Have they produced feature films?",
    bn:"তিনি কি চলচ্চিত্র প্রযোজনাও করেছেন?" },
  { id:"screen_famous_villain_dialogues", group:"job",
    en:"Are they especially known for distinctive villain dialogues?",
    bn:"খলচরিত্রের স্বতন্ত্র সংলাপের জন্য কি তিনি বিশেষভাবে পরিচিত?" },
  { id:"screen_800_plus_films", group:"job",
    en:"Have they appeared in more than 800 films?",
    bn:"তিনি কি ৮০০টির বেশি চলচ্চিত্রে অভিনয় করেছেন?" },
  { id:"screen_lead_to_villain", group:"job",
    en:"Did they become known for villain roles after starting as a screen hero?",
    bn:"প্রধান চরিত্রে অভিনয় দিয়ে শুরু করে পরে কি খলচরিত্রেও পরিচিত হয়েছেন?" },
  { id:"screen_theatre_tv_film", group:"job",
    en:"Were they widely known for acting in theatre, television and film?",
    bn:"মঞ্চ, টেলিভিশন ও চলচ্চিত্র—তিন মাধ্যমেই কি তিনি বিশেষভাবে পরিচিত ছিলেন?" },
  { id:"screen_new_film_announced_2026", group:"job",
    en:"Were they announced in a new film project in 2026?",
    bn:"২০২৬ সালে কি তাঁর নতুন চলচ্চিত্রে অভিনয়ের ঘোষণা এসেছে?" },
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
    en: "Are they known for playing leading roles?",
    bn: "তিনি কি সাধারণত প্রধান চরিত্রে অভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_role_villain", group: "job",
    en: "Are they especially known for playing villainous characters?",
    bn: "তিনি কি বিশেষভাবে খলচরিত্রে অভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_role_comedy", group: "job",
    en: "Were they particularly known for comic acting?",
    bn: "তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত?",
  },
  {
    id: "screen_role_supporting", group: "job",
    en: "Did they usually play supporting rather than lead roles?",
    bn: "তিনি কি সাধারণত প্রধান চরিত্রের পরিবর্তে পার্শ্বচরিত্রে অভিনয় করতেন?",
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
