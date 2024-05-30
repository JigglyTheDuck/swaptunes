import { route } from "../../utils";
import { keys as scales } from "../../modules/composers/_priceComposer";
import {
  template,
  advancedFieldsTemplate,
  baseFieldsTemplate,
  formatDate,
} from "./templates";

import { initializeForm } from "./form";
import { getParams, now5Minutes, N } from "./params";
import config from "../../config";

const { pools } = config.market.uniswap;
const { indices } = config.market.stocks;
const { songLengthOptions, composerOptions } = config.market;

const renderForm = (root) => {
  let {
    source,
    ticker,
    sampleRate,
    t,
    n,
    composer,
    targetChannelCount,
    initialScale,
  } = getParams();
  const getActivePoolIndex = () => {
    return pools.findIndex((p) => p.address === ticker);
  };
  const getActiveIndex = () => {
    return indices.findIndex((p) => p.ticker === ticker);
  };

  const getDisplayTicker = () => {
    return source === "uniswap"
      ? pools[getActivePoolIndex()].pair
      : indices[getActiveIndex()].name;
  };

  const toggleSource = () => {
    if (source === "uniswap") {
      source = "index";
      ticker = indices[0].ticker;
      sampleRate = config.market.stocks.sampleRates[0];
    } else {
      source = "uniswap";
      ticker = pools[0].address;
      sampleRate = pools[0].minSampleRate;
    }

    updateTime();
  };

  const toggleTicker = () => {
    if (source === "uniswap") {
      const poolIndex = getActivePoolIndex() ^ 1;
      ticker = pools[poolIndex].address;
      sampleRate = pools[poolIndex].minSampleRate;
    } else {
      const stockIndex = getActiveIndex() ^ 1;
      ticker = indices[stockIndex].ticker;
      sampleRate = config.market.stocks.sampleRates[0];
    }

    updateTime();
  };

  const toggleChannelCount = () => {
    targetChannelCount = (targetChannelCount + 1) % 3;
  };

  const toggleScale = () => {
    initialScale = (initialScale + 1) % Object.keys(scales).length;
  };

  const toggleSampleRate = () => {
    if (source === "uniswap") {
      const poolIndex = getActivePoolIndex();
      if (sampleRate >= pools[poolIndex].maxSampleRate) {
        sampleRate = pools[poolIndex].minSampleRate;
      } else {
        sampleRate += pools[poolIndex].sampleRateSteps;
      }
    } else {
      const currentIndex = config.market.stocks.sampleRates.findIndex(
        (s) => s === sampleRate
      );
      if (currentIndex >= config.market.stocks.sampleRates.length - 1) {
        sampleRate = config.market.stocks.sampleRates[0];
      } else {
        sampleRate = config.market.stocks.sampleRates[currentIndex + 1];
      }
    }
    updateTime();
  };

  const updateTime = () => {
    if (t === "live" && composer !== "Musical") return t;
    // actually wrong, if not uniswap we will need to be clever here,
    // markets aren't always open
    const sampleRateIndex = config.market.stocks.sampleRates.findIndex(
      (s) => s === sampleRate
    );
    t =
      now5Minutes() -
      sampleRate *
        (source === "uniswap"
          ? config.market.uniswap.N
          : config.market.stocks.Nvalues[sampleRateIndex]) *
        n;
  };

  if (t === 0) updateTime();

  root.innerHTML = template({
    source,
    ticker: getDisplayTicker(),
    sampleRate,
    t,
    isSinceDisabled: composer === "Musical",
  });
  const form = document.getElementById("market-form");

  const setFormState = (state = "base") => {
    if (destroyForm) destroyForm();
    form.innerHTML =
      state === "base"
        ? baseFieldsTemplate({
            source,
            ticker: getDisplayTicker(),
            sampleRate,
            t,
            isSinceDisabled: composer === "Musical",
          })
        : advancedFieldsTemplate({
            n,
            composer,
            targetChannelCount,
            initialScale,
          });
    destroyForm = initializeForm(
      form,
      state === "base" ? submitBaseForm : submitAdvancedForm
    );
  };

  const submitBaseForm = (data, elements) => {
    const index = elements.findIndex((e) => e.children[0]?.value === data);

    if (index === elements.length - 2) return; // back button

    elements[index].focus();
    elements[index].checked = true;

    if (data === "source") {
      toggleSource();

      elements[index + 1].innerText = source;
      elements[index + 2].children[1].innerText =
        source === "uniswap" ? "Token pair" : "Ticker";
      elements[index + 3].innerText = getDisplayTicker();
      elements[index + 5].innerText = sampleRate;
      elements[index + 7].innerText = formatDate(t);
    } else if (data === "ticker") {
      toggleTicker();
      elements[index + 1].innerText = getDisplayTicker();
      elements[index + 3].innerText = sampleRate;
      elements[index + 5].innerText = formatDate(t);
    } else if (data === "sampleRate") {
      toggleSampleRate();
      elements[index + 1].innerText = sampleRate;
      elements[index + 3].innerText = formatDate(t);
    } else if (data === "since") {
      t = t === "live" ? 0 : "live";
      updateTime();
      elements[index + 1].innerText = formatDate(t);
    } else if (data === "adv") {
      setFormState("adv");
    } else {
      route("priceComposer", {
        sampleRate,
        source,
        ticker,
        t: t === "live" ? Math.floor(Date.now() / 1000) - 4 * sampleRate : t,
        n: t === "live" ? 1000 : n,
        composer,
        targetChannelCount: targetChannelCount + 1,
        initialScale,
      });
    }
  };

  const submitAdvancedForm = (data, elements) => {
    const index = elements.findIndex((e) => e.children[0]?.value === data);
    elements[index].focus();
    elements[index].checked = true;

    if (data === "songLength") {
      n =
        songLengthOptions[
          (songLengthOptions.indexOf(n) + 1) % songLengthOptions.length
        ];
      updateTime();
      elements[index + 1].innerText = n;
    } else if (data === "composer") {
      composer =
        composerOptions[
          (composerOptions.indexOf(composer) + 1) % composerOptions.length
        ];
      elements[index + 1].innerText = composer;
      updateTime();
    } else if (data === "targetChannelCount") {
      toggleChannelCount();
      elements[index + 1].innerText = targetChannelCount + 1;
    } else if (data === "initialScale") {
      toggleScale();
      elements[index + 1].innerText = Object.keys(scales)[initialScale];
    } else if (data === "base") {
      setFormState("base");
    }
  };

  let destroyForm = initializeForm(form, submitBaseForm);
  return destroyForm;
};

export default renderForm;
