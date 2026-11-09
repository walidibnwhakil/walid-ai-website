export const MEDALS = Object.freeze([
  { name: "gold", color: "#ffd76b", label: "Winner" },
  { name: "silver", color: "#e3edf7", label: "1st Runner-up" },
  { name: "bronze", color: "#dba26b", label: "2nd Runner-up" },
]);
export function finishPresentation(state, index) {
  const rank = state.order.indexOf(index),
    player = state.players[index];
  if (rank < 0) throw Error("Player has not finished");
  if (state.bot)
    return {
      title: index === 0 ? "You Win" : "You Lose",
      medal: index === 0 ? "gold" : null,
      defeat: index === 1,
      standings: false,
      automatic: false,
    };
  const medal = MEDALS[Math.min(rank, 2)].name;
  return {
    title:
      state.players.length === 2 || rank === 0
        ? `${player.color} Wins`
        : `${player.color} · ${MEDALS[rank].label}`,
    medal,
    defeat: false,
    standings: false,
    automatic: state.players.length > 2,
  };
}
export function finishMedal(orderLength) {
  return MEDALS[Math.min(orderLength, 2)].name;
}
export function finalStandings(state) {
  if (state.bot || state.players.length === 2) return [];
  return state.order.map((index, rank) => ({
    index,
    color: state.players[index].color,
    medal: rank < state.players.length - 1 ? MEDALS[rank].name : null,
    label: rank < state.players.length - 1 ? MEDALS[rank].label : "Loser",
  }));
}
