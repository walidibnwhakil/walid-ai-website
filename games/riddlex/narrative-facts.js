// Sparse, evidence-backed classical narratives and history/television profiles.
// An epic is treated as a NARRATIVE for fictional-character mode, not a claim
// about anyone's religious beliefs or historical existence. All entries have
// non-sensitive facts, and missing traits remain UNKNOWN rather than NO.
export const NARRATIVE_QUESTIONS = Object.freeze([
  {
    "id": "story_indian_epic",
    "group": "fiction",
    "parent": "fictional",
    "en": "Is this a character from a classical Indian epic narrative?",
    "bn": "চরিত্রটি কি ভারতীয় মহাকাব্যের কোনো কাহিনির?"
  },
  {
    "id": "story_mahabharata",
    "group": "fiction",
    "parent": "story_indian_epic",
    "en": "Does the character appear in the Mahabharata?",
    "bn": "চরিত্রটি কি মহাভারতের কাহিনিতে আছেন?"
  },
  {
    "id": "story_ramayana",
    "group": "fiction",
    "parent": "story_indian_epic",
    "en": "Does the character appear in the Ramayana?",
    "bn": "চরিত্রটি কি রামায়ণের কাহিনিতে আছেন?"
  },
  {
    "id": "story_archery",
    "group": "fiction",
    "parent": "story_indian_epic",
    "en": "Is this character especially associated with the bow and arrow?",
    "bn": "চরিত্রটির সঙ্গে কি ধনুক ও তিরের বিশেষ সম্পর্ক আছে?"
  },
  {
    "id": "story_pandava",
    "group": "fiction",
    "parent": "story_mahabharata",
    "en": "Is this one of the five Pandava brothers?",
    "bn": "চরিত্রটি কি পাঁচ পাণ্ডব ভাইয়ের একজন?"
  },
  {
    "id": "story_charioteer_guide",
    "group": "fiction",
    "parent": "story_mahabharata",
    "en": "Does this character guide Arjuna as his charioteer?",
    "bn": "চরিত্রটি কি অর্জুনের সারথি ও উপদেষ্টা হিসেবে পরিচিত?"
  },
  {
    "id": "story_lifelong_vow",
    "group": "fiction",
    "parent": "story_mahabharata",
    "en": "Is this character especially known for a lifelong vow of celibacy?",
    "bn": "চরিত্রটি কি আজীবন ব্রহ্মচর্যের প্রতিজ্ঞার জন্য পরিচিত?"
  },
  {
    "id": "story_karna_armor",
    "group": "fiction",
    "parent": "story_mahabharata",
    "en": "Was the character famously born with divine armour and earrings?",
    "bn": "জন্মগত কবচ-কুণ্ডলের জন্য কি চরিত্রটি বিখ্যাত?"
  },
  {
    "id": "story_rama_brother",
    "group": "fiction",
    "parent": "story_ramayana",
    "en": "Is this character Rama's brother who accompanies him into exile?",
    "bn": "চরিত্রটি কি রামের ভাই যিনি তাঁর সঙ্গে বনবাসে যান?"
  },
  {
    "id": "story_sita_husband",
    "group": "fiction",
    "parent": "story_ramayana",
    "en": "Is the character Sita's husband?",
    "bn": "চরিত্রটি কি সীতার স্বামী?"
  },
  {
    "id": "story_lanka_king",
    "group": "fiction",
    "parent": "story_ramayana",
    "en": "Is this character the ruler of Lanka?",
    "bn": "চরিত্রটি কি লঙ্কার রাজা?"
  },
  {
    "id": "story_secret_agent",
    "group": "fiction",
    "parent": "fictional",
    "en": "Is the character a fictional secret agent or spy?",
    "bn": "এই কাল্পনিক চরিত্রটি কি একজন গোপন এজেন্ট বা গুপ্তচর?"
  },
  {
    "id": "story_agent_007",
    "group": "fiction",
    "parent": "story_secret_agent",
    "en": "Is the agent known by the number 007?",
    "bn": "এই এজেন্ট কি ০০৭ নম্বরে পরিচিত?"
  },
  {
    "id": "history_religious_prophet",
    "group": "job",
    "parent": "real",
    "en": "Is this person known as a prophet in Abrahamic religious traditions?",
    "bn": "ইব্রাহিমি ধর্মীয় ঐতিহ্যে কি তিনি একজন নবী হিসেবে পরিচিত?"
  },
  {
    "id": "history_first_human",
    "group": "job",
    "parent": "history_religious_prophet",
    "en": "Is this person identified as the first human in the religious account?",
    "bn": "ধর্মীয় বর্ণনায় কি তাঁকে প্রথম মানুষ বলা হয়?"
  },
  {
    "id": "history_jesus_isa",
    "group": "job",
    "parent": "history_religious_prophet",
    "en": "Is this prophet known as Jesus in English and Isa in Arabic?",
    "bn": "এই নবী কি ইংরেজিতে জিসাস এবং আরবিতে ঈসা নামে পরিচিত?"
  },
  {
    "id": "office_us_2009_2017",
    "group": "job",
    "parent": "politician",
    "en": "Did this person serve as US president from 2009 through January 2017?",
    "bn": "তিনি কি ২০০৯ থেকে ২০১৭ সালের জানুয়ারি পর্যন্ত যুক্তরাষ্ট্রের প্রেসিডেন্ট ছিলেন?"
  },
  {
    "id": "office_aca_2010",
    "group": "job",
    "parent": "office_us_2009_2017",
    "en": "Is the Affordable Care Act widely associated with this president?",
    "bn": "Affordable Care Act আইনটি কি এই প্রেসিডেন্টের সঙ্গে বিশেষভাবে সম্পর্কিত?"
  },
  {
    "id": "screen_money_heist",
    "group": "job",
    "parent": "actor",
    "en": "Did this performer appear in the series Money Heist (La casa de papel)?",
    "bn": "এই অভিনয়শিল্পী কি মানি হেইস্ট সিরিজে অভিনয় করেছেন?"
  },
  {
    "id": "screen_tokyo_heist",
    "group": "job",
    "parent": "screen_money_heist",
    "en": "Did this performer play the character Tokyo in Money Heist?",
    "bn": "মানি হেইস্ট সিরিজে কি তিনি টোকিও চরিত্রে অভিনয় করেছেন?"
  }
]);
export const NARRATIVE_PEOPLE = Object.freeze([
  {
    "id": "narrative-arjuna",
    "en": "Arjuna",
    "bn": "অর্জুন",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_mahabharata",
      "story_archery",
      "story_pandava"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_ramayana",
      "story_charioteer_guide",
      "story_lifelong_vow",
      "story_karna_armor"
    ],
    "aliases": []
  },
  {
    "id": "narrative-krishna",
    "en": "Krishna",
    "bn": "কৃষ্ণ",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_mahabharata",
      "story_charioteer_guide"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_ramayana",
      "story_pandava",
      "story_lifelong_vow",
      "story_karna_armor"
    ],
    "aliases": [
      "Krisno",
      "শ্রীকৃষ্ণ"
    ]
  },
  {
    "id": "narrative-karna",
    "en": "Karna",
    "bn": "কর্ণ",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_mahabharata",
      "story_archery",
      "story_karna_armor"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_ramayana",
      "story_pandava",
      "story_charioteer_guide",
      "story_lifelong_vow"
    ],
    "aliases": []
  },
  {
    "id": "narrative-bhishma",
    "en": "Bhishma",
    "bn": "ভীষ্ম",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_mahabharata",
      "story_archery",
      "story_lifelong_vow"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_ramayana",
      "story_pandava",
      "story_charioteer_guide",
      "story_karna_armor"
    ],
    "aliases": [
      "Bheeshma",
      "Vism"
    ]
  },
  {
    "id": "narrative-rama",
    "en": "Rama",
    "bn": "রাম",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_ramayana",
      "story_archery",
      "story_sita_husband"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_mahabharata",
      "story_rama_brother",
      "story_lanka_king"
    ],
    "aliases": [
      "Ram"
    ]
  },
  {
    "id": "narrative-lakshmana",
    "en": "Lakshmana",
    "bn": "লক্ষ্মণ",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_ramayana",
      "story_archery",
      "story_rama_brother"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_mahabharata",
      "story_sita_husband",
      "story_lanka_king"
    ],
    "aliases": [
      "Lokkhon",
      "Laxman"
    ]
  },
  {
    "id": "narrative-ravana",
    "en": "Ravana",
    "bn": "রাবণ",
    "pop": 350,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "story_indian_epic",
      "story_ramayana",
      "story_lanka_king"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_mahabharata",
      "story_sita_husband",
      "story_rama_brother"
    ],
    "aliases": [
      "Rabon"
    ]
  },
  {
    "id": "narrative-james-bond",
    "en": "James Bond",
    "bn": "জেমস বন্ড",
    "pop": 850,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "from_film",
      "story_secret_agent",
      "story_agent_007"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_indian_epic",
      "from_bengali_lit",
      "detective_role"
    ],
    "aliases": [
      "007"
    ]
  },
  {
    "id": "narrative-ethan-hunt",
    "en": "Ethan Hunt",
    "bn": "ইথান হান্ট",
    "pop": 330,
    "yes": [
      "fictional",
      "named",
      "male",
      "from_novel",
      "talks",
      "from_film",
      "story_secret_agent"
    ],
    "no": [
      "real",
      "animal",
      "object",
      "from_bengali_lit",
      "from_anime",
      "from_game",
      "story_agent_007",
      "story_indian_epic"
    ],
    "aliases": []
  },
  {
    "id": "narrative-adam",
    "en": "Adam (prophet)",
    "bn": "আদম (আ.)",
    "pop": 630,
    "yes": [
      "real",
      "named",
      "male",
      "history_religious_prophet",
      "history_first_human",
      "born_pre1900"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "actor",
      "politician",
      "cricketer",
      "footballer",
      "scientist"
    ],
    "aliases": [
      "Prophet Adam",
      "হযরত আদম"
    ]
  },
  {
    "id": "narrative-jesus-isa",
    "en": "Jesus",
    "bn": "যিশু (ঈসা)",
    "pop": 800,
    "yes": [
      "real",
      "named",
      "male",
      "history_religious_prophet",
      "history_jesus_isa",
      "born_pre1900"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "actor",
      "politician",
      "cricketer",
      "footballer",
      "scientist"
    ],
    "aliases": [
      "Jesus",
      "Jesus Christ",
      "Isa",
      "Esha",
      "ঈসা",
      "যিশু",
      "যীশু"
    ]
  },
  {
    "id": "narrative-ursula-corbero",
    "en": "Úrsula Corberó",
    "bn": "উরসুলা করবেরো",
    "pop": 430,
    "yes": [
      "real",
      "named",
      "male",
      "female",
      "alive",
      "from_es",
      "actor",
      "screen_money_heist",
      "screen_tokyo_heist",
      "screen_films_after_2000"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "male",
      "politician",
      "cricketer",
      "footballer",
      "scientist"
    ],
    "aliases": [
      "Ursula Corbero"
    ]
  },
  {
    "id": "narrative-office-comparator",
    "en": "George W. Bush",
    "bn": "জর্জ ডব্লিউ বুশ",
    "pop": 300,
    "yes": [
      "real",
      "named",
      "male",
      "alive",
      "from_us",
      "politician",
      "led_gov",
      "head_of_state"
    ],
    "no": [
      "fictional",
      "animal",
      "object",
      "office_us_2009_2017",
      "office_aca_2010",
      "actor"
    ],
    "aliases": []
  }
]);
export const NARRATIVE_FACTS = Object.freeze({
  "story_indian_epic": {
    "narrative-arjuna": 2,
    "narrative-krishna": 2,
    "narrative-karna": 2,
    "narrative-bhishma": 2,
    "narrative-rama": 2,
    "narrative-lakshmana": 2,
    "narrative-ravana": 2,
    "narrative-james-bond": 1,
    "narrative-ethan-hunt": 1
  },
  "story_mahabharata": {
    "narrative-arjuna": 2,
    "narrative-krishna": 2,
    "narrative-karna": 2,
    "narrative-bhishma": 2,
    "narrative-rama": 1,
    "narrative-lakshmana": 1,
    "narrative-ravana": 1
  },
  "story_ramayana": {
    "narrative-arjuna": 1,
    "narrative-krishna": 1,
    "narrative-karna": 1,
    "narrative-bhishma": 1,
    "narrative-rama": 2,
    "narrative-lakshmana": 2,
    "narrative-ravana": 2
  },
  "story_archery": {
    "narrative-arjuna": 2,
    "narrative-karna": 2,
    "narrative-bhishma": 2,
    "narrative-rama": 2,
    "narrative-lakshmana": 2
  },
  "story_pandava": {
    "narrative-arjuna": 2,
    "narrative-krishna": 1,
    "narrative-karna": 1,
    "narrative-bhishma": 1
  },
  "story_charioteer_guide": {
    "narrative-arjuna": 1,
    "narrative-krishna": 2,
    "narrative-karna": 1,
    "narrative-bhishma": 1
  },
  "story_lifelong_vow": {
    "narrative-arjuna": 1,
    "narrative-krishna": 1,
    "narrative-karna": 1,
    "narrative-bhishma": 2
  },
  "story_karna_armor": {
    "narrative-arjuna": 1,
    "narrative-krishna": 1,
    "narrative-karna": 2,
    "narrative-bhishma": 1
  },
  "story_rama_brother": {
    "narrative-rama": 1,
    "narrative-lakshmana": 2,
    "narrative-ravana": 1
  },
  "story_sita_husband": {
    "narrative-rama": 2,
    "narrative-lakshmana": 1,
    "narrative-ravana": 1
  },
  "story_lanka_king": {
    "narrative-rama": 1,
    "narrative-lakshmana": 1,
    "narrative-ravana": 2
  },
  "story_secret_agent": {
    "narrative-james-bond": 2,
    "narrative-ethan-hunt": 2
  },
  "story_agent_007": {
    "narrative-james-bond": 2,
    "narrative-ethan-hunt": 1
  },
  "history_religious_prophet": {
    "narrative-adam": 2,
    "narrative-jesus-isa": 2
  },
  "history_first_human": {
    "narrative-adam": 2
  },
  "history_jesus_isa": {
    "narrative-jesus-isa": 2
  },
  "office_us_2009_2017": {
    "narrative-office-comparator": 1,
    "Q76": 2,
    "riddlex-profile-trump": 1
  },
  "office_aca_2010": {
    "narrative-office-comparator": 1,
    "Q76": 2,
    "riddlex-profile-trump": 1
  },
  "screen_money_heist": {
    "narrative-ursula-corbero": 2
  },
  "screen_tokyo_heist": {
    "narrative-ursula-corbero": 2
  }
});
