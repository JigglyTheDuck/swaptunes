import header from "../components/header";
import Chart from "../components/chart";
import dialog from "../components/dialog";
import Jiggly4 from "../modules/composers/jiggly4";
import editor, { Editor } from "./editor";
import { _playBtn } from "../components/playbtn";
import _copyBtn from "../components/copybtn";
import { observe, pop } from "../modules/clipboard";
import { Parser, ParsingError } from "../modules/parser";
import { Composer as SimpleComposer } from "../modules/simpleComposer";
import { Decoder, Encoder } from "../modules/encoder";
import { setQueryParams, simplifyTrack } from "../utils";
import { getSetting } from "../modules/settings";
import { keys as scales } from "../modules/composers/_priceComposer";

const defaultComposition = `channel1::
  tempo 144
`;

const editorProps = { name: "composer", id: "composer" };
const template = `
${header({
  title: "Composer",
  //description: "Create and share beautiful songs!",
})}

${dialog({
  action: { id: "action", label: "Yes" },
  cancelLabel: "No",
  id: "composer__paste",
  content: `<p class="text align-center">You have a composition in your clipboard. <br />Would you like to paste it here?</p>`,
})}

${dialog({
  cancelLabel: "Back",
  id: "composer__setup",
  content: `<p class="text align-center">You have a composition in your clipboard. <br />Would you like to paste it here?</p>`,
})}

${dialog({
  cancelLabel: "Back",
  id: "composer__share",
  content: (id) => `<div class="nes-field stack gap-md">
      <label for="${id}_input">Share this URL on your preferred platform</label>
      <div class="inline gap-sm align-center">
        <input
          type="text"
          id="${id}_input"
          class="nes-input"
          readonly
        />
          <button
            type="button"
            id="${id}_copy"
            class="nes-btn is-primary"
            type="button"
          >copy</button>
      </div>
    </div>`,
})}

<div class="bg-secondary padding-md text sm from-left">
  <span id="status"></span> 
</div>
<canvas id="chart" class="chart hidden"></canvas>
<div class="stack" id="editor"></div>
<div class="inline gap-md wrap">
    <button id="composer_play" type="button" class="nes-btn is-primary">play</button>
    <button id="composer_share" type="button" class="nes-btn is-success">share</button>
    <button id="composer_setup" type="button" class="hidden nes-btn is-disabled" disabled>chart</button>
</div>
`;

const estimateLength = (track) => {
  const parser = new Parser(() => {}, SimpleComposer);

  parser.parse(simplifyTrack(track));

  return parser.composer.optionCount;
};

const updateParams = (track) =>
  new Encoder().encode(track).then((previewTrack) => {
    setQueryParams({ previewTrack });
    return previewTrack;
  });

const loadPreviewTrack = () => {
  const params = new URLSearchParams(window.location.search);
  if (!params.get("previewTrack")) return Promise.resolve(null);

  const decoder = new Decoder();
  return decoder.decode(params.get("previewTrack"));
};

// this will actually check against Jiggly somehow
// in the first iteration, we can just simply check if all octaves
//
const checkCompatibility = (track) => {
  return Promise.resolve([...new Array(estimateLength(track))]);
  const composer = new Jiggly4(
    2000,
    4,
    2,
    Object.keys(scales)[getSetting("defaultScale") || 0],
    3
  );
  composer.parse(track);

  return Promise.resolve(composer.priceHistory);

  /*
  try {
    const lines = track.split("\n");
    const _track = track.split("\n");
    for (let i = 0; i < lines.length; ++i) {
      if (lines[i].includes("sound_loop") || lines[i].includes("sound_ret")) {
        lines[i] = "  channel_end";
        if (lines[i - 1] === "  channel_end") {
          lines.splice(i, 1);
          _track.splice(i, 1);
        }
      }
    }
    const p = new Parser(() => {}, SimpleComposer);
    const e = new Encoder();
    return Promise.all([
      e.encode(p.parse(lines.join("\n"))),
      e.encode(_track.join("\n")),
    ]).then(([a, b]) => a === b);
  } catch (e) {}
  return Promise.resolve(false);*/
};

export default (root, fromHash) => {
  // if from hash you can copy it back
  root.innerHTML = template;
  let priceHistory = [];
  const estimate = document.getElementById("status");
  const pasteDialog = document.getElementById(`dialog__composer__paste`);
  const shareDialog = document.getElementById(`dialog__composer__share`);
  const setupDialog = document.getElementById(`dialog__composer__setup`);
  const shareInput = document.getElementById(`dialog__composer__share_input`);
  const shareCopyBtn = document.getElementById(`dialog__composer__share_copy`);
  const editorContainer = document.getElementById("editor");
  const viewBtn = document.getElementById(`composer_setup`);
  const canvas = document.getElementById("chart");
  const chart = new Chart({ canvas });
  let previewTrack;
  const setShareValue = (v) => {
    previewTrack = v;
    shareInput.value = window.location.href;
  };
  const updateEstimate = (track) => {
    const lengthHours = ((estimateLength(track) * 15) / 60).toFixed(2);
    checkCompatibility(track).then((_priceHistory) => {
      const compatible = !!_priceHistory;
      /*
      viewBtn.classList[compatible ? "remove" : "add"]("is-disabled");
      viewBtn.disabled = !compatible;
      if (compatible) {
        priceHistory = _priceHistory;
        chart.draw(priceHistory);
      }*/
      estimate.innerText = compatible
        ? `compatible: ${_priceHistory.length} segment${
            _priceHistory.length !== 1 ? "s" : ""
          }`
        : `not compatible`;
    });
  };
  document.getElementById("back-to-menu").focus();

  const initializeEditor = (composition) => {
    updateParams(composition).then(setShareValue);

    return editor({
      root: editorContainer,
      id: "composer_editor",
      name: "composer",
      composition,
      onChange: (_track) => {
        if (_track instanceof ParsingError) {
          estimate.innerText = `composition error in channel: ${
            _track.channelIndex + 1
          } line: ${_track.line + 1}`;
          return;
        } else if (_track instanceof Error) {
          //debugger
          return;
        }
        track = _track;

        // we could debounce these.
        updateEstimate(track);
        updateParams(track).then(setShareValue);
      },
    });
  };

  let track;
  let destroyEditor;

  loadPreviewTrack()
    .then((composition) => {
      track = composition || defaultComposition;

      updateEstimate(track);
      return track;
    })
    .then(initializeEditor)
    .then((r) => {
      destroyEditor = r;
    });

  if (observe()) pasteDialog.showModal();
  const pasteAction = document.getElementById(`dialog__composer__paste_action`);

  pasteAction.onclick = () => {
    if (destroyEditor) destroyEditor();
    track = pop();
    destroyEditor = initializeEditor(track);
    pasteDialog.close();
  };

  const playBtn = document.getElementById(`composer_play`);
  const shareBtn = document.getElementById(`composer_share`);

  shareBtn.onclick = () => {
    shareDialog.showModal();
  };
  viewBtn.onclick = () => {
    if (canvas.classList.contains("hidden")) {
      editorContainer.classList.add("hidden");
      canvas.classList.remove("hidden");
      resizeCanvas(true);
      viewBtn.innerText = "compose";
    } else {
      editorContainer.classList.remove("hidden");
      canvas.classList.add("hidden");
      viewBtn.innerText = "chart";
    }
  };
  _playBtn(playBtn, () => track);
  _copyBtn(shareCopyBtn, () => window.location.href);

  let previousWidth = 0;
  const resizeCanvas = (forceRender) => {
    if (
      forceRender !== true &&
      Math.abs(window.innerWidth - previousWidth) < 50
    )
      return;
    previousWidth = window.innerWidth;
    canvas.width = canvas.parentElement.getBoundingClientRect().width;
    canvas.height = canvas.width / 1.5;
    chart.draw(priceHistory);
  };

  resizeCanvas();

  window.addEventListener("resize", resizeCanvas);
  return () => {
    destroyEditor();
    window.removeEventListener("resize", resizeCanvas);
  };
};
