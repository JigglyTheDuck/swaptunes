import header from "../../components/header";
import Chart from "../../components/chart";
import dialog from "../../components/dialog";
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
import { setQueryParams } from "../../utils";
import config from "../../config";

import "./index.css";

import { formatDate } from "../market/templates";
import { PriceProcessor } from "../../datasources/processor";
import { PriceProcessor as IndexPriceProcessor } from "../../datasources/indexProcessor";

const { pools } = config.market.uniswap;
const { indices } = config.market.stocks;

const renderPrice = (p) => p.toFixed(2);

const statusTemplate = ({ source, ticker, since, sampleRate }) => `
<div class="stack bg-secondary gap-xs border padding-md-squish">
  <span>${source === "uniswap" ? "Pair" : "Ticker"}: ${ticker}</span>
  <span>Since: ${since}</span>
  <span>Rate: ${sampleRate}s</span>
</div>
`;

const template = ({ n }) =>
  `${header({
    title: "Loading...",
    loading: true,
  })}
${dialog({
  cancelLabel: "Back",
  id: "priceComposer_song",
  action: { id: "action", label: "save", isForm: true },
  content: (id) => `
    <label for="${id}_input">
      Set a song that you aim to compose by trading.
    </label>
    <textarea name="song" id="${id}_input" class="nes-textarea"></textarea>
    <p class="sm nes-text is-warning">
       It must match the current composition so far.
    </p>
  `,
})}
${dialog({
  cancelLabel: "Back",
  action: { id: "action", label: "copy" },
  id: "priceComposer_share",
  content: (id) => `<div class="nes-field stack gap-md">
      <label for="${id}_input">Share this URL on your preferred platform</label>
        <input
          type="text"
          id="${id}_input"
          class="nes-input"
          readonly
          value=${window.location.href}
        />
    </div>`,
})}
  <div class="stack gap-lg">
    <p id="priceComposer__status" class="stack text sm border bg-secondary padding-md"></p>
    <div id="priceComposer__progress" class="stack gap-sm">
      <div class="progress-container">
        <progress id="priceComposer__progress_bar" class="nes-progress" value="0" max="${n}"></progress>
        <span id="priceComposer__progress_value" class="nes-progress-value nes-text is-primary">0 / ${n}</span>
      </div>
    </div>
    <div class="hidden channels-container nes-balloon text sm padding-md bg-secondary gap-md justify-space-between">
      <div id="channel-0" class=""></div>
      <div id="channel-1" class=""></div>
      <div id="channel-2" class=""></div>
    </div>
    <canvas id="canvas"></canvas>
    <div id="compositionProgress" class="hidden">
      <div id="composition" class="stack gap-lg">
        <h3 id="segment" class="text align-center">Next segment</h3>
        <div id="options" class="options">
          <div id="mark" class="mark"></div>
        </div>
      </div>
      <div id="confirmation" class="padding-xl hidden blink text align-center nes-text is-primary">Pending confirmation...</div>
    </div>
    <button class="nes-btn self-center hidden" id="priceComposer__action_switch_view">switch view</button>
    <div id="priceComposer__actions" class="hidden inline justify-center wrap gap-md">
      <button class="nes-btn is-primary" id="priceComposer__action_play">play</button>
      <button class="nes-btn hidden" id="priceComposer__action_add_song">add song</button>
      <button class="nes-btn is-warning" id="priceComposer__action_store">store</button>
      <button class="nes-btn is-success" id="priceComposer__action_share">share</button>
    </div>
</div>
`;

const getNoteLength = (tempo, noteLength) =>
  (1000 * 867 * tempo * noteLength) / 0x100000;
const getSongLength = (tempo, seek) => getNoteLength(tempo, seek);

const channelToElements = (commands, channelIndex) => {
  let timer = 0;
  return commands.map((command, lineIndex) => {
    const template = commandTemplate("", command, lineIndex, channelIndex);
    let commandLength = 0;
    const cmdTemplate = {
      template,
      start: 0,
      end: 0,
    };
    if (["note", "rest"].includes(command.cmd)) {
      cmdTemplate.start = timer;
      commandLength = parseInt(command.values[command.cmd === "note" ? 1 : 0]);
      timer += getNoteLength(160, commandLength);
      cmdTemplate.end = timer;
    }

    return cmdTemplate;
  });
};

const initializeChannels = (channels, track) => {
  for (const [i, channel] of channels.entries()) {
    channel.innerHTML = `<div class="stack price-composer-channel"><span class="padding-sm-squish">channel${
      i + 1
    }::</span>${track[i]
      .slice(0, 5)
      .map((command, lineIndex) => commandTemplate("", command, lineIndex, i))
      .join("")}</div>`;
  }
};

const initialzeChannelsWithPreviewTrack = (
  channels,
  originalTrack,
  previewTrack
) => {};

const renderSong = (
  control,
  props,
  { prevN, previousIndex, latestCommandIndex }
) => {
  const { channelCommands, chart, channels, songLength, c } = props;
  if (control.cleared) return;

  if (Date.now() - control.playSince > songLength) {
    control.playSince += songLength;
  }

  const t = Date.now() - control.playSince;

  const n = Math.floor((c.priceHistory.length * t) / songLength);

  if (n !== prevN) {
    chart.draw(c.priceHistory, n);
    prevN = n;
  }

  for (const [channelIndex, ch] of channels.entries()) {
    const highlightedCmdIndex = channelCommands[channelIndex].findIndex(
      (c) => t >= c.start && t < c.end
    );

    if (
      highlightedCmdIndex === -1 ||
      previousIndex[channelIndex] === highlightedCmdIndex
    )
      continue;

    const commands = channelCommands[channelIndex];

    previousIndex[channelIndex] = highlightedCmdIndex;

    const maxIndex = commands.length - 1;

    const nBefore = highlightedCmdIndex > 3 ? 3 : highlightedCmdIndex;
    const nAfter =
      highlightedCmdIndex < maxIndex - 3 ? 3 : maxIndex - highlightedCmdIndex;

    ch.innerHTML = `<div class="stack price-composer-channel">
  ${commands
    .slice(highlightedCmdIndex - nBefore - (3 - nAfter), highlightedCmdIndex)
    .map((c) => c.template)
    .join("")}
  ${commands[highlightedCmdIndex].template}
  ${commands
    .slice(
      highlightedCmdIndex + 1,
      highlightedCmdIndex + nAfter + (3 - nBefore)
    )
    .map((c) => c.template)
    .join("")}
</div>`;
    document
      .getElementById(`editor___${channelIndex}_${highlightedCmdIndex}`)
      ?.classList.add("active");
  }

  requestAnimationFrame(() =>
    renderSong(control, props, { prevN, previousIndex, latestCommandIndex })
  );
};

function enterComposingState(processor, chart, channels) {
  const canvas = document.getElementById("canvas");
  const compositionContainer = document.getElementById("compositionProgress");
  const segmentContainer = document.getElementById("segment");
  const optionsContainer = document.getElementById("options");
  const addSongDialog = document.getElementById(`dialog__priceComposer_song`);
  const addSongBtn = document.getElementById("priceComposer__action_add_song");
  const addSongForm = document.getElementById(
    "dialog__priceComposer_song_form"
  );
  let previewComposer = null;
  let view = "chart";
  const loadPreviewTrack = (track) => {
    previewComposer = new Jiggly4(
      processor.composer.LIMIT,
      processor.composer.MA,
      processor.composer.AVG,
      processor.composer.scale,
      processor.composer.targetChannelCount
    );

    try {
      previewComposer.parse(
        track,
        processor.composer.priceHistory.slice(0, previewComposer.MA)
      );
    } catch (e) {
      debugger;
      return false;
    }

    const _track = previewComposer.render();
    const isValid = _track.startsWith(processor.composer.render());
    if (isValid) {
      new Encoder().encode(_track).then((previewTrack) => {
        setQueryParams({
          previewTrack,
        });
      });
    }
    const p = new Parser();
    p.parse(_track);
    initializeChannels(channels, p.composer.track);
    return isValid;
  };
  const checkTrackInUrl = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("previewTrack")) return Promise.resolve(null);

    return new Decoder()
      .decode(params.get("previewTrack"))
      .then(loadPreviewTrack);
  };
  const renderOptions = (currentPrice) => {
    const mark = document.getElementById("mark");
    segmentContainer.innerText = formatDate(
      processor.nextSegment - processor.params.sampleRate
    );

    while (optionsContainer.children.length > 1) {
      optionsContainer.lastChild.remove();
    }

    const labels = processor.composer.getOptionLabels();
    const limits = processor.composer.getOptionRanges(
      processor.composer.getNextPriceOptionsSize()
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
    optionsContainer.appendChild(label);
    if (position < 0) {
      label.classList.add("active");
    }

    for (let i = limits.length - 1; i >= 0; --i) {
      const _label = document.createElement("SPAN");
      if (Math.floor(position) === limits.length - 1 - i) {
        _label.classList.add("active");
      }
      const el = document.createElement("SPAN");
      el.innerText = `${renderPrice(limits[i])}`;
      _label.innerText = labels[i];
      optionsContainer.appendChild(el);
      optionsContainer.appendChild(_label);
    }

    if (currentPrice !== null)
      mark.style.transform = `translateY(${position * 48}px)`;
  };
  const switchViewBtn = document.getElementById(
    "priceComposer__action_switch_view"
  );

  const switchView = () => {
    view = view === "options" ? "chart" : "options";
    if (view === "options") {
      canvas.classList.add("hidden");
      compositionContainer.classList.remove("hidden");
    } else {
      canvas.classList.remove("hidden");
      compositionContainer.classList.add("hidden");
    }
  };

  switchViewBtn.onclick = switchView;
  switchViewBtn.classList.remove("hidden");
  addSongBtn.classList.remove("hidden");
  addSongBtn.onclick = () => {
    addSongDialog.showModal();
  };
  addSongForm.onsubmit = (e) => {
    if (!loadPreviewTrack(new FormData(e.target).get("song"))) {
      e.preventDefault();
    }
  };

  const process = () => {
    processor.proceed().then((result) => {
      if (result === false) {
        compositionContainer.children[1].classList.remove("hidden");
        renderOptions(null);
        return;
      }
      compositionContainer.children[1].classList.add("hidden");
      processor.fetchLatestPrice().then(renderOptions);
    });
  };

  checkTrackInUrl();
  process();

  return setInterval(process, 15000);
}

const doMagic = async (processor, chart) => {
  const c = processor.composer;
  const actions = document.getElementById("priceComposer__actions");
  const statusContainer = document.getElementById("priceComposer__status");
  const progress = document.getElementById("priceComposer__progress");
  const progressBar = document.getElementById("priceComposer__progress_bar");
  const progressValue = document.getElementById(
    "priceComposer__progress_value"
  );
  const onProgress = ({ segment, price, ticker }, isOver) => {
    statusContainer.innerHTML = `<span>${new Date(
      segment * 1000
    ).toLocaleString()}</span>
      <span>${ticker}: ${price.toFixed(4)}</span>
    `;
    progressBar.value = c.priceHistory.length;
    progressValue.innerText = `${c.priceHistory.length}/${c.LIMIT}`;
    chart.draw(c.priceHistory);
  };

  await processor.process(onProgress);

  if (new URL(window.location.href).hash !== "#priceComposer") return;
  document.getElementById("header__status").innerHTML = statusTemplate({
    source: processor instanceof PriceProcessor ? "uniswap" : "index",
    ticker:
      processor instanceof PriceProcessor
        ? pools.find((p) => p.address === processor.params.address).pair
        : indices.find((i) => i.ticker === processor.params.ticker).name,
    since: formatDate(processor.params.since),
    sampleRate: processor.params.sampleRate,
  });
  statusContainer.classList.add("hidden");
  progress.classList.add("hidden");
  actions.classList.remove("hidden");

  // nope
  // at this point we need to check if the price history is indeed satisfied

  // c.finishSong();

  // at this point we'll make a decision
  // either we are entering composing
  const p = new Parser();
  p.parse(c.render());
  chart.draw(c.priceHistory);

  const displayAll = window.innerWidth > 800;
  const channels = c.track
    .filter((t, i) => i === 0 || (t.length > 0 && displayAll))
    .map((_, i) => document.getElementById(`channel-${i}`));

  channels[0].parentElement.classList.remove("hidden");

  return {
    channels,
    channelCommands: p.composer.track.map(channelToElements),
    c,
    parser: p,
    chart,
    songLength: getSongLength(160, c.seek[0]),
    isOver: c.isOver,
  };
};

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
  root.innerHTML = template({ n: processor.composer.LIMIT });
  const shareDialog = document.getElementById(`dialog__priceComposer_share`);
  const shareCopyBtn = document.getElementById(
    `dialog__priceComposer_share_action`
  );
  const shareBtn = document.getElementById(`priceComposer__action_share`);
  shareBtn.onclick = () => {
    shareDialog.showModal();
  };
  _copyBtn(shareCopyBtn, () => window.location.href);
  const storeBtn = document.getElementById(`priceComposer__action_store`);
  _storeBtn(storeBtn, () => processor.composer.render());
  let previousWidth = 0;
  const canvas = document.getElementById("canvas");
  const chart = new Chart({ canvas });
  let destroyPlayBtn = null;
  let intvl = null;

  doMagic(processor, chart).then(
    ({ channels, channelCommands, c, parser, chart, songLength, isOver }) => {
      initializeChannels(channels, parser.composer.track);

      let control = { cleared: false };

      // probably return this
      destroyPlayBtn = _playBtn(
        document.getElementById("priceComposer__action_play"),
        () => {
          control.cleared = false;
          return parser.composer.renderTrack();
        },
        {
          onStop: () => {
            control.cleared = true;
            chart.draw(c.priceHistory);
            initializeChannels(channels, parser.composer.track);
          },
          onPlay: () => {
            control.playSince = Date.now();
            renderSong(
              control,
              {
                channels,
                channelCommands,
                c,
                chart,
                songLength,
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

      if (!isOver) intvl = enterComposingState(processor, chart, channels);
    }
  );
  const resizeCanvas = () => {
    if (Math.abs(window.innerWidth - previousWidth) < 50) return;
    previousWidth = window.innerWidth;
    canvas.width = canvas.parentElement.getBoundingClientRect().width;
    canvas.height = canvas.width / 1.5;
    chart.draw(processor.composer.priceHistory);
  };

  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);
  return () => {
    clearInterval(intvl);
    if (destroyPlayBtn) destroyPlayBtn();
    window.removeEventListener("resize", resizeCanvas);
  };
};
