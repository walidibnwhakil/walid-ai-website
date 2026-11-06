import assert from "node:assert/strict";
import {addTile, canMove, mergeLine, moveBoard, tileMotions} from "./2048-core.mjs";

assert.deepEqual(mergeLine([2, 0, 2, 2]), {line:[4, 2, 0, 0], score:4});
assert.deepEqual(mergeLine([2, 2, 2, 2]), {line:[4, 4, 0, 0], score:8});
assert.deepEqual(mergeLine([4, 4, 8, 0]), {line:[8, 8, 0, 0], score:8});
const board = [2,0,2,2, 0,0,0,0, 0,0,0,0, 0,0,0,0];
assert.deepEqual(moveBoard(board, "left"), {board:[4,2,0,0, ...Array(12).fill(0)], score:4, changed:true});
assert.deepEqual(moveBoard([2,0,0,0, 2,0,0,0, 0,0,0,0, 0,0,0,0], "up").board.slice(0,4), [4,0,0,0]);
assert.equal(moveBoard(board, "right").board[3], 4);
assert.equal(moveBoard(Array(16).fill(0), "left").changed, false);
assert.equal(canMove([2,4,2,4, 4,2,4,2, 2,4,2,4, 4,2,4,2]), false);
assert.equal(canMove([2,4,2,4, 4,2,4,2, 2,4,2,4, 4,2,4,0]), true);
const spawned = addTile(Array(16).fill(0), () => 0);
assert.equal(spawned[0], 2);
assert.equal(spawned.reduce((sum, value) => sum + Number(!!value), 0), 1);
assert.equal(addTile(Array(16).fill(2)).every(value => value === 2), true);
assert.deepEqual(tileMotions(board, "left"), [
  {source:2,destination:0,merged:true,consumed:true},
  {source:3,destination:1,merged:false}
]);
assert.deepEqual(tileMotions([2,0,0,0,...Array(12).fill(0)], "right"), [{source:0,destination:3,merged:false}]);
console.log("2048 rules and tile motion: 14 assertions passed");
