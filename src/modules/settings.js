import { keys as scales } from "./composers/_priceComposer";
import config from "../config";

const rpcKeys = Object.keys(config.contract.rpcUrls);

const settingKeys = [
  "darkMode",
  "volume",
  "clipboard",
  "operationMode",
  "visualization",
  "composerUI",
  "defaultScale",
  "rpcUrl",
];

// TODO: add duck as waveform option

const settings = {
  volume: 2,
  visualization: true,
  darkMode: "auto",
  operationMode: "market",
  defaultScale: 0,
  rpcUrl: Object.keys(config.contract.rpcUrls)[0],
};

const watchers = settingKeys.reduce(
  (acc, key) => ({ ...acc, [key]: new Set() }),
  {}
);

export const loadSettings = () => {
  const storedSettings = localStorage.getItem("settings");
  if (storedSettings) {
    for (const [key, value] of Object.entries(JSON.parse(storedSettings)))
      settings[key] = value;
  }
  return settings;
};

const notify = (setting) => {
  for (const l of Array.from(watchers[setting])) {
    l(settings[setting]);
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem("settings", JSON.stringify(settings));
};

export const toggleDarkMode = (settings) => {
  settings.darkMode =
    settings.darkMode === "auto"
      ? true
      : settings.darkMode === true
      ? false
      : "auto";
  notify("darkMode");
  return settings;
};

export const toggleRPCUrl = (settings) => {
  const index = rpcKeys.indexOf(settings.rpcUrl);
  settings.rpcUrl = rpcKeys[(index + 1) % rpcKeys.length];
  notify("rpcUrl");
  return settings;
};

export const toggleComposerUI = (settings) => {
  settings.composerUI =
    settings.composerUI === "auto"
      ? true
      : settings.composerUI === true
      ? false
      : "auto";
  notify("composerUI");
  return settings;
};

export const toggleVolume = (settings) => {
  settings.volume = ((settings.volume || 0) + 1) % 5;
  notify("volume");
  return settings;
};

export const toggleDefaultScale = (settings) => {
  settings.defaultScale =
    ((settings.defaultScale || 0) + 1) % Object.keys(scales).length;
  notify("defaultScale");
  return settings;
};

export const toggleSetting = (settings, key) => {
  settings[key] = !settings[key];
  notify(key);
  return settings;
};

export const getSetting = (setting) => {
  return settings[setting];
};
export const watchSetting = (setting, onChange, initialCall = true) => {
  watchers[setting].add(onChange);
  if (initialCall) onChange(settings[setting]);
};
export const unwatchSetting = (setting, onChange) =>
  watchers[setting].delete(onChange);
