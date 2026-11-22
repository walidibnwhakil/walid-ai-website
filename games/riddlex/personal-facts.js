// Role-based guesses are deliberately generic: Riddlex cannot know or
// collect the real names of a player's family or friends. Nothing is sent to
// the shared "learned people" database for these relationships.
export const PERSONAL_QUESTIONS = Object.freeze([
  { id: "knows_you", group: "personal", en: "Does this person know you personally?", bn: "এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন?" },
  { id: "your_family", group: "personal", en: "Are they a member of your family?", bn: "তিনি কি আপনার পরিবারের সদস্য?" },
  { id: "your_parent", group: "personal", en: "Are they one of your parents?", bn: "তিনি কি আপনার বাবা বা মা?" },
  { id: "your_sibling", group: "personal", en: "Are they your brother or sister?", bn: "তিনি কি আপনার ভাই বা বোন?" },
  { id: "your_friend", group: "personal", en: "Are they your friend?", bn: "তিনি কি আপনার বন্ধু?" },
  { id: "your_best_friend", group: "personal", en: "Are they your closest friend?", bn: "তিনি কি আপনার সবচেয়ে কাছের বন্ধু?" },
]);

function relation(id, en, bn, gender, facts, popularity) {
  return {
    id: "riddlex-role-" + id, en, bn, pop: popularity,
    yes: ["real", "named", gender],
    no: ["fictional", "animal", "object", gender === "male" ? "female" : "male"],
    facts: { knows_you: 2, ...facts },
  };
}

export const PERSONAL_RELATIONS = Object.freeze([
  relation("mother", "Your mother", "আপনার মা", "female",
    { your_family: 2, your_parent: 2, your_sibling: 1 }, 850),
  relation("father", "Your father", "আপনার বাবা", "male",
    { your_family: 2, your_parent: 2, your_sibling: 1 }, 850),
  relation("brother", "Your brother", "আপনার ভাই", "male",
    { your_family: 2, your_parent: 1, your_sibling: 2 }, 720),
  relation("sister", "Your sister", "আপনার বোন", "female",
    { your_family: 2, your_parent: 1, your_sibling: 2 }, 720),
  {
    id: "riddlex-role-best-friend", en: "Your best friend", bn: "আপনার সবচেয়ে কাছের বন্ধু",
    pop: 650, yes: ["real", "named"], no: ["fictional", "animal", "object"],
    facts: { knows_you: 2, your_family: 1, your_friend: 2, your_best_friend: 2 },
  },
  {
    id: "riddlex-role-friend", en: "Your friend", bn: "আপনার বন্ধু",
    pop: 620, yes: ["real", "named"], no: ["fictional", "animal", "object"],
    facts: { knows_you: 2, your_family: 1, your_friend: 2, your_best_friend: 1 },
  },
]);

// Riddlex's on-screen detective is also a playable fictional character.
// No invented age, gender, or human backstory is attached to the character.
export const RIDDLEX_CHARACTER = Object.freeze({
  id: "riddlex-detective", en: "Riddlex", bn: "রিডলেক্স",
  pop: 260, yes: ["fictional", "named", "from_game", "detective_role"],
  no: ["real", "animal", "object"],
});

export const PERSONAL_FACTS = Object.freeze(Object.fromEntries(
  PERSONAL_RELATIONS.map((person) => [person.id, Object.freeze(person.facts)])
));
export const PERSONAL_QUESTION_IDS = new Set(PERSONAL_QUESTIONS.map((question) => question.id));
