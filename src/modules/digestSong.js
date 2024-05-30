import * as notes from "./notes";
import config from "../config";

export function digestSong(str) {
  const lines = str
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let track = [];
  const tracks = [track];
  const labels = {};

  const samples = "02468ACEFFFEEDDCCBA9876544332211"
    .split("")
    .map((d) => parseInt(d, 16));
  let octave = 5;
  let volume = 13;
  let fade = 3;
  let duty = 2;
  let tempo = 160;

  for (const line of lines) {
    if (line.includes("unused")) {
      continue;
    } else if (line.endsWith("::")) {
      const [, label] = line.match(/(.*?)::$/);
      labels[label] = track.length;
      continue;
    } else if (line.endsWith(":")) {
      const [, label] = line.match(/(.*?):$/);
      labels[label] = track.length;
      continue;
    }

    const [cmd, ...argStr] = line.split(/,? /g);

    if (argStr[0] === undefined) continue;
    const args = argStr.map((n) => +n);

    if (cmd === "endchannel") {
    } else if (
      cmd === "loopchannel" ||
      cmd === "sound_ret" ||
      cmd === "sound_loop"
    ) {
      track.splice(labels[argStr[1]], 0, "LOOPSTART");
      track = [];
      tracks.push(track);
    } else if (cmd === "octave") {
      octave = args[0] + 2;
    } else if (cmd === "notetype" || cmd === "note_type") {
      volume = args[1];
      fade = args[2];
    } else if (cmd === "note") {
      const note = argStr[0][0];
      const sharp = { _: "", "#": "s" }[argStr[0][1]];
      const freq = notes[note + sharp + octave];
      track.push({ freq, volume, fade, duty, samples, length: 320 });
      track.push(((867 * tempo) / 0x100000) * args[1]);
    } else if (cmd === "rest") {
      track.push({ volume: 0, length: 0 });
      track.push(((867 * tempo) / 0x100000) * args[0]);
    } else if (cmd === "tempo") {
      tempo = args[0];
    } else if (cmd === "vibrato") {
    } else if (cmd === "duty" || cmd === "duty_cycle") {
      duty = args[0];
    } else if (!config.sampling.unsupported_commands.includes(cmd)) {
      throw new Error("Unknown command: " + line);
    }
  }
  return tracks;
}
