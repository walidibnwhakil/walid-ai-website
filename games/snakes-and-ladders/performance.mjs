// Cap decorative work by the screen it is painted on, not the source artwork size.
const compactQuery = matchMedia("(max-width:800px), (pointer:coarse)");
export const compactDevice = () => compactQuery.matches;
export const renderQuality = (requested) =>
  compactDevice() ? (requested === "High" ? "Balanced" : "Low") : requested;
export const menuArtwork = () =>
  compactDevice()
    ? "assets/jungle-emblem-small.webp"
    : "assets/jungle-emblem.webp";
export const caveArtwork = () =>
  innerWidth <= 800 ? "assets/cavern-mobile.webp" : "assets/cavern.webp";
const images = new Map();
export function preloadImage(url) {
  if (!images.has(url))
    images.set(
      url,
      new Promise((resolve, reject) => {
        const im = new Image();
        im.decoding = "async";
        im.onload = async () => {
          try {
            await im.decode();
          } catch {}
          resolve(im);
        };
        im.onerror = () => {
          images.delete(url);
          reject(new Error("Could not load " + url));
        };
        im.src = url;
      }),
    );
  return images.get(url);
}
