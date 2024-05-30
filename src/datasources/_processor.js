// this is technically an abstract class
export class Processor {
  constructor(composer, ticker, since, sampleRate, n) {
    this.params = { ticker, since, sampleRate };
    this.composer = composer;
  }

  _applyPriceChange(price, timestamp) {
    this.composer.applyPriceChange(price);

    this.nextSegment = timestamp + this.params.sampleRate;

    this.latestPrice = price;

    if (this.composer.isOver) {
      this.notify(true);
      return true;
    }

    this.notify(false);
    return false;
  }

  notify(isOver = false) {
    if (!this.listener) return;
    this.listener(
      {
        segment: this.nextSegment,
        price: this.latestPrice,
        ticker: this.params.ticker,
      },
      isOver
    );
  }
}

