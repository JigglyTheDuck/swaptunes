//import { client, GET_SWAPS } from "./uniswap.js";
// import { applyPriceChange, setInitialPrice } from "./priceToSong";
import config from "../config";

export class PriceProcessor {
  pair = "";
  segmentSwapsCount = 0;
  swapHistory = [];
  nextSegment = 0;
  previousSwap = null;
  listener = null;
  composer = null;

  constructor(composer, address, since, sampleRate, n) {
    this.params = { address, since, sampleRate };
    this.composer = composer;
  }

  _applyPriceChange() {
    if (this.previousSwap === null) throw new Error("no previous price yet");

    this.composer.applyPriceChange(this.previousSwap.price);

    this.segmentSwapCount = 0;

    this.nextSegment += this.params.sampleRate;

    if (this.composer.isOver) {
      this.notify(true);
      return true;
    }

    this.notify(false);
    return false;
  }

  fetchSwaps(since = this.params.since, skip = this.segmentSwapCount, to) {
    /*
    return client.query({
      fetchPolicy: "no-cache",
      query: GET_SWAPS,
      variables: {
        tokenAddress: this.params.address,
        since: parseInt(since),
        skip,
        to,
      },
    });*/
  }

  notify(isOver = false) {
    if (!this.listener) return;
    this.listener(
      {
        segment: this.nextSegment,
        price: this.previousSwap.price,
        ticker: this.pair,
      },
      isOver
    );
  }

  async process(listener, swaps) {
    this.listener = listener;
    const delayedNow = Math.floor(Date.now() / 1000) - config.confirmationDelay;

    // stop processing if next segment is too far ahead
    // don't even care until segment is safe
    if (this.nextSegment > delayedNow) {
      this.notify(true);
      return false;
    }
    /*  TODO: for future reference return new Promise((r) => setTimeout(r, 5000)).then(() =>
       this.process(listener)
      );*/

    if (!swaps) {
      swaps = await this.fetchSwaps(
        this.previousSwap
          ? this.previousSwap.timestamp
          : this.params.since - this.params.sampleRate * this.composer.MA,
        this.segmentSwapCount,
        delayedNow
      );
    }

    // at this point we can safely assume that all swaps are in correct order

    if (!swaps?.data?.swaps) throw new Error("something went wrong");

    let swapHistory = swaps.data.swaps.map(this.swapToPrice.bind(this));
    //.filter((s) => s.timestamp < delayedNow);

    this.segmentSwapCount += swapHistory.length;

    if (!this.previousSwap) {
      if (swapHistory.length === 0) return false;
      this.nextSegment = this.params.since + this.params.sampleRate;
      this.previousSwap = swapHistory[0];
      swapHistory = swapHistory.slice(1);
    }

    // current swaps will be ordered but it may happen that we get something here that will
    // so simply what we do is just store ALL swaps
    // and stop even requesting ones beyond now - confirmationDelay

    if (swapHistory.length === 0) {
      if (delayedNow > this.nextSegment) {
        if (this._applyPriceChange()) return true;
        await new Promise((r) => setTimeout(r, 40));
      }

      this.notify(true);
      return false;
    }

    // eager load next data set
    const nextSwaps = this.fetchSwaps(
      this.previousSwap.timestamp,
      this.segmentSwapCount,
      delayedNow
    );

    for (const swap of swapHistory) {
      while (swap.timestamp > this.nextSegment) {
        if (this._applyPriceChange()) return true;
        await new Promise((r) => setTimeout(r, 40));
      }

      this.previousSwap = swap;
    }

    if (new URL(window.location.href).hash === "#priceComposer")
      return this.process(listener, await nextSwaps);
  }

  async fetchLatestPrice() {
    const swaps = await this.fetchSwaps(this.nextSegment - this.params.sampleRate, 0, Math.floor(Date.now() / 1000));

    if (!Array.isArray(swaps?.data?.swaps)) return 0;

    return this.swapToPrice(swaps.data.swaps.slice(-1)[0]).price;
  }

  swapToPrice(swap) {
    let price =
      swap.amount0In > 0
        ? swap.amount0In / swap.amount1Out
        : swap.amount0Out / swap.amount1In;
    if (!this.pair) {
      // check price to be able to determine what to display
      this.pair = `${swap.pair[price < 0.01 ? "token1" : "token0"].symbol}/${
        swap.pair[price < 0.01 ? "token0" : "token1"].symbol
      }`;
    }

    if (this.pair.split("/")[0] !== swap.pair.token0.symbol) price = 1 / price;

    return {
      timestamp: swap.timestamp,
      price,
    };
  }
}
