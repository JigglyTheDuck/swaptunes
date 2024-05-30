import { now } from "../utils";
// this module is intended to work as a clipboard replacement
// it stores a single composition and renderers can hook up to it
// actually... for now we'll just use the previewTrack search param as clipboard

const cache = { value: "", timestamp: 0 };
export const set = (value) => {
  cache.value = value;
  cache.timestamp = now();
};

export const observe = () => cache.value && now() - cache.timestamp < 60;

export const pop = () => {
  if (cache.value) {
    return cache.value;
  }
  return null;
};

