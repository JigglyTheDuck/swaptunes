import { fetchQuotes, fetchPrice } from "./yahoo";
import { Processor } from "./_processor";
import config from "../config";

export class PriceProcessor extends Processor {
  isSinceAdjusted = false;

  translateSampleRate() {
    switch (this.params.sampleRate) {
      case 1800:
        // return "30m";
        return "5m";
      case 3600:
        return "1h";
      case 86400:
        return "1d";
    }
  }

  calculateLength() {
    switch (this.params.sampleRate) {
      case 1800:
        return "1mo";
      case 3600:
        return "3mo";
      case 86400:
        return "1y";
    }
  }

  async process(listener) {
    this.listener = listener;

    const quotes = await fetchQuotes(
      this.params.ticker,
      this.translateSampleRate(),
      // this.params.since
      this.calculateLength()
    );

    this.nextSegment = this.params.since;

    // last two values are always unreliable
    quotes.pop();
    quotes.pop();

    // assuming since has been set correctly. eventually we will need to use that

    for (const quote of quotes) {
      if (
        quote.timestamp >= this.nextSegment &&
        (this.params.sampleRate === 86400 ||
          quote.timestamp % this.params.sampleRate === 0)
      ) {
        // first: set this as since
        if (!this.isSinceAdjusted) {
          this.isSinceAdjusted = true;
          this.params.since = quote.timestamp;
        }

        if (this._applyPriceChange(quote.price, quote.timestamp)) return true;
        await new Promise((r) => setTimeout(r, 40));
      }
    }

    return this.proceed();
  }

  async proceed() {
    const now = Math.floor(Date.now() / 1000);
    const delayedNow = now - config.confirmationDelay;
    if (delayedNow < this.nextSegment) {
      return now < this.nextSegment;
    }
    const quotes = await fetchQuotes(this.params.ticker, "5m", "1d");
    quotes.pop();
    quotes.pop();

    for (const quote of quotes) {
      if (quote.timestamp >= this.nextSegment) {
        if (this._applyPriceChange(quote.price, quote.timestamp)) return true;
      }
    }

    if (now > this.nextSegment) return false;

    return true;
  }

  async fetchLatestPrice() {
    const price = await fetchPrice(this.params.ticker);

    return parseFloat(price.replace(/,/g, ""));
  }
}
