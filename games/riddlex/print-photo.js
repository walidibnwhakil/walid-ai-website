// No remote image requests: only reviewed images packaged with the game.
const casebookPhotos = new Map([["einstein", "./images/einstein.jpg"]]);

export function localPhotoPath(entry){
 return casebookPhotos.get(entry?.id) ?? null;
}
