export const notes = [
  "C_",
  "C#",
  "D_",
  "D#",
  "E_",
  "F_",
  "F#",
  "G_",
  "G#",
  "A_",
  "A#",
  "B_",
];
const pattern = [2, 2, 1, 2, 2, 2];
export const noteLengths = [3, 1, 2, 4, 8, 6, 10, 16];
export const keys = notes
  .map((n, i) => {
    const chordNotes = [notes[i]];
    let c = i;
    for (const p of pattern) {
      c += p;
      chordNotes.push(notes[c % notes.length]);
    }
    return [`${notes[i]} major`, chordNotes];
  })
  .reduce((acc, [name, keys]) => ({ ...acc, [name]: keys }), {});

export default class BasePriceComposer {
  priceHistory = [];
  isOver = false;
  priceMapping = [new Map(), new Map(), new Map()];
  track = [[], [], []];
  MA;
  AVG;
  LIMIT;
  octaves = [0, 0, 0];
  seek = [0, 0, 0];
  scale;
  optionChain = [];

  constructor(limit = 100, n = 4, avg = 4, initialScale = "C_ major") {
    this.LIMIT = limit;
    this.MA = n;
    this.AVG = avg;
    this.scale = initialScale;
  }

  getPriceRange() {
    const diffs = [];

    const N = this.priceHistory.length - 1;

    for (let n = 0; n < this.MA; ++n) {
      const i = N - n;
      if (i < 1) break;

      diffs.push(Math.abs(this.priceHistory[i] - this.priceHistory[i - 1]));
    }

    const avg =
      (this.AVG * diffs.reduce((acc, d) => acc + d, 0)) / diffs.length;

    return [this.priceHistory[N] - avg, this.priceHistory[N] + avg];
  }

  finishSong() {
    if (this.onFinish) this.onFinish();
    this.checkSync(true);
    this.isOver = true;
  }

  writeChannel(channel, command) {
    let l = 0;
    if (command.startsWith("rest")) l = parseInt(command.split(" ")[1]);
    if (command.startsWith("note ")) l = parseInt(command.split(" ")[2]);
    if (command.startsWith("octave"))
      this.octaves[channel] = parseInt(command.split(" ")[1]);

    this.seek[channel] += l;

    this.priceMapping[channel].set(
      this.priceHistory.length,
      this.track[channel].length
    );

    this.track[channel].push(command);
  }

  applyPriceChange(price) {
    if (this.isOver) return;

    if (this.priceHistory.length < this.MA) {
      if (this.processPriceCollection) this.processPriceCollection(price);
    } else {
      const priceRange = this.getPriceRange();
      if (price < priceRange[0]) {
        this.optionChain.push(-2);
        if (this.processOutOfRange) this.processOutOfRange(-1);
      } else if (price > priceRange[1]) {
        this.optionChain.push(-1);
        if (this.processOutOfRange) this.processOutOfRange(1);
      } else {
        const index = this.findPriceOptionIndex(
          price,
          this.getNextPriceOptionsSize()
        );
        this.optionChain.push(index);
        // handle normal scenario
        this.applyPriceIndex(index);
      }
    }

    this.priceHistory.push(price);

    if (this.priceHistory.length >= this.LIMIT) {
      this.finishSong();
    }
  }

  getOptionRanges(n) {
    const priceRange = this.getPriceRange();
    const rangeSize = priceRange[1] - priceRange[0];
    const limits = [priceRange[0]];

    while (limits.length < n + 1) {
      limits.push(limits[limits.length - 1] + rangeSize / n);
    }

    return limits;
  }

  isInOctave(notes, note) {
    const octaveChangeIndex = notes.findIndex((n) => n.includes("C"));
    if (octaveChangeIndex === 0) return true;
    return note < octaveChangeIndex;
  }

  toggleNotePitch(note) {
    if (note === "B_") return "C_";
    if (note === "E_") return "F_";

    return `${note[0]}${note[1] === "_" ? "#" : "_"}`;
  }

  _writeNote(channel, note, speedIndex, baseOctave, isAccidental) {
    const notes = keys[this.scale];
    const desiredOctave = baseOctave; // + (this.isInOctave(notes, note) ? 0 : 1);

    if (this.octaves[channel] !== desiredOctave) {
      this.writeChannel(channel, `octave ${desiredOctave}`);
    }

    this.writeChannel(
      channel,
      `note ${
        isAccidental ? this.toggleNotePitch(notes[note]) : notes[note]
      }, ${noteLengths[speedIndex]}`
    );
  }

  writeNote(channel, note, speedIndex, baseOctave) {
    let desiredOctave =
      note < 0
        ? baseOctave - Math.floor(-note / 7)
        : note < 7
        ? baseOctave
        : baseOctave + Math.ceil(note / 7);

    desiredOctave = Math.min(8, desiredOctave);
    desiredOctave = Math.max(1, desiredOctave);

    if (this.octaves[channel] !== desiredOctave) {
      this.writeChannel(channel, `octave ${desiredOctave}`);
    }

    const notes = keys[this.scale];

    this.writeChannel(
      channel,
      `note ${notes[(note + 63) % notes.length]}, ${noteLengths[speedIndex]}`
    );
  }

  findPriceOptionIndex(price, optionRangeLength) {
    const limits = this.getOptionRanges(optionRangeLength);

    const result = limits.findIndex((l) => price < l) - 1;

    return result === -2 ? 0 : result;
  }

  render(shouldFinish = true) {
    let track = ``;
    for (const channel of this.track) {
      if (channel.length === 0) continue;
      const hasLoop = channel.find((cmd) => cmd === ".mainloop:");
      track += `channel::
${hasLoop || shouldFinish === false ? "" : ".mainloop:"}
  ${channel.join(`\n  `)}
${shouldFinish ? `sound_loop 0, .mainloop\n` : ""}`;
    }
    return track;
  }

  // TODO: this is a lie! it only works if we don't have intro/outro
  checkSync(fullSync = false) {
    // don't allow channels to get too much out of sync
    const max = Math.max(...this.seek);
    const maxIndex = this.seek.indexOf(max);

    // ah no no no, we will need to check if ANY is below
    // at this point we'll take the one that's furthest ahead

    for (let i = 0; i < 3; i++) {
      if (i === maxIndex) continue;
      let d = max - this.seek[i];
      while (d > 16) {
        this.writeChannel(i, `rest 16`);
        d = max - this.seek[i];
      }

      if (fullSync && d > 0) {
        this.writeChannel(i, `rest ${d}`);
      }
    }
  }
}
