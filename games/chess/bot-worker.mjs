import { bestMove } from "./engine.mjs";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      id: data.id,
      fen: data.fen,
      move: bestMove(data.fen, data.level),
    });
  } catch {
    self.postMessage({
      id: data.id,
      fen: data.fen,
      error: "Chess analysis failed",
    });
  }
};
