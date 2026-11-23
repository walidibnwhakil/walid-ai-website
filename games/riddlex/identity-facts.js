// Public-interest profiles supplement the sparse worldwide casebook. These
// are verifiable, broad career cues before specific film/title confirmation.
// A public person may have multiple professions. No absent fact is marked NO.
// All information shown in questions is public, non-private career context.
// Names appearing in multiple source shards remain separate candidate records;
// only an affirmative *distinctive* clue can trigger the verified-name path.
//
// Source starting points:
// https://en.wikipedia.org/wiki/Ferdous_Ahmed
// https://en.wikipedia.org/wiki/Jaya_Ahsan
// https://en.wikipedia.org/wiki/Dev_(actor)
// https://en.wikipedia.org/wiki/Mashrafe_Mortaza
// https://en.wikipedia.org/wiki/Pinaki_Bhattacharya
// https://en.wikipedia.org/wiki/Koel_Mallick
// https://en.wikipedia.org/wiki/Srabanti_Chatterjee
// https://en.wikipedia.org/wiki/Prabhas
// https://en.wikipedia.org/wiki/Dani_Daniels
// https://en.wikipedia.org/wiki/Stacy_Martin
// https://en.wikipedia.org/wiki/Sydney_Sweeney
// https://en.wikipedia.org/wiki/Kate_Winslet
// https://www.daily.co.jp/gossip/subculture/2024/08/25/0018046288.shtml

const descriptions = [
 // Shared types and subbranches. These do NOT independently confirm anyone.
 ["career_bengali_films","actor",
  "Have they acted mainly in Bengali-language films?","তিনি কি প্রধানত বাংলা ভাষার চলচ্চিত্রে অভিনয় করেছেন?",false],
 ["career_hindi_films","actor",
  "Are they especially known for Hindi-language films?","তিনি কি মূলত হিন্দি চলচ্চিত্রের জন্য পরিচিত?",false],
 ["career_telugu_films","actor",
  "Do they primarily work in Telugu-language cinema?","তিনি কি মূলত তেলুগু ভাষার চলচ্চিত্রে অভিনয় করেন?",false],
 ["career_hollywood_films","actor",
  "Are they especially known for English-language films or TV?","তিনি কি ইংরেজি ভাষার চলচ্চিত্র বা টিভি সিরিজের জন্য পরিচিত?",false],
 ["career_child_performer","actor",
  "Did they become publicly known as a child performer?","তিনি কি শিশুশিল্পী হিসেবে পরিচিতি পেয়েছিলেন?",false],
 ["career_bd_mp","politician",
  "Have they served as an elected member of Bangladesh's parliament?","তিনি কি বাংলাদেশের সংসদ সদস্য ছিলেন?",false],
 ["career_indian_mp","politician",
  "Have they been elected to India's parliament?","তিনি কি ভারতের সংসদ সদস্য নির্বাচিত হয়েছেন?",false],
 ["career_worked_both_bengals","actor",
  "Have they acted in both Bangladeshi and Indian Bengali productions?","তিনি কি বাংলাদেশের পাশাপাশি ভারতের বাংলা চলচ্চিত্রেও অভিনয় করেছেন?",false],
 ["career_fast_bowler","cricketer",
  "Were they mainly an international fast bowler?","তিনি কি আন্তর্জাতিক ক্রিকেটে মূলত পেস বোলার ছিলেন?",false],
 ["career_bangladesh_captain","cricketer",
  "Did they captain Bangladesh's national cricket team?","তিনি কি বাংলাদেশ জাতীয় ক্রিকেট দলের অধিনায়ক ছিলেন?",false],
 ["career_narail_express","cricketer",
  "Were they widely nicknamed the Narail Express?","তিনি কি ‘নড়াইল এক্সপ্রেস’ নামে পরিচিত?",true],
 ["career_online_commentator","writer",
  "Are they widely known for political commentary through online videos?","তিনি কি অনলাইন ভিডিওতে রাজনৈতিক বিশ্লেষণের জন্য পরিচিত?",true],
 ["career_former_adult","adult_ent",
  "Have they left the adult-film industry?","তিনি কি প্রাপ্তবয়স্ক চলচ্চিত্রের কাজ ছেড়ে দিয়েছেন?",false],
 ["career_japanese_av","adult_ent",
  "Did they work in the Japanese adult video industry?","তিনি কি জাপানি প্রাপ্তবয়স্ক ভিডিও শিল্পে কাজ করেছেন?",false],
 ["career_adult_director","adult_ent",
  "Have they also directed adult films?","তিনি কি প্রাপ্তবয়স্ক চলচ্চিত্র পরিচালনাও করেছেন?",false],
 ["career_adult_to_india","adult_ent",
  "Did they later become known for Indian mainstream films?","তিনি কি পরে ভারতের মূলধারার চলচ্চিত্রেও পরিচিত হন?",true],
 // Individually distinctive but familiar works/roles. A 'no' is informative,
 // but a film title is never assumed familiar; players may say Unknown.
 ["film_hothat_brishti","actor",
  "Did they star in the Bangladeshi film Hothat Brishti?","তিনি কি ‘হঠাৎ বৃষ্টি’ চলচ্চিত্রে অভিনয় করেছেন?",true],
 ["film_kabuliwala_child","actor",
  "Did they receive recognition as a child actor for Kabuliwala?","তিনি কি শিশুশিল্পী হিসেবে ‘কাবুলিওয়ালা’ চলচ্চিত্রের জন্য পরিচিতি পান?",true],
 ["film_bisorjon","actor",
  "Did they star in the Bengali film Bisorjon?","তিনি কি ‘বিসর্জন’ চলচ্চিত্রে অভিনয় করেছেন?",true],
 ["film_chander_pahar","actor",
  "Did they lead the Bengali adventure film Chander Pahar?","তিনি কি ‘চাঁদের পাহাড়’ চলচ্চিত্রের প্রধান চরিত্রে অভিনয় করেছেন?",true],
 ["film_sathi_2002","actor",
  "Was Sathi a major early hit in their film career?","‘সাথী’ কি তাঁর চলচ্চিত্রজীবনের প্রথমদিকের জনপ্রিয় ছবি?",true],
 ["film_nater_guru","actor",
  "Did they make their leading-film debut in Nater Guru?","‘নাটের গুরু’ চলচ্চিত্র দিয়ে কি তাঁর নায়িকা হিসেবে অভিষেক হয়?",true],
 ["film_mayar_badhon","actor",
  "Did they appear as a child performer in Mayar Badhon?","তিনি কি ‘মায়ার বাঁধন’-এ শিশুশিল্পী হিসেবে অভিনয় করেছিলেন?",true],
 ["film_vicky_donor","actor",
  "Did they star in Vicky Donor?","তিনি কি ‘ভিকি ডোনার’ চলচ্চিত্রে অভিনয় করেছেন?",true],
 ["film_baahubali","actor",
  "Did they play the central character in the Baahubali films?","তিনি কি ‘বাহুবলী’ চলচ্চিত্রগুলোর কেন্দ্রীয় চরিত্রে অভিনয় করেছেন?",true],
 ["film_singham","actor",
  "Did they play the police officer in the Singham films?","তিনি কি ‘সিংহম’ চলচ্চিত্রগুলোতে পুলিশ কর্মকর্তার চরিত্রে অভিনয় করেছেন?",true],
 ["film_ddlj_kajol","actor",
  "Did they play the female lead in Dilwale Dulhania Le Jayenge?","তিনি কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’তে প্রধান নারী চরিত্রে অভিনয় করেছেন?",true],
 ["film_khiladi","actor",
  "Were they particularly known through the Khiladi films?","তিনি কি ‘খিলাড়ি’ চলচ্চিত্রগুলোর মাধ্যমে বিশেষ পরিচিতি পান?",true],
 ["film_titanic","actor",
  "Did they play Rose in the film Titanic?","তিনি কি ‘টাইটানিক’ চলচ্চিত্রে রোজ চরিত্রে অভিনয় করেছেন?",true],
 ["tv_euphoria","actor",
  "Did they play Cassie in the series Euphoria?","তিনি কি ‘ইউফোরিয়া’ সিরিজে ক্যাসি চরিত্রে অভিনয় করেছেন?",true],
 ["film_nymphomaniac","actor",
  "Did they play Young Joe in the film Nymphomaniac?","তিনি কি ‘নিম্ফোম্যানিয়াক’ চলচ্চিত্রে তরুণী জো চরিত্রে অভিনয় করেছেন?",true],
 ["politics_russian_president","politician",
  "Has this person been president of Russia?","এই ব্যক্তি কি রাশিয়ার রাষ্ট্রপতি ছিলেন?",true],
 ["politics_american_president","politician",
  "Has this person been president of the United States?","এই ব্যক্তি কি যুক্তরাষ্ট্রের রাষ্ট্রপতি ছিলেন?",true],
 // Well documented public career transitions distinguish adult performers.
 ["career_adult_lebanese_origin","adult_ent",
  "Were they born in Lebanon and later based in the United States?","তিনি কি লেবাননে জন্ম নিয়ে পরে যুক্তরাষ্ট্রে পরিচিত হন?",true],
 ["career_adult_italian","adult_ent",
  "Are they an Italian adult-film actor and director?","তিনি কি ইতালীয় প্রাপ্তবয়স্ক চলচ্চিত্রের অভিনেতা ও পরিচালক?",true],
 ["career_adult_painter","adult_ent",
  "Are they also publicly known for painting or fine art?","তিনি কি চিত্রকলা বা শিল্পকর্মের জন্যও পরিচিত?",true],
 ["career_aizawa_2019_award","adult_ent",
  "Did they win the top actress award at the 2019 FANZA Adult Awards?","তিনি কি ২০১৯ সালের FANZA Adult Awards-এ সেরা অভিনেত্রী হন?",true],
];

export const EXTRA_IDENTITY_QUESTIONS=Object.freeze(descriptions.map(
  ([id,parent,en,bn,distinctive])=>Object.freeze({id,parent,group:
    parent==="adult_ent"?"adult":parent==="politician"?"politics":"job",
    en,bn,distinctive})));
export const IDENTITY_DISTINCTIVE_IDS=Object.freeze(
  EXTRA_IDENTITY_QUESTIONS.filter(q=>q.distinctive).map(q=>q.id));

function profile(id,en,bn,country,gender,professions,facts,pop=120){
  const yes=new Set(["real","named","alive",country,
    gender==="male"?"male":"female",...professions,...facts]);
  const no=new Set(["fictional","animal","object",
    gender==="male"?"female":"male","dead"]);
  return {id,en,bn,pop,yes:[...yes],no:[...no]};
}

export const EXTRA_IDENTITY_PEOPLE=Object.freeze([
 profile("riddlex-profile-ferdous","Ferdous Ahmed","ফেরদৌস আহমেদ","from_bd","male",
  ["actor","politician"],["career_bengali_films","career_bd_mp","film_hothat_brishti",
  "screen_role_lead","screen_films_after_2000","screen_national_film_award"],190),
 profile("riddlex-profile-dighi","Prarthana Fardin Dighi","প্রার্থনা ফারদিন দীঘি","from_bd","female",
  ["actor"],["career_bengali_films","career_child_performer","film_kabuliwala_child",
  "screen_films_after_2000","screen_national_film_award"],150),
 profile("riddlex-profile-jaya","Jaya Ahsan","জয়া আহসান","from_bd","female",
  ["actor"],["career_bengali_films","career_worked_both_bengals","film_bisorjon",
  "screen_role_lead","screen_films_after_2000","screen_national_film_award"],225),
 profile("riddlex-profile-deb","Dev Adhikari","দেব অধিকারী","from_in","male",
  ["actor","politician"],["career_bengali_films","career_indian_mp",
  "film_chander_pahar","screen_role_lead","screen_films_after_2000"],200),
 profile("riddlex-profile-jeet","Jeet","জিৎ","from_in","male",
  ["actor"],["career_bengali_films","film_sathi_2002",
  "screen_role_lead","screen_films_after_2000"],180),
 profile("riddlex-profile-modi","Narendra Modi","নরেন্দ্র মোদি","from_in","male",
  ["politician"],["led_gov","been_minister","been_premier","in_government"],400),
 profile("riddlex-profile-mashrafe","Mashrafe Mortaza","মাশরাফি বিন মুর্তজা","from_bd","male",
  ["politician","cricketer","athlete"],["career_bd_mp","party_al",
  "career_fast_bowler","career_bangladesh_captain","career_narail_express",
  "captain","bowler","does_bowl"],265),
 profile("riddlex-profile-pinaki","Pinaki Bhattacharya","পিনাকী ভট্টাচার্য","from_bd","male",
  ["writer","youtube"],["career_online_commentator","lives_abroad"],140),
 profile("riddlex-profile-koel","Koel Mallick","কোয়েল মল্লিক","from_in","female",
  ["actor"],["career_bengali_films","film_nater_guru",
  "screen_role_lead","screen_films_after_2000"],180),
 profile("riddlex-profile-srabanti","Srabanti Chatterjee","শ্রাবন্তী চট্টোপাধ্যায়","from_in","female",
  ["actor"],["career_bengali_films","career_child_performer","film_mayar_badhon",
  "screen_role_lead","screen_films_after_2000"],180),
 profile("riddlex-profile-ayushmann","Ayushmann Khurrana","আয়ুষ্মান খুরানা","from_in","male",
  ["actor","singer"],["career_hindi_films","film_vicky_donor",
  "screen_role_lead","screen_films_after_2000"],220),
 profile("riddlex-profile-prabhas","Prabhas","প্রভাস","from_in","male",
  ["actor"],["career_telugu_films","film_baahubali",
  "screen_role_lead","screen_films_after_2000"],320),
 profile("riddlex-profile-ajay","Ajay Devgn","অজয় দেবগন","from_in","male",
  ["actor","director"],["career_hindi_films","film_singham",
  "screen_role_lead","screen_films_after_2000"],280),
 profile("riddlex-profile-kajol","Kajol","কাজল","from_in","female",
  ["actor"],["career_hindi_films","film_ddlj_kajol",
  "screen_role_lead","screen_films_after_2000"],260),
 profile("riddlex-profile-akshay","Akshay Kumar","অক্ষয় কুমার","from_in","male",
  ["actor"],["career_hindi_films","film_khiladi",
  "screen_role_lead","screen_films_after_2000"],285),
 profile("riddlex-profile-sunny","Sunny Leone","সানি লিওন","from_ca","female",
  ["actor","adult_ent"],["career_former_adult","career_adult_to_india",
  "career_hindi_films","screen_films_after_2000"],200),
 profile("riddlex-profile-rocco","Rocco Siffredi","রোক্কো সিফ্রেদি","from_it","male",
  ["actor","adult_ent","director"],["career_adult_director",
  "career_adult_italian"],200),
 // The literal "Minami Ozawa" JAV identification supplied by the user
 // could not be independently verified. Do NOT merge a guessed adult
 // profession onto the independently documented Japanese voice actress.
 // The identity remains pending/source-needed; no false "verified" record.
 profile("riddlex-profile-dani","Dani Daniels","ড্যানি ড্যানিয়েলস","from_us","female",
  ["actor","adult_ent"],["career_adult_painter"],135),
 profile("riddlex-profile-mia","Mia Khalifa","মিয়া খলিফা","from_us","female",
  ["actor","adult_ent"],["career_former_adult","career_adult_lebanese_origin"],185),
 profile("riddlex-profile-putin","Vladimir Putin","ভ্লাদিমির পুতিন","from_ru","male",
  ["politician"],["politics_russian_president","head_of_state",
  "led_gov","been_minister","been_premier"],450),
 profile("riddlex-profile-trump","Donald Trump","ডোনাল্ড ট্রাম্প","from_us","male",
  ["politician","business"],["politics_american_president","head_of_state",
  "led_gov","been_minister"],450),
 profile("riddlex-profile-stacy","Stacy Martin","স্টেসি মার্টিন","from_fr","female",
  ["actor"],["career_hollywood_films","film_nymphomaniac",
  "screen_role_lead","screen_films_after_2000"],150),
 profile("riddlex-profile-sydney","Sydney Sweeney","সিডনি সুইনি","from_us","female",
  ["actor"],["career_hollywood_films","tv_euphoria",
  "screen_role_lead","screen_films_after_2000"],260),
 profile("riddlex-profile-kate","Kate Winslet","কেট উইন্সলেট","from_gb","female",
  ["actor"],["career_hollywood_films","film_titanic",
  "screen_role_lead","screen_films_after_2000"],290),
 // Verified Japanese JAV star, not interchangeable with "Minami Ozawa".
 profile("riddlex-profile-aizawa","Minami Aizawa","মিনামি আইজাওয়া","from_jp","female",
  ["actor","adult_ent"],["career_japanese_av","career_former_adult",
  "career_aizawa_2019_award"],150),
]);
export const IDENTITY_FACTS=Object.freeze(Object.fromEntries(
  EXTRA_IDENTITY_QUESTIONS.map(q=>[
    q.id,Object.freeze(Object.fromEntries(EXTRA_IDENTITY_PEOPLE
      .filter(person=>person.yes.includes(q.id)).map(person=>[person.id,2])))
  ])
));
