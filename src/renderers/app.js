import { Parser } from "../modules/parser";
import { Composer as SimpleComposer } from "../modules/simpleComposer";
import playBtn from "../components/playbtn";
import copyBtn from "../components/copybtn";
import { Encoder, Decoder } from "../modules/encoder";
import {
  route,
  clearQueryParams,
  setQueryParams,
  parseLine,
  href,
  simplifyTrack,
} from "../utils";
import { formatDate } from "./market/templates";
import { ContractProcessor } from "../datasources/contractProcessor";
import { JsonRpcProvider, WebSocketProvider } from "ethers";
import { getSetting } from "../modules/settings";
import config from "../config";
import "./app.css";

const layout = () => `
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
    <div class="nes-field stack gap-md">
      <label for="output__shareInput" class="text align-center">Share this URL on your preferred platform</label>
      <div class="inline gap-sm">
      <input
        type="text"
        id="output__shareInput"
        class="nes-input"
        readonly
    />
      <button id="output__shareCopy" class="nes-btn is-primary" type="button">copy</button>
      </div>
    </div>
    <menu class="dialog-menu inline justify-center padding-sm gap-md align-center">
      <button class="nes-btn">back</button>
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
<header class="inline md justify-space-between gap-md align-center">
  <p class="nes-text hidden text align-center" id="output__message"></p>
  <p class="stack text sm">
    <span id="output__currentTime"></span>
    <span id="output__currentPoolSize"></span>
  </p>
  <div class="inline gap-sm">
    <button id="output__actionShare" class="nes-btn is-success hidden">share</button>
    <a href="${href(
      "#menu"
    )}" id="back-to-menu" class="nes-btn is-error">menu</a>
  </div>
</header>
<div class="inline sm reverse gap-lg justify-space-between align-start">
  <div class="nes-balloon nes-text text sm width-md stack padding-md grow-1"> 
    <pre id="output__compositionPrevious" class="composition-output"></pre>
    <p id="output__compositionPending" class="composition-output nes-text is-warning"></p>
    <p id="output__compositionActive" class="composition-output nes-text"></p>
    <pre id="output__compositionPreview" class="composition-output nes-text is-success"></pre>
  </div>
  <!--<p class="width-sm">put song symbols here, and animate them when playing, actually you can even translate the text into music sheets https://codepen.io/gvissing/pen/BKmmpJ </p>-->
</div>
<div class="inline justify-center gap-sm wrap">
    <button id="output__actionInsertSong" class="nes-btn hidden">add song</button>
    <button id="output__actionPlay" class="nes-btn hidden is-primary">play</button>
    <a href="https://app.uniswap.org/swap?inputCurrency=${
      config.contract.address
    }&outputCurrency=0xe53bF56F8E5BfC508A08cD2C375c0257044114F7" target="_blank" rel="noreferer" id="output__actionTrade" class="nes-btn is-warning hidden">trade</a>
    <button id="output__actionCompose" class="nes-btn hidden">compose</button>
    <!--
  <button id="output__actionPrev" class="nes-btn hidden is-primary">previous</button>
  <button id="output__actionNext" class="nes-btn hidden is-primary">next</button>
  -->
</div>
<div class="gly-options stack gap-md" id="output__options"></div>
      <div id="output__progress" class="hidden stack gap-sm">
        <span>Progress</span>
        <div class="progress-container">
        <progress id="output__progress_bar" class="nes-progress is-primary" value="80" max="100"></progress>
        <span id="output__progress_value" class="nes-progress-value nes-text is-error"></span>
      </div>
    </div>
`;

export class OutputRenderer {
  curretPoolSize = 0;
  latestVotes;
  nextSegment;
  isRendering;
  processor;
  root;
  showAllOptions = true;
  timers = {
    time: 0,
    processor: 0,
  };

  previewTrack = null;

  isDestroyed = false;

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
    },
    composition: {
      active: null,
      previous: null,
      preview: null,
      pending: null,
    },
    rewardPool: null,
    message: null,
    time: null,
    options: null,
    optionsContainer: null,
    progress: {
      container: null,
      bar: null,
      value: null,
    },
  };

  get now() {
    return Math.floor(Date.now() / 1000);
  }

  constructor(root, processor, previewTrack) {
    this.processor = processor;
    this.renderLayout(root);
    this._show(root);
    this._enterState("awaiting");
    if (previewTrack) this.previewTrack = previewTrack;
  }

  destroy() {
    this.isDestroyed = true;
    this.resetState();
  }

  revive() {
    this.isDestroyed = false;
  }

  _render(element, content) {
    this._show(element);
    element.innerHTML = content;
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
        `${formatDate(timestamp)} (in ${timestamp - this.now}s)`
      );
      this.timers.time = setTimeout(() => this._renderTime(timestamp), 500);
      return;
    }

    this._render(this.elements.time, formatDate(timestamp));
  }

  resetState() {
    for (const k of Array.from(Object.keys(this.timers)))
      clearTimeout(this.timers[k]);

    // hide all elements by default
    for (const k of Array.from(Object.keys(this.elements.composition)))
      this._hide(this.elements.composition[k]);

    for (const k of Array.from(Object.keys(this.elements.actions)))
      this._hide(this.elements.actions[k]);

    this._hide(this.elements.progress.container);
    this._hide(this.elements.message);
    this._hide(this.elements.time);
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

  enterAwaitingStartState() {
    this._render(
      this.elements.composition.active,
      `<span class="nes-text is-primary blink">loading...</span>`
    );
  }

  enterFinishedState() {
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.compose);
    this._show(this.elements.actions.play);

    this._render(this.elements.message, "This composition is final!");
    this.elements.message.classList.add("is-success", "blink");

    this._render(
      this.elements.composition.previous,
      this.processor.composer.renderTrack().split("\n").slice(-8).join("\n")
    );
  }

  _renderPool(poolSize) {
    this._render(
      this.elements.rewardPool,
      `Reward pool: ${poolSize / 1000000000n} GLY`
    );
  }

  enterComposingState() {
    this.nextSegment = this.processor.getNextSegment();

    if (this.previewTrack) {
      try {
        this.setPreviewTrack(this.previewTrack);
      } catch (e) {}
    }

    this.updateQuery();

    this.renderComposingScreen();
  }

  _findMatchingOption(options) {
    if (!this.previewTrack) return null;
    const composer = this.getComposer();
    const currentLineIndex = composer.renderTrack().split("\n").length - 1;
    const previewCommand = this.previewTrack.split("\n")[currentLineIndex];

    if (!previewCommand) return null;

    if (!this.previewTrack.startsWith(composer.renderTrack())) {
      this.clearPreviewTrack();
      return null;
    }

    const [cmd, values] = previewCommand.includes(":")
      ? ["new_loop", []]
      : parseLine(previewCommand);
    if (composer.currentCommand.cmd === null) {
      return options.findIndex((o) => o.option === cmd);
    }

    if (composer.currentCommand.cmd !== cmd) {
      this.clearPreviewTrack();
      return null;
    }

    let isFaulty = false;
    for (let i = 0; i < composer.currentCommand.values.length; ++i) {
      if (composer.currentCommand.values[i] != values[i]) isFaulty = true;
    }

    if (isFaulty) {
      this.clearPreviewTrack();
      return null;
    }

    return options.findIndex(
      (o) =>
        o.option == values[composer.currentCommand.values.length] ||
        `${o.value},` === values[composer.currentCommand.values.length]
    );
  }

  getComposer() {
    if (this.isSegmentConfirmed) {
      const composer = this.processor.composer.copy();

      composer.applyOption(
        this.latestVotes.reduce(
          (acc, v, i) => (v > acc.value ? { index: i, value: v } : acc),
          { index: 0, value: 0n }
        ).index
      );
      return composer;
    }

    return this.processor.composer;
  }

  getNextOptions() {
    const normalizedVotes = this.latestVotes.map((v) =>
      Number(v / 1000000000n)
    );
    const votesSum = normalizedVotes.reduce((acc, v) => acc + v, 0);
    const composer = this.getComposer();
    if (composer === this.processor.composer)
      return composer
        .getNextOptions()
        .map(({ option }, i) => ({
          actionIndex: i,
          ratio: normalizedVotes[i] === 0 ? 0 : normalizedVotes[i] / votesSum,
          votes: normalizedVotes[i],
          option,
        }))
        .sort((a, b) => (a.votes < b.votes ? 1 : -1));

    return composer.getNextOptions().map(({ option }, i) => ({
      actionIndex: i,
      ratio: 0,
      votes: 0,
      option,
    }));
  }

  static getOptionLabel(i) {
    return `x${((i + 1) / 100).toFixed(2).slice(1)}`;
  }

  renderOptions() {
    this._render(
      this.elements.options,
      `<div class="inline md gap-sm"><p class="text">Next command</p>${
        this.isSegmentConfirmed ? `<p>(no votes yet)</p>` : ""
      }`
    );

    const optionsContainer = document.createElement(`div`);
    optionsContainer.classList.add(`option-container`);

    const optionsAndVotes = this.getNextOptions();
    const previewOptionIndex = this._findMatchingOption(optionsAndVotes);
    /*
    if (this.isSegmentConfirmed) {
      for (const option of optionsAndVotes) {
        const container = document.createElement("div");
        const value = document.createElement("span");
        const decimals = document.createElement("span");
        decimals.classList.add("nes-text", "is-primary");
        container.classList.add(
          "nes-text",
          "option-box",
          "padding-md",
          "justify-space-between",
          "border",
          "inline",
          "gap-lg"
        );
        if (option.actionIndex === previewOptionIndex)
          container.classList.add("is-success");

        decimals.innerText = OutputRenderer.getOptionLabel(option.actionIndex);
        value.innerText = option.option;
        container.appendChild(value);
        container.appendChild(decimals);
        optionsContainer.appendChild(container);
      }

      this.elements.options.appendChild(optionsContainer);

      // render table of options
      return;
    }*/

    optionsContainer.classList.add("bars");

    const length =
      this.showAllOptions || optionsAndVotes.length < 5
        ? optionsAndVotes.length
        : 5;

    for (let i = 0; i < length; ++i) {
      const option = document.createElement("div");
      option.classList.add("inline", "sm", "gap-sm", "align-center");
      const label = document.createElement("span");
      const optionValue = document.createElement("span");
      const percentContainer = document.createElement("div");
      const labelContainer = document.createElement("div");
      percentContainer.classList.add("inline", "gap-sm");
      labelContainer.classList.add(
        "label-container",
        "inline",
        "justify-end",
        "gap-lg",
        "nes-text"
      );
      const value = document.createElement("span");
      value.classList.add("text", "sm");
      const bar = document.createElement("span");
      const percent = `${(optionsAndVotes[i].ratio * 100).toFixed(2)}%`;

      value.innerText = `${percent} (${optionsAndVotes[i].votes.toFixed(0)})`;
      label.innerText = optionsAndVotes[i].option;
      optionValue.innerText = `${OutputRenderer.getOptionLabel(
        optionsAndVotes[i].actionIndex
      )}`;
      optionValue.classList.add("nes-text", "is-primary");
      bar.classList.add("progress");
      bar.style.flexGrow = 1;
      bar.style.maxWidth = percent;

      if (i === 0) {
        if (previewOptionIndex === i) {
          labelContainer.classList.add("is-success");
          bar.classList.add("is-success");
        }
      } else if (previewOptionIndex === i) {
        labelContainer.classList.add("is-warning");
        bar.classList.add("is-warning");
      }

      percentContainer.appendChild(bar);
      percentContainer.appendChild(value);

      labelContainer.appendChild(label);
      labelContainer.appendChild(optionValue);

      optionsContainer.appendChild(labelContainer);
      optionsContainer.appendChild(percentContainer);
    }

    this.elements.options.appendChild(optionsContainer);
  }

  renderComposition() {
    const hasPreview = this.previewTrack !== null;
    const composer = this.getComposer();
    const trackLines = composer.renderTrack().split("\n");
    const command = composer.currentCommand;
    const isPending = !this.isSegmentConfirmed;

    // simple enough, render last few lines
    this._render(
      this.elements.composition.previous,
      trackLines
        .slice(-5 - (hasPreview ? 0 : 3) - (command.cmd !== null ? 0 : 1))
        .join("\n")
    );

    // if we have a pending we can rotate over possible values
    const nextOptions = composer.getNextOptions();

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
    this._renderPool(this.currentPoolSize);
    this._renderTime(this.nextSegment);
    this._show(this.elements.actions.insertSong);
    this._show(this.elements.actions.share);
    this._show(this.elements.actions.trade);
    this._show(this.elements.actions.compose);
    this._show(this.elements.actions.play);
    this.renderProgress();

    this.renderOptions();

    this.renderComposition();
  }

  renderProgress() {
    if (!this.previewTrack) {
      this._hide(this.elements.progress.container);
      return;
    }
    const parser = new Parser(() => {}, SimpleComposer);

    // TODO: actually this should be used up there...
    // also we should check if previewTrack is final.
    parser.parse(simplifyTrack(this.previewTrack));

    this.elements.progress.bar.value = this.getComposer().optionCount;
    this.elements.progress.bar.max = parser.composer.optionCount;
    this.elements.progress.value.innerText = `${this.elements.progress.bar.value}/${this.elements.progress.bar.max} segments`;

    this._show(this.elements.progress.container);
  }

  renderComposingScreen() {
    this.isRendering = true;

    // TODO: check at least if navigator is online
    // or ping something
    // or the return value from uniswap before committing to changes.

    if (this.processor.composer.isFinished) return this._enterState("finished");

    Promise.all([
      this.processor.getVotes(),
      this.processor.getRewardPoolSize(),
    ]).then(([votes, poolSize]) => {
      this.isSegmentConfirmed = false;
      // Date.now() / 1000 > this.processor.getNextSegment();

      // TODO: check what happens when composition is finished
      if (this.isSegmentConfirmed)
        this.nextSegment =
          this.processor.getNextSegment() +
          Number(this.processor.segmentLength);

      this.currentPoolSize = poolSize;

      this.latestVotes = votes;

      this.renderState();

      this.isRendering = false;
    });

    this.timers.processor = setTimeout(
      this.renderComposingScreen.bind(this),
      15000
    );

    /*
    // if (this.nextSegment - this.now) this.isRendering = false;
    
    this.timers.processor = setTimeout(
      this.renderComposingScreen.bind(this),
      this.nextSegment - this.now < 10
        ? (this.nextSegment - this.now) * 1000
        : 10000
    );*/
  }

  renderProcessing(track, details, isOver) {
    if (this.isDestroyed) return;
    if (isOver) {
      if (this.processor.composer.isFinised) {
        return this._enterState("finished");
      }
      return this._enterState("composing");
    }
    //this._renderTime(details.segment);
    this._render(this.elements.time, details.lastBlock);
    this._render(
      this.elements.composition.previous,
      track.split("\n").slice(-10).join("\n")
    );
  }

  renderLayout(root) {
    root.innerHTML = layout();
    const _id = (id) => document.getElementById(`output__${id}`);
    this.elements = {
      failureDialog: _id("compositionFailedDialog"),
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
      },
      composition: {
        active: _id("compositionActive"),
        pending: _id("compositionPending"),
        previous: _id("compositionPrevious"),
        preview: _id("compositionPreview"),
      },
      time: _id("currentTime"),
      rewardPool: _id("currentPoolSize"),
      options: _id("options"),
      optionsContainer: _id("optionsContainer"),
      message: _id("message"),
      progress: {
        container: _id("progress"),
        bar: _id("progress_bar"),
        value: _id("progress_value"),
      },
    };

    this._show(root.parentElement);
    setTimeout(
      () => root.scrollIntoView({ block: "center", behavior: "smooth" }),
      500
    );
    this.elements.actions.insertSong.onclick = this.onInsertClick.bind(this);
    this.elements.actions.share.onclick = this.onShareClick.bind(this);
    copyBtn(this.elements.shareDialog.copy, () => window.location.href);
    this.elements.actions.compose.onclick = () =>
      new Encoder()
        .encode(this.previewTrack || this.processor.composer.renderTrack())
        .then((previewTrack) => route("composer", { previewTrack }));

    this.elements.songDialog.closeBtn.onclick =
      this.onDialogBackClick.bind(this);
    this.elements.songDialog.form.onsubmit = this.onTrackSubmit.bind(this);
    //this.elements.actions.trade.href = `https://v2.info.uniswap.org/pair/${this.processor.params.address}`;
    playBtn(
      this.elements.actions.play,
      () => this.previewTrack || this.processor.composer.renderTrack()
    );
  }

  async updateQuery() {
    if (this.previewTrack) {
      setQueryParams({
        previewTrack: await new Encoder().encode(this.previewTrack),
      });
    } else {
      clearQueryParams();
    }
  }

  verifyTrack(track) {
    const p = new Parser(() => {}, SimpleComposer);
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

  clearPreviewTrack() {
    this.previewTrack = null;
    this.elements.failureDialog.showModal();
    this.updateQuery();
  }

  setPreviewTrack(track) {
    const renderedTrack = this.verifyTrack(track);
    if (renderedTrack === null)
      throw new Error("track should start with the current one");

    this.previewTrack = renderedTrack;
    const url = new URL(window.location.href);
    this.elements.songDialog.textArea.value = this.previewTrack;
    this.updateQuery();
    if (!this.isRendering) {
      this.renderState();
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

  static copyToClipBoard(toCopy) {
    return navigator.clipboard
      .writeText(toCopy)
      .then(() => true)
      .catch((e) => false);
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

export default (root) => {
  const processor = new ContractProcessor(
    config.contract.address,
    //new JsonRpcProvider("https://base.llamarpc.com")
    new WebSocketProvider(config.contract.rpcUrls[getSetting("rpcUrl")])
  );

  let renderer;
  new Decoder()
    .decode(new URLSearchParams(window.location.search).get("previewTrack"))
    .then((previewTrack) => {
      renderer = new OutputRenderer(root, processor, previewTrack);
    })
    .catch(() => {
      renderer = new OutputRenderer(root, processor);
      // error rendering
    })
    .finally(async () => {
      try {
        await processor.process(
          renderer.renderProcessing.bind(renderer),
          await processor.findSongFirstBlock(config.contract.initialBlock)
        );
      } catch (e) {
        route("menu");
      }
    });

  return () => {
    if (renderer) renderer.destroy();
  };
};
