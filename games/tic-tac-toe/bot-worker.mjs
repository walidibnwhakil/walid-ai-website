import { chooseMove } from "./bot.mjs";
self.onmessage = ({ data }) => {
  self.postMessage({ id: data.id, index: chooseMove(data.game, data.budget) });
};
