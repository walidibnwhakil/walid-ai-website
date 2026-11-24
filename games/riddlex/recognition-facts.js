// Sources for new records: https://www.unicef.org/bangladesh/en/meena-and-unicef ; https://www.rottentomatoes.com/celebrity/tom_cruise ; public film credits and WWE biographies.
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
,
  {"id":"profile_film_mission_impossible","group":"job","parent":"actor","en":"Did they play Ethan Hunt in Mission: Impossible?","bn":"তিনি কি মিশন ইম্পসিবল চলচ্চিত্রে ইথান হান্ট চরিত্রে অভিনয় করেছেন?"},
  {"id":"profile_film_top_gun","group":"job","parent":"actor","en":"Did they play Maverick in Top Gun?","bn":"তিনি কি টপ গান চলচ্চিত্রে ম্যাভেরিক চরিত্রে অভিনয় করেছেন?"},
  {"id":"profile_film_maleficent","group":"job","parent":"actor","en":"Did they play the title character in Maleficent?","bn":"তিনি কি ম্যালেফিসেন্ট চলচ্চিত্রে নাম ভূমিকায় অভিনয় করেছেন?"},
  {"id":"profile_film_tomb_raider","group":"job","parent":"actor","en":"Did they play Lara Croft in the early Tomb Raider films?","bn":"তিনি কি প্রথম দিকের টুম্ব রেইডার চলচ্চিত্রে লারা ক্রফট চরিত্রে অভিনয় করেছেন?"},
  {"id":"profile_film_knives_out","group":"job","parent":"actor","en":"Did they portray Marta in Knives Out?","bn":"তিনি কি নাইভস আউট চলচ্চিত্রে মার্টা চরিত্রে অভিনয় করেছেন?"},
  {"id":"profile_film_no_time_to_die","group":"job","parent":"actor","en":"Did they play Paloma in No Time to Die?","bn":"তিনি কি নো টাইম টু ডাই চলচ্চিত্রে পালোমা চরিত্রে অভিনয় করেছেন?"},
  {"id":"profile_music_brothers","group":"job","parent":"singer","en":"Are they a member of the Jonas Brothers band?","bn":"তিনি কি জোনাস ব্রাদার্স ব্যান্ডের সদস্য?"},
  {"id":"profile_music_jealous","group":"job","parent":"singer","en":"Did they release the solo song Jealous in 2014?","bn":"তিনি কি ২০১৪ সালে একক গান জেলাস প্রকাশ করেছিলেন?"},
  {"id":"profile_sports_dx","group":"job","parent":"profile_sports_wwe","en":"Was this wrestler a founding member of D-Generation X?","bn":"এই কুস্তিগির কি ডি-জেনারেশন এক্স দলের প্রতিষ্ঠাতা সদস্য ছিলেন?"},
  {"id":"profile_sports_wwe_executive","group":"job","parent":"profile_sports_wwe","en":"Did this wrestler become a WWE chief content officer?","bn":"এই কুস্তিগির কি পরে WWE-এর প্রধান কনটেন্ট কর্মকর্তা হয়েছেন?"},
  {"id":"profile_cartoon_unicef","group":"fiction","parent":"from_cartoon","en":"Is this character from a UNICEF educational cartoon series?","bn":"চরিত্রটি কি ইউনিসেফের শিক্ষামূলক কার্টুন সিরিজের?"},
  {"id":"profile_cartoon_parrot","group":"fiction","parent":"profile_cartoon_unicef","en":"Is this character a girl whose pet parrot is called Mithu?","bn":"চরিত্রটি কি এমন একটি মেয়ে যার পোষা টিয়াপাখির নাম মিঠু?"}
]);
export const RECOGNITION_PEOPLE=Object.freeze([
  {
    "id": "identity-kate-winslet",
    "image": "Kate Winslet March 18, 2014 (headshot).jpg",
    "credit": "Mingle Media TV — CC BY-SA 2.0 · Wikimedia Commons",
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
    "image": "Monica Bellucci 2002.jpg",
    "credit": "Georges Biard — CC BY-SA 3.0 · Wikimedia Commons",
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
    "image": "Nawazuddin Siddiqui.jpg",
    "credit": "Bollywood Hungama — CC BY 3.0 · Wikimedia Commons",
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
    "image": "Keerthy Suresh 2.jpg",
    "credit": "Verghese TK — CC BY-SA 4.0 · Wikimedia Commons",
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
    "image": "Bobby Deol.jpg",
    "credit": "Bollywood Hungama — CC BY 3.0 · Wikimedia Commons",
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
    "image": "Rahil-Azam.jpg",
    "credit": "Bollywood Hungama — CC BY 3.0 · Wikimedia Commons",
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
    "image": "Priyankachopra.jpg",
    "credit": "Bollywood Hungama — CC BY 3.0 · Wikimedia Commons",
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
    "image": "John Cena 01.jpg",
    "credit": "Gage Skidmore — CC BY-SA 4.0 · Wikimedia Commons",
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
,
  {"id":"identity-tom-cruise","en":"Tom Cruise","bn":"টম ক্রুজ","pop":400,"yes":["real","named","alive","male","from_us","actor","screen_role_lead","career_hollywood_films","profile_film_mission_impossible","profile_film_top_gun"],"no":["fictional","animal","object","female","profile_sports_wrestling","profile_film_maleficent","profile_film_tomb_raider","profile_film_knives_out","profile_film_no_time_to_die"],"aliases":[]},
  {"id":"identity-angelina-jolie","en":"Angelina Jolie","bn":"অ্যাঞ্জেলিনা জোলি","pop":400,"yes":["real","named","alive","female","from_us","actor","director","screen_role_lead","career_hollywood_films","profile_film_maleficent","profile_film_tomb_raider"],"no":["fictional","animal","object","male","profile_film_mission_impossible","profile_film_top_gun","profile_film_knives_out","profile_film_no_time_to_die","tv_euphoria"],"aliases":[]},
  {"id":"identity-ana-de-armas","en":"Ana de Armas","bn":"আনা দে আরমাস","pop":400,"yes":["real","named","alive","female","actor","screen_role_lead","career_hollywood_films","from_north_america","profile_film_knives_out","profile_film_no_time_to_die"],"no":["fictional","animal","object","male","from_us","from_bd","from_in","profile_film_maleficent","profile_film_tomb_raider","tv_euphoria"],"aliases":[]},
  {"id":"identity-nick-jonas","en":"Nick Jonas","bn":"নিক জোনাস","pop":400,"yes":["real","named","alive","male","from_us","actor","singer","musician","profile_music_brothers","profile_music_jealous"],"no":["fictional","animal","object","female","profile_sports_wrestling","profile_film_mission_impossible","profile_film_top_gun"],"aliases":[]},
  {"id":"identity-triple-h","en":"Triple H","bn":"ট্রিপল এইচ","pop":400,"yes":["real","named","alive","male","from_us","athlete","profile_sports_wrestling","profile_sports_wwe","profile_sports_record_champion","profile_sports_dx","profile_sports_wwe_executive"],"no":["fictional","animal","object","female","profile_sports_peacemaker"],"aliases":["Paul Levesque","Paul Michael Levesque"]},
  {"id":"identity-cartoon-meena","en":"Meena","bn":"মীনা","pop":400,"yes":["fictional","named","female","from_cartoon","talks","profile_cartoon_unicef","profile_cartoon_parrot"],"no":["real","male","animal","object","from_anime","from_game","superhero","detective_role"],"aliases":["UNICEF Meena"]}
]);
export const RECOGNITION_ANIMALS=Object.freeze([
  {
    "id": "identity-domestic-hen",
    "image": "Hen chicken.jpg",
    "credit": "Thegreenj — CC BY-SA 3.0 · Wikimedia Commons",
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
  "profile_cartoon_parrot": {"identity-cartoon-meena":2},
  "profile_cartoon_unicef": {"identity-cartoon-meena":2},
  "profile_sports_wwe_executive": {"identity-triple-h":2,"identity-john-cena":1},
  "profile_sports_dx": {"identity-triple-h":2,"identity-john-cena":1},
  "profile_music_jealous": {"identity-nick-jonas":2},
  "profile_music_brothers": {"identity-nick-jonas":2},
  "profile_film_no_time_to_die": {"identity-tom-cruise":1,"identity-angelina-jolie":1,"identity-ana-de-armas":2},
  "profile_film_knives_out": {"identity-tom-cruise":1,"identity-angelina-jolie":1,"identity-ana-de-armas":2},
  "profile_film_tomb_raider": {"identity-tom-cruise":1,"identity-angelina-jolie":2,"identity-ana-de-armas":1},
  "profile_film_maleficent": {"identity-tom-cruise":1,"identity-angelina-jolie":2,"identity-ana-de-armas":1},
  "profile_film_top_gun": {"identity-tom-cruise":2,"identity-angelina-jolie":1,"identity-nick-jonas":1},
  "profile_film_mission_impossible": {"identity-tom-cruise":2,"identity-angelina-jolie":1,"identity-nick-jonas":1},
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
    "identity-tom-cruise": 1,
    "identity-nick-jonas": 1,
    "identity-triple-h": 2,
    "identity-john-cena": 2
  },
  "profile_sports_wwe": {
    "identity-triple-h": 2,
    "identity-john-cena": 2
  },
  "profile_sports_record_champion": {
    "identity-triple-h": 2,
    "identity-john-cena": 2
  },
  "profile_sports_peacemaker": {
    "identity-triple-h": 1,
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
export const RECOGNITION_SPECIFIC_IDS=Object.freeze(["profile_film_mission_impossible","profile_film_top_gun","profile_film_maleficent","profile_film_tomb_raider","profile_film_knives_out","profile_film_no_time_to_die","profile_music_jealous","profile_sports_wwe_executive","profile_cartoon_parrot","profile_film_titanic","profile_film_oscar_lead","profile_film_malena","profile_film_spectre","profile_film_sacred_games","profile_film_gangs_wasseypur","profile_film_mahanati","profile_film_national_award","profile_film_aashram","profile_film_animal_2023","profile_film_quantico","profile_film_miss_world","profile_film_hatim_role","profile_sports_record_champion","profile_sports_peacemaker","profile_bd_leader_spouse","profile_bd_leader_daughter","profile_bd_uk_bar","profile_animal_comb"]);
