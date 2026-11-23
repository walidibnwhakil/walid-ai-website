// Generic evidence taxonomy with explicit bilingual questions.
// Facts are public, independently verifiable career and physical attributes.
// NO identity-specific "is this NAME?" question. Missing entries stay UNKNOWN.
// QA must independently answer questions rather than reading this table.
export const RECOGNITION_QUESTIONS=Object.freeze([
  {
    "id": "profile_film_titanic",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer have a major role in the 1997 film Titanic?",
    "bn": "এই শিল্পী কি ১৯৯৭ সালের টাইটানিক চলচ্চিত্রে গুরুত্বপূর্ণ চরিত্রে ছিলেন?"
  },
  {
    "id": "profile_film_oscar_lead",
    "group": "job",
    "parent": "actor",
    "en": "Has this performer won an Academy Award for acting in a leading role?",
    "bn": "এই শিল্পী কি প্রধান চরিত্রে অভিনয়ের জন্য অস্কার পেয়েছেন?"
  },
  {
    "id": "profile_film_malena",
    "group": "job",
    "parent": "actor",
    "en": "Did this actress star in the Italian film Malèna?",
    "bn": "এই অভিনেত্রী কি ইতালীয় চলচ্চিত্র মালেনায় অভিনয় করেছেন?"
  },
  {
    "id": "profile_film_spectre",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer appear in the James Bond film Spectre?",
    "bn": "এই শিল্পী কি জেমস বন্ডের স্পেক্ট্র চলচ্চিত্রে অভিনয় করেছেন?"
  },
  {
    "id": "profile_film_sacred_games",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer appear in the streaming series Sacred Games?",
    "bn": "এই শিল্পী কি সেক্রেড গেমস ওয়েব সিরিজে অভিনয় করেছেন?"
  },
  {
    "id": "profile_film_gangs_wasseypur",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer feature prominently in Gangs of Wasseypur?",
    "bn": "এই শিল্পী কি গ্যাংস অব ওয়াসেপুর চলচ্চিত্রে গুরুত্বপূর্ণ চরিত্রে ছিলেন?"
  },
  {
    "id": "profile_film_south_india",
    "group": "job",
    "parent": "actor",
    "en": "Is the person known for Tamil, Telugu or Malayalam films?",
    "bn": "তিনি কি তামিল, তেলুগু বা মালয়ালম চলচ্চিত্রে পরিচিত?"
  },
  {
    "id": "profile_film_mahanati",
    "group": "job",
    "parent": "profile_film_south_india",
    "en": "Did this actress portray the title character in Mahanati?",
    "bn": "এই অভিনেত্রী কি মহানটি চলচ্চিত্রে মূল চরিত্রে অভিনয় করেছেন?"
  },
  {
    "id": "profile_film_national_award",
    "group": "job",
    "parent": "actor",
    "en": "Has this performer won India's National Film Award for acting?",
    "bn": "এই শিল্পী কি অভিনয়ের জন্য ভারতের জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন?"
  },
  {
    "id": "profile_film_aashram",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer act in the Hindi web series Aashram?",
    "bn": "এই শিল্পী কি আশ্রম ওয়েব সিরিজে অভিনয় করেছেন?"
  },
  {
    "id": "profile_film_animal_2023",
    "group": "job",
    "parent": "actor",
    "en": "Did this male actor play an antagonist in the 2023 film Animal?",
    "bn": "এই পুরুষ অভিনেতা কি ২০২৩ সালের অ্যানিম্যাল চলচ্চিত্রে প্রতিপক্ষ চরিত্রে ছিলেন?"
  },
  {
    "id": "profile_film_quantico",
    "group": "job",
    "parent": "actor",
    "en": "Did this actress star in the American television series Quantico?",
    "bn": "এই অভিনেত্রী কি মার্কিন টিভি সিরিজ কোয়ান্টিকোতে প্রধান চরিত্রে ছিলেন?"
  },
  {
    "id": "profile_film_miss_world",
    "group": "job",
    "parent": "actor",
    "en": "Did this actress win the Miss World title in 2000?",
    "bn": "এই অভিনেত্রী কি ২০০০ সালে মিস ওয়ার্ল্ড হয়েছিলেন?"
  },
  {
    "id": "profile_film_indian_tv",
    "group": "job",
    "parent": "actor",
    "en": "Is the performer especially known for leading Indian television serials?",
    "bn": "এই শিল্পী কি ভারতীয় টিভি ধারাবাহিকে প্রধান চরিত্রের জন্য পরিচিত?"
  },
  {
    "id": "profile_film_hatim_role",
    "group": "job",
    "parent": "profile_film_indian_tv",
    "en": "Did this actor play Hatim in the 2003 Indian fantasy television series?",
    "bn": "এই অভিনেতা কি ২০০৩ সালের ভারতীয় ফ্যান্টাসি ধারাবাহিকে হাতিম চরিত্রে অভিনয় করেছেন?"
  },
  {
    "id": "profile_sports_wrestling",
    "group": "job",
    "parent": "real",
    "en": "Is this person a professional wrestler, rather than a footballer or cricketer?",
    "bn": "তিনি কি ফুটবলার বা ক্রিকেটার নন, পেশাদার কুস্তিগির?"
  },
  {
    "id": "profile_sports_wwe",
    "group": "job",
    "parent": "profile_sports_wrestling",
    "en": "Is this wrestler strongly associated with WWE?",
    "bn": "এই কুস্তিগির কি WWE-এর সঙ্গে বিশেষভাবে পরিচিত?"
  },
  {
    "id": "profile_sports_record_champion",
    "group": "job",
    "parent": "profile_sports_wwe",
    "en": "Has this wrestler won WWE world championship titles more than ten times?",
    "bn": "এই কুস্তিগির কি WWE-তে দশবারের বেশি বিশ্ব চ্যাম্পিয়ন হয়েছেন?"
  },
  {
    "id": "profile_sports_peacemaker",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer play Peacemaker in DC's films or television series?",
    "bn": "এই শিল্পী কি ডিসির চলচ্চিত্র বা সিরিজে পিসমেকার চরিত্রে অভিনয় করেছেন?"
  },
  {
    "id": "profile_bd_physician",
    "group": "job",
    "parent": "real",
    "en": "Is this person professionally trained and known as a medical doctor?",
    "bn": "এই ব্যক্তি কি পেশায় চিকিৎসক?"
  },
  {
    "id": "profile_bd_barrister",
    "group": "job",
    "parent": "real",
    "en": "Is this person qualified as a barrister or lawyer?",
    "bn": "এই ব্যক্তি কি ব্যারিস্টার বা আইনজীবী?"
  },
  {
    "id": "profile_bd_public_family",
    "group": "person",
    "parent": "real",
    "en": "Is this Bangladeshi person publicly known through a national political family?",
    "bn": "বাংলাদেশে তিনি কি জাতীয় পর্যায়ের কোনো রাজনৈতিক পরিবারের সঙ্গে পরিচিত?"
  },
  {
    "id": "profile_bd_leader_spouse",
    "group": "person",
    "parent": "profile_bd_public_family",
    "en": "Is this person the spouse of a national political leader?",
    "bn": "এই ব্যক্তি কি জাতীয় পর্যায়ের একজন রাজনৈতিক নেতার জীবনসঙ্গী?"
  },
  {
    "id": "profile_bd_leader_daughter",
    "group": "person",
    "parent": "profile_bd_public_family",
    "en": "Is this person the daughter of a nationally known political leader?",
    "bn": "এই ব্যক্তি কি জাতীয় পর্যায়ের একজন পরিচিত রাজনৈতিক নেতার মেয়ে?"
  },
  {
    "id": "profile_bd_uk_bar",
    "group": "job",
    "parent": "profile_bd_barrister",
    "en": "Did this person complete barrister training in the United Kingdom?",
    "bn": "এই ব্যক্তি কি যুক্তরাজ্যে ব্যারিস্টারি প্রশিক্ষণ সম্পন্ন করেছেন?"
  },
  {
    "id": "profile_animal_poultry",
    "group": "animal",
    "parent": "bird",
    "en": "Is this a domesticated farm bird commonly kept for eggs or meat?",
    "bn": "এটি কি ডিম বা মাংসের জন্য পালিত গৃহপালিত খামারের পাখি?"
  },
  {
    "id": "profile_animal_eggs",
    "group": "animal",
    "parent": "profile_animal_poultry",
    "en": "Does the female of this bird commonly lay eggs for human consumption?",
    "bn": "এই প্রজাতির স্ত্রী পাখির ডিম কি মানুষ সাধারণত খায়?"
  },
  {
    "id": "profile_animal_comb",
    "group": "animal",
    "parent": "profile_animal_poultry",
    "en": "Does this bird typically have a fleshy comb on top of its head?",
    "bn": "এই পাখির মাথায় কি সাধারণত মাংসল ঝুঁটি থাকে?"
  }
]);
export const RECOGNITION_PEOPLE=Object.freeze([
  {
    "id": "identity-kate-winslet",
    "en": "Kate Winslet",
    "bn": "কেট উইন্সলেট",
    "pop": 760,
    "yes": [
      "real",
      "named",
      "female",
      "from_gb",
      "actor",
      "alive",
      "born_1970_1979",
      "profile_film_titanic",
      "profile_film_oscar_lead"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "profile_film_spectre",
      "profile_film_malena",
      "profile_film_mahanati",
      "profile_film_quantico"
    ],
    "aliases": [
      "Kate Elizabeth Winslet"
    ]
  },
  {
    "id": "identity-monica-bellucci",
    "en": "Monica Bellucci",
    "bn": "মনিকা বেলুচ্চি",
    "pop": 670,
    "yes": [
      "real",
      "named",
      "female",
      "from_it",
      "actor",
      "alive",
      "born_1960_1969",
      "profile_film_malena",
      "profile_film_spectre"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "profile_film_titanic",
      "profile_film_mahanati",
      "profile_film_quantico"
    ],
    "aliases": [
      "Monica Belucci",
      "Monica Anna Maria Bellucci"
    ]
  },
  {
    "id": "identity-nawazuddin",
    "en": "Nawazuddin Siddiqui",
    "bn": "নওয়াজউদ্দিন সিদ্দিকী",
    "pop": 650,
    "yes": [
      "real",
      "named",
      "male",
      "from_in",
      "actor",
      "alive",
      "born_1970_1979",
      "profile_film_sacred_games",
      "profile_film_gangs_wasseypur"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "female",
      "profile_film_titanic",
      "profile_film_mahanati",
      "profile_film_spectre"
    ],
    "aliases": [
      "Nawazuddin Siddique",
      "Newazuddin Siddique"
    ]
  },
  {
    "id": "identity-keerthy-suresh",
    "en": "Keerthy Suresh",
    "bn": "কীর্তি সুরেশ",
    "pop": 690,
    "yes": [
      "real",
      "named",
      "female",
      "from_in",
      "actor",
      "alive",
      "born_1990_1999",
      "profile_film_south_india",
      "profile_film_mahanati",
      "profile_film_national_award"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "profile_film_quantico",
      "profile_film_gangs_wasseypur",
      "profile_film_titanic"
    ],
    "aliases": [
      "Keerthi Suresh"
    ]
  },
  {
    "id": "identity-bobby-deol",
    "en": "Bobby Deol",
    "bn": "ববি দেওল",
    "pop": 710,
    "yes": [
      "real",
      "named",
      "male",
      "from_in",
      "actor",
      "alive",
      "born_1960_1969",
      "profile_film_aashram",
      "profile_film_animal_2023"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "female",
      "profile_film_mahanati",
      "profile_film_sacred_games",
      "profile_film_hatim_role"
    ],
    "aliases": [
      "Boby Deol",
      "Vijay Singh Deol"
    ]
  },
  {
    "id": "identity-rahil-azam",
    "en": "Rahil Azam",
    "bn": "রাহিল আজম",
    "pop": 430,
    "yes": [
      "real",
      "named",
      "male",
      "from_in",
      "actor",
      "alive",
      "born_1980_1989",
      "profile_film_indian_tv",
      "profile_film_hatim_role"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "female",
      "profile_film_animal_2023",
      "profile_film_gangs_wasseypur",
      "profile_film_titanic"
    ],
    "aliases": [
      "Rahul Azim"
    ]
  },
  {
    "id": "identity-priyanka-chopra",
    "en": "Priyanka Chopra Jonas",
    "bn": "প্রিয়াঙ্কা চোপড়া",
    "pop": 970,
    "yes": [
      "real",
      "named",
      "female",
      "from_in",
      "actor",
      "alive",
      "born_1980_1989",
      "profile_film_miss_world",
      "profile_film_quantico",
      "profile_film_national_award"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "profile_film_mahanati",
      "profile_film_titanic",
      "profile_film_malena"
    ],
    "aliases": [
      "Priyanka Chopra"
    ]
  },
  {
    "id": "identity-john-cena",
    "en": "John Cena",
    "bn": "জন সিনা",
    "pop": 850,
    "yes": [
      "real",
      "named",
      "male",
      "from_us",
      "actor",
      "alive",
      "athlete",
      "born_1970_1979",
      "profile_sports_wrestling",
      "profile_sports_wwe",
      "profile_sports_record_champion",
      "profile_sports_peacemaker"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "female",
      "cricketer",
      "footballer",
      "profile_film_titanic"
    ],
    "aliases": [
      "John Felix Anthony Cena"
    ]
  },
  {
    "id": "identity-zubaida-rahman",
    "en": "Zubaida Rahman",
    "bn": "জোবাইদা রহমান",
    "pop": 350,
    "yes": [
      "real",
      "named",
      "female",
      "from_bd",
      "doctor",
      "alive",
      "profile_bd_physician",
      "profile_bd_public_family",
      "profile_bd_leader_spouse"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "actor",
      "profile_bd_barrister",
      "profile_bd_leader_daughter"
    ],
    "aliases": [
      "Zobaida Rahman",
      "Dr. Zubaida Rahman"
    ]
  },
  {
    "id": "identity-zaima-rahman",
    "en": "Zaima Rahman",
    "bn": "জাইমা রহমান",
    "pop": 310,
    "yes": [
      "real",
      "named",
      "female",
      "from_bd",
      "lawyer",
      "alive",
      "profile_bd_barrister",
      "profile_bd_public_family",
      "profile_bd_leader_daughter",
      "profile_bd_uk_bar"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "actor",
      "profile_bd_physician",
      "profile_bd_leader_spouse"
    ],
    "aliases": [
      "Zaima Zarnaz Rahman",
      "Barrister Zaima Rahman"
    ]
  }
]);
export const RECOGNITION_ANIMALS=Object.freeze([
  {
    "id": "identity-domestic-hen",
    "en": "Chicken (hen)",
    "bn": "মুরগি",
    "pop": 450,
    "yes": [
      "animal",
      "bird",
      "farm",
      "profile_animal_poultry",
      "profile_animal_eggs",
      "profile_animal_comb"
    ],
    "no": [
      "real",
      "fictional",
      "object",
      "named",
      "mammal",
      "fish",
      "reptile",
      "insect",
      "wild",
      "water_life",
      "is_dog",
      "is_cat",
      "is_mouse"
    ],
    "aliases": [
      "Chicken",
      "Hen",
      "Domestic chicken",
      "মুরগী"
    ]
  }
]);
export const RECOGNITION_FACTS=Object.freeze({
  "profile_film_titanic": {
    "identity-kate-winslet": 2,
    "identity-monica-bellucci": 1,
    "identity-nawazuddin": 1,
    "identity-keerthy-suresh": 1,
    "identity-rahil-azam": 1,
    "identity-priyanka-chopra": 1,
    "identity-john-cena": 1
  },
  "profile_film_oscar_lead": {
    "identity-kate-winslet": 2
  },
  "profile_film_malena": {
    "identity-monica-bellucci": 2,
    "identity-kate-winslet": 1,
    "identity-priyanka-chopra": 1
  },
  "profile_film_spectre": {
    "identity-monica-bellucci": 2,
    "identity-kate-winslet": 1,
    "identity-nawazuddin": 1
  },
  "profile_film_sacred_games": {
    "identity-nawazuddin": 2,
    "identity-bobby-deol": 1
  },
  "profile_film_gangs_wasseypur": {
    "identity-nawazuddin": 2,
    "identity-keerthy-suresh": 1,
    "identity-rahil-azam": 1
  },
  "profile_film_south_india": {
    "identity-keerthy-suresh": 2
  },
  "profile_film_mahanati": {
    "identity-keerthy-suresh": 2,
    "identity-kate-winslet": 1,
    "identity-monica-bellucci": 1,
    "identity-nawazuddin": 1,
    "identity-bobby-deol": 1,
    "identity-priyanka-chopra": 1
  },
  "profile_film_national_award": {
    "identity-keerthy-suresh": 2,
    "identity-priyanka-chopra": 2
  },
  "profile_film_aashram": {
    "identity-bobby-deol": 2
  },
  "profile_film_animal_2023": {
    "identity-bobby-deol": 2,
    "identity-rahil-azam": 1
  },
  "profile_film_quantico": {
    "identity-priyanka-chopra": 2,
    "identity-kate-winslet": 1,
    "identity-monica-bellucci": 1,
    "identity-keerthy-suresh": 1
  },
  "profile_film_miss_world": {
    "identity-priyanka-chopra": 2
  },
  "profile_film_indian_tv": {
    "identity-rahil-azam": 2
  },
  "profile_film_hatim_role": {
    "identity-rahil-azam": 2,
    "identity-bobby-deol": 1
  },
  "profile_sports_wrestling": {
    "identity-john-cena": 2
  },
  "profile_sports_wwe": {
    "identity-john-cena": 2
  },
  "profile_sports_record_champion": {
    "identity-john-cena": 2
  },
  "profile_sports_peacemaker": {
    "identity-john-cena": 2
  },
  "profile_bd_physician": {
    "identity-zubaida-rahman": 2,
    "identity-zaima-rahman": 1
  },
  "profile_bd_barrister": {
    "identity-zaima-rahman": 2,
    "identity-zubaida-rahman": 1
  },
  "profile_bd_public_family": {
    "identity-zubaida-rahman": 2,
    "identity-zaima-rahman": 2
  },
  "profile_bd_leader_spouse": {
    "identity-zubaida-rahman": 2,
    "identity-zaima-rahman": 1
  },
  "profile_bd_leader_daughter": {
    "identity-zaima-rahman": 2,
    "identity-zubaida-rahman": 1
  },
  "profile_bd_uk_bar": {
    "identity-zaima-rahman": 2
  },
  "profile_animal_poultry": {
    "identity-domestic-hen": 2
  },
  "profile_animal_eggs": {
    "identity-domestic-hen": 2
  },
  "profile_animal_comb": {
    "identity-domestic-hen": 2
  }
});
export const RECOGNITION_SPECIFIC_IDS=Object.freeze(["profile_film_titanic","profile_film_oscar_lead","profile_film_malena","profile_film_spectre","profile_film_sacred_games","profile_film_gangs_wasseypur","profile_film_mahanati","profile_film_national_award","profile_film_aashram","profile_film_animal_2023","profile_film_quantico","profile_film_miss_world","profile_film_hatim_role","profile_sports_record_champion","profile_sports_peacemaker","profile_bd_leader_spouse","profile_bd_leader_daughter","profile_bd_uk_bar","profile_animal_comb"]);
