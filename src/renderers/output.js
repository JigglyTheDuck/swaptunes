import {
  getNormalizedPriceOptions,
  getSelectedOptionIndex,
} from "../modules/priceToSong";
import SlimChart from "../components/chart";
import { Parser } from "../modules/parser";
import playBtn from "../components/playbtn";
import { Encoder } from "../modules/encoder";
import config from "../config";
import { parseLine } from "../utils";

const layout = `
<dialog class="nes-dialog width-md" id="output__compositionFailedDialog">
  <form method="dialog">
    <div class="nes-field">
      <p>Song composition failed :(</p>
    </div>
    <menu class="dialog-menu inline justify-center padding-sm align-center">
      <button class="nes-btn">back</button>
    </menu>
  </form>
</dialog>
<dialog class="nes-dialog width-md" id="output__shareDialog">
  <form method="dialog">
    <div class="nes-field">
      <label for="output__shareInput">Share this URL on your preferred platform</label>
      <input
        type="text"
        id="output__shareInput"
        class="nes-input"
        readonly
      />
    </div>
    <menu class="dialog-menu inline justify-center padding-sm gap-md align-center">
      <button class="nes-btn">back</button>
      <button id="output__shareCopy" class="nes-btn is-primary" type="button">copy</button>
    </menu>
  </form>
</dialog>
<dialog class="nes-dialog width-md" id="output__dialog">
  <form method="dialog" id="output__dialogForm">
    <label for="output__dialogTextArea">
      Set a song that you aim to compose by trading.
    </label>
    <textarea name="song" id="output__dialogTextArea" class="nes-textarea"></textarea>
    <p class="sm nes-text is-warning">
       It must match the current composition so far.
    </p>
    <menu class="dialog-menu inline justify-center padding-sm gap-md align-center">
      <button id="output__dialogCloseBtn" type="button" class="nes-btn">back</button>
      <button class="nes-btn is-primary">confirm</button>
    </menu>
  </form>
</dialog>
<header class="inline md justify-space-between gap-md">
  <p class="nes-text hidden text align-center" id="output__message"></p>
  <h3 class="stack">
    <span id="output__currentTime"></span>
    <span id="output__currentPrice"></span>
  </h3>
  <button id="output__actionInsertSong" class="nes-btn is-success hidden">add song</button>
</header>
<div class="inline sm reverse gap-md justify-space-between align-start">
  <div class="stack"> 
    <pre id="output__compositionPrevious" class="composition-output"></pre>
    <p id="output__compositionPending" class="composition-output nes-text is-warning"></p>
    <p id="output__compositionActive" class="composition-output nes-text"></p>
    <pre id="output__compositionPreview" class="composition-output nes-text is-success"></pre>
  </div>
  <div class="stack gap-xs">
    <button id="output__actionCompose" class="nes-btn hidden">compose</button>
    <a href="" target="_blank" id="output__actionTrade" class="nes-btn hidden is-warning">trade</a>
    <button id="output__actionShare" class="nes-btn hidden">share</button>
    <button id="output__actionPlay" class="nes-btn hidden is-primary">play</button>
  </div>
</div>
<div class="option-container hidden" id="output__options"></div>
<div class="hidden" id="output__chart"></div>
<footer class="inline justify-center">
    <button id="output__actionToggleView" class="nes-btn hidden is-primary">toggle view</button>
    <p id="output__footerMessage" class="nes-text is-primary"></button>
</footer>
`;

const formatPrice = (price) =>
  price > 100000
    ? Math.round(price)
    : price > 10000
    ? price.toFixed(1)
    : price > 1000
    ? price.toFixed(2)
    : price > 100
    ? price.toFixed(3)
    : price > 10
    ? price.toFixed(4)
    : price > 1
    ? price.toFixed(5)
    : price.toFixed(6);

export class OutputRenderer {
  currentPrice; // this is not reduntant from processor it's updated before
  nextSegment;
  processor;
  isRendering;
  composer;
  root;
  timers = {
    time: 0,
    processor: 0,
  };

  previewTrack = null;

  currentState = "pending start";

  elements = {
    failureDialog: null,
    songDialog: {
      root: null,
      form: null,
      closeBtn: null,
    },
    shareDialog: {
      root: null,
      input: null,
      copy: null,
    },
    actions: {
      insertSong: null,
      play: null,
      share: null,
      trade: null,
      compose: null,
      toggleView: null,
    },
    composition: {
      active: null,
      previous: null,
      preview: null,
      pending: null,
    },
    chart: null,
    message: null,
    time: null,
    options: null,
    price: null,
    footerMessage: null,
  };

  get now() {
    return Math.floor(Date.now() / 1000);
  }

  get isSegmentConfirmed() {
    return this.nextSegment === this.processor.nextSegment;
  }

  constructor(processor, root, previewTrack) {
    this.processor = processor;
    this.renderLayout(root);
    this._show(root);
    this._enterState("awaiting");
    if (previewTrack) this.previewTrack = previewTrack;
  }

  destroy() {
    this.resetState();
  }

  _render(element, content) {
    this._show(element);
    element.innerText = content;
  }

  _show(element) {
    element.classList.remove("hidden");
  }

  _hide(element) {
    element.classList.add("hidden");
  }

  _renderTime(timestamp) {
    if (timestamp > this.now) {
      clearTimeout(this.timers.time);
      this._render(
        this.elements.time,
        `${new Date(timestamp * 1000).toLocaleString()} (in ${
          timestamp - this.now
        }s)`
      );
      this.timers.time = setTimeout(() => this._renderTime(timestamp), 500);
      return;
    }

    this._render(
      this.elements.time,
      new Date(timestamp * 1000).toLocaleString()
    );
  }

  _renderPrice(price, pair) {
    this._render(this.elements.price, `${pair} ${formatPrice(price)}`);
  }

  resetState() {
    for (const k of Array.from(Object.keys(this.timers)))
      clearTimeout(this.timers[k]);

    // hide all elements by default
    for (const k of Array.from(Object.keys(this.elements.composition)))
      this._hide(this.elements.composition[k]);

    for (const k of Array.from(Object.keys(this.elements.actions)))
      this._hide(this.elements.actions[k]);

    this._hide(this.elements.time);
    this._hide(this.elements.price);
    this._hide(this.elements.options);
  }

  _enterState(state) {
    this.resetState();
    switch (state) {
      case "processing":
        return this.enterProcessingState();
      case "composing":
        return this.enterComposingState();
      case "awaiting":
        return this.enterAwaitingStartState();
      case "finished":
        return this.enterFinishedState();
      default:
    }
  }

  enterAwaitingStartState() {}
  enterFinishedState() {
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.compose);
    this._show(this.elements.actions.play);

    this._render(this.elements.message, "This composition is final!");
    this.elements.message.classList.add("is-success", "blink");
    this.elements.actions.play.playTrack(
      this.processor.composer.renderTrack.bind(this.processor.composer)
    );

    this.renderChart();

    this._render(
      this.elements.composition.previous,
      this.processor.composer.renderTrack().split("\n").slice(-8).join("\n")
    );

    this.elements.actions.compose.onclick = async () => {
      try {
        this.elements.actions.compose.innerText = "copied!";
        await navigator.clipboard.writeText(
          this.processor.composer.renderTrack()
        );
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(error.message);
      } finally {
        this.elements.actions.compose.innerText = "compose";
      }
    };
  }

  enterComposingState() {
    this.currentPrice = this.processor.previousSwap.price;
    this.nextSegment = this.processor.nextSegment;

    this.view = "options";

    if (this.previewTrack) {
      try {
        this.setPreviewTrack(this.previewTrack);
      } catch (e) {}
    }

    this.setQueryParams();

    this.elements.actions.toggleView.onclick = () => {
      this.view = this.view === "options" ? "chart" : "options";
      if (this.view === "chart") this.renderChart();
      else this.renderOptions();
    };

    this.elements.actions.compose.onclick = async () => {
      try {
        // TODO: not very elegand
        const composerInput = document.getElementById("composerInput");
        if (!composerInput) return;
        const track = this.processor.composer.renderTrack();
        composerInput.value = track;
        composerInput.dispatchEvent(new Event("change"));
        composerInput.scrollIntoView({ block: "center", behavior: "smooth" });

        this.elements.actions.compose.innerText = "copied!";
        await navigator.clipboard.writeText(track);
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(error.message);
      } finally {
        this.elements.actions.compose.innerText = "compose";
      }
    };

    this.renderComposingScreen();
  }

  renderOptions() {
    this._hide(this.elements.chart);
    this._render(this.elements.options, "");

    const composerOptions = this.processor.composer.getNextOptions();

    const options = getNormalizedPriceOptions(
      this.previousPrice,
      this.currentPrice,
      composerOptions
    );

    const _selectedOptionIndex = getSelectedOptionIndex(
      this.previousPrice,
      this.currentPrice,
      composerOptions
    );
    const selectedOptionIndex = options.findIndex(
      (o) => o.value === composerOptions[_selectedOptionIndex].option
    );

    let previewOptionIndex = -1;

    // find current preview index
    if (this.previewTrack) {
      const currentLineIndex =
        this.processor.composer.renderTrack().split("\n").length - 1;
      const previewAction = this.previewTrack.split("\n")[currentLineIndex];
      if (previewAction) {
        // TODO: this is nice and all but totally useless
        // if the last value won't match it won't trigger error
        const [cmd, values] = parseLine(previewAction);
        if (this.processor.composer.currentCommand.cmd === null) {
          previewOptionIndex = options.findIndex((o) => o.value === cmd);
        } else if (this.processor.composer.currentCommand.cmd === cmd) {
          let isFaulty = false;
          for (
            let i = 0;
            i < this.processor.composer.currentCommand.values.length;
            ++i
          ) {
            if (this.processor.composer.currentCommand.values[i] != values[i])
              isFaulty = true;
          }

          if (!isFaulty) {
            previewOptionIndex = options.findIndex(
              (o) =>
                o.value ==
                  values[
                    this.processor.composer.currentCommand.values.length
                  ] ||
                `${o.value},` ===
                  values[this.processor.composer.currentCommand.values.length]
            );
          } else {
            // it's faulty handle error
            this.previewTrack = null;
            this.elements.failureDialog.showModal();
          }
        } else {
          // TODO: absolutely not, we can eager load wrong values that may still resolve just fine
          this.previewTrack = null;
          this.elements.failureDialog.showModal();
        }
      }
    }

    let i = 0;
    for (const option of options) {
      if (option.maxPrice === option.minPrice) {
        i += 1;
        continue;
      }
      const container = document.createElement("div");
      const value = document.createElement("span");
      const priceRange = document.createElement("span");
      container.classList.add(
        "option-box",
        "padding-sm",
        "border",
        "stack",
        "gap-sm",
        "align-center",
        "width-sm"
      );
      priceRange.classList.add("text", "sm");

      if (i === selectedOptionIndex) {
        if (i === previewOptionIndex)
          container.classList.add("nes-text", "is-success");
        else container.classList.add("nes-text", "is-primary");
      } else if (i === previewOptionIndex) {
        container.classList.add("nes-text", "is-warning");
      }

      priceRange.innerText = `${formatPrice(option.minPrice)} - ${formatPrice(
        option.maxPrice
      )}`;

      value.innerText = option.value;

      container.appendChild(value);
      container.appendChild(priceRange);
      this.elements.options.appendChild(container);
      i += 1;
    }
  }

  renderComposition() {
    const hasPreview = this.previewTrack !== null;
    const trackLines = this.processor.composer.renderTrack().split("\n");
    const command = this.processor.composer.currentCommand;
    const isPending = !this.isSegmentConfirmed;

    // simple enough, render last few lines
    this._render(
      this.elements.composition.previous,
      trackLines
        .slice(-5 - (hasPreview ? 0 : 3) - (command.cmd !== null ? 0 : 1))
        .join("\n")
    );

    // if we have a pending we can rotate over possible values
    const nextOptions = this.processor.composer.getNextOptions();

    this._render(this.elements.composition.active, "");
    // active command
    if (command.cmd !== null) {
      const activeCommand = document.createElement("span");
      activeCommand.innerHTML = `${
        command.cmd === "new_loop" ? command.cmd : `&nbsp;&nbsp${command.cmd}`
      } ${command.values.join(", ")} `;
      this._hide(this.elements.composition.preview);

      this.elements.composition.active.appendChild(activeCommand);

      // we currently have an active command
      if (isPending) {
        // command next value has been selected and is pending
        const pendingValue = document.createElement("span");
        pendingValue.innerText = "??? ";
        pendingValue.classList.add("nes-text", "is-primary", "blink");
        this.elements.composition.active.appendChild(pendingValue);
      }

      if (!this.previewTrack) return;
      const [previewCmd, previewValues] = parseLine(
        this.previewTrack.split("\n")[trackLines.length - 1]
      );

      for (let i = 0; i < command.values.length; ++i) {
        if (command.values[i] != previewValues[i]) {
          this.previewTrack = null;
          return;
        }
      }

      const valuesToDisplay = previewValues.slice(
        command.values.length + (isPending ? 1 : 0)
      );

      if (valuesToDisplay.length > 0) {
        const pendingValue = document.createElement("span");
        pendingValue.innerText = valuesToDisplay.join(", ");
        pendingValue.classList.add("nes-text", "is-success");
        this.elements.composition.active.appendChild(pendingValue);
      }

      // now at this point we need to determine whether the preview track has future values here.
    } else if (isPending) {
      // we don't have a command, but it is pending, need to display
      const pendingCommand = document.createElement("span");
      pendingCommand.innerHTML = "&nbsp;&nbsp;???";
      pendingCommand.classList.add("nes-text", "is-primary", "blink");
      this.elements.composition.active.appendChild(pendingCommand);
    } else {
      this._hide(this.elements.composition.active);
    }

    if (hasPreview)
      this._render(
        this.elements.composition.preview,
        this.previewTrack
          .split("\n")
          .slice(
            trackLines.length -
              (command.cmd !== null || (command.cmd === null && isPending)
                ? 0
                : 1),
            trackLines.length +
              (command.cmd !== null || (command.cmd === null && isPending)
                ? 2
                : 3)
          )
          .join("\n")
      );
  }

  renderState() {
    this.elements.actions.play.playTrack(
      this.processor.composer.renderTrack.bind(this.processor.composer)
    );

    this._renderTime(this.nextSegment);
    this._renderPrice(this.currentPrice, this.processor.pair);
    this._show(this.elements.actions.insertSong);
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.trade);
    this._show(this.elements.actions.compose);
    this._show(this.elements.actions.play);

    this.renderComposition();
  }

  renderComposingScreen() {
    this.isRendering = true;

    const refreshPrice = async () => {
      const swaps = await this.processor.fetchSwaps(
        this.now - this.processor.params.sampleRate,
        0,
        this.now
      );

      if (!swaps?.data?.swaps || swaps.data.swaps.length === 0) return;

      const swap = this.processor.swapToPrice(swaps.data.swaps.slice(-1)[0]);

      this.currentPrice = swap.price;
    };

    const processSideEffects = async () => {
      if (this.now > this.nextSegment)
        this.nextSegment = this.nextSegment + this.processor.params.sampleRate;
      if (this.now - config.confirmationDelay > this.processor.nextSegment) {
        await this.processor.process();
        if (this.verifyTrack(this.previewTrack) === null) {
          this.previewTrack = null;
        }
      }
    };

    const render = async () => {
      // TODO: check at least if navigator is online
      // or ping something
      // or the return value from uniswap before committing to changes.

      if (this.processor.composer.isFinished)
        return this._enterState("finished");

      await refreshPrice();

      await processSideEffects();

      this.renderState();

      if (this.view === "options" && this.isSegmentConfirmed)
        this.renderOptions();
      else this.renderChart();

      if (this.isSegmentConfirmed) {
        this._show(this.elements.actions.toggleView);
        this._hide(this.elements.footerMessage);
      } else {
        this._hide(this.elements.actions.toggleView);
        this._render(this.elements.footerMessage, "pending confirmation");
      }

      if (this.nextSegment - this.now) this.isRendering = false;
      this.timers.processor = setTimeout(
        this.renderComposingScreen.bind(this),
        this.nextSegment - this.now < 10
          ? (this.nextSegment - this.now) * 1000
          : 10000
      );
    };

    render();
  }

  renderChart() {
    this._hide(this.elements.options);
    this._render(this.elements.chart, "");
    const canvas = document.createElement("canvas");
    canvas.width = this.elements.chart.clientWidth;
    canvas.height = canvas.width / 2;
    const chart = new SlimChart({ canvas });
    chart.draw(this.processor.priceHistory);
    this.elements.chart.appendChild(canvas);
  }

  renderProcessing(track, details, isOver) {
    if (isOver) {
      if (this.processor.composer.isFinised) {
        return this._enterState("finished");
      }
      return this._enterState("composing");
    }
    this._renderTime(details.segment);
    this._renderPrice(details.price, details.pair);
    this._render(
      this.elements.composition.previous,
      track.split("\n").slice(-10).join("\n")
    );
  }

  renderLayout(root) {
    root.innerHTML = layout;
    const _id = (id) => document.getElementById(`output__${id}`);
    this.elements = {
      failureDialog: _id("failureDialog"),
      songDialog: {
        root: _id("dialog"),
        form: _id("dialogForm"),
        textArea: _id("dialogTextArea"),
        closeBtn: _id("dialogCloseBtn"),
      },
      shareDialog: {
        root: _id("shareDialog"),
        input: _id("shareInput"),
        copy: _id("shareCopy"),
      },
      actions: {
        insertSong: _id("actionInsertSong"),
        play: _id("actionPlay"),
        share: _id("actionShare"),
        trade: _id("actionTrade"),
        compose: _id("actionCompose"),
        toggleView: _id("actionToggleView"),
      },
      composition: {
        active: _id("compositionActive"),
        pending: _id("compositionPending"),
        previous: _id("compositionPrevious"),
        preview: _id("compositionPreview"),
      },
      time: _id("currentTime"),
      options: _id("options"),
      chart: _id("chart"),
      price: _id("currentPrice"),
      message: _id("message"),
      footerMessage: _id("footerMessage"),
    };

    this._show(root.parentElement);
    setTimeout(
      () => root.scrollIntoView({ block: "center", behavior: "smooth" }),
      500
    );
    this.elements.actions.insertSong.onclick = this.onInsertClick.bind(this);
    this.elements.actions.share.onclick = this.onShareClick.bind(this);
    this.elements.shareDialog.copy.onclick = this.onCopyUrlClick.bind(this);
    this.elements.songDialog.closeBtn.onclick =
      this.onDialogBackClick.bind(this);
    this.elements.songDialog.form.onsubmit = this.onTrackSubmit.bind(this);
    this.elements.actions.trade.href = `https://v2.info.uniswap.org/pair/${this.processor.params.address}`;
    playBtn("play", this.elements.actions.play);
  }

  async setQueryParams() {
    const url = new URL(window.location.href);
    url.searchParams.set("address", this.processor.params.address);
    url.searchParams.set("t", this.processor.params.since);
    url.searchParams.set("sample", this.processor.params.sampleRate);
    if (this.previewTrack) {
      const encoder = new Encoder();
      url.searchParams.set(
        "previewTrack",
        await encoder.encode(this.previewTrack)
      );
    }

    window.history.pushState(null, "", url.toString());
  }

  verifyTrack(track) {
    const p = new Parser();
    try {
      p.parse(track);
    } catch (e) {
      return null;
    }
    const renderedTrack = p.composer.renderTrack();
    if (!renderedTrack.startsWith(this.processor.composer.renderTrack()))
      return null;
    return renderedTrack;
  }

  setPreviewTrack(track) {
    const renderedTrack = this.verifyTrack(track);
    if (renderedTrack === null)
      throw new Error("track should start with the current one");

    this.previewTrack = renderedTrack;
    const url = new URL(window.location.href);
    this.elements.songDialog.textArea.value = this.previewTrack;
    this.setQueryParams();
    if (!this.isRendering) {
      this.renderState();
      if (this.view === "options" && this.isSegmentConfirmed)
        this.renderOptions();
    }
  }

  /// listeners

  onInsertClick() {
    this.elements.songDialog.root.showModal();
  }

  onShareClick() {
    this.elements.shareDialog.input.value = window.location.href;
    this.elements.shareDialog.root.showModal();
  }

  async onCopyUrlClick() {
    try {
      this.elements.shareDialog.copy.innerText = "copied!";
      this.elements.shareDialog.copy.classList.add("is-disabled");
      await navigator.clipboard.writeText(window.location.href);
      await new Promise((r) => setTimeout(r, 2000));
      // this.elements.shareDialog.root.close();
    } catch (error) {
      console.error(error.message);
      this.elements.shareDialog.copy.innerText = "failed to copy";
    } finally {
      this.elements.shareDialog.copy.classList.remove("is-disabled");
      this.elements.shareDialog.copy.innerText = "copy";
    }
  }

  onTrackSubmit(e) {
    try {
      this.setPreviewTrack(this.elements.songDialog.textArea.value);
    } catch (error) {
      debugger;
      e.preventDefault();
    }
  }

  onDialogBackClick() {
    this.elements.songDialog.root.close();
  }
}
