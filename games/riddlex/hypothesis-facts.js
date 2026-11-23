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
  // General, observable functions. These discriminate ordinary tools and
  // devices, rather than memorising any named answer.
  { id:"obj_writes_paper", group:"object",
    en:"Is it used to write or draw on paper?",
    bn:"এটি কি কাগজে লেখা বা আঁকার কাজে ব্যবহার হয়?" },
  { id:"obj_uses_ink", group:"object",
    en:"Does it use ink to write?",
    bn:"এটি কি কালি দিয়ে লেখে?" },
  { id:"obj_uses_graphite", group:"object",
    en:"Does it write using a graphite core?",
    bn:"এটি কি গ্রাফাইটের শিস দিয়ে লেখে?" },
  { id:"obj_broad_marker_tip", group:"object",
    en:"Does it usually have a broad felt tip for marking or highlighting?",
    bn:"এটির কি সাধারণত দাগ বা হাইলাইট করার জন্য মোটা ফেল্ট টিপ থাকে?" },
  { id:"obj_makes_calls", group:"object",
    en:"Can it make a telephone call?",
    bn:"এটি দিয়ে কি ফোনকল করা যায়?" },
  { id:"obj_touchscreen", group:"object",
    en:"Does it normally have a touch-sensitive screen?",
    bn:"এটির কি সাধারণত স্পর্শ-সংবেদনশীল স্ক্রিন আছে?" },
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
  { id:"obj_flower_from_plant", group:"object",
    en:"Is it a flower that grows on a plant?",
    bn:"এটি কি গাছে ফোটা কোনো ফুল?" },
  { id:"obj_fragrant_flower", group:"object",
    en:"Is this flower usually fragrant?",
    bn:"ফুলটির কি সাধারণত সুগন্ধ আছে?" },
  { id:"obj_five_spiral_waxy_petals", group:"object",
    en:"Does it typically have five thick, overlapping petals arranged in a spiral?",
    bn:"এর কি সাধারণত ঘূর্ণির মতো সাজানো পাঁচটি মোটা, পরস্পর-ছোঁয়া পাপড়ি আছে?" },
  { id:"obj_frangipani_yellow_center", group:"object",
    en:"Can its flowers be white or pink with a yellow centre?",
    bn:"ফুলটির রং কি সাদা বা গোলাপি এবং মাঝখানটা হলুদ হতে পারে?" },
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
  obj_writes_paper: Object.freeze({
    "c-pen":2, "c-pencil":2, "c-marker":2, "c-phone":1,
  }),
  obj_uses_ink: Object.freeze({
    "c-pen":2, "c-marker":2, "c-pencil":1,
  }),
  obj_uses_graphite: Object.freeze({
    "c-pencil":2, "c-pen":1, "c-marker":1,
  }),
  obj_broad_marker_tip: Object.freeze({
    "c-marker":2, "c-pen":1, "c-pencil":1,
  }),
  obj_makes_calls: Object.freeze({
    "c-phone":2, "c-pen":1, "c-pencil":1, "c-marker":1,
  }),
  obj_touchscreen: Object.freeze({
    "c-phone":2, "c-pen":1, "c-pencil":1, "c-marker":1,
  }),
  // Nectar is SHARED by butterflies and honeybees, not an identity proof.
  // https://pollinators.wisc.edu/bee-identification/non-bee-pollinators/
  // https://www.amnh.org/exhibitions/butterflies/butterfly-behavior
  // https://scientificdiscoveries.ars.usda.gov/tellus/stories/articles/planting-for-pollinators
  animal_visits_flowers: Object.freeze({ "c-butterfly": 2, "c-honeybee": 2 }),
  animal_patterned_wings: Object.freeze({ "c-butterfly": 2, "c-honeybee": 1 }),
  animal_makes_honey: Object.freeze({ "c-honeybee": 2, "c-butterfly": 1 }),
  animal_pollen_baskets: Object.freeze({ "c-honeybee": 2, "c-butterfly": 1 }),
  // Plumeria (Kathgolap) facts: FAO, RHS, Singapore NParks, USDA.
  // https://www.fao.org/4/ai387e/AI387E05.htm
  // https://www.rhs.org.uk/plants/94126/plumeria-rubra/details
  // https://www.nparks.gov.sg/florafaunaweb/flora/8/6/8620
  obj_flower_from_plant: Object.freeze({
    "c-kathgolap":2, "c-jasmine-flower":2, "c-hibiscus-flower":2,
  }),
  obj_fragrant_flower: Object.freeze({
    "c-kathgolap":2, "c-jasmine-flower":2,
  }),
  obj_five_spiral_waxy_petals: Object.freeze({
    "c-kathgolap":2,
  }),
  obj_frangipani_yellow_center: Object.freeze({
    "c-kathgolap":2,
  }),
});

// Minimal new curated examples unavailable in the old packed curated shard.
// Their common attributes are also recorded for ordinary question selection.
export const EXTRA_HYPOTHESIS_ENTRIES = Object.freeze({
  object: Object.freeze([
    // Ordinary writing tools belong in the general object vocabulary, with
    // nearby alternatives so a single broad "tool" YES never proves pen.
    { id:"c-pen",en:"Pen",bn:"কলম",pop:175,
      yes:["object","tool","handheld","pocket","daily_use"],
      no:["real","fictional","animal","named","electronic","vehicle","clothing",
        "food","furniture","kitchen","cooking","uses_pressure","music_item","sport_item"] },
    { id:"c-pencil",en:"Pencil",bn:"পেনসিল",pop:155,
      yes:["object","tool","handheld","pocket","daily_use"],
      no:["real","fictional","animal","named","electronic","vehicle","clothing",
        "food","furniture","kitchen","cooking","uses_pressure","music_item","sport_item"] },
    { id:"c-marker",en:"Marker pen",bn:"মার্কার",pop:125,
      yes:["object","tool","handheld","pocket","daily_use"],
      no:["real","fictional","animal","named","electronic","vehicle","clothing",
        "food","furniture","kitchen","cooking","uses_pressure","music_item","sport_item"] },
    // Plants/flowers are accessible through the existing "Object" choice
    // without changing the user-approved menu artwork or category layout.
    { id:"c-kathgolap", en:"Kathgolap (Frangipani)", bn:"কাঠগোলাপ",
      pop:180, yes:["object"], no:["animal","real","fictional","electronic",
        "vehicle","clothing","kitchen","cooking","metal","sport_item","music_item",
        "uses_pressure"] },
    { id:"c-jasmine-flower", en:"Jasmine flower", bn:"জুঁই ফুল",
      pop:155, yes:["object"], no:["animal","real","fictional","electronic",
        "vehicle","clothing","kitchen","cooking","metal","sport_item","music_item"] },
    { id:"c-hibiscus-flower", en:"Hibiscus flower", bn:"জবা ফুল",
      pop:150, yes:["object"], no:["animal","real","fictional","electronic",
        "vehicle","clothing","kitchen","cooking","metal","sport_item","music_item"] },
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
