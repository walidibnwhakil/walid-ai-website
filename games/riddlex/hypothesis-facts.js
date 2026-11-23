// Small, source-checked function and behaviour clues. A missing fact stays
// UNKNOWN (0): absence must never be treated as evidence for "no".
// These facts supplement the existing 3M+ casebook without re-packing binaries.
export const EXTRA_HYPOTHESIS_QUESTIONS = Object.freeze([
  { id: "obj_moves_air_blades", group: "object",
    en: "Does it move air using rotating blades?",
    bn: "এটি কি ঘূর্ণায়মান পাখা বা ব্লেড দিয়ে বাতাস চলাচল করায়?" },
  { id: "obj_mounted_ceiling", group: "object",
    en: "Is it normally mounted above you on the ceiling?",
    bn: "এটি কি সাধারণত মাথার ওপরে ছাদে লাগানো থাকে?" },
  { id: "obj_cools_room", group: "object",
    en: "Is its main purpose to cool the air in a room?",
    bn: "এর প্রধান কাজ কি ঘরের বাতাস ঠান্ডা করা?" },
  { id: "obj_keeps_food_cold", group: "object",
    en: "Does it keep food cold to help it stay fresh?",
    bn: "খাবার ঠান্ডা রেখে তাজা রাখাই কি এর প্রধান কাজ?" },
  { id: "obj_uses_electricity", group: "object",
    en: "Does it normally run on electricity?",
    bn: "এটি কি সাধারণত বিদ্যুতে চলে?" },
  { id: "animal_visits_flowers", group: "animal",
    en: "Does it often visit flowers to feed on nectar?",
    bn: "মধুরস খেতে কি এটি প্রায়ই ফুলে ফুলে ঘোরে?" },
  { id: "animal_patterned_wings", group: "animal",
    en: "Does it have broad, often colourful or patterned wings?",
    bn: "এর কি চওড়া, প্রায়ই রঙিন বা নকশাযুক্ত ডানা আছে?" },
  { id: "animal_makes_honey", group: "animal",
    en: "Does it make and store honey in a colony?",
    bn: "এটি কি মৌচাকে মধু তৈরি ও জমা করে?" },
  { id: "animal_pollen_baskets", group: "animal",
    en: "Does it carry pollen in special baskets on its hind legs?",
    bn: "এটি কি পেছনের পায়ের বিশেষ থলিতে ফুলের পরাগ বহন করে?" },
]);

export const HYPOTHESIS_FACTS = Object.freeze({
  obj_moves_air_blades: Object.freeze({ "c-fan": 2, "c-ceiling-fan": 2 }),
  obj_mounted_ceiling: Object.freeze({ "c-ceiling-fan": 2 }),
  obj_cools_room: Object.freeze({ "c-air-conditioner": 2 }),
  obj_keeps_food_cold: Object.freeze({ "c-fridge": 2 }),
  obj_uses_electricity: Object.freeze({
    "c-fan": 2, "c-ceiling-fan": 2, "c-air-conditioner": 2,
    "c-fridge": 2, "c-phone": 2, "c-tv": 2, "c-rice-cooker": 2,
  }),
  // Nectar is SHARED by butterflies and honeybees, not an identity proof.
  // https://pollinators.wisc.edu/bee-identification/non-bee-pollinators/
  // https://www.amnh.org/exhibitions/butterflies/butterfly-behavior
  // https://scientificdiscoveries.ars.usda.gov/tellus/stories/articles/planting-for-pollinators
  animal_visits_flowers: Object.freeze({ "c-butterfly": 2, "c-honeybee": 2 }),
  animal_patterned_wings: Object.freeze({ "c-butterfly": 2, "c-honeybee": 1 }),
  animal_makes_honey: Object.freeze({ "c-honeybee": 2, "c-butterfly": 1 }),
  animal_pollen_baskets: Object.freeze({ "c-honeybee": 2, "c-butterfly": 1 }),
});

// Minimal new curated examples unavailable in the old packed curated shard.
// Their common attributes are also recorded for ordinary question selection.
export const EXTRA_HYPOTHESIS_ENTRIES = Object.freeze({
  object: Object.freeze([
    { id:"c-ceiling-fan", en:"Ceiling fan", bn:"সিলিং ফ্যান", pop:80,
      yes:["object","electronic","daily_use","metal"],
      no:["animal","real","fictional","named","kitchen","cooking","vehicle","pocket","clothing"] },
    { id:"c-air-conditioner", en:"Air conditioner", bn:"এয়ার কন্ডিশনার", pop:110,
      yes:["object","electronic","daily_use"],
      no:["animal","real","fictional","named","kitchen","cooking","vehicle","pocket","clothing"] },
  ]),
  animal: Object.freeze([
    { id:"c-butterfly", en:"Butterfly", bn:"প্রজাপতি", pop:140,
      yes:["animal","insect","can_fly","wild"],
      no:["object","real","fictional","named","mammal","bird","fish","reptile","pet","farm","bigger_than_person"] },
    { id:"c-honeybee", en:"Honeybee", bn:"মৌমাছি", pop:150,
      yes:["animal","insect","can_fly","wild"],
      no:["object","real","fictional","named","mammal","bird","fish","reptile","bigger_than_person"] },
  ]),
});
