import { parseLine, getNoteLength } from "../../utils";
import { commandTemplate } from "../editor";

export function channelToElements(trackChannel, channelIndex) {
  let timer = 0;
  return trackChannel.map((line, lineIndex) => {
    const [cmd, values] = parseLine(line);
    const template = commandTemplate(
      "",
      { cmd, values },
      lineIndex,
      channelIndex
    );
    let commandLength = 0;
    const cmdTemplate = {
      template,
      start: 0,
      end: 0,
    };
    if (["note", "rest"].includes(cmd)) {
      cmdTemplate.start = timer;
      commandLength = parseInt(values[cmd === "note" ? 1 : 0]);
      timer += getNoteLength(160, commandLength);
      cmdTemplate.end = timer;
    }

    return cmdTemplate;
  });
}

export default function renderSong(
  control,
  props,
  { prevN, previousIndex, latestCommandIndex }
) {
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
}
