// Guess relationship *types*, not private individuals. These entries have no
// names, contact details, images, birth dates or user identifiers.
export const PERSONAL_QUESTIONS = Object.freeze([
  { id: "knows_you", group: "personal", en: "Does this person know you personally?", bn: "এই মানুষটি কি আপনাকে ব্যক্তিগতভাবে চেনেন?" },
  { id: "your_family", group: "personal", en: "Are they a member of your family?", bn: "তিনি কি আপনার পরিবারের সদস্য?" },
  { id: "your_parent", group: "personal", en: "Are they one of your parents?", bn: "তিনি কি আপনার বাবা বা মা?" },
  { id: "your_sibling", group: "personal", en: "Are they your brother or sister?", bn: "তিনি কি আপনার ভাই বা বোন?" },
  { id: "your_spouse", group: "personal", en: "Are you married to this person?", bn: "তিনি কি আপনার স্বামী বা স্ত্রী?" },
  { id: "your_child", group: "personal", en: "Is this person your child?", bn: "সে কি আপনার সন্তান?" },
  { id: "your_baby", group: "personal", en: "Is this your baby or very young child?", bn: "সে কি আপনার শিশু সন্তান?" },
  { id: "your_partner", group: "personal", en: "Are you currently in a romantic relationship with them?", bn: "তিনি কি বর্তমানে আপনার প্রেমিক বা প্রেমিকা?" },
  { id: "your_ex", group: "personal", en: "Were they your romantic partner or spouse in the past?", bn: "তিনি কি আপনার প্রাক্তন প্রেমিক, প্রেমিকা বা জীবনসঙ্গী?" },
  { id: "your_friend", group: "personal", en: "Are they your friend?", bn: "তিনি কি আপনার বন্ধু?" },
  { id: "your_best_friend", group: "personal", en: "Are they your closest friend?", bn: "তিনি কি আপনার সবচেয়ে কাছের বন্ধু?" },
]);

// Generic relations deliberately avoid assertions about a specific person's
// job, location, activity, age or personal identity. The relationship answers
// are only relative to the current player's thoughts.
function relation(id, en, bn, gender, facts, popularity = 620) {
  const genders = gender === "female" ? { yes: ["female"], no: ["male"] }
    : gender === "male" ? { yes: ["male"], no: ["female"] }
    : { yes: [], no: [] };
  return {
    id: "riddlex-role-" + id, en, bn, pop: popularity,
    yes: ["real", "named", ...genders.yes],
    no: ["fictional", "animal", "object", ...genders.no],
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
  relation("husband", "Your husband", "আপনার স্বামী", "male",
    { your_family: 2, your_parent: 1, your_sibling: 1, your_spouse: 2, your_partner: 2, your_ex: 1 }, 730),
  relation("wife", "Your wife", "আপনার স্ত্রী", "female",
    { your_family: 2, your_parent: 1, your_sibling: 1, your_spouse: 2, your_partner: 2, your_ex: 1 }, 730),
  relation("child", "Your child", "আপনার সন্তান", null,
    { your_family: 2, your_parent: 1, your_sibling: 1, your_spouse: 1, your_child: 2, your_baby: 1 }, 690),
  relation("baby", "Your baby", "আপনার শিশু সন্তান", null,
    { your_family: 2, your_parent: 1, your_sibling: 1, your_spouse: 1, your_child: 2, your_baby: 2 }, 690),
  relation("boyfriend", "Your boyfriend", "আপনার প্রেমিক", "male",
    { your_family: 1, your_spouse: 1, your_partner: 2, your_ex: 1 }, 680),
  relation("girlfriend", "Your girlfriend", "আপনার প্রেমিকা", "female",
    { your_family: 1, your_spouse: 1, your_partner: 2, your_ex: 1 }, 680),
  relation("ex", "Your ex", "আপনার প্রাক্তন সঙ্গী", null,
    { your_family: 1, your_partner: 1, your_ex: 2 }, 610),
  relation("best-friend", "Your best friend", "আপনার সবচেয়ে কাছের বন্ধু", null,
    { your_family: 1, your_partner: 1, your_ex: 1, your_friend: 2, your_best_friend: 2 }, 650),
  relation("friend", "Your friend", "আপনার বন্ধু", null,
    { your_family: 1, your_partner: 1, your_ex: 1, your_friend: 2, your_best_friend: 1 }, 620),
]);

// Riddlex's own detective can be thought of as a fictional game character.
export const RIDDLEX_CHARACTER = Object.freeze({
  id: "riddlex-detective", en: "Riddlex", bn: "রিডলেক্স",
  pop: 260, yes: ["fictional", "named", "from_game", "detective_role"],
  no: ["real", "animal", "object"],
  image: "./images/approved/detective.png",
  credit: "Riddlex original game artwork",
});

export const PERSONAL_FACTS = Object.freeze(Object.fromEntries(
  PERSONAL_RELATIONS.map((person) => [person.id, Object.freeze(person.facts)])
));
export const PERSONAL_QUESTION_IDS = new Set(PERSONAL_QUESTIONS.map((question) => question.id));
