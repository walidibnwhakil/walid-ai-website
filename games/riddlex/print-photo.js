// No remote image requests: only reviewed images packaged with the game.
const casebookPhotos = new Map([["einstein", "./images/einstein.jpg"]]);

export function localPhotoPath(entry){
 const path=entry?.image ?? casebookPhotos.get(entry?.id);
 return typeof path==="string"&&/^\.\/images\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp)$/.test(path)?path:null;
}
