export const starts = [0, 26];
export const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function newLudo() {
  return {pieces: [Array(4).fill(-1), Array(4).fill(-1)], turn: 0, roll: 0, winner: null};
}

export function trackPosition(player, step) {
  return (starts[player] + step) % 52;
}

export function legalTokens(state) {
  return state.pieces[state.turn].flatMap((step, index) => {
    if (!state.roll || state.winner !== null) return [];
    return (step < 0 ? state.roll === 6 : step + state.roll <= 57) ? [index] : [];
  });
}

export function rollLudo(state, roll) {
  if (state.roll || state.winner !== null || !Number.isInteger(roll) || roll < 1 || roll > 6) return state;
  const rolled = {...state, roll};
  return legalTokens(rolled).length ? rolled : {...rolled, turn: 1 - state.turn, roll: 0};
}

export function moveLudo(state, index) {
  if (!legalTokens(state).includes(index)) return state;
  const pieces = state.pieces.map(team => [...team]);
  const {turn, roll} = state;
  const old = pieces[turn][index];
  const step = old < 0 ? 0 : old + roll;
  pieces[turn][index] = step;
  if (step < 52) {
    const square = trackPosition(turn, step);
    if (!safe.has(square)) {
      pieces[1 - turn] = pieces[1 - turn].map(other =>
        other >= 0 && other < 52 && trackPosition(1 - turn, other) === square ? -1 : other);
    }
  }
  const winner = pieces[turn].every(position => position === 57) ? turn : null;
  return {pieces, turn: roll === 6 || winner !== null ? turn : 1 - turn, roll: 0, winner};
}
