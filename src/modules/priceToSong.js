import config from "../config";
import { Composer } from "./composer";
import { Parser } from "./parser";

const getRange = (price) => [
  price * (1 / config.priceRange),
  price * config.priceRange,
];

export function getPriceOptions(price, options) {
  const range = getRange(price);

  const priceOptions = [];
  let minPrice = range[0];
  let maxPrice = minPrice;
  let index = 0;
  for (const { option, probability } of options) {
    if (probability === 0) {
      priceOptions.push({
        value: option,
        minPrice: 0,
        maxPrice: 0,
      });
      continue;
    }
    maxPrice += (range[1] - range[0]) * probability;

    priceOptions.push({
      value: option,
      minPrice,
      maxPrice,
    });

    minPrice = maxPrice;
  }

  return priceOptions;
}

/*
 * this function takes the original options and adjusts them
 * in case the target price is outside of the range
 * we can also shuffle later...
 * */
export function getNormalizedPriceOptions(previousPrice, targetPrice, options) {
  const priceOptions = getPriceOptions(previousPrice, options);
  // TODO: even though this is great for future reference, it completely breaks price prediction to be fair, price prediction is kind of broken to begin with..
  const getMinPrice = (_poptions) =>
    _poptions.reduce(
      (min, { minPrice }) =>
        minPrice < min && minPrice !== 0 ? minPrice : min,
      Number.MAX_SAFE_INTEGER
    );
  const getMaxPrice = (_poptions) =>
    _poptions.reduce(
      (max, { maxPrice }) => (maxPrice > max ? maxPrice : max),
      0
    );

  let minPrice = getMinPrice(priceOptions);
  let maxPrice = getMaxPrice(priceOptions);

  if (targetPrice < minPrice) {
    const newPriceOptions = getPriceOptions(minPrice, options);
    minPrice = getMinPrice(newPriceOptions);

    // still too low
    if (targetPrice < minPrice)
      return getNormalizedPriceOptions(minPrice, targetPrice, options);

    return newPriceOptions;
  } else if (targetPrice > maxPrice) {
    const newPriceOptions = getPriceOptions(
      priceOptions[priceOptions.length - 1].maxPrice,
      options
    );
    maxPrice = getMaxPrice(newPriceOptions);

    // still too high
    if (targetPrice > newPriceOptions[priceOptions.length - 1].maxPrice)
      return getNormalizedPriceOptions(maxPrice, targetPrice, options);

    return newPriceOptions;
  }

  return priceOptions;
}

export function generatePriceHistory(initialPrice, song, hook) {
  let priceHistory = [initialPrice];
  const p = new Parser((selectedOption, options) => {
    const priceOptions = getPriceOptions(priceHistory.slice(-1)[0], options);
    const priceOption = priceOptions[selectedOption];
    const price = (priceOption.minPrice + priceOption.maxPrice) / 2;
    /*
      priceOption.minPrice +
        Math.random() * (priceOption.maxPrice - priceOption.minPrice)*/

    priceHistory.push(price);
  });

  p.parse(song);

  return priceHistory;
}

export function getSelectedOptionIndex(previousPrice, price, options) {
  // indices of price options may not match options!
  const priceOptions = getNormalizedPriceOptions(previousPrice, price, options);
  let selectedIndex = 0;
  let maxValue = -1;
  let maxIndex = -1;
  while (selectedIndex < priceOptions.length) {
    if (priceOptions[selectedIndex].maxPrice > maxValue) {
      maxValue = priceOptions[selectedIndex].maxPrice;
      maxIndex = selectedIndex;
    }
    if (
      priceOptions[selectedIndex].maxPrice > 0 &&
      price < priceOptions[selectedIndex].maxPrice
    )
      break;
    selectedIndex += 1;
  }

  const pairedOptionIndex = options.findIndex(
    (o) =>
      o.option ===
      priceOptions[
        selectedIndex === priceOptions.length ? maxIndex : selectedIndex
      ].value
  );

  if (pairedOptionIndex === -1) throw new Error("option pairing failed");

  return pairedOptionIndex;
}

export function generateSong(priceHistory) {
  const c = new Composer();
  for (let i = 1; i < priceHistory.length; ++i) {
    if (c.isFinished) break;

    c.applyOption(
      getSelectedOptionIndex(
        priceHistory[i - 1],
        priceHistory[i],
        c.getNextOptions()
      )
    );
  }

  return c.renderTrack();
}
