import header from "../../components/header";
import dialog from "../../components/dialog";
import { commandTemplate } from "../editor";
import { parseLine } from "../../utils";

export const statusTemplate = ({ source, ticker, since, sampleRate }) => `
<div class="stack bg-secondary gap-xs border padding-md-squish">
  <span>${
    source === "uniswap" ? "Pair" : "Ticker"
  }: ${ticker} (${sampleRate}s)</span>
  <span>Since: ${since}</span>
</div>
`;

export const template = ({ n }) =>
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
    <p id="priceComposer__processing_status" class="stack text sm border bg-secondary padding-md"></p>
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
    <div id="compositionProgress" class="hidden relative">
      <div id="composition" class="stack gap-lg">
        <h3 id="segment" class="text align-center">Next segment</h3>
        <div id="options" class="options">
          <div id="mark" class="mark"></div>
        </div>
      </div>
      <div id="confirmation" class="padding-xl hidden overlay">
      <div class="blink text align-center nes-text is-primary">Pending confirmation...</div>
      </div>
    </div>
    <button class="nes-btn self-center hidden" id="priceComposer__action_switch_view">switch view</button>
    <div id="priceComposer__actions" class="hidden inline justify-center wrap gap-md">
      <button class="nes-btn is-primary" id="priceComposer__action_play">play</button>
      <button class="nes-btn hidden" id="priceComposer__action_add_song">add song</button>
      <button class="nes-btn is-warning" id="priceComposer__action_store">store</button>
      <button class="nes-btn is-warning" id="priceComposer__action_compose">compose</button>
      <button class="nes-btn is-success" id="priceComposer__action_share">share</button>
    </div>
</div>
`;

export const channelTemplate = (
  i,
  track,
  segments = [0, 5]
) => `<div class="stack price-composer-channel"><span class="padding-sm-squish">channel${
  i + 1
}::</span>${track[i]
  .slice(segments[0], segments[1])
  .map((line, lineIndex) => {
    const [cmd, values] = parseLine(line);

    return commandTemplate("", { cmd, values }, lineIndex, i);
  })
  .join("")}</div>
  `;
