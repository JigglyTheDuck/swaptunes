import "./app.css";
import { loadSettings, watchSetting, getSetting } from "./modules/settings";
import menuRenderer from "./renderers/menu";
import appRenderer from "./renderers/market";
import app2Renderer from "./renderers/app";
import composerRenderer from "./renderers/composer";
import priceComposerRenderer from "./renderers/priceComposer/app";
import helpRenderer from "./renderers/help";
import settingsRenderer from "./renderers/settings";
import jukeboxRenderer from "./renderers/jukebox";

const darkStyles = `
:root {
  --color-text: #efefef;
  --color-text-primary: #efefef;
  --color-text-secondary: #cfcfcf;
  --color-primary: #108de0;
  --color-primary-variant: #3990f0;
  --color-secondary: rgba(0, 0, 0, 0.5);

  --color-background: #212529;
  --color-background-primary: var(--color-background);
  --color-background-shadow: #161616;
  --color-background-secondary: #323230;
  --color-background-disabled: #626262;

  color: rgba(255, 255, 255, 0.87);
}

.nes-balloon {
  border-image-slice: 3;
  border-image-width: 3;
  border-image-repeat: stretch;
  border-image-source: url('data:image/svg+xml;utf8,<?xml version="1.0" encoding="UTF-8" ?><svg version="1.1" width="8" height="8" xmlns="http://www.w3.org/2000/svg"><path d="M3 1 h1 v1 h-1 z M4 1 h1 v1 h-1 z M2 2 h1 v1 h-1 z M5 2 h1 v1 h-1 z M1 3 h1 v1 h-1 z M6 3 h1 v1 h-1 z M1 4 h1 v1 h-1 z M6 4 h1 v1 h-1 z M2 5 h1 v1 h-1 z M5 5 h1 v1 h-1 z M3 6 h1 v1 h-1 z M4 6 h1 v1 h-1 z" fill="rgb(255,255,255)" /></svg>');
  border-image-outset: 0;
  color: #fff;
  background: #212529;
  border-image-outset: 2;
  box-shadow: 0 0 0 8px #212529;
}
.nes-container {
  position: relative;
  margin: 4px;
  color: #fff;
  background-color: #212529;
  border-color: #fff;
}
`;
let darkModeStyles;

function renderDarkMode() {
  const browserPrefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const darkModeSetting = getSetting("darkMode");

  const isDarkMode =
    darkModeSetting === true ||
    (darkModeSetting !== false && browserPrefersDarkMode);

  if (browserPrefersDarkMode || (darkModeSetting === true && !darkModeStyles)) {
    darkModeStyles = document.createElement("style");
    darkModeStyles.innerHTML = darkStyles;
    document.head.appendChild(darkModeStyles);
  } else if (!isDarkMode && darkModeStyles) {
    darkModeStyles.remove();
    darkModeStyles = null;
  }

  // get a list of all .nes-containers
  const containers = document.getElementsByClassName("nes-container");
  const radios = document.getElementsByClassName("nes-radio");
  const inputs = document.getElementsByClassName("nes-input");
  const dialogs = document.getElementsByClassName("nes-dialog");
  const balloons = document.getElementsByClassName("nes-balloon");

  for (const c of Array.from(containers)) {
    c.classList[isDarkMode ? "add" : "remove"]("is-dark");
  }
  for (const c of Array.from(radios)) {
    c.classList[isDarkMode ? "add" : "remove"]("is-dark");
  }
  for (const c of Array.from(inputs)) {
    c.classList[isDarkMode ? "add" : "remove"]("is-dark");
  }
  for (const c of Array.from(dialogs)) {
    c.classList[isDarkMode ? "add" : "remove"]("is-dark");
  }
  for (const c of Array.from(balloons)) {
    c.classList[isDarkMode ? "add" : "remove"]("is-dark");
  }
}

function getRenderer(hash) {
  switch (hash) {
    case "#help":
    case "#help/intro":
    case "#help/composition":
    case "#help/voting":
    case "#help/rewards":
      return helpRenderer;
    case "#settings":
      return settingsRenderer;
    case "#jukebox":
      return jukeboxRenderer;
    case "#app/advanced":
    case "#app":
      return app2Renderer;
    case "#composer":
      return composerRenderer;
    case "#priceComposer":
      return priceComposerRenderer;
    case "#menu":
    // actually default will be home page
    default:
      return menuRenderer;
  }
}

let rendererDestroyer = null;
function onHashChange(e) {
  const root = document.getElementById("output");
  if (!root) return;
  if (rendererDestroyer) rendererDestroyer();
  root.innerText = "";
  let previousHash;
  if (e) {
    previousHash = new URL(e.oldURL).hash;
  }
  rendererDestroyer = getRenderer(window.location.hash)(root, previousHash);
}

loadSettings();
watchSetting("darkMode", renderDarkMode);
onHashChange();
setInterval(renderDarkMode, 5000);

addEventListener("hashchange", onHashChange);
document.body.style.opacity = 1;
