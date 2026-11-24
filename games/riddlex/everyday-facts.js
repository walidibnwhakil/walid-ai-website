// Broad reusable object-function taxonomy. No direct if(name) guess rules.
// Facts are basic observable everyday uses; unidentified objects remain UNKNOWN.
// The specific examples supplement—not replace—the millions of packed records.
export const EVERYDAY_QUESTIONS = Object.freeze([
  {
    "id": "obj_family_electric",
    "group": "object",
    "parent": "object",
    "en": "Does this item normally use electrical power?",
    "bn": "এটি কি সাধারণত বিদ্যুতে চলে?"
  },
  {
    "id": "obj_family_kitchen",
    "group": "object",
    "parent": "object",
    "en": "Is this item ordinarily used in a kitchen or while serving food?",
    "bn": "এটি কি সাধারণত রান্নাঘর বা খাবার পরিবেশনে ব্যবহার হয়?"
  },
  {
    "id": "obj_family_container",
    "group": "object",
    "parent": "object",
    "en": "Is it a container for holding or carrying something?",
    "bn": "এটি কি কিছু ধরে বা বহন করার পাত্র?"
  },
  {
    "id": "obj_family_personal_care",
    "group": "object",
    "parent": "object",
    "en": "Is it commonly used for grooming, fragrance or skin care?",
    "bn": "এটি কি শরীরের যত্ন, প্রসাধন বা সুগন্ধির কাজে ব্যবহার হয়?"
  },
  {
    "id": "obj_family_worn",
    "group": "object",
    "parent": "object",
    "en": "Is it normally worn on the head, face, ear, nose or body?",
    "bn": "এটি কি সাধারণত মাথা, মুখ, কান, নাক বা শরীরে পরা হয়?"
  },
  {
    "id": "obj_family_paper",
    "group": "object",
    "parent": "object",
    "en": "Is it typically made of paper with pages, sheets, or printed dates?",
    "bn": "এটি কি সাধারণত কাগজের পাতা, শিট বা ছাপা তারিখ নিয়ে তৈরি?"
  },
  {
    "id": "obj_family_house",
    "group": "object",
    "parent": "object",
    "en": "Is it part of a building's opening, such as a door or window?",
    "bn": "এটি কি ঘরের দরজা বা জানালার মতো স্থায়ী অংশ?"
  },
  {
    "id": "obj_family_lock",
    "group": "object",
    "parent": "object",
    "en": "Is it used to lock or unlock something?",
    "bn": "এটি কি কোনো কিছু তালাবদ্ধ করতে বা খুলতে ব্যবহার হয়?"
  },
  {
    "id": "obj_family_cleaning",
    "group": "object",
    "parent": "object",
    "en": "Is its usual purpose cleaning, wiping or sweeping?",
    "bn": "এটি কি পরিষ্কার, মোছা বা ঝাড়ু দেওয়ার কাজে ব্যবহার হয়?"
  },
  {
    "id": "obj_family_medicine",
    "group": "object",
    "parent": "object",
    "en": "Is this something swallowed as a medicine?",
    "bn": "এটি কি মুখে খাওয়ার ওষুধ?"
  },
  {
    "id": "obj_family_climbing",
    "group": "object",
    "parent": "object",
    "en": "Is its purpose to help someone climb to a higher place?",
    "bn": "এটি কি উঁচু স্থানে ওঠার কাজে ব্যবহার হয়?"
  },
  {
    "id": "obj_family_prayer",
    "group": "object",
    "parent": "object",
    "en": "Is this a mat specifically used during prayer?",
    "bn": "এটি কি নামাজের জন্য ব্যবহৃত বিছানো জায়নামাজ?"
  },
  {
    "id": "obj_family_consumable",
    "group": "object",
    "parent": "object",
    "en": "Is this commonly consumed as part of food or drink?",
    "bn": "এটি কি খাবার বা পানীয়ের অংশ হিসেবে খাওয়া হয়?"
  },
  {
    "id": "obj_family_financial",
    "group": "object",
    "parent": "object",
    "en": "Is this a place or institution providing banking services?",
    "bn": "এটি কি ব্যাংকিং সেবা দেওয়ার প্রতিষ্ঠান বা স্থান?"
  },
  {
    "id": "obj_family_waste",
    "group": "object",
    "parent": "object",
    "en": "Is this bodily waste rather than a manufactured product?",
    "bn": "এটি কি কোনো তৈরি পণ্য নয়, বরং শরীরের বর্জ্য?"
  },
  {
    "id": "obj_computes_data",
    "group": "object",
    "parent": "obj_family_electric",
    "en": "Does it process digital information using a computer operating system?",
    "bn": "এটি কি কম্পিউটার অপারেটিং সিস্টেমে ডিজিটাল তথ্য প্রক্রিয়াকরণ করে?"
  },
  {
    "id": "obj_shows_television",
    "group": "object",
    "parent": "obj_family_electric",
    "en": "Is its main role displaying television programmes or video to viewers?",
    "bn": "এটির প্রধান কাজ কি দর্শককে টিভি অনুষ্ঠান বা ভিডিও দেখানো?"
  },
  {
    "id": "obj_amplifies_sound",
    "group": "object",
    "parent": "obj_family_electric",
    "en": "Does it primarily play or amplify sound through a loudspeaker?",
    "bn": "এটি কি মূলত স্পিকারের মাধ্যমে শব্দ বাজায় বা জোরালো করে?"
  },
  {
    "id": "obj_remote_control",
    "group": "object",
    "parent": "obj_family_electric",
    "en": "Is it a handheld device for controlling a separate electronic appliance?",
    "bn": "এটি কি অন্য বৈদ্যুতিক যন্ত্র নিয়ন্ত্রণের হাতে ধরা রিমোট?"
  },
  {
    "id": "obj_recharges_battery",
    "group": "object",
    "parent": "obj_family_electric",
    "en": "Does its main job involve supplying power to recharge another device?",
    "bn": "এটি কি অন্য যন্ত্রের ব্যাটারি চার্জ দেওয়ার কাজে ব্যবহৃত হয়?"
  },
  {
    "id": "obj_blends_liquids",
    "group": "object",
    "parent": "obj_family_kitchen",
    "en": "Does it blend or puree food with a fast rotating blade in a jar?",
    "bn": "এটি কি পাত্রে ঘূর্ণায়মান ব্লেড দিয়ে খাবার বা তরল ব্লেন্ড করে?"
  },
  {
    "id": "obj_whisks_mixture",
    "group": "object",
    "parent": "obj_family_kitchen",
    "en": "Does it mix or beat batter or ingredients using beaters?",
    "bn": "এটি কি বিটার দিয়ে বাটা বা খাবারের উপাদান ফেটায় বা মেশায়?"
  },
  {
    "id": "obj_drinking_glass",
    "group": "object",
    "parent": "obj_family_container",
    "en": "Is it an open drinking vessel normally held while taking a sip?",
    "bn": "এটি কি পান করার সময় হাতে ধরা খোলা গ্লাস?"
  },
  {
    "id": "obj_sealable_bottle",
    "group": "object",
    "parent": "obj_family_container",
    "en": "Is it a portable bottle normally closed by a cap or stopper?",
    "bn": "এটি কি মুখ বন্ধ করার ঢাকনাযুক্ত বহনযোগ্য বোতল?"
  },
  {
    "id": "obj_food_plate",
    "group": "object",
    "parent": "obj_family_kitchen",
    "en": "Is this a relatively flat dish for eating or serving a meal?",
    "bn": "এটি কি খাবার খাওয়া বা পরিবেশনের সমতল থালা?"
  },
  {
    "id": "obj_carries_items",
    "group": "object",
    "parent": "obj_family_container",
    "en": "Is its main use carrying belongings in a bag?",
    "bn": "এটি কি ব্যাগে জিনিসপত্র বহন করার কাজে ব্যবহার হয়?"
  },
  {
    "id": "obj_stores_cooking_gas",
    "group": "object",
    "parent": "obj_family_container",
    "en": "Is it a cylinder that stores pressurised fuel gas for cooking?",
    "bn": "এটি কি রান্নার জন্য চাপযুক্ত গ্যাস রাখা সিলিন্ডার?"
  },
  {
    "id": "obj_skin_perfume",
    "group": "object",
    "parent": "obj_family_personal_care",
    "en": "Is its principal purpose applying a fragrance or perfume?",
    "bn": "এটি কি মূলত সুগন্ধি লাগানোর জন্য ব্যবহার হয়?"
  },
  {
    "id": "obj_skin_moisturizer",
    "group": "object",
    "parent": "obj_family_personal_care",
    "en": "Is it applied to the skin to moisturise or protect it?",
    "bn": "এটি কি ত্বক আর্দ্র বা সুরক্ষিত রাখতে লাগানো হয়?"
  },
  {
    "id": "obj_skin_cream",
    "group": "object",
    "parent": "obj_skin_moisturizer",
    "en": "Does this skin product usually have the texture of a cream rather than a pourable lotion?",
    "bn": "এটি কি ঢেলে নেওয়া যায় এমন লোশনের বদলে তুলনামূলক ঘন ক্রিম?"
  },
  {
    "id": "obj_skin_lotion",
    "group": "object",
    "parent": "obj_skin_moisturizer",
    "en": "Is this usually a pourable liquid or light lotion applied on skin?",
    "bn": "এটি কি ত্বকে লাগানোর পাতলা তরল বা লোশন?"
  },
  {
    "id": "obj_skin_jelly",
    "group": "object",
    "parent": "obj_skin_moisturizer",
    "en": "Is it a petroleum-jelly-type semi-solid ointment?",
    "bn": "এটি কি পেট্রোলিয়াম জেলির মতো আধা-ঘন পদার্থ?"
  },
  {
    "id": "obj_ear_jewellery",
    "group": "object",
    "parent": "obj_family_worn",
    "en": "Is it jewellery specifically worn in the ear?",
    "bn": "এটি কি কানে পরার গয়না?"
  },
  {
    "id": "obj_nose_jewellery",
    "group": "object",
    "parent": "obj_family_worn",
    "en": "Is it jewellery specifically worn through or on the nose?",
    "bn": "এটি কি নাকে পরার গয়না?"
  },
  {
    "id": "obj_forehead_dot",
    "group": "object",
    "parent": "obj_family_worn",
    "en": "Is it a decorative dot or bindi placed on the forehead?",
    "bn": "এটি কি কপালে পরার টিপ বা বিন্দু?"
  },
  {
    "id": "obj_cap_head",
    "group": "object",
    "parent": "obj_family_worn",
    "en": "Is this a cap or hat worn on the head?",
    "bn": "এটি কি মাথায় পরার টুপি?"
  },
  {
    "id": "obj_reference_dictionary",
    "group": "object",
    "parent": "obj_family_paper",
    "en": "Does this book define or translate words, usually alphabetically?",
    "bn": "এটি কি শব্দের অর্থ বা অনুবাদ দেখার অভিধান?"
  },
  {
    "id": "obj_personal_diary",
    "group": "object",
    "parent": "obj_family_paper",
    "en": "Is this a book mainly used to record personal notes or daily events?",
    "bn": "এটি কি ব্যক্তিগত নোট বা দৈনন্দিন ঘটনা লেখার ডায়েরি?"
  },
  {
    "id": "obj_dates_calendar",
    "group": "object",
    "parent": "obj_family_paper",
    "en": "Is this a calendar primarily for displaying dates, months and days?",
    "bn": "এটি কি তারিখ, মাস ও দিন দেখানোর ক্যালেন্ডার?"
  },
  {
    "id": "obj_wiping_tissue",
    "group": "object",
    "parent": "obj_family_cleaning",
    "en": "Is it disposable soft tissue paper used for wiping?",
    "bn": "এটি কি মোছার কাজে ব্যবহৃত নরম একবার-ব্যবহারযোগ্য টিস্যু?"
  },
  {
    "id": "obj_sweeping_broom",
    "group": "object",
    "parent": "obj_family_cleaning",
    "en": "Does it use bundled bristles or fibres to sweep the floor?",
    "bn": "এটি কি তন্তু বা ঝাড়ুর শলা দিয়ে মেঝে ঝাড়ু দেয়?"
  },
  {
    "id": "obj_room_door",
    "group": "object",
    "parent": "obj_family_house",
    "en": "Is it a hinged or sliding barrier used for entering a room?",
    "bn": "এটি কি ঘরে ঢোকা বা বের হওয়ার দরজা?"
  },
  {
    "id": "obj_glazed_window",
    "group": "object",
    "parent": "obj_family_house",
    "en": "Is it a window letting light or air into a building?",
    "bn": "এটি কি আলো বা বাতাস ঢোকার জানালা?"
  },
  {
    "id": "obj_metal_key",
    "group": "object",
    "parent": "obj_family_lock",
    "en": "Is it a small key inserted or used to operate a lock?",
    "bn": "এটি কি তালা খোলার চাবি?"
  },
  {
    "id": "obj_padlock",
    "group": "object",
    "parent": "obj_family_lock",
    "en": "Is it a removable padlock that fastens with a shackle?",
    "bn": "এটি কি ধাতব শিকল বা আংটাযুক্ত বহনযোগ্য তালা?"
  },
  {
    "id": "obj_oral_tablet",
    "group": "object",
    "parent": "obj_family_medicine",
    "en": "Is it a compressed pill or tablet intended as medicine?",
    "bn": "এটি কি খাওয়ার ওষুধের ট্যাবলেট বা বড়ি?"
  },
  {
    "id": "obj_climbing_ladder",
    "group": "object",
    "parent": "obj_family_climbing",
    "en": "Does it have a series of steps or rungs for climbing?",
    "bn": "এটিতে কি ওপরে ওঠার জন্য ধাপ বা সিঁড়ির মতো পা রাখার জায়গা আছে?"
  },
  {
    "id": "obj_prayer_mat",
    "group": "object",
    "parent": "obj_family_prayer",
    "en": "Is it rolled or laid flat as a dedicated prayer mat?",
    "bn": "এটি কি নামাজের জন্য বিছানো বা গুটানো যায় এমন জায়নামাজ?"
  },
  {
    "id": "obj_table_salt",
    "group": "object",
    "parent": "obj_family_consumable",
    "en": "Is it the familiar salt added to food for seasoning?",
    "bn": "এটি কি খাবারে স্বাদ বাড়াতে ব্যবহৃত লবণ?"
  },
  {
    "id": "obj_banking_service",
    "group": "object",
    "parent": "obj_family_financial",
    "en": "Does it accept deposits or provide financial account services?",
    "bn": "এটি কি আমানত নেওয়া বা ব্যাংক হিসাবের সেবা দেয়?"
  },
  {
    "id": "obj_fecal_matter",
    "group": "object",
    "parent": "obj_family_waste",
    "en": "Is it faeces or stool produced by digestion?",
    "bn": "এটি কি পরিপাকের ফলে তৈরি মল?"
  }
,
  {
    "id": "obj_reading_book",
    "group": "object",
    "parent": "obj_family_paper",
    "en": "Is it mainly a bound collection of pages intended for reading, rather than a dictionary, diary or calendar?",
    "bn": "এটি কি অভিধান, ডায়েরি বা ক্যালেন্ডার নয়, মূলত পড়ার জন্য বাঁধাই করা পাতার সমষ্টি?"
  }
]);
export const EVERYDAY_OBJECTS = Object.freeze([
  {
    "id": "everyday-computer",
    "en": "Computer",
    "bn": "কম্পিউটার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "tool",
      "obj_family_electric",
      "obj_computes_data"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Personal computer",
      "Desktop computer"
    ]
  },
  {
    "id": "everyday-tv",
    "en": "TV",
    "bn": "টিভি",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "obj_family_electric",
      "obj_shows_television"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Television",
      "Television set"
    ]
  },
  {
    "id": "everyday-glass",
    "en": "Glass",
    "bn": "গ্লাস",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "container",
      "handheld",
      "kitchen",
      "obj_family_kitchen",
      "obj_family_container",
      "obj_drinking_glass"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Drinking glass",
      "Drinking cup"
    ]
  },
  {
    "id": "everyday-tissue",
    "en": "Tissue",
    "bn": "টিস্যু",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "soft",
      "obj_family_paper",
      "obj_family_cleaning",
      "obj_wiping_tissue"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Tissue paper",
      "Facial tissue"
    ]
  },
  {
    "id": "everyday-medicine-tablet",
    "en": "Tablet (medicine)",
    "bn": "ওষুধের ট্যাবলেট",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "pocket",
      "obj_family_medicine",
      "obj_oral_tablet"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Tablet",
      "Pill",
      "Medicine tablet"
    ]
  },
  {
    "id": "everyday-ladder",
    "en": "Ladder",
    "bn": "মই",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "tool",
      "obj_family_climbing",
      "obj_climbing_ladder"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Stepladder"
    ]
  },
  {
    "id": "everyday-perfume",
    "en": "Perfume",
    "bn": "সুগন্ধি",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "obj_family_personal_care",
      "obj_skin_perfume"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Fragrance",
      "Perfume spray"
    ]
  },
  {
    "id": "everyday-feces",
    "en": "Feces",
    "bn": "মল",
    "pop": 180,
    "yes": [
      "object",
      "soft",
      "obj_family_waste",
      "obj_fecal_matter"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Faeces",
      "Poop",
      "Stool (feces)",
      "Human excrement"
    ]
  },
  {
    "id": "everyday-earring",
    "en": "Earring",
    "bn": "কানের দুল",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "clothing",
      "handheld",
      "obj_family_worn",
      "obj_ear_jewellery"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Ear ring"
    ]
  },
  {
    "id": "everyday-nosering",
    "en": "Nose ring",
    "bn": "নাকফুল",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "clothing",
      "handheld",
      "obj_family_worn",
      "obj_nose_jewellery"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Nose pin"
    ]
  },
  {
    "id": "everyday-bindi",
    "en": "Bindi",
    "bn": "কপালের টিপ",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "clothing",
      "handheld",
      "obj_family_worn",
      "obj_forehead_dot"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Forehead bindi",
      "Tika"
    ]
  },
  {
    "id": "everyday-calendar",
    "en": "Calendar",
    "bn": "ক্যালেন্ডার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "obj_family_paper",
      "obj_dates_calendar"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Calender"
    ]
  },
  {
    "id": "everyday-blender",
    "en": "Blender",
    "bn": "ব্লেন্ডার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "kitchen",
      "cooking",
      "tool",
      "obj_family_electric",
      "obj_family_kitchen",
      "obj_blends_liquids"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Food blender",
      "Juice blender"
    ]
  },
  {
    "id": "everyday-mixer",
    "en": "Mixer",
    "bn": "মিক্সার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "kitchen",
      "cooking",
      "tool",
      "obj_family_electric",
      "obj_family_kitchen",
      "obj_whisks_mixture"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Kitchen mixer",
      "Electric mixer"
    ]
  },
  {
    "id": "everyday-cream",
    "en": "Cream",
    "bn": "ক্রিম",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "soft",
      "obj_family_personal_care",
      "obj_skin_moisturizer",
      "obj_skin_cream"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Skin cream",
      "Moisturizing cream",
      "Face cream"
    ]
  },
  {
    "id": "everyday-lotion",
    "en": "Lotion",
    "bn": "লোশন",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "obj_family_personal_care",
      "obj_skin_moisturizer",
      "obj_skin_lotion"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Body lotion",
      "Moisturizing lotion"
    ]
  },
  {
    "id": "everyday-vaseline",
    "en": "Vaseline",
    "bn": "ভ্যাসলিন",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "soft",
      "obj_family_personal_care",
      "obj_skin_moisturizer",
      "obj_skin_jelly"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Petroleum jelly"
    ]
  },
  {
    "id": "everyday-door",
    "en": "Door",
    "bn": "দরজা",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "obj_family_house",
      "obj_room_door"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Doorway door"
    ]
  },
  {
    "id": "everyday-window",
    "en": "Window",
    "bn": "জানালা",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "obj_family_house",
      "obj_glazed_window"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "House window"
    ]
  },
  {
    "id": "everyday-bag",
    "en": "Bag",
    "bn": "ব্যাগ",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "container",
      "handheld",
      "obj_family_container",
      "obj_carries_items"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Backpack",
      "Handbag"
    ]
  },
  {
    "id": "everyday-key",
    "en": "Key",
    "bn": "চাবি",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "metal",
      "tool",
      "obj_family_lock",
      "obj_metal_key"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Door key"
    ]
  },
  {
    "id": "everyday-padlock",
    "en": "Padlock",
    "bn": "তালা",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "metal",
      "handheld",
      "obj_family_lock",
      "obj_padlock"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Lock"
    ]
  },
  {
    "id": "everyday-bank",
    "en": "Bank",
    "bn": "ব্যাংক",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "obj_family_financial",
      "obj_banking_service"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Bank branch",
      "Commercial bank"
    ]
  },
  {
    "id": "everyday-bottle",
    "en": "Bottle",
    "bn": "বোতল",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "container",
      "handheld",
      "obj_family_container",
      "obj_sealable_bottle"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Water bottle",
      "Plastic bottle"
    ]
  },
  {
    "id": "everyday-plate",
    "en": "Plate",
    "bn": "প্লেট",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "kitchen",
      "handheld",
      "obj_family_kitchen",
      "obj_food_plate"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Eating plate",
      "Dinner plate"
    ]
  },
  {
    "id": "everyday-dictionary",
    "en": "Dictionary",
    "bn": "অভিধান",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "obj_family_paper",
      "obj_reference_dictionary"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "English dictionary"
    ]
  },
  {
    "id": "everyday-diary",
    "en": "Diary",
    "bn": "ডায়েরি",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "obj_family_paper",
      "obj_personal_diary"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Journal",
      "Personal diary"
    ]
  },
  {
    "id": "everyday-speaker",
    "en": "Speaker",
    "bn": "স্পিকার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "obj_family_electric",
      "obj_amplifies_sound"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Loudspeaker",
      "Sound box",
      "Soundbox"
    ]
  },
  {
    "id": "everyday-remote",
    "en": "Remote control",
    "bn": "রিমোট",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "handheld",
      "obj_family_electric",
      "obj_remote_control"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "TV remote",
      "Remote"
    ]
  },
  {
    "id": "everyday-charger",
    "en": "Charger",
    "bn": "চার্জার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "electronic",
      "handheld",
      "obj_family_electric",
      "obj_recharges_battery"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Phone charger",
      "Mobile charger"
    ]
  },
  {
    "id": "everyday-gas-cylinder",
    "en": "Gas cylinder",
    "bn": "গ্যাস সিলিন্ডার",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "container",
      "kitchen",
      "obj_family_container",
      "obj_family_kitchen",
      "obj_stores_cooking_gas"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "LPG cylinder",
      "Cylinder"
    ]
  },
  {
    "id": "everyday-salt",
    "en": "Salt",
    "bn": "লবণ",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "food",
      "kitchen",
      "cooking",
      "obj_family_kitchen",
      "obj_family_consumable",
      "obj_table_salt"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Table salt"
    ]
  },
  {
    "id": "everyday-broom",
    "en": "Broom",
    "bn": "ঝাড়ু",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "tool",
      "handheld",
      "obj_family_cleaning",
      "obj_sweeping_broom"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Sweeping broom"
    ]
  },
  {
    "id": "everyday-cap",
    "en": "Cap",
    "bn": "টুপি",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "clothing",
      "handheld",
      "obj_family_worn",
      "obj_cap_head"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Hat",
      "Prayer cap",
      "Skullcap"
    ]
  },
  {
    "id": "everyday-prayer-mat",
    "en": "Prayer mat",
    "bn": "জায়নামাজ",
    "pop": 180,
    "yes": [
      "object",
      "daily_use",
      "handheld",
      "soft",
      "obj_family_prayer",
      "obj_prayer_mat"
    ],
    "no": [
      "real",
      "fictional",
      "animal"
    ],
    "aliases": [
      "Salah mat",
      "Jainamaz",
      "Janamaz"
    ]
  }
,
  {
    "id": "everyday-reading-book",
    "en": "Book",
    "bn": "বই",
    "pop": 450,
    "yes": [
      "object",
      "handheld",
      "obj_family_paper",
      "obj_reading_book"
    ],
    "no": [
      "real",
      "fictional",
      "animal",
      "electronic",
      "vehicle",
      "food",
      "clothing",
      "furniture",
      "obj_family_electric",
      "obj_reference_dictionary",
      "obj_personal_diary",
      "obj_dates_calendar",
      "obj_wiping_tissue"
    ],
    "aliases": [
      "Reading book",
      "বই"
    ]
  }
]);
export const EVERYDAY_FACTS = Object.freeze({
  "obj_family_electric": {
    "everyday-computer": 2,
    "everyday-tv": 2,
    "everyday-blender": 2,
    "everyday-mixer": 2,
    "everyday-speaker": 2,
    "everyday-remote": 2,
    "everyday-charger": 2
  },
  "obj_family_kitchen": {
    "everyday-glass": 2,
    "everyday-blender": 2,
    "everyday-mixer": 2,
    "everyday-plate": 2,
    "everyday-gas-cylinder": 2,
    "everyday-salt": 2
  },
  "obj_family_container": {
    "everyday-glass": 2,
    "everyday-bag": 2,
    "everyday-bottle": 2,
    "everyday-gas-cylinder": 2
  },
  "obj_family_personal_care": {
    "everyday-perfume": 2,
    "everyday-cream": 2,
    "everyday-lotion": 2,
    "everyday-vaseline": 2
  },
  "obj_family_worn": {
    "everyday-earring": 2,
    "everyday-nosering": 2,
    "everyday-bindi": 2,
    "everyday-cap": 2
  },
  "obj_family_paper": {
    "everyday-reading-book": 2,
    "everyday-tissue": 2,
    "everyday-calendar": 2,
    "everyday-dictionary": 2,
    "everyday-diary": 2
  },
  "obj_family_house": {
    "everyday-door": 2,
    "everyday-window": 2
  },
  "obj_family_lock": {
    "everyday-key": 2,
    "everyday-padlock": 2
  },
  "obj_family_cleaning": {
    "everyday-tissue": 2,
    "everyday-broom": 2
  },
  "obj_family_medicine": {
    "everyday-medicine-tablet": 2
  },
  "obj_family_climbing": {
    "everyday-ladder": 2
  },
  "obj_family_prayer": {
    "everyday-prayer-mat": 2
  },
  "obj_family_consumable": {
    "everyday-salt": 2
  },
  "obj_family_financial": {
    "everyday-bank": 2
  },
  "obj_family_waste": {
    "everyday-feces": 2
  },
  "obj_computes_data": {
    "everyday-computer": 2
  },
  "obj_shows_television": {
    "everyday-tv": 2
  },
  "obj_amplifies_sound": {
    "everyday-speaker": 2
  },
  "obj_remote_control": {
    "everyday-remote": 2
  },
  "obj_recharges_battery": {
    "everyday-charger": 2
  },
  "obj_blends_liquids": {
    "everyday-blender": 2
  },
  "obj_whisks_mixture": {
    "everyday-mixer": 2
  },
  "obj_drinking_glass": {
    "everyday-glass": 2
  },
  "obj_sealable_bottle": {
    "everyday-bottle": 2
  },
  "obj_food_plate": {
    "everyday-plate": 2
  },
  "obj_carries_items": {
    "everyday-bag": 2
  },
  "obj_stores_cooking_gas": {
    "everyday-gas-cylinder": 2
  },
  "obj_skin_perfume": {
    "everyday-perfume": 2
  },
  "obj_skin_moisturizer": {
    "everyday-cream": 2,
    "everyday-lotion": 2,
    "everyday-vaseline": 2
  },
  "obj_skin_cream": {
    "everyday-cream": 2
  },
  "obj_skin_lotion": {
    "everyday-lotion": 2
  },
  "obj_skin_jelly": {
    "everyday-vaseline": 2
  },
  "obj_ear_jewellery": {
    "everyday-earring": 2
  },
  "obj_nose_jewellery": {
    "everyday-nosering": 2
  },
  "obj_forehead_dot": {
    "everyday-bindi": 2
  },
  "obj_cap_head": {
    "everyday-cap": 2
  },
  "obj_reading_book": {"everyday-reading-book": 2,"everyday-dictionary": 1,"everyday-diary": 1,"everyday-calendar": 1,"everyday-tissue": 1},
  "obj_reference_dictionary": {
    "everyday-dictionary": 2
  },
  "obj_personal_diary": {
    "everyday-diary": 2
  },
  "obj_dates_calendar": {
    "everyday-calendar": 2
  },
  "obj_wiping_tissue": {
    "everyday-tissue": 2
  },
  "obj_sweeping_broom": {
    "everyday-broom": 2
  },
  "obj_room_door": {
    "everyday-door": 2
  },
  "obj_glazed_window": {
    "everyday-window": 2
  },
  "obj_metal_key": {
    "everyday-key": 2
  },
  "obj_padlock": {
    "everyday-padlock": 2
  },
  "obj_oral_tablet": {
    "everyday-medicine-tablet": 2
  },
  "obj_climbing_ladder": {
    "everyday-ladder": 2
  },
  "obj_prayer_mat": {
    "everyday-prayer-mat": 2
  },
  "obj_table_salt": {
    "everyday-salt": 2
  },
  "obj_banking_service": {
    "everyday-bank": 2
  },
  "obj_fecal_matter": {
    "everyday-feces": 2
  }
});
export const EVERYDAY_FAMILY_IDS = Object.freeze(["obj_family_electric","obj_family_kitchen","obj_family_container","obj_family_personal_care","obj_family_worn","obj_family_paper","obj_family_house","obj_family_lock","obj_family_cleaning","obj_family_medicine","obj_family_climbing","obj_family_prayer","obj_family_consumable","obj_family_financial","obj_family_waste"]);
