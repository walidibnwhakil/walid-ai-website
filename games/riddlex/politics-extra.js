// Office and party facts that are missing or stale in the packed shards.
// November 2026: Tarique Rahman is prime minister, Mirza Fakhrul Islam
// Alamgir is president, Khaleda Zia has died, and Sheikh Hasina is abroad.
// A listed yes or no overrides the shard. Everyone else stays unknown.

const BIRTHS = ["born_pre1900", "born_1900_1949", "born_1950_1969", "born_1970_1979", "born_1980_1989", "born_1990_1999", "born_2000_plus"];
const COUNTRIES = ["from_bd", "from_in", "from_pk", "from_us", "from_gb", "from_jp", "from_kr", "from_cn", "from_fr", "from_de", "from_ru", "from_br", "from_ca", "from_au", "from_es", "from_it", "from_mx", "from_ng", "from_eg", "from_tr", "from_id", "from_sa", "from_ar", "from_za"];
const JOBS = ["actor", "singer", "writer", "cricketer", "footballer", "athlete", "scientist", "musician", "director", "business", "youtube", "adult_ent"];

function bits(yes, no = []) {
  return { yes, no };
}

export const POLITICS_FACTS = {
  // President since August 2026. Resigned as BNP secretary-general that month.
  Q6874839: bits(
    ["party_bnp", "been_minister", "head_of_state", "in_government"],
    ["party_al", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary"],
  ),
  // Died 30 December 2025. Three-time prime minister, not the current chair.
  Q234814: bits(
    ["party_bnp", "led_gov", "zia_family", "been_minister", "been_premier"],
    ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "head_of_state", "party_chief", "party_secretary", "in_government"],
  ),
  // Former prime minister, still Awami League chief, living abroad.
  Q52183: bits(
    ["party_al", "led_gov", "mujib_family", "lives_abroad", "been_minister", "been_premier", "party_chief"],
    ["party_bnp", "party_jp", "party_jamaat", "zia_family", "head_of_state", "party_secretary", "in_government"],
  ),
  // BNP chairman and prime minister since February 2026. Back from London.
  Q7686199: bits(
    ["party_bnp", "led_gov", "zia_family", "been_minister", "been_premier", "party_chief", "in_government"],
    ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "head_of_state", "party_secretary"],
  ),
  // Awami League general secretary and former minister. Not in this government.
  Q14325293: bits(
    ["party_al", "been_minister", "party_secretary"],
    ["party_bnp", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_chief", "in_government"],
  ),
  // Former chief adviser. He held the top government post and leads no party.
  Q43969: bits(
    ["led_gov", "been_minister"],
    ["party_bnp", "party_al", "party_jp", "party_jamaat", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_chief", "party_secretary", "in_government"],
  ),
  // President, 1977–1981. Founder of the BNP. Not a prime minister.
  Q198313: bits(
    ["party_bnp", "led_gov", "zia_family", "been_minister", "head_of_state", "party_chief"],
    ["party_al", "party_jp", "party_jamaat", "mujib_family", "lives_abroad", "been_premier", "party_secretary", "in_government"],
  ),
  // Prime minister and president. Awami League founder.
  Q191375: bits(
    ["party_al", "led_gov", "mujib_family", "been_minister", "been_premier", "head_of_state", "party_chief"],
    ["party_bnp", "party_jp", "party_jamaat", "zia_family", "lives_abroad", "party_secretary", "in_government"],
  ),
  // President, 2013–2023. Awami League. Not in office now.
  Q3246667: bits(
    ["party_al", "been_minister", "head_of_state"],
    ["party_bnp", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary", "in_government"],
  ),
  // President, 2023–July 2026. A judge the Awami League nominated; not a party member.
  Q116763154: bits(
    ["been_minister", "head_of_state"],
    ["party_bnp", "party_al", "party_jp", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "party_chief", "party_secretary", "in_government"],
  ),
};

function sheet({ id, en, bn, pop, male, alive, birth, scientist, yes, no }) {
  const y = new Set(["real", "named", "from_bd", "politician", male ? "male" : "female", alive ? "alive" : "dead", birth, ...(yes || [])]);
  if (scientist) y.add("scientist");
  const n = new Set(no || []);
  const addNo = (qid) => { if (!y.has(qid)) n.add(qid); };
  addNo(male ? "female" : "male");
  addNo(alive ? "dead" : "alive");
  for (const qid of BIRTHS) addNo(qid);
  for (const qid of COUNTRIES) addNo(qid);
  for (const qid of JOBS) addNo(qid);
  for (const qid of ["fictional", "animal", "object"]) addNo(qid);
  for (const qid of y) n.delete(qid);
  return { id, en, bn, pop, yes: [...y], no: [...n] };
}

// People the packed shards never included. Same shape as a shard row.
export const POLITICS_PEOPLE = [
  sheet({
    id: "Q5515139",
    en: "GM Quader",
    bn: "গোলাম মোহাম্মদ কাদের",
    pop: 160,
    male: true,
    alive: true,
    birth: "born_1900_1949",
    yes: ["party_jp", "been_minister", "party_chief"],
    no: ["party_bnp", "party_al", "party_jamaat", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_premier", "head_of_state", "party_secretary", "in_government"],
  }),
  sheet({
    id: "Q16406038",
    en: "Shafiqur Rahman",
    bn: "শফিকুর রহমান",
    pop: 240,
    male: true,
    alive: true,
    birth: "born_1950_1969",
    yes: ["party_jamaat", "party_chief"],
    no: ["party_bnp", "party_al", "party_jp", "led_gov", "zia_family", "mujib_family", "lives_abroad", "been_minister", "been_premier", "head_of_state", "party_secretary", "in_government"],
  }),
];

for (const person of POLITICS_PEOPLE) {
  POLITICS_FACTS[person.id] = bits(
    person.yes.filter((qid) => qid.startsWith("party_") || ["led_gov", "zia_family", "mujib_family", "lives_abroad", "been_minister", "been_premier", "head_of_state", "in_government"].includes(qid)),
    person.no.filter((qid) => qid.startsWith("party_") || ["led_gov", "zia_family", "mujib_family", "lives_abroad", "been_minister", "been_premier", "head_of_state", "in_government"].includes(qid)),
  );
}
