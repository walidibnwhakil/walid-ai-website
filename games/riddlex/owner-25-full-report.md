# Riddlex: ২৫টি স্বতন্ত্র বাস্তব গেমপ্লে পরীক্ষা

**পরীক্ষা:** ২৩ নভেম্বর ২০২৬ · **গেম:** GitHub `main` থেকে নেওয়া আসল Riddlex, PR #607-এ আলাদা Chromium browser পরীক্ষা · **পরীক্ষার উৎস:** [GitHub Actions রান #45133882635](https://github.com/walidibnwhakil/walid-ai-website/actions/runs/45133882635)

**পদ্ধতি:** প্রতিটি ব্যক্তির জন্য নতুন রাউন্ড চালু করে বাস্তব গেমের প্রতিটি প্রশ্নে স্বাধীনভাবে প্রস্তুত করা, সতর্ক public-knowledge উত্তর দেওয়া হয়েছে। কোনো অস্পষ্ট/নির্দিষ্ট তথ্য নিশ্চিত না হলে *জানি না* দেওয়া হয়েছে। গেমের ভেতরের knowledge-base দেখে উত্তর বানানো হয়নি। এটি একজন সাধারণ মানুষের উত্তরের একটি **simulation**, বাস্তব খেলোয়াড়ের আচরণের নিশ্চয়তা নয়।

**ফল:** ২৫টির মধ্যে **১টি সঠিক**, **২৪টি ব্যর্থ**, **২টি খেলায় ভুল Guess**। এই নির্দিষ্ট পরীক্ষাই শুধু পরিমাপ করা হয়েছে, সামগ্রিক সাফল্যের হার নয়।

**প্রশ্নের কঠিনতার সূচক:** সাধারণ = নাম/দেশ/প্রাথমিক পেশা, মাঝারি = ভূমিকা/বিভাগ, বিশেষ তথ্য = নির্দিষ্ট ছবি/পুরস্কার/দলীয় পদ/পেশাগত সময়কাল। এটি একটি heuristic, ব্যবহারকারীদের জরিপ নয়। "জানি না" দেওয়া প্রশ্নগুলো ব্যবহারকারীর কাছে কঠিন হতে পারে; এটি সবসময় প্রশ্নটি খারাপ তা বোঝায় না।

**পরিচয়সংক্রান্ত নোট:** Ferdous = ফেরদৌস আহমেদ; Deb = দেব অধিকারী; Dighi = প্রার্থনা ফারদিন দীঘি; Srabonti = শ্রাবন্তী চ্যাটার্জি; Ayusman = আয়ুষ্মান খুরানা; Probhas = প্রভাস; Vlademir = ভ্লাদিমির পুতিন; Dani Dainels = Dani Daniels; Seednew Sweeney = Sydney Sweeney; Kate Winstlet = Kate Winslet। **Minami Ozawa** নামটি অস্পষ্ট, এখানে আক্ষরিক নামের জাপানি ভয়েস অভিনেত্রীকে ধরা হয়েছে; Minami Aizawa/Maria Ozawa-কে নয়।

## একনজরে ফল

| # | লক্ষ্য | Guess | প্রশ্ন | জানি না | বিশেষ প্রশ্ন | ভুল নাম |
|---:|---|---|---:|---:|---:|---|
| 1 | Ferdous (Ferdous Ahmed) | ব্যর্থ | 22 | 7 | 14 | Sajeeb Wazed |
| 2 | Dighi (Prarthana Fardin Dighi) | ব্যর্থ | 23 | 8 | 13 | — |
| 3 | Jaya Ahsan | ব্যর্থ | 22 | 7 | 13 | — |
| 4 | Deb (Dev Adhikari) | ব্যর্থ | 24 | 10 | 7 | — |
| 5 | Jeet (Jeet Madnani) | ব্যর্থ | 24 | 10 | 7 | — |
| 6 | Narendra Modi | সঠিক | 14 | 0 | 1 | — |
| 7 | Mashrafee Bin Mortaza (Mashrafe Mortaza) | ব্যর্থ | 21 | 8 | 13 | Sajeeb Wazed |
| 8 | Pinaki Bhattacharya | ব্যর্থ | 11 | 0 | 0 | — |
| 9 | Koel Mallick | ব্যর্থ | 14 | 1 | 2 | — |
| 10 | Srabonti (Srabanti Chatterjee) | ব্যর্থ | 14 | 1 | 2 | — |
| 11 | Ayusman Khurana (Ayushmann Khurrana) | ব্যর্থ | 21 | 6 | 4 | — |
| 12 | Probhas (Prabhas) | ব্যর্থ | 24 | 10 | 7 | — |
| 13 | Ajay Devgan (Ajay Devgn) | ব্যর্থ | 23 | 7 | 5 | — |
| 14 | Kajol | ব্যর্থ | 14 | 1 | 2 | — |
| 15 | Akshay Kumar | ব্যর্থ | 25 | 10 | 8 | — |
| 16 | Sunny Leone | ব্যর্থ | 17 | 6 | 2 | — |
| 17 | Rocco Siffredi | ব্যর্থ | 21 | 6 | 2 | — |
| 18 | Minami Ozawa (Minami Ozawa (Japanese voice actress)) | ব্যর্থ | 21 | 7 | 2 | — |
| 19 | Dani Dainels (Dani Daniels) | ব্যর্থ | 19 | 6 | 2 | — |
| 20 | Mia Khalifa | ব্যর্থ | 19 | 6 | 2 | — |
| 21 | Vlademir Putin (Vladimir Putin) | ব্যর্থ | 26 | 7 | 10 | — |
| 22 | Donald Trump | ব্যর্থ | 25 | 6 | 10 | — |
| 23 | Stacy Martin | ব্যর্থ | 17 | 5 | 2 | — |
| 24 | Seednew Sweeney (Sydney Sweeney) | ব্যর্থ | 19 | 5 | 2 | — |
| 25 | Kate Winstlet (Kate Winslet) | ব্যর্থ | 17 | 5 | 2 | — |

## সব প্রশ্ন ও উত্তরের পূর্ণ বিবরণ

প্রতিটি নামের নিচের অংশে ক্লিক করে প্রসারিত করলে সব প্রশ্নের বাংলা ও ইংরেজি, উত্তর, কঠিনতার সূচক দেখতে পারবেন।

<details>
<summary>1. Ferdous — ব্যর্থ · 22 প্রশ্ন · 7টি জানি না</summary>

**পরীক্ষার পরিচয়:** Ferdous Ahmed। **শেষ Guess:** Sajeeb Wazed। **ভুল Guess:** Sajeeb Wazed (14 প্রশ্নের পরে)।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **হ্যাঁ** | সাধারণ |
| 6 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি কোনো রাজনৈতিক দলের প্রধান? <small>(Are they the chief or leader of a political party?)</small> \`party_chief\` | **না** | বিশেষ তথ্য |
| 8 | তিনি কি সরকার প্রধান ছিলেন? <small>(Have they led a government?)</small> \`led_gov\` | **না** | বিশেষ তথ্য |
| 9 | তিনি কি রাষ্ট্রপতি ছিলেন? <small>(Have they been President?)</small> \`head_of_state\` | **না** | বিশেষ তথ্য |
| 10 | তিনি কি কোনো দলের মহাসচিব? <small>(Are they the secretary-general of a political party?)</small> \`party_secretary\` | **না** | বিশেষ তথ্য |
| 11 | এই ব্যক্তি কি আগে গণঅধিকার পরিষদের সাধারণ সম্পাদক ছিলেন? <small>(Did this person previously serve as the general secretary of Gono Odhikar Parishad?)</small> \`politics_gono_odhikar_gs\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি বিএনপির? <small>(Are they from the BNP?)</small> \`party_bnp\` | **জানি না** | বিশেষ তথ্য |
| 13 | তিনি কি আওয়ামী লীগের? <small>(Are they from the Awami League?)</small> \`party_al\` | **হ্যাঁ** | বিশেষ তথ্য |
| 14 | এই ব্যক্তি কি ২০২৬ সালে বাংলাদেশের প্রধানমন্ত্রীর রাজনৈতিক সহকারী হিসেবে নিয়োগ পান? <small>(Was this person appointed as Bangladesh's prime minister's political assistant in 2026?)</small> \`politics_pm_political_aide_2026\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 16 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 17 | এই ব্যক্তি কি বগুড়ায় সংসদীয় উপনির্বাচনে স্বতন্ত্র প্রার্থী হয়েছিলেন? <small>(Did this person contest parliamentary by-elections in Bogura as an independent candidate?)</small> \`politics_bogura_independent\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি জিয়াউর রহমানের পরিবারের? <small>(Are they in Ziaur Rahman's family?)</small> \`zia_family\` | **জানি না** | বিশেষ তথ্য |
| 19 | তিনি কি শেখ মুজিবের পরিবারের? <small>(Are they in Sheikh Mujib's family?)</small> \`mujib_family\` | **জানি না** | বিশেষ তথ্য |
| 20 | তিনি কি নির্বাসনে, বা দেশের বাইরে আছেন? <small>(Are they in exile, or living abroad?)</small> \`lives_abroad\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি কোনো সরকারি পদে ছিলেন (মন্ত্রী, প্রধানমন্ত্রী বা রাষ্ট্রপতি)? <small>(Have they held a government post (minister, prime minister, or president)?)</small> \`been_minister\` | **না** | বিশেষ তথ্য |
| 22 | তিনি কি প্রধানমন্ত্রী ছিলেন? <small>(Have they been Prime Minister?)</small> \`been_premier\` | **না** | বিশেষ তথ্য |

</details>

<details>
<summary>2. Dighi — ব্যর্থ · 23 প্রশ্ন · 8টি জানি না</summary>

**পরীক্ষার পরিচয়:** Prarthana Fardin Dighi। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **হ্যাঁ** | সাধারণ |
| 6 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **না** | সাধারণ |
| 7 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 8 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 9 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 10 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 11 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি ১৯৯০ সালের আগেই চলচ্চিত্রে পরিচিত তারকা হয়েছিলেন? <small>(Did they become a known film star before 1990?)</small> \`screen_star_pre1990\` | **না** | বিশেষ তথ্য |
| 13 | তিনি কি ১৯৯০ থেকে ১৯৯৯ সালের মধ্যে চলচ্চিত্রে পরিচিত তারকা হন? <small>(Did they become a known film star during 1990–1999?)</small> \`screen_star_1990s\` | **না** | বিশেষ তথ্য |
| 14 | তাঁর প্রথম চলচ্চিত্র কি ‘কেয়ামত থেকে কেয়ামত’? <small>(Was their debut film Keyamat Theke Keyamat?)</small> \`screen_first_film_keyamat\` | **জানি না** | বিশেষ তথ্য |
| 15 | এই অভিনেত্রী কি ‘কোটি টাকার কাবিন’ চলচ্চিত্রে প্রধান নারী চরিত্রে অভিনয় করেছিলেন? <small>(Did this actress play the female lead in Koti Takar Kabin?)</small> \`screen_apu_koti_takar_kabin\` | **জানি না** | বিশেষ তথ্য |
| 16 | এই অভিনেত্রী কি ‘কাল সকালে’ চলচ্চিত্র দিয়ে চলচ্চিত্রজীবন শুরু করেছিলেন? <small>(Did this actress begin her film career in Kal Shokale?)</small> \`screen_apu_kal_shokale\` | **জানি না** | বিশেষ তথ্য |
| 17 | এই অভিনেত্রী কি ‘বসগিরি’ চলচ্চিত্র দিয়ে বড় পর্দায় অভিষেক করেন? <small>(Did this actress make her film debut in Bossgiri?)</small> \`screen_bubly_bossgiri_debut\` | **জানি না** | বিশেষ তথ্য |
| 18 | এই অভিনেত্রী কি চলচ্চিত্রে আসার আগে টেলিভিশনে সংবাদ উপস্থাপনা করতেন? <small>(Did this actress work as a TV news presenter before entering films?)</small> \`screen_bubly_news_presenter\` | **জানি না** | বিশেষ তথ্য |
| 19 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 20 | তিনি কি ১৯৯৫ সালের আগে চলচ্চিত্রে অভিনয় শুরু করেন? <small>(Did they first appear in films before 1995?)</small> \`screen_film_debut_pre1995\` | **না** | বিশেষ তথ্য |
| 21 | তিনি কি ১০০টির বেশি পূর্ণদৈর্ঘ্য চলচ্চিত্রে অভিনয় করেছেন? <small>(Have they acted in more than 100 feature films?)</small> \`screen_over_100_films\` | **জানি না** | বিশেষ তথ্য |
| 22 | তিনি কি ২০০০ সালের পরেও চলচ্চিত্রে অভিনয় করেছেন? <small>(Did they act in feature films after the year 2000?)</small> \`screen_films_after_2000\` | **হ্যাঁ** | বিশেষ তথ্য |
| 23 | তিনি কি অভিনয়ের জন্য জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন? <small>(Have they won a Bangladesh National Film Award for acting?)</small> \`screen_national_film_award\` | **হ্যাঁ** | বিশেষ তথ্য |

</details>

<details>
<summary>3. Jaya Ahsan — ব্যর্থ · 22 প্রশ্ন · 7টি জানি না</summary>

**পরীক্ষার পরিচয়:** Jaya Ahsan। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **হ্যাঁ** | সাধারণ |
| 6 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **না** | সাধারণ |
| 7 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 8 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 10 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 11 | তিনি কি ১৯৯০ সালের আগেই চলচ্চিত্রে পরিচিত তারকা হয়েছিলেন? <small>(Did they become a known film star before 1990?)</small> \`screen_star_pre1990\` | **না** | বিশেষ তথ্য |
| 12 | তিনি কি ১৯৯০ থেকে ১৯৯৯ সালের মধ্যে চলচ্চিত্রে পরিচিত তারকা হন? <small>(Did they become a known film star during 1990–1999?)</small> \`screen_star_1990s\` | **না** | বিশেষ তথ্য |
| 13 | তাঁর প্রথম চলচ্চিত্র কি ‘কেয়ামত থেকে কেয়ামত’? <small>(Was their debut film Keyamat Theke Keyamat?)</small> \`screen_first_film_keyamat\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেত্রী কি ‘কোটি টাকার কাবিন’ চলচ্চিত্রে প্রধান নারী চরিত্রে অভিনয় করেছিলেন? <small>(Did this actress play the female lead in Koti Takar Kabin?)</small> \`screen_apu_koti_takar_kabin\` | **জানি না** | বিশেষ তথ্য |
| 15 | এই অভিনেত্রী কি ‘কাল সকালে’ চলচ্চিত্র দিয়ে চলচ্চিত্রজীবন শুরু করেছিলেন? <small>(Did this actress begin her film career in Kal Shokale?)</small> \`screen_apu_kal_shokale\` | **জানি না** | বিশেষ তথ্য |
| 16 | এই অভিনেত্রী কি ‘বসগিরি’ চলচ্চিত্র দিয়ে বড় পর্দায় অভিষেক করেন? <small>(Did this actress make her film debut in Bossgiri?)</small> \`screen_bubly_bossgiri_debut\` | **জানি না** | বিশেষ তথ্য |
| 17 | এই অভিনেত্রী কি চলচ্চিত্রে আসার আগে টেলিভিশনে সংবাদ উপস্থাপনা করতেন? <small>(Did this actress work as a TV news presenter before entering films?)</small> \`screen_bubly_news_presenter\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 19 | তিনি কি ১৯৯৫ সালের আগে চলচ্চিত্রে অভিনয় শুরু করেন? <small>(Did they first appear in films before 1995?)</small> \`screen_film_debut_pre1995\` | **না** | বিশেষ তথ্য |
| 20 | তিনি কি ১০০টির বেশি পূর্ণদৈর্ঘ্য চলচ্চিত্রে অভিনয় করেছেন? <small>(Have they acted in more than 100 feature films?)</small> \`screen_over_100_films\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি ২০০০ সালের পরেও চলচ্চিত্রে অভিনয় করেছেন? <small>(Did they act in feature films after the year 2000?)</small> \`screen_films_after_2000\` | **হ্যাঁ** | বিশেষ তথ্য |
| 22 | তিনি কি অভিনয়ের জন্য জাতীয় চলচ্চিত্র পুরস্কার পেয়েছেন? <small>(Have they won a Bangladesh National Film Award for acting?)</small> \`screen_national_film_award\` | **হ্যাঁ** | বিশেষ তথ্য |

</details>

<details>
<summary>4. Deb — ব্যর্থ · 24 প্রশ্ন · 10টি জানি না</summary>

**পরীক্ষার পরিচয়:** Dev Adhikari। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন? <small>(Did the actor marry for the third time in 2026?)</small> \`screen_india_third_marriage\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 22 | এই অভিনেতা কি ‘দঙ্গল’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন? <small>(Did the actor play the leading role in Dangal?)</small> \`screen_india_dangal\` | **জানি না** | বিশেষ তথ্য |
| 23 | এই অভিনেতা কি ঐতিহাসিক পতৌদি নবাব পরিবারের সদস্য? <small>(Does the actor belong to the historical Pataudi royal family?)</small> \`screen_india_pataudi_family\` | **জানি না** | বিশেষ তথ্য |
| 24 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>5. Jeet — ব্যর্থ · 24 প্রশ্ন · 10টি জানি না</summary>

**পরীক্ষার পরিচয়:** Jeet Madnani। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন? <small>(Did the actor marry for the third time in 2026?)</small> \`screen_india_third_marriage\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 22 | এই অভিনেতা কি ‘দঙ্গল’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন? <small>(Did the actor play the leading role in Dangal?)</small> \`screen_india_dangal\` | **জানি না** | বিশেষ তথ্য |
| 23 | এই অভিনেতা কি ঐতিহাসিক পতৌদি নবাব পরিবারের সদস্য? <small>(Does the actor belong to the historical Pataudi royal family?)</small> \`screen_india_pataudi_family\` | **জানি না** | বিশেষ তথ্য |
| 24 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>6. Narendra Modi — সঠিক Guess · 14 প্রশ্ন · 0টি জানি না</summary>

**পরীক্ষার পরিচয়:** Narendra Modi। **শেষ Guess:** Narendra Modi। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **না** | সাধারণ |
| 12 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 13 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **হ্যাঁ** | সাধারণ |
| 14 | তিনি কি সরকার প্রধান ছিলেন? <small>(Have they led a government?)</small> \`led_gov\` | **হ্যাঁ** | বিশেষ তথ্য |

</details>

<details>
<summary>7. Mashrafee Bin Mortaza — ব্যর্থ · 21 প্রশ্ন · 8টি জানি না</summary>

**পরীক্ষার পরিচয়:** Mashrafe Mortaza। **শেষ Guess:** Sajeeb Wazed। **ভুল Guess:** Sajeeb Wazed (17 প্রশ্নের পরে)।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **হ্যাঁ** | সাধারণ |
| 6 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি কোনো রাজনৈতিক দলের প্রধান? <small>(Are they the chief or leader of a political party?)</small> \`party_chief\` | **জানি না** | বিশেষ তথ্য |
| 8 | তিনি কি সরকার প্রধান ছিলেন? <small>(Have they led a government?)</small> \`led_gov\` | **না** | বিশেষ তথ্য |
| 9 | তিনি কি আওয়ামী লীগের? <small>(Are they from the Awami League?)</small> \`party_al\` | **হ্যাঁ** | বিশেষ তথ্য |
| 10 | তিনি কি শেখ মুজিবের পরিবারের? <small>(Are they in Sheikh Mujib's family?)</small> \`mujib_family\` | **জানি না** | বিশেষ তথ্য |
| 11 | এই ব্যক্তি কি আগে গণঅধিকার পরিষদের সাধারণ সম্পাদক ছিলেন? <small>(Did this person previously serve as the general secretary of Gono Odhikar Parishad?)</small> \`politics_gono_odhikar_gs\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি রাষ্ট্রপতি ছিলেন? <small>(Have they been President?)</small> \`head_of_state\` | **না** | বিশেষ তথ্য |
| 13 | তিনি কি জিয়াউর রহমানের পরিবারের? <small>(Are they in Ziaur Rahman's family?)</small> \`zia_family\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই ব্যক্তি কি ২০২৬ সালে বাংলাদেশের প্রধানমন্ত্রীর রাজনৈতিক সহকারী হিসেবে নিয়োগ পান? <small>(Was this person appointed as Bangladesh's prime minister's political assistant in 2026?)</small> \`politics_pm_political_aide_2026\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি নির্বাসনে, বা দেশের বাইরে আছেন? <small>(Are they in exile, or living abroad?)</small> \`lives_abroad\` | **জানি না** | বিশেষ তথ্য |
| 16 | তিনি কি কোনো সরকারি পদে ছিলেন (মন্ত্রী, প্রধানমন্ত্রী বা রাষ্ট্রপতি)? <small>(Have they held a government post (minister, prime minister, or president)?)</small> \`been_minister\` | **না** | বিশেষ তথ্য |
| 17 | এই ব্যক্তি কি বগুড়ায় সংসদীয় উপনির্বাচনে স্বতন্ত্র প্রার্থী হয়েছিলেন? <small>(Did this person contest parliamentary by-elections in Bogura as an independent candidate?)</small> \`politics_bogura_independent\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **হ্যাঁ** | মাঝারি |
| 19 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 20 | তিনি কি প্রধানমন্ত্রী ছিলেন? <small>(Have they been Prime Minister?)</small> \`been_premier\` | **না** | বিশেষ তথ্য |
| 21 | তিনি কি কোনো দলের মহাসচিব? <small>(Are they the secretary-general of a political party?)</small> \`party_secretary\` | **জানি না** | বিশেষ তথ্য |

</details>

<details>
<summary>8. Pinaki Bhattacharya — ব্যর্থ · 11 প্রশ্ন · 0টি জানি না</summary>

**পরীক্ষার পরিচয়:** Pinaki Bhattacharya। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **হ্যাঁ** | সাধারণ |
| 6 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **না** | সাধারণ |
| 7 | তিনি কি ক্রিকেট খেলেন? <small>(Do they play cricket?)</small> \`cricketer\` | **না** | সাধারণ |
| 8 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 9 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **না** | সাধারণ |
| 10 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **হ্যাঁ** | মাঝারি |
| 11 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>9. Koel Mallick — ব্যর্থ · 14 প্রশ্ন · 1টি জানি না</summary>

**পরীক্ষার পরিচয়:** Koel Mallick। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 14 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

<details>
<summary>10. Srabonti — ব্যর্থ · 14 প্রশ্ন · 1টি জানি না</summary>

**পরীক্ষার পরিচয়:** Srabanti Chatterjee। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 14 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

<details>
<summary>11. Ayusman Khurana — ব্যর্থ · 21 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Ayushmann Khurrana। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **হ্যাঁ** | মাঝারি |
| 20 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 21 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

<details>
<summary>12. Probhas — ব্যর্থ · 24 প্রশ্ন · 10টি জানি না</summary>

**পরীক্ষার পরিচয়:** Prabhas। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন? <small>(Did the actor marry for the third time in 2026?)</small> \`screen_india_third_marriage\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 22 | এই অভিনেতা কি ‘দঙ্গল’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন? <small>(Did the actor play the leading role in Dangal?)</small> \`screen_india_dangal\` | **জানি না** | বিশেষ তথ্য |
| 23 | এই অভিনেতা কি ঐতিহাসিক পতৌদি নবাব পরিবারের সদস্য? <small>(Does the actor belong to the historical Pataudi royal family?)</small> \`screen_india_pataudi_family\` | **জানি না** | বিশেষ তথ্য |
| 24 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>13. Ajay Devgan — ব্যর্থ · 23 প্রশ্ন · 7টি জানি না</summary>

**পরীক্ষার পরিচয়:** Ajay Devgn। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 14 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **হ্যাঁ** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন? <small>(Did the actor marry for the third time in 2026?)</small> \`screen_india_third_marriage\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি ব্যবসা করেন? <small>(Do they run a business?)</small> \`business\` | **হ্যাঁ** | মাঝারি |
| 22 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 23 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

<details>
<summary>14. Kajol — ব্যর্থ · 14 প্রশ্ন · 1টি জানি না</summary>

**পরীক্ষার পরিচয়:** Kajol। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 14 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

<details>
<summary>15. Akshay Kumar — ব্যর্থ · 25 প্রশ্ন · 10টি জানি না</summary>

**পরীক্ষার পরিচয়:** Akshay Kumar। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 10 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 13 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **হ্যাঁ** | বিশেষ তথ্য |
| 14 | তিনি কি নির্বাক চলচ্চিত্রের কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they famous for comedy in silent films?)</small> \`screen_silent_comedy\` | **জানি না** | বিশেষ তথ্য |
| 15 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 16 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 17 | এই অভিনেতা কি ‘কিং খান’ নামে বিশেষভাবে পরিচিত? <small>(Is the actor especially known by the nickname King Khan?)</small> \`screen_india_king_khan\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | এই অভিনেতা কি ‘দিলওয়ালে দুলহানিয়া লে জায়েঙ্গে’ চলচ্চিত্রে অভিনয় করেছেন? <small>(Did the actor star in Dilwale Dulhania Le Jayenge?)</small> \`screen_india_ddlj\` | **জানি না** | বিশেষ তথ্য |
| 21 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 22 | এই অভিনেতা কি ২০২৬ সালে তৃতীয়বার বিয়ে করেছেন? <small>(Did the actor marry for the third time in 2026?)</small> \`screen_india_third_marriage\` | **জানি না** | বিশেষ তথ্য |
| 23 | এই অভিনেতা কি ‘দঙ্গল’ চলচ্চিত্রে প্রধান চরিত্রে অভিনয় করেছেন? <small>(Did the actor play the leading role in Dangal?)</small> \`screen_india_dangal\` | **জানি না** | বিশেষ তথ্য |
| 24 | এই অভিনেতা কি ঐতিহাসিক পতৌদি নবাব পরিবারের সদস্য? <small>(Does the actor belong to the historical Pataudi royal family?)</small> \`screen_india_pataudi_family\` | **জানি না** | বিশেষ তথ্য |
| 25 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>16. Sunny Leone — ব্যর্থ · 17 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Sunny Leone। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 8 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 9 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 14 | তিনি কি কানাডার? <small>(Are they from Canada?)</small> \`from_ca\` | **হ্যাঁ** | সাধারণ |
| 15 | তিনি কি মূলত প্রাপ্তবয়স্ক চলচ্চিত্রের অভিনেতা? <small>(Are they mainly an adult-film actor?)</small> \`adult_ent\` | **হ্যাঁ** | সাধারণ |
| 16 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 17 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>17. Rocco Siffredi — ব্যর্থ · 21 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Rocco Siffredi। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 8 | তিনি কি যুক্তরাজ্যের? <small>(Are they from the United Kingdom?)</small> \`from_gb\` | **না** | সাধারণ |
| 9 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি ফ্রান্সের? <small>(Are they from France?)</small> \`from_fr\` | **না** | সাধারণ |
| 11 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **না** | সাধারণ |
| 12 | তিনি কি জার্মানির? <small>(Are they from Germany?)</small> \`from_de\` | **না** | মাঝারি |
| 13 | তিনি কি ইতালির? <small>(Are they from Italy?)</small> \`from_it\` | **হ্যাঁ** | সাধারণ |
| 14 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 15 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **জানি না** | বিশেষ তথ্য |
| 16 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 17 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 18 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 19 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 20 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 21 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>18. Minami Ozawa — ব্যর্থ · 21 প্রশ্ন · 7টি জানি না</summary>

**পরীক্ষার পরিচয়:** Minami Ozawa (Japanese voice actress)। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 8 | তিনি কি এশিয়ার? <small>(Is the person from Asia?)</small> \`from_asia\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি ভারতের? <small>(Are they from India?)</small> \`from_in\` | **না** | সাধারণ |
| 10 | তিনি কি জাপানের? <small>(Are they from Japan?)</small> \`from_jp\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 12 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 13 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 14 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 15 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 16 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **জানি না** | বিশেষ তথ্য |
| 17 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 18 | তিনি কি ব্যবসা করেন? <small>(Do they run a business?)</small> \`business\` | **জানি না** | মাঝারি |
| 19 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 20 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 21 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>19. Dani Dainels — ব্যর্থ · 19 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Dani Daniels। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 8 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 9 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 14 | তিনি কি কানাডার? <small>(Are they from Canada?)</small> \`from_ca\` | **না** | সাধারণ |
| 15 | তিনি কি মেক্সিকোর? <small>(Are they from Mexico?)</small> \`from_mx\` | **না** | মাঝারি |
| 16 | তিনি কি মূলত প্রাপ্তবয়স্ক চলচ্চিত্রের অভিনেতা? <small>(Are they mainly an adult-film actor?)</small> \`adult_ent\` | **হ্যাঁ** | সাধারণ |
| 17 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 18 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 19 | তিনি কি যুক্তরাষ্ট্রের? <small>(Are they from the United States?)</small> \`from_us\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>20. Mia Khalifa — ব্যর্থ · 19 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Mia Khalifa। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 8 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 9 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **জানি না** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 14 | তিনি কি কানাডার? <small>(Are they from Canada?)</small> \`from_ca\` | **না** | সাধারণ |
| 15 | তিনি কি মেক্সিকোর? <small>(Are they from Mexico?)</small> \`from_mx\` | **না** | মাঝারি |
| 16 | তিনি কি মূলত প্রাপ্তবয়স্ক চলচ্চিত্রের অভিনেতা? <small>(Are they mainly an adult-film actor?)</small> \`adult_ent\` | **হ্যাঁ** | সাধারণ |
| 17 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 18 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 19 | তিনি কি যুক্তরাষ্ট্রের? <small>(Are they from the United States?)</small> \`from_us\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>21. Vlademir Putin — ব্যর্থ · 26 প্রশ্ন · 7টি জানি না</summary>

**পরীক্ষার পরিচয়:** Vladimir Putin। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি ফুটবল খেলেন? <small>(Do they play football?)</small> \`footballer\` | **না** | সাধারণ |
| 8 | তিনি কি যুক্তরাজ্যের? <small>(Are they from the United Kingdom?)</small> \`from_gb\` | **না** | সাধারণ |
| 9 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি ফ্রান্সের? <small>(Are they from France?)</small> \`from_fr\` | **না** | সাধারণ |
| 11 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি রাশিয়ার? <small>(Are they from Russia?)</small> \`from_ru\` | **হ্যাঁ** | সাধারণ |
| 13 | তিনি কি বিজ্ঞানী? <small>(Are they a scientist?)</small> \`scientist\` | **না** | মাঝারি |
| 14 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 15 | তিনি কি ব্যবসা করেন? <small>(Do they run a business?)</small> \`business\` | **জানি না** | মাঝারি |
| 16 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 17 | তিনি কি সরকার প্রধান ছিলেন? <small>(Have they led a government?)</small> \`led_gov\` | **হ্যাঁ** | বিশেষ তথ্য |
| 18 | তিনি কি নির্বাসনে, বা দেশের বাইরে আছেন? <small>(Are they in exile, or living abroad?)</small> \`lives_abroad\` | **না** | বিশেষ তথ্য |
| 19 | তিনি কি কোনো সরকারি পদে ছিলেন (মন্ত্রী, প্রধানমন্ত্রী বা রাষ্ট্রপতি)? <small>(Have they held a government post (minister, prime minister, or president)?)</small> \`been_minister\` | **হ্যাঁ** | বিশেষ তথ্য |
| 20 | তিনি কি প্রধানমন্ত্রী ছিলেন? <small>(Have they been Prime Minister?)</small> \`been_premier\` | **হ্যাঁ** | বিশেষ তথ্য |
| 21 | তিনি কি রাষ্ট্রপতি ছিলেন? <small>(Have they been President?)</small> \`head_of_state\` | **হ্যাঁ** | বিশেষ তথ্য |
| 22 | তিনি কি কোনো রাজনৈতিক দলের প্রধান? <small>(Are they the chief or leader of a political party?)</small> \`party_chief\` | **জানি না** | বিশেষ তথ্য |
| 23 | তিনি কি কোনো দলের মহাসচিব? <small>(Are they the secretary-general of a political party?)</small> \`party_secretary\` | **জানি না** | বিশেষ তথ্য |
| 24 | এই ব্যক্তি কি আগে গণঅধিকার পরিষদের সাধারণ সম্পাদক ছিলেন? <small>(Did this person previously serve as the general secretary of Gono Odhikar Parishad?)</small> \`politics_gono_odhikar_gs\` | **জানি না** | বিশেষ তথ্য |
| 25 | এই ব্যক্তি কি ২০২৬ সালে বাংলাদেশের প্রধানমন্ত্রীর রাজনৈতিক সহকারী হিসেবে নিয়োগ পান? <small>(Was this person appointed as Bangladesh's prime minister's political assistant in 2026?)</small> \`politics_pm_political_aide_2026\` | **জানি না** | বিশেষ তথ্য |
| 26 | এই ব্যক্তি কি বগুড়ায় সংসদীয় উপনির্বাচনে স্বতন্ত্র প্রার্থী হয়েছিলেন? <small>(Did this person contest parliamentary by-elections in Bogura as an independent candidate?)</small> \`politics_bogura_independent\` | **জানি না** | বিশেষ তথ্য |

</details>

<details>
<summary>22. Donald Trump — ব্যর্থ · 25 প্রশ্ন · 6টি জানি না</summary>

**পরীক্ষার পরিচয়:** Donald Trump। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **হ্যাঁ** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **না** | সাধারণ |
| 7 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **হ্যাঁ** | সাধারণ |
| 8 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 9 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **না** | সাধারণ |
| 10 | তিনি কি বিজ্ঞানী? <small>(Are they a scientist?)</small> \`scientist\` | **না** | মাঝারি |
| 11 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 12 | তিনি কি রাজনীতি করেন? <small>(Are they in politics?)</small> \`politician\` | **হ্যাঁ** | সাধারণ |
| 13 | তিনি কি ব্যবসা করেন? <small>(Do they run a business?)</small> \`business\` | **হ্যাঁ** | মাঝারি |
| 14 | তিনি কি যুক্তরাষ্ট্রের? <small>(Are they from the United States?)</small> \`from_us\` | **হ্যাঁ** | সাধারণ |
| 15 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 16 | তিনি কি সরকার প্রধান ছিলেন? <small>(Have they led a government?)</small> \`led_gov\` | **হ্যাঁ** | বিশেষ তথ্য |
| 17 | তিনি কি নির্বাসনে, বা দেশের বাইরে আছেন? <small>(Are they in exile, or living abroad?)</small> \`lives_abroad\` | **না** | বিশেষ তথ্য |
| 18 | তিনি কি কোনো সরকারি পদে ছিলেন (মন্ত্রী, প্রধানমন্ত্রী বা রাষ্ট্রপতি)? <small>(Have they held a government post (minister, prime minister, or president)?)</small> \`been_minister\` | **হ্যাঁ** | বিশেষ তথ্য |
| 19 | তিনি কি প্রধানমন্ত্রী ছিলেন? <small>(Have they been Prime Minister?)</small> \`been_premier\` | **না** | বিশেষ তথ্য |
| 20 | তিনি কি রাষ্ট্রপতি ছিলেন? <small>(Have they been President?)</small> \`head_of_state\` | **হ্যাঁ** | বিশেষ তথ্য |
| 21 | তিনি কি কোনো রাজনৈতিক দলের প্রধান? <small>(Are they the chief or leader of a political party?)</small> \`party_chief\` | **জানি না** | বিশেষ তথ্য |
| 22 | তিনি কি কোনো দলের মহাসচিব? <small>(Are they the secretary-general of a political party?)</small> \`party_secretary\` | **জানি না** | বিশেষ তথ্য |
| 23 | এই ব্যক্তি কি আগে গণঅধিকার পরিষদের সাধারণ সম্পাদক ছিলেন? <small>(Did this person previously serve as the general secretary of Gono Odhikar Parishad?)</small> \`politics_gono_odhikar_gs\` | **জানি না** | বিশেষ তথ্য |
| 24 | এই ব্যক্তি কি ২০২৬ সালে বাংলাদেশের প্রধানমন্ত্রীর রাজনৈতিক সহকারী হিসেবে নিয়োগ পান? <small>(Was this person appointed as Bangladesh's prime minister's political assistant in 2026?)</small> \`politics_pm_political_aide_2026\` | **জানি না** | বিশেষ তথ্য |
| 25 | এই ব্যক্তি কি বগুড়ায় সংসদীয় উপনির্বাচনে স্বতন্ত্র প্রার্থী হয়েছিলেন? <small>(Did this person contest parliamentary by-elections in Bogura as an independent candidate?)</small> \`politics_bogura_independent\` | **জানি না** | বিশেষ তথ্য |

</details>

<details>
<summary>23. Stacy Martin — ব্যর্থ · 17 প্রশ্ন · 5টি জানি না</summary>

**পরীক্ষার পরিচয়:** Stacy Martin। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **হ্যাঁ** | সাধারণ |
| 8 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 10 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 11 | তিনি কি যুক্তরাজ্যের? <small>(Are they from the United Kingdom?)</small> \`from_gb\` | **সম্ভবত হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 13 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 14 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 15 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 16 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 17 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>24. Seednew Sweeney — ব্যর্থ · 19 প্রশ্ন · 5টি জানি না</summary>

**পরীক্ষার পরিচয়:** Sydney Sweeney। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **হ্যাঁ** | সাধারণ |
| 7 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 8 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 9 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 10 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 11 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 12 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 13 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 14 | তিনি কি কানাডার? <small>(Are they from Canada?)</small> \`from_ca\` | **না** | সাধারণ |
| 15 | তিনি কি মেক্সিকোর? <small>(Are they from Mexico?)</small> \`from_mx\` | **না** | মাঝারি |
| 16 | তিনি কি মূলত প্রাপ্তবয়স্ক চলচ্চিত্রের অভিনেতা? <small>(Are they mainly an adult-film actor?)</small> \`adult_ent\` | **না** | সাধারণ |
| 17 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |
| 18 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 19 | তিনি কি যুক্তরাষ্ট্রের? <small>(Are they from the United States?)</small> \`from_us\` | **হ্যাঁ** | সাধারণ |

</details>

<details>
<summary>25. Kate Winstlet — ব্যর্থ · 17 প্রশ্ন · 5টি জানি না</summary>

**পরীক্ষার পরিচয়:** Kate Winslet। **শেষ Guess:** সঠিক নামের Guess আসেনি। **ভুল Guess:** নেই।

| # | প্রশ্ন—বাংলা ও ইংরেজি | উত্তর | কঠিনতা |
|---:|---|---|---|
| 1 | এ কি সত্যিকারের মানুষ? <small>(Is this a real person?)</small> \`real\` | **হ্যাঁ** | সাধারণ |
| 2 | এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন? <small>(Does this person know you personally?)</small> \`knows_you\` | **না** | সাধারণ |
| 3 | সে কি পুরুষ? <small>(Are they a man?)</small> \`male\` | **না** | সাধারণ |
| 4 | সে কি এখন বেঁচে আছেন? <small>(Are they alive?)</small> \`alive\` | **হ্যাঁ** | সাধারণ |
| 5 | তিনি কি বাংলাদেশের? <small>(Are they from Bangladesh?)</small> \`from_bd\` | **না** | সাধারণ |
| 6 | তিনি কি উত্তর আমেরিকার? <small>(Is the person from North America?)</small> \`from_north_america\` | **না** | সাধারণ |
| 7 | তিনি কি ইউরোপের? <small>(Is the person from Europe?)</small> \`from_europe\` | **হ্যাঁ** | সাধারণ |
| 8 | তিনি কি অভিনয় করেন? <small>(Do they act?)</small> \`actor\` | **হ্যাঁ** | সাধারণ |
| 9 | তিনি কি সাধারণত প্রধান নায়ক বা মুখ্য চরিত্রে অভিনয় করতেন? <small>(Did they usually play the main hero or leading character?)</small> \`screen_role_lead\` | **হ্যাঁ** | বিশেষ তথ্য |
| 10 | তিনি কি বিশেষভাবে কৌতুকাভিনয়ের জন্য পরিচিত? <small>(Were they particularly known for comic acting?)</small> \`screen_role_comedy\` | **জানি না** | বিশেষ তথ্য |
| 11 | তিনি কি যুক্তরাজ্যের? <small>(Are they from the United Kingdom?)</small> \`from_gb\` | **হ্যাঁ** | সাধারণ |
| 12 | তিনি কি সংগীত করেন? <small>(Do they make music?)</small> \`musician\` | **জানি না** | মাঝারি |
| 13 | তিনি কি গান করেন? <small>(Do they sing?)</small> \`singer\` | **জানি না** | মাঝারি |
| 14 | তিনি কি লেখেন? <small>(Do they write?)</small> \`writer\` | **জানি না** | মাঝারি |
| 15 | তিনি কি সিনেমা পরিচালনা করেন? <small>(Do they direct films?)</small> \`director\` | **জানি না** | মাঝারি |
| 16 | এর কি নিজের নাম আছে? <small>(Does it have its own name?)</small> \`named\` | **হ্যাঁ** | সাধারণ |
| 17 | তিনি কি খেলাধুলা করেন? <small>(Do they play a sport?)</small> \`athlete\` | **না** | মাঝারি |

</details>

---

**সতর্কতা:** এখানে রিপোর্ট করা Guess-গুলো প্রকৃত গেমের সিদ্ধান্ত। প্রশ্নের উত্তরের একটি অংশ সতর্কভাবে প্রস্তুত করা public-knowledge simulation; কোনো অযাচাইকৃত জীবনীমূলক তথ্যকে নির্ভুল বলে দাবি করা হচ্ছে না। সংশ্লিষ্ট পরীক্ষায় গেমের production engine, casebook, CSS, artwork, menu বা live website পরিবর্তন করা হয়নি। QA-only PR #607 main-এ merge করা হয়নি।
