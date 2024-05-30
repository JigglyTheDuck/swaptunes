import Chart from "../../components/chart";
import navItem from "../../components/navitem";
import { _playBtn } from "../../components/playbtn";
import _copyBtn from "../../components/copybtn";
import _storeBtn from "../../components/storebtn";
import Jiggly2 from "../../modules/composers/jiggly2";
import Jiggly1 from "../../modules/composers/jiggly1";
import Jiggly4 from "../../modules/composers/jiggly4";
import { Decoder, Encoder } from "../../modules/encoder";
import { Parser } from "../../modules/parser";
import { keys as scales } from "../../modules/composers/_priceComposer";
import { commandTemplate } from "../editor";
import {
  e,
  route,
  setQueryParams,
  getSongLength,
  clearQueryParams,
} from "../../utils";
import config from "../../config";

import "./index.css";

import { formatDate } from "../market/templates";
import { PriceProcessor } from "../../datasources/processor";
import { PriceProcessor as IndexPriceProcessor } from "../../datasources/indexProcessor";
import { statusTemplate, channelTemplate, template } from "./template";
import renderSong, { channelToElements } from "./renderSong";

import { Renderer } from "../baseRenderer";
const { pools } = config.market.uniswap;
const { indices } = config.market.stocks;
const renderPrice = (p) => p.toFixed(2);

class PriceComposerRenderer extends Renderer {
  processor;
  chart;
  previewComposer;
  isDestroyed = false;
  elements = {
    failureDialog: null,
    songDialog: {
      root: "dialog__priceComposer_song",
      form: "dialog__priceComposer_song_form",
    },
    shareDialog: {
      root: "dialog__priceComposer_share",
      input: "dialog__priceComposer_share_input",
      copy: "dialog__priceComposer_share_action",
    },
    actions: {
      root: "priceComposer__actions",
      insertSong: "priceComposer__action_add_song",
      play: "priceComposer__action_play",
      share: "priceComposer__action_share",
      store: "priceComposer__action_store",
      compose: "priceComposer__action_compose",
      switchView: "priceComposer__action_switch_view",
    },
    channels: ["channel-0", "channel-1", "channel-2"],
    headerStatus: "header__status",
    processingStatus: "priceComposer__processing_status",
    composition: {
      root: "compositionProgress",
      options: "options",
      mark: "mark",
      segmentRoot: "segment",
    },
    progress: {
      container: "priceComposer__progress",
      bar: "priceComposer__progress_bar",
      value: "priceComposer__progress_value",
    },
    canvas: "canvas",
  };
  timers = {
    composition: null,
  };
  intervals = {
    composition: null,
  };

  listeners = {
    windowResize: null,
    actions: {
      insertSong: null,
      play: null,
      store: null,
      share: null,
      shareCopy: null,
      switchView: null,
    },
  };

  constructor(root, processor) {
    super(root);

    this.processor = processor;
    this.renderLayout(template({ n: this.processor.composer.LIMIT }));
    this.chart = new Chart({ canvas: this.elements.canvas });
    this._show(root);
    this._enterState("processing");
  }

  resetState() {
    for (const k of Array.from(Object.keys(this.timers)))
      clearTimeout(this.timers[k]);
    for (const k of Array.from(Object.keys(this.intervals)))
      clearInterval(this.intervals[k]);

    // hide all elements by default
    for (const ch of this.elements.channels) this._hide(ch);

    for (const k of Array.from(Object.keys(this.elements.actions)))
      this._hide(this.elements.actions[k]);

    this._hide(this.elements.progress.container);
    this._hide(this.elements.processingStatus);
    this._hide(this.elements.composition.root);

    this.removeListeners();
  }

  removeListeners() {
    window.removeEventListener("resize", this.listeners.windowResize);
    this.elements.actions.play.onclick = null;
    this.elements.actions.share.onclick = null;
    this.elements.shareDialog.copy.onclick = null;
    this.elements.actions.switchView.onclick = null;
    this.elements.actions.store.onclick = null;
    this.elements.actions.compose.onclick = null;
    this.elements.actions.insertSong.onclick = null;

    if (this.destroyPlayBtn) this.destroyPlayBtn();
  }

  attachListeners() {
    let previousWidth = 0;
    const onResize = () => {
      if (Math.abs(window.innerWidth - previousWidth) < 50) return;
      previousWidth = window.innerWidth;
      this.elements.canvas.width = this.elements.canvas.parentElement.getBoundingClientRect().width;
      this.elements.canvas.height = canvas.width / 1.5;
      this.chart.draw(this.processor.composer.priceHistory);
    };

    this.elements.actions.share.onclick = () => {
      this.elements.shareDialog.root.showModal();
    };
    this.elements.actions.switchView.onclick = () => {};
    this.elements.actions.insertSong.onclick = () => {};

    _copyBtn(this.elements.shareDialog.copy, () => window.location.href);

    window.addEventListener("resize", onResize);

    onResize();

    this.listeners.windowResize = onResize;

    let control = { cleared: false };

    this.destroyPlayBtn = _playBtn(
      this.elements.actions.play,
      () => {
        control.cleared = false;
        return this.processor.composer.render();
      },
      {
        onStop: () => {
          control.cleared = true;
          this.chart.draw(this.processor.composer.priceHistory);
          this.renderChannels();
        },
        onPlay: () => {
          control.playSince = Date.now();
          renderSong(
            control,
            {
              channels: this.elements.channels,
              channelCommands: this.processor.composer.track.map(
                channelToElements
              ),
              c: this.processor.composer,
              chart: this.chart,
              songLength: getSongLength(160, this.processor.composer.seek[0]),
            },
            {
              prevN: 0,
              previousIndex: [0, 0, 0],
              latestCommandIndex: 1,
            }
          );
        },
      }
    );
  }

  _enterState(state) {
    this.resetState();
    this.attachListeners();
    switch (state) {
      case "processing":
        return this.enterProcessingState();
      case "composing":
        return this.enterComposingState();
      case "finished":
        return this.enterFinishedState();
      default:
    }
  }

  enterProcessingState() {
    this._show(this.elements.processingStatus);
    const onProgress = ({ segment, price, ticker }, isOver) => {
      this.elements.processingStatus.innerHTML = `<span>${new Date(
        segment * 1000
      ).toLocaleString()}</span>
      <span>${ticker}: ${price.toFixed(4)}</span>
    `;
      this.elements.progress.bar.value = this.processor.composer.priceHistory.length;
      this.elements.progress.value.innerText = `${this.processor.composer.priceHistory.length}/${this.processor.composer.LIMIT}`;
      this.chart.draw(this.processor.composer.priceHistory);
    };

    this.processor.process(onProgress).then(() => {
      if (this.processor.composer.isOver) {
        this._enterState("finished");
      } else {
        this._enterState("composing");
      }
    });
  }

  renderOptions(currentPrice) {
    let desiredOption = -1;
    if (this.previewComposer) {
      desiredOption = this.previewComposer.findNextOption(
        this.processor.composer
      );
    }
    this.elements.composition.segmentRoot.innerText = formatDate(
      this.processor.nextSegment
    );

    while (this.elements.composition.options.children.length > 1) {
      this.elements.composition.options.lastChild.remove();
    }

    const labels = this.processor.composer.getOptionLabels();
    const limits = this.processor.composer.getOptionRanges(
      this.processor.composer.getNextPriceOptionsSize()
    );

    const range = [limits[0], limits.slice(-1)[0]];
    const step = limits[1] - limits[0];
    let position = (limits.slice(-1)[0] - currentPrice) / step;

    position =
      currentPrice === null
        ? null
        : Math.min(limits.length, Math.max(-1, position));

    const label = document.createElement(`SPAN`);
    label.innerText = labels.slice(-1)[0];
    this.elements.composition.options.appendChild(label);
    if (position < 0) {
      label.classList.add("active");
    }

    for (let i = limits.length - 1; i >= 0; --i) {
      const _label = document.createElement("SPAN");
      //  _label.classList.add("nes-text", "is-warning");
      const optionIndex = limits.length - 1 - i;
      if (Math.floor(position) === optionIndex) {
        _label.classList.add(
          "active",
          "nes-text",
          desiredOption === optionIndex ? "is-success" : "is-primary"
        );
      }
      const el = document.createElement("SPAN");
      el.innerText = `${renderPrice(limits[i])}`;
      _label.innerText = labels[i];
      this.elements.composition.options.appendChild(el);
      this.elements.composition.options.appendChild(_label);
    }

    if (currentPrice !== null)
      this.elements.composition.mark.style.transform = `translateY(${
        position * 48
      }px)`;
  }

  renderStatus() {
    this._render(
      this.elements.headerStatus,
      statusTemplate({
        source: this.processor instanceof PriceProcessor ? "uniswap" : "index",
        ticker:
          this.processor instanceof PriceProcessor
            ? pools.find((p) => p.address === this.processor.params.address)
                .pair
            : indices.find((i) => i.ticker === this.processor.params.ticker)
                .name,
        since: formatDate(this.processor.params.since),
        sampleRate: this.processor.params.sampleRate,
      })
    );

    this.chart.draw(this.processor.composer.priceHistory);
  }

  renderChannels() {
    const channels = this.elements.channels;
    for (const [i, channel] of channels.entries()) {
      if (i === 0) this._show(channel.parentElement);
      // if has preview track must reflect it...
      // actually it could be as simple as flagging the line
      console.log(this.processor.composer.track[i]);
      // console.log(this.previewComposer.track[i])
      this._render(
        channel,
        channelTemplate(i, this.processor.composer.track, [0, 5])
      );
    }
    if (window.innerWidth < 800) {
      this._hide(channels[1]);
      this._hide(channels[2]);
    }
  }

  enterComposingState() {
    this.renderStatus();
    this._show(this.elements.actions.root);
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.play);
    this._show(this.elements.actions.compose);
    this._show(this.elements.actions.insertSong);
    this._show(this.elements.actions.switchView);

    this.elements.actions.compose.onclick = () => {
      new Encoder()
        .encode((this.previewComposer || this.processor.composer).render(false))
        .then((previewTrack) => route("composer", { previewTrack }));
    };

    const process = () => {
      this.renderChannels();
      this.processor.proceed().then((result) => {
        if (result === false) {
          this.elements.composition.root.children[1].classList.remove("hidden");
          this.renderOptions(null);
          return;
        }
        this.elements.composition.root.children[1].classList.add("hidden");
        this.processor.fetchLatestPrice().then(this.renderOptions.bind(this));
      });
    };

    this.elements.actions.insertSong.onclick = () => {
      this.elements.songDialog.root.showModal();
    };

    this.elements.songDialog.form.onsubmit = (e) => {
      if (!this.loadPreviewTrack(new FormData(e.target).get("song"))) {
        e.preventDefault();
      }
    };

    this.elements.actions.switchView.onclick = () => {
      if (this.elements.canvas.classList.contains("hidden")) {
        this.elements.canvas.classList.remove("hidden");
        this.elements.composition.root.classList.add("hidden");
      } else {
        this.elements.canvas.classList.add("hidden");
        this.elements.composition.root.classList.remove("hidden");
      }
    };

    const checkTrackInUrl = () => {
      const params = new URLSearchParams(window.location.search);

      const previewTrack = new URLSearchParams(window.location.search).get(
        "previewTrack"
      );
      if (!previewTrack) return Promise.resolve(null);
      return new Decoder()
        .decode(previewTrack)
        .then(this.loadPreviewTrack.bind(this));
    };

    checkTrackInUrl().then(() => {
      // need to check the cutoff point
      // erm, it'll be different for each channel...
      process();
    });

    this.intervals.composition = setInterval(process, 15000);
  }

  enterFinishedState() {
    this.renderStatus();
    this._show(this.elements.actions.root);
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.store);
    this._show(this.elements.actions.play);
    _storeBtn(this.elements.actions.store, () =>
      this.processor.composer.render()
    );

    this.renderChannels();
  }

  destroy() {
    this.isDestroyed = true;
    this.resetState();
  }

  revive() {
    this.isDestroyed = false;
  }

  loadPreviewTrack(track) {
    this.previewComposer = new Jiggly4(
      this.processor.composer.LIMIT,
      this.processor.composer.MA,
      this.processor.composer.AVG,
      this.processor.composer.scale,
      this.processor.composer.targetChannelCount
    );

    try {
      console.log(this.processor.composer.optionChain);
      console.log(
        this.previewComposer.parse(
          track,
          this.processor.composer.priceHistory.slice(0, this.previewComposer.MA)
        )
      );
    } catch (e) {
      debugger;
      return false;
    }

    const _track = this.previewComposer.render(false);
    const isValid = _track.startsWith(this.processor.composer.render(false));
    if (isValid) {
      new Encoder().encode(_track).then((previewTrack) => {
        setQueryParams({
          previewTrack,
        });
      });
    } else {
      this.previewComposer = null;
    }
    return isValid;
  }
}

export default (root) => {
  const url = new URL(window.location.href);
  const composer = url.searchParams.get("composer") || "Musical";
  const n = parseInt(url.searchParams.get("n"));
  const processor = new (url.searchParams.get("source") === "uniswap"
    ? PriceProcessor
    : IndexPriceProcessor)(
    composer === "Simple"
      ? new Jiggly1(n)
      : composer === "Experimental"
      ? new Jiggly4(
          n,
          4,
          1,
          Object.keys(scales)[parseInt(url.searchParams.get("initialScale"))],
          parseInt(url.searchParams.get("targetChannelCount"))
        )
      : new Jiggly2(n),
    url.searchParams.get("ticker"),
    parseInt(url.searchParams.get("t")),
    parseInt(url.searchParams.get("sampleRate")),
    n
  );

  const renderer = new PriceComposerRenderer(root, processor);

  return () => {
    if (renderer) renderer.destroy();
  };
};
