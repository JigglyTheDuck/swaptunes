import "./main.css";
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

const lightStyles = `
:root {
    color: #213547;
    --color-text-primary: #242424;
    --color-text-secondary: #6a6a6a;
    --color-primary: #108de0;
    --color-primary-variant: #3990f0;
    --color-secondary: #356570;

    --color-background: #fafaff;
    --color-background-primary: var(--color-background);
    --color-background-shadow: #161616;
    --color-background-secondary: #ffffff;
    --color-background-disabled: #626262;
}`;
let lightModeStyles;

function renderDarkMode() {
  const browserPrefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const darkModeSetting = getSetting("darkMode");

  const isDarkMode =
    darkModeSetting === true ||
    (darkModeSetting !== false && browserPrefersDarkMode);

  if (
    (!browserPrefersDarkMode || darkModeSetting === false) &&
    !lightModeStyles
  ) {
    lightModeStyles = document.createElement("style");
    lightModeStyles.innerHTML = lightStyles;
    document.head.appendChild(lightModeStyles);
  } else if (isDarkMode && lightModeStyles) {
    lightModeStyles.remove();
    lightModeStyles = null;
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
