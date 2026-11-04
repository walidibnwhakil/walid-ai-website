// No remote image requests: only reviewed images packaged with the game.
export function localPhotoPath(entry){
 const path=entry?.image;
 return typeof path==="string"&&/^\.\/images\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp)$/.test(path)?path:null;
}
