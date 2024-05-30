import config from "../../config";
import { keys as scales } from "../../modules/composers/_priceComposer";

const { songLengthOptions, composerOptions } = config.market;
const { pools } = config.market.uniswap;
const { stocks } = config.market;
const stockIndexSampleRates = stocks.sampleRates;

export const N = 2;
export const now5Minutes = () => Math.floor(Date.now() / 1000 / 300) * 300;
export const getParams = () => {
  const url = new URL(window.location.href);
  let _sampleRate = url.searchParams.get("sampleRate");
  let _t = url.searchParams.get("t");
  let _n = url.searchParams.get("n");
  const composer = url.searchParams.get("composer") || composerOptions[0];
  const source = url.searchParams.get("source") || "uniswap";
  const targetChannelCount = (parseInt(url.searchParams.get("targetChannelCount")) || 3) - 1;
  const initialScale = parseInt(url.searchParams.get("initialScale")) || 0;
  let ticker = url.searchParams.get("ticker");
  if (!ticker) {
    if (source === "uniswap") {
      ticker = pools[0].address;
    } else {
      ticker = stocks[0].name;
    }
  }
  let activePoolIndex = 0;
  if (source === "uniswap") {
    activePoolIndex = pools.findIndex((p) => p.address === ticker);
  }

  let n = songLengthOptions[1];

  let sampleRate =
    source === "uniswap"
      ? pools[activePoolIndex].minSampleRate
      : stockIndexSampleRates[0];
  let t = 0;

  if (_sampleRate) {
    sampleRate = parseInt(_sampleRate);
  }

  
  if (_t && t !== "live") {
    t = parseInt(_t);
  }

  if (_n) {
    n = parseInt(_n);
  }

  return {
    source,
    ticker,
    sampleRate,
    t,
    n,
    composer,
    targetChannelCount,
    initialScale,
  };
};
