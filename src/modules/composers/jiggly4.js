import BasePriceComposer, { notes, keys, noteLengths } from "./_priceComposer";
import { parseLine } from "../../utils";

// TODO:
// current problems are parsing and labeling

const noteCharacteristics = [
  {
    key: "accidental",
    name: "Accidental note",
    options: [0, 1, 2, 3, 4],
  },
  {
    key: "baseOctave",
    name: "Change base octave",
    options: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    key: "rest",
    name: "Insert rest",
    options: noteLengths,
  },
];
const noteCharacteristicsKeys = noteCharacteristics.map((c) => c.key);

const compositionCharacteristics = [
  {
    key: "end_channel", // start/end
    name: "End channel", // start loop / end loop
    options: [],
  },

  {
    key: "dutyCycle",
    name: "Set duty cycle",
    options: [0, 1, 2, 3],
  },

  // most likely note types
  {
    key: "noteType1",
    name: "Change note type (1)",
    options: [
      "note_type 12, 1, 1",
      "note_type 12, 1, 3",
      "note_type 12, 1, 2",
      "note_type 12, 2, -7",
      "note_type 12, 9, 4",
      "note_type 12, 10, 0",
      "note_type 12, 10, 3",
    ],
  },

  // less likely note types
  {
    key: "noteType2",
    name: "Change note type (2)",
    options: [
      "note_type 12, 11, 2",
      "note_type 12, 11, 3",
      "note_type 12, 11, 4",
      "note_type 12, 12, 2",
      "note_type 12, 12, 3",
      "note_type 12, 12, 4",
      "note_type 12, 13, 3",
    ],
  },
];

const compositionCharacteristicsKeys = compositionCharacteristics.map(
  (c) => c.key
);

export default class Jiggly4 extends BasePriceComposer {
  state = {
    isAccidental: false,
    baseOctave: 3,
    currentNote: null,
    currentChannel: 0,
    hasLoop: false,
  };

  activeStateQuery = 0;
  targetChannelCount = 0;

  constructor(
    limit = 100,
    n = 4,
    avg = 2,
    initialScale = "C_ major",
    targetChannelCount = 3
  ) {
    super(limit, n, avg, initialScale);
    this.targetChannelCount = targetChannelCount;
    this.octaves[0] = 3;
  }

  processOutOfRange(direction) {
    if (this.activeStateQuery !== 0) {
      // resets in case we're still out of range
      this.activeStateQuery = 0;
      return;
    }
    this.activeStateQuery = direction;
  }

  changeDutyCycle(dutyCycle) {
    if (this.state.currentChannel === 2) return;
    this.writeChannel(this.state.currentChannel, `duty_cycle ${dutyCycle}`);
  }

  changeBaseOctave(index) {
    this.state.baseOctave = index + 1;
  }

  getNextPriceOptionsSize() {
    if (this.activeStateQuery === 1) {
      // note specific options
      return noteCharacteristics.length;
    }

    if (this.activeStateQuery === -1) {
      // composition speicific options
      return compositionCharacteristics.length;
    }

    if (noteCharacteristicsKeys.includes(this.activeStateQuery)) {
      return noteCharacteristics.find((c) => c.key === this.activeStateQuery)
        .options.length;
    }

    if (compositionCharacteristicsKeys.includes(this.activeStateQuery)) {
      return compositionCharacteristics.find(
        (c) => c.key === this.activeStateQuery
      ).options.length;
    }

    if (this.state.currentNote === null) {
      // number of notes in a key
      return 7;
    }

    return noteLengths.length;
  }

  finishChannel() {
    if (this.state.currentChannel === this.targetChannelCount - 1) {
      this.finishSong();
      return true;
    }

    this.state.hasLoop = false;
    this.state.currentChannel += 1;
    return false;
  }

  processLoopChange() {
    this.activeStateQuery = 0;

    if (this.state.hasLoop) {
      return this.finishChannel();
    }

    this.writeChannel(this.state.currentChannel, ".mainloop:");
    this.state.hasLoop = true;
  }

  changeNoteType(index) {
    this.writeChannel(
      this.state.currentChannel,
      compositionCharacteristics.find((c) => c.key === this.activeStateQuery)
        .options[index]
    );
  }

  applyStateChangeOption(index) {
    if (this.activeStateQuery === 1) {
      this.activeStateQuery = noteCharacteristics[index].key;
      return;
    }

    if (this.activeStateQuery === -1) {
      this.activeStateQuery = compositionCharacteristics[index].key;
      if (this.activeStateQuery === "end_channel") this.processLoopChange();
      return;
    }

    if (this.activeStateQuery === "rest") {
      this.writeChannel(
        this.state.currentChannel,
        `rest ${noteLengths[index]}`
      );
    } else if (this.activeStateQuery === "dutyCycle") {
      this.changeDutyCycle(index);
    } else if (["noteType1", "noteType2"].includes(this.activeStateQuery)) {
      this.changeNoteType(index);
    } else if (this.activeStateQuery === "accidental") {
      this.state.currentNote = index;
      this.state.isAccidental = true;
    } else if (this.activeStateQuery === "baseOctave") {
      this.changeBaseOctave(index);
    }

    this.activeStateQuery = 0;
  }

  getAccidentalNote() {
    const accidentals = notes.filter(
      (note) => !keys[this.scale].includes(note)
    );

    return accidentals[this.state.currentNote];
  }

  applyPriceIndex(index) {
    if (this.activeStateQuery !== 0) return this.applyStateChangeOption(index);

    if (this.state.currentNote === null) {
      this.state.currentNote = index;
      return;
    }

    const length = index;

    if (this.state.isAccidental) {
      this.state.isAccidental = false;
      const note = this.getAccidentalNote();
      this._writeNote(
        this.state.currentChannel,
        keys[this.scale].indexOf(this.toggleNotePitch(note)),
        index,
        this.state.baseOctave,
        true
      );
    } else {
      this._writeNote(
        this.state.currentChannel,
        this.state.currentNote,
        length,
        this.state.baseOctave
      );
    }

    this.state.currentNote = null;
  }

  findNextOption(_composer) {
    const composer = new Jiggly4(
      _composer.LIMIT,
      _composer.MA,
      _composer.AVG,
      _composer.scale,
      _composer.targetChannelCount
    );
    const track = _composer.render()


    let i = 0;

    while (composer.render() !== track && i < this.optionChain.length) {
      const option = this.optionChain[i];
      if (option < 0) {
        composer.processOutOfRange(option === -1 ? 1 : -1);
      } else {
        composer.applyPriceIndex(option);
      }
      i++;
    }

    if (_composer.state.currentNote !== composer.currentNote) {
      // well, also not true
      //
      debugger
    }
    if (_composer.activeStateQuery !== composer.activeStateQuery) {
      // need to reset
      debugger
    }

    // yeah not so simple, we need to take into account current state
    //
    // that is not part of the rendered track

    return this.optionChain.slice(i - 1);
  }

  parse(track, initialPriceHistory = [1000, 1001, 1000, 999, 1002]) {
    const lines = track.split("\n");
    let octave = this.octaves[0];
    this.priceHistory = initialPriceHistory;

    const pickOption = (index) => {
      const limits = this.getOptionRanges(this.getNextPriceOptionsSize());
      const nextPrice = limits[index] + (limits[1] - limits[0]) / 2;
      this.applyPriceChange(nextPrice);
    };

    const commitStateChange = (direction, command, value) => {
      if (this.activeStateQuery !== 0) throw new Error("not in correct state");

      const range = this.getPriceRange();

      this.applyPriceChange(direction === -1 ? range[0] - 1 : range[1] + 1);
      const source =
        direction === -1 ? compositionCharacteristics : noteCharacteristics;

      const i = source.findIndex((v) => v.key === command);
      let optionChain = null;
      for (let j = 0; j < source[i].options.length; ++j) {
        if (source[i].options[j] == value) {
          optionChain = [i, j];
        }
      }

      if (optionChain === null) throw new Error("unprocessable line");

      pickOption(optionChain[0]);
      pickOption(optionChain[1]);

      return [direction === 1 ? -1 : -2, ...optionChain];
    };

    const processRest = (value) => {
      const optionChain = commitStateChange(1, "rest", value);

      if (
        this.track[this.state.currentChannel].slice(-1)[0] !== `rest ${value}`
      ) {
        throw new Error("parse failed");
      }

      return optionChain;
    };

    const processNewLoop = () => {
      const range = this.getPriceRange();
      const step = (range[1] - range[0]) / 2;

      this.applyPriceChange(range[0] - 1);

      const option = compositionCharacteristics.findIndex(
        (v) => v.key === "end_channel"
      );

      pickOption(option);

      if (this.track[this.state.currentChannel].slice(-1)[0] !== `.mainloop:`) {
        throw new Error("parse failed");
      }

      return [-2, option];
    };

    const processDutyCycle = (value) => {
      const optionChain = commitStateChange(-1, "dutyCycle", value);

      if (
        this.track[this.state.currentChannel].slice(-1)[0] !==
        `duty_cycle ${value}`
      )
        throw new Error("parse failed");

      return optionChain;
    };

    const processNoteType = (line) => {
      if (this.activeStateQuery !== 0) throw new Error("not in correct state");

      const range = this.getPriceRange();
      this.applyPriceChange(range[0] - 1);

      let optionChain = null;
      for (let i = 0; i < compositionCharacteristics.length; ++i) {
        for (let j = 0; j < compositionCharacteristics[i].options.length; ++j) {
          if (compositionCharacteristics[i].options[j] === line) {
            optionChain = [i, j];
          }
        }
      }

      if (optionChain === null) throw new Error("unprocessable line");

      pickOption(optionChain[0]);
      pickOption(optionChain[1]);

      if (this.track[this.state.currentChannel].slice(-1)[0] !== line)
        throw new Error("parse failed");

      return [-2, ...optionChain];
    };

    const processAccidentalNote = (note, length) => {
      const optionChain = commitStateChange(
        1,
        "accidental",
        notes.filter((note) => !keys[this.scale].includes(note)).indexOf(note)
      );

      const _notes = keys[this.scale];
      const eventualOctave = this.state.baseOctave;

      if (octave !== eventualOctave) {
        optionChain.push(...commitStateChange(1, "baseOctave", octave));
      }

      const lengthOption = noteLengths.findIndex((l) => l == length);
      pickOption(lengthOption);
      optionChain.push(lengthOption);

      if (
        this.track[this.state.currentChannel].slice(-1)[0] !==
        `note ${note}, ${length}`
      )
        throw new Error("parse failed");

      return optionChain;
    };

    const processNote = (note, length) => {
      const notes = keys[this.scale];
      if (!notes.includes(note)) return processAccidentalNote(note, length);
      const index = notes.indexOf(note);

      const eventualOctave = this.state.baseOctave;

      const optionChain = [];
      if (octave !== eventualOctave) {
        optionChain.push(...commitStateChange(1, "baseOctave", octave));
      }

      optionChain.push(index % 7);
      pickOption(optionChain.slice(-1)[0]);
      optionChain.push(noteLengths.findIndex((l) => l == length));
      pickOption(optionChain.slice(-1)[0]);

      if (
        this.track[this.state.currentChannel].slice(-1)[0] !==
        `note ${note}, ${length}`
      ) {
        // also check note change?
        throw new Error("parse failed");
      }
      return optionChain;
    };

    function processOctave(_octave) {
      octave = parseInt(_octave);
    }

    function parseCmd(cmd, values, line) {
      if (cmd.includes(":")) return processNewLoop();
      switch (cmd) {
        case "duty_cycle":
          return processDutyCycle(values[0]);
        case "note_type":
          return processNoteType(line.trim());
        case "octave":
          return processOctave(values[0]);
        case "note":
          return processNote(values[0], values[1]);
        case "rest":
          return processRest(values[0]);
        case "sound_ret":
        case "sound_loop":
        case "tempo":
          return;
        default:
          console.warn(`unprocessable command ${line}`);
          return;
      }
    }

    // we can go line by line to deal with the slam dunks
    // octaves and notes should be looked at more carefully
    const optionChain = [];
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i];
      if (line.trim().length === 0 || line.includes("unused")) continue;
      if (line.includes("::")) {
        if (this.finishChannel()) break;
        let octave = this.octaves[this.state.currentChannel];
        continue;
      }
      let [cmd, values] = parseLine(line);
      try {
        const options = parseCmd(cmd, values, line);
        if (options) optionChain.push(...options);
      } catch (e) {
        throw new Error(`composition error at line: ${line}`);
      }
    }

    this.finishChannel();

    return optionChain;
  }

  getOptionLabels() {
    if (this.activeStateQuery === 0) {
      return [
        "comp opts",
        ...(this.state.currentNote === null
          ? keys[this.scale].map((n) => `note ${n}`)
          : noteLengths.map(
              (l) => `${keys[this.scale][this.state.currentNote]}, ${l}`
            )),
        "note opts",
      ];
    }

    if (this.activeStateQuery === 1) {
      return ["reset", "acc. note", "new base octave", "rest", "reset"];
    }

    if (this.activeStateQuery === -1) {
      return [
        "reset",
        this.state.hasLoop ? "end channel" : "start loop",
        "new duty cycle",
        "new note type (1)",
        "new note type (2)",
        "reset",
      ];
    }

    if (this.activeStateQuery === "rest") {
      return ["reset", ...noteLengths.map((l) => `rest ${l}`), "reset"];
    }

    if (this.activeStateQuery === "baseOctave") {
      return [
        "reset",
        ...noteCharacteristics[1].options.map((o) => `octave ${o}`),
        "reset",
      ];
    }

    if (this.activeStateQuery === "dutyCycle") {
      return [
        "reset",
        ...compositionCharacteristics[1].options.map((o) => `duty cycle ${o}`),
        "reset",
      ];
    }

    if (this.activeStateQuery === "noteType1") {
      return ["reset", ...compositionCharacteristics[2].options, "reset"];
    }

    if (this.activeStateQuery === "noteType2") {
      return ["reset", ...compositionCharacteristics[3].options, "reset"];
    }
  }
}
