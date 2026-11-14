// Answer expressions are independent of the idle mood. Thinking must not cancel
// a smile. The hold clock waits until that plate is actually loaded.

export const EXPRESSION_HOLD = 1.2;
export const EXPRESSION_EASE = 0.45;

const KEYS = ["happy", "sad", "worried", "serious", "confused"];

export function expressionKey(answer) {
  if (answer === "yes" || answer === "probably") return "happy";
  if (answer === "no" || answer === "probably_not") return "serious";
  if (answer === "unknown") return "confused";
  return "";
}

export function createExpressions() {
  let mood = "curious";
  let reaction = null;
  const level = Object.fromEntries(KEYS.map((key) => [key, 0]));

  function moodKey() {
    if (mood === "happy" || mood === "confident") return "happy";
    if (mood === "sad" || mood === "defeated") return "sad";
    return "";
  }

  function picture() {
    return {
      mood,
      key: reaction ? reaction.key : moodKey(),
      age: reaction ? reaction.age : 0,
      holding: !!reaction,
      levels: { ...level },
    };
  }

  return {
    setMood(value) {
      mood = value || "curious";
    },
    react(answer) {
      const key = expressionKey(answer);
      if (!key) return "";
      reaction = { key, age: 0 };
      for (const name of KEYS) level[name] = name === key ? 1 : 0;
      return key;
    },
    step(dt, plateReady = () => true) {
      if (reaction) {
        const ready = plateReady(reaction.key) !== false;
        if (ready) reaction.age += Math.max(0, dt);
        let strength = 1;
        if (reaction.age > EXPRESSION_HOLD) {
          strength = 1 - (reaction.age - EXPRESSION_HOLD) / EXPRESSION_EASE;
        }
        if (strength <= 0) {
          reaction = null;
        } else {
          for (const name of KEYS) level[name] = name === reaction.key ? Math.min(1, Math.max(0, strength)) : 0;
          return picture();
        }
      }
      const goal = moodKey();
      const blend = 1 - Math.exp(-Math.max(0, dt) / 0.22);
      for (const name of KEYS) {
        const target = name === goal ? 1 : 0;
        level[name] += (target - level[name]) * blend;
        if (level[name] < 0.001) level[name] = 0;
      }
      return picture();
    },
    picture,
  };
}
