export const starts = [0, 26, 13, 39];
export const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function newLudo(playerCount = 2) {
  if (![2,3,4].includes(playerCount)) throw new RangeError("Ludo supports 2, 3 or 4 players");
  return {pieces: Array.from({length:playerCount}, () => Array(4).fill(-1)), turn: 0, roll: 0, winner: null};
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
  return legalTokens(rolled).length ? rolled : {...rolled, turn: (state.turn + 1) % state.pieces.length, roll: 0};
}

export function moveLudo(state, index) {
  if (!legalTokens(state).includes(index)) return state;
  const pieces = state.pieces.map(team => [...team]);
  const {turn, roll} = state;
  const old = pieces[turn][index];
  const step = old < 0 ? 0 : old + roll;
  let captured = false;
  pieces[turn][index] = step;
  if (step < 52) {
    const square = trackPosition(turn, step);
    if (!safe.has(square)) pieces.forEach((team, rival) => {
      if (rival !== turn) pieces[rival] = team.map(other => {
        const hit = other >= 0 && other < 52 && trackPosition(rival, other) === square;
        captured ||= hit;
        return hit ? -1 : other;
      });
    });
  }
  const winner = pieces[turn].every(position => position === 57) ? turn : null;
  return {pieces, turn: roll === 6 || captured || winner !== null ? turn : (turn + 1) % pieces.length, roll: 0, winner};
}
