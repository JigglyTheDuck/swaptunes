import header from "../components/header";
import linkNav, { formNavItem as navItem } from "../components/navitem";
import { keys as scales } from "../modules/composers/_priceComposer";
import "./settings.css";
import { useNavigate, useAutofocus } from "../utils";
import {
  toggleSetting,
  toggleDarkMode,
  toggleRPCUrl,
  toggleComposerUI,
  toggleVolume,
  loadSettings,
  saveSettings,
  toggleDefaultScale,
} from "../modules/settings";

const displaySetting = (setting, value) => {
  switch (setting) {
    case "volume":
      return value === "muted" ? "MUTED" : value || 0;
    case "clipboard":
      return value ? "ON" : "OFF";
    case "visualization":
      return value ? "ON" : "OFF";
    case "composerUI":
      return value === "auto" ? "AUTO" : value ? "FRIENDLY" : "TEXT";
    case "darkMode":
      return value === "auto" ? "AUTO" : value ? "ON" : "OFF";
    case "rpcUrl":
      return value;
    case "defaultScale":
      return Object.keys(scales)[value || 0];
  }
};

const template = (settings) => `
  ${header({ title: "Settings" })}
  <form id="settings-form" class="settings menu-nav">
    ${navItem({
      value: "volume",
      label: "Volume",
      checked: true,
    })}
    <span>${displaySetting("volume", settings.volume)}</span>
    ${navItem({
      value: "visualization",
      label: "Waveform",
    })}
    <span>${displaySetting("visualization", settings.visualization)}</span>
    ${navItem({
      value: "darkMode",
      label: "Dark mode",
    })}
    <span>${displaySetting("darkMode", settings.darkMode)}</span>
    ${navItem({
      value: "rpcUrl",
      label: "RPC url",
    })}
    <span>${displaySetting("rpcUrl", settings.rpcUrl)}</span>
    ${linkNav({
      to: "",
      label: "Back",
    })}
    <button class="hidden"></button>
  </form>
`;

      /*
       *
    ${navItem({
      value: "composerUI",
      label: "Composer",
    })}
    <span>${displaySetting("composerUI", settings.composerUI)}</span>
    ${navItem({
      value: "defaultScale",
      label: "Scale",
    })}
    <span>${displaySetting("defaultScale", settings.defaultScale)}</span>
        * */

const toggleSettings = (setting, settings) => {
  switch (setting) {
    case "volume":
      return toggleVolume(settings);
    case "visualization":
      return toggleSetting(settings, "visualization");
    case "clipboard":
      return toggleSetting(settings, "clipboard");
    case "darkMode":
      return toggleDarkMode(settings);
    case "rpcUrl":
      return toggleRPCUrl(settings);
    case "composerUI":
      return toggleComposerUI(settings);
    case "defaultScale":
      return toggleDefaultScale(settings);
    default:
  }
};

const renderForm = (root) => {
  const settings = loadSettings();
  root.innerHTML = template(settings);

  const form = document.getElementById("settings-form");
  const destroyNavigate = useNavigate(form);
  const elements = Array.from(form.children);

  const onsubmit = (e) => {
    if (e) e.preventDefault();
    const data = new FormData(form).get("nav");

    const index = elements.findIndex((e) => e.children[0]?.value === data);

    if (index === elements.length - 2) return; // back button

    saveSettings(toggleSettings(data, settings));
    elements[index].focus();
    elements[index].checked = true;
    elements[index + 1].innerText = displaySetting(data, settings[data]);
  };

  const autofocus = () => {
    elements[0].focus();
    elements[0].checked = true;
  };

  const onLabelClick = (e) => {
    if (e.target.tagName === "INPUT") return;
    setTimeout(() => {
      // to
      onsubmit();
    });
  };

  for (const el of elements) {
    if (el.tagName !== "LABEL") continue;
    el.addEventListener("click", onLabelClick);
  }

  const destroyAutofocus = useAutofocus(autofocus);

  form.addEventListener("submit", onsubmit);
  return () => {
    destroyAutofocus();
    for (const el of elements) {
      if (el.tagName !== "LABEL") continue;
      el.removeEventListener("click", onLabelClick);
    }
    destroyNavigate();

    form.removeEventListener("submit", onsubmit);
  };
};

export default renderForm;
