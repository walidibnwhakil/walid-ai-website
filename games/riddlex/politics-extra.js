// Attributes that did not fit in the packed shards. Only people listed here
// get a yes or no; everyone else stays unknown, so the question is asked
// only once the remaining names actually differ on it.

export const POLITICS_EXTRAS = {
  Q6874839: {
    // Mirza Fakhrul Islam Alamgir, BNP secretary general.
    yes: ["been_minister", "party_secretary"],
    no: ["been_premier", "head_of_state", "party_jp", "party_jamaat", "party_chief", "in_government"],
  },
  Q7686199: {
    // Tarique Rahman, BNP chairman and prime minister.
    yes: ["party_chief", "been_premier", "in_government"],
    no: ["head_of_state", "party_jp", "party_jamaat", "party_secretary"],
  },
  Q52183: {
    // Sheikh Hasina, former prime minister and Awami League leader.
    yes: ["been_minister", "been_premier", "party_chief"],
    no: ["head_of_state", "party_jp", "party_jamaat", "party_secretary", "in_government"],
  },
  Q234814: {
    // Khaleda Zia, former prime minister and BNP chair.
    yes: ["been_minister", "been_premier", "party_chief"],
    no: ["head_of_state", "party_jp", "party_jamaat", "party_secretary", "in_government"],
  },
  Q14325293: {
    // Obaidul Quader, Awami League general secretary.
    yes: ["been_minister", "party_secretary"],
    no: ["been_premier", "head_of_state", "party_jp", "party_jamaat", "party_chief", "in_government"],
  },
  Q43969: {
    // Muhammad Yunus, former chief adviser, not a party leader.
    yes: [],
    no: ["been_minister", "been_premier", "head_of_state", "party_jp", "party_jamaat", "party_chief", "party_secretary", "in_government"],
  },
};
