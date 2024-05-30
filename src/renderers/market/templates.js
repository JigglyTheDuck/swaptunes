import header from "../../components/header";
import linkNav, { formNavItem as navItem } from "../../components/navitem";
import { keys as scales } from "../../modules/composers/_priceComposer";

const prepend = (n) => (n < 10 ? `0${n}` : n);

export const formatDate = (t) => {
  if (t === "live") return "Live";
  const d = new Date(t * 1000);

  if (d.getYear() !== new Date().getYear()) {
    return `${
      d.getYear() !== new Date().getYear() ? `${d.getYear() + 1900} ` : ""
    }${d.getDate()}/${d.getMonth() + 1}
    `;
  }

  return `${d.getDate()}/${d.getMonth() + 1} ${prepend(d.getHours())}:${prepend(
    d.getMinutes()
  )}`;
};

const submitBtn = `<button class="hidden"></button>`;
export const template = ({
  ticker,
  source,
  sampleRate,
  t,
  isSinceDisabled,
}) => `
${header({ title: "Swaptunes" })}
  <form id="market-form" class="settings menu-nav">
    ${baseFieldsTemplate({ ticker, source, sampleRate, t, isSinceDisabled })}
  </form>
`;

export const advancedFieldsTemplate = ({
  n,
  composer,
  targetChannelCount,
  initialScale,
}) => `
    ${navItem({
      value: "composer",
      label: "Composer",
      checked: true,
    })}
    <span>${composer}</span>
    ${navItem({
      value: "songLength",
      label: "Length",
    })}
    <span>${n}</span>
    ${navItem({
      value: "targetChannelCount",
      label: "Channels",
    })}
    <span>${targetChannelCount + 1}</span>
    ${navItem({
      value: "initialScale",
      label: "Scale",
    })}
    <span>${Object.keys(scales)[initialScale]}</span>
    ${navItem({
      value: "tempo",
      label: "Tempo",
      disabled: true
    })}
    <span>144</span>
    ${navItem({
      value: "base",
      label: "Back",
    })}
    <span></span>
    ${submitBtn}
`;

export const baseFieldsTemplate = ({
  isSinceDisabled,
  source,
  ticker,
  sampleRate,
  t,
}) => `${navItem({
  value: "launch",
  label: "SAMPLE",
  checked: true,
})}
    <span></span>
    ${navItem({
      value: "source",
      label: "Data source",
    })}
    <span>${source}</span>
    ${navItem({
      value: "ticker",
      label: source === "uniswap" ? "Token pair" : "Ticker",
    })}
    <span>${ticker}</span>
    ${navItem({
      value: "sampleRate",
      label: "Sample rate",
    })}
    <span>${sampleRate}</span>
    ${navItem({
      value: "since",
      label: "Since",
      disabled: isSinceDisabled,
    })}
    <span>${formatDate(t)}</span>
    ${navItem({
      value: "adv",
      label: "Advanced",
    })}
    <span></span>
    ${linkNav({
      to: "",
      label: "Back",
    })}
    ${submitBtn}
      `;
