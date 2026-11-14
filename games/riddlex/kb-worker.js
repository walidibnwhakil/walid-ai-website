import { decodeShard } from "./kb.js";

self.onmessage = (event) => {
  const { id, buffer, questions } = event.data;
  try {
    const pool = decodeShard(buffer, questions);
    self.postMessage({
      id,
      attrBytes: pool.attrBytes,
      count: pool.count,
      ids: pool.ids,
      ens: pool.ens,
      bns: pool.bns,
      images: pool.images,
      credits: pool.credits,
      attrs: pool.attrs,
      pop: pool.pop,
      flags: pool.flags,
    }, [pool.attrs.buffer, pool.pop.buffer, pool.flags.buffer]);
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message ? error.message : error) });
  }
};
