import BasePriceComposer, { notes, keys, noteLengths } from "./_priceComposer";

const chords = [
  [0, 2, 4], // major/minor
  [0, 2, 4, 6], // 7th
  [0, 7], // octave
  [0, 5, 7], // octave, can play the pattern 0-2-1
];

const speeds = noteLengths.slice(0, -2);

function createRand(seed) {
  var m = 25;
  var a = 11;
  var c = 17;

  var z = seed || 3;
  return function (n) {
    z = (a * z + c) % m;
    const r = z / m;

    if (n) return Math.floor(r * n) % n;
    return z / m;
  };
}

const getRandomProgression = (rand) => {
  // picks 2-6 chords
  const n = 2 + rand(4);
  const _chords = [];

  for (let i = 0; i < n; ++i) {
    _chords.push({ startNote: rand(7), dists: chords[rand(chords.length)] });
  }

  return _chords;
};

const progressionToCommandList = (progression) => {
  const noteCommands = [];
  for (const p of progression) {
    const isEven = p.dists.length % 2 === 0;
    if (isEven) {
      for (let i = 0; i < p.dists.length; i += 2) {
        noteCommands.push([
          p.dists[i] + p.startNote,
          p.dists[i + 1] + p.startNote,
        ]);
      }
    } else {
      for (const command of p.dists) {
        noteCommands.push(command + p.startNote);
      }
    }
  }

  return noteCommands;
};

export default class Jiggly2 extends BasePriceComposer {
  melodyLastNote = 0;
  chordProgress = 0;
  alteredSinceLastSequence = new Set();
  state = {
    progression: null,
    melodySpeed: 2, // 1, 2, 4, 8,
    chordSpeed: 3,
    melodyBaseOctave: 4,
    chordBaseOctave: 3,
    dutyCycle: 1, // only for melody
    // noteType: [0, 0, 0],
    // vibrato: [0, 0, 0],
  };
  rand;

  constructor(limit = 100, n = 10, avg = 2) {
    super(limit, n, avg);
  }

  // gets the current price range
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

  processPriceCollection(price) {
    if (this.priceHistory.length === 0) {
      this.rand = createRand(price % 7);
      return
    }
    this.processOutOfRange();
  }

  processOutOfRange(direction = -1) {
    // at each point, we'll take 2 options and assign them to higher/lower bound
    const stateKeys = Object.keys(this.state);

    let remainingKeys = stateKeys.reduce(
      (acc, k) => (this.alteredSinceLastSequence.has(k) ? acc : [...acc, k]),
      []
    );

    if (remainingKeys.length < 2 && this.state.progression !== null) {
      remainingKeys = stateKeys;
      this.alteredSinceLastSequence = new Set();
    }

    const stateToChange =
      remainingKeys[
        (this.rand(remainingKeys.length) + (direction === -1 ? 0 : 1)) %
          remainingKeys.length
      ];
    this.alteredSinceLastSequence.add(stateToChange);

    switch (stateToChange) {
      case "progression":
        return this.changeProgression();
      case "melodySpeed":
        return this.changeMelodySpeed();
      case "chordSpeed":
        return this.changeChordSpeed();
      case "melodyBaseOctave":
        return this.changeMelodyBaseOctave();
      case "chordBaseOctave":
        return this.changeChordBaseOctave();
      case "dutyCycle":
        return this.changeDutyCycle();
      case "noteType":
        return this.changeNoteType();
      case "vibrato":
        return this.changeVibrato();
      case "key":
        return this.changeKey();
    }
  }
  changeMelodySpeed() {
    this.state.melodySpeed = this.rand(speeds.length - 2);
  }
  changeChordSpeed() {
    this.state.chordSpeed = this.rand(speeds.length - 2) + 2;
  }

  changeMelodyBaseOctave() {
    this.state.melodyBaseOctave = 3 + this.rand(3);
  }
  changeChordBaseOctave() {
    this.state.chordBaseOctave = 2 + this.rand(4);
  }
  changeDutyCycle() {
    this.state.dutyCycle = this.rand(4);
    this.writeChannel(0, `duty_cycle ${this.state.dutyCycle}`);
  }
  changeNoteType() {
    this.writeChannel(this.rand(3), this.getNoteType());
  }
  changeVibrato() {
    this.writeChannel(this.rand(3), this.getVibrato());
  }
  changeKey() {
    /*
    const _keys = Object.keys(keys);
    this.scale = _keys[this.rand(_keys.length)];*/
  }

  changeProgression() {
    this.state.progression = getRandomProgression(this.rand);
    this.chordProgress = 0;
  }

  getWithProbability(optionsAndProbabilities) {
    const r = this.rand(100) / 100;
    let pPlus = 0;

    optionsAndProbabilities.sort((a, b) => (a.p > b.p ? 1 : -1));

    for (const { o, p } of optionsAndProbabilities) {
      if (pPlus < r) return o;
      pPlus += p;
    }

    return optionsAndProbabilities.slice(-1)[0].o;
  }

  getVibrato() {
    const n1 = this.getWithProbability([
      {
        o: 0,
        p: 0.07,
      },
      {
        o: 4,
        p: 0.04,
      },
      {
        o: 5,
        p: 0.03,
      },
      {
        o: 6,
        p: 0.12,
      },
      {
        o: 8,
        p: 0.28,
      },
      {
        o: 9,
        p: 0.03,
      },
      {
        o: 10,
        p: 0.16,
      },
      {
        o: 11,
        p: 0.04,
      },
      {
        o: 12,
        p: 0.08,
      },
      {
        o: 16,
        p: 0.06,
      },
      {
        o: 18,
        p: 0.03,
      },
      {
        o: 20,
        p: 0.03,
      },
      {
        o: 24,
        p: 0.03,
      },
    ]);
    const n2 = this.getWithProbability([
      {
        o: 0,
        p: 0.03,
      },
      {
        o: 1,
        p: 0.21,
      },
      {
        o: 2,
        p: 0.45,
      },
      {
        o: 3,
        p: 0.25,
      },
      {
        o: 4,
        p: 0.03,
      },
      {
        o: 8,
        p: 0.03,
      },
    ]);
    const n3 = this.getWithProbability([
      {
        o: 0,
        p: 0.05,
      },
      {
        o: 1,
        p: 0.05,
      },
      {
        o: 2,
        p: 0.09,
      },
      {
        o: 3,
        p: 0.08,
      },
      {
        o: 4,
        p: 0.33,
      },
      {
        o: 5,
        p: 0.24,
      },
      {
        o: 6,
        p: 0.1,
      },
      {
        o: 7,
        p: 0.03,
      },
      {
        o: 8,
        p: 0.03,
      },
    ]);

    return `vibrato ${n1} ${n2} ${n3}`;
  }

  getNoteType() {
    const n1 = this.getWithProbability([
      {
        o: 4,
        p: 0.02,
      },
      {
        o: 6,
        p: 0.01,
      },
      {
        o: 13,
        p: 0.01,
      },
      {
        o: 12,
        p: 0.84,
      },
    ]);

    const n2 = this.getWithProbability([
      {
        o: 0,
        p: 0.01,
      },
      {
        o: 1,
        p: 0.05,
      },
      {
        o: 2,
        p: 0.01,
      },
      {
        o: 3,
        p: 0.01,
      },
      {
        o: 4,
        p: 0.02,
      },
      {
        o: 5,
        p: 0.01,
      },
      {
        o: 6,
        p: 0.02,
      },
      {
        o: 7,
        p: 0.01,
      },
      {
        o: 8,
        p: 0.03,
      },
      {
        o: 9,
        p: 0.04,
      },
      {
        o: 10,
        p: 0.1,
      },
      {
        o: 11,
        p: 0.3,
      },
      {
        o: 12,
        p: 0.32,
      },
      {
        o: 13,
        p: 0.04,
      },
      {
        o: 14,
        p: 0.02,
      },
      {
        o: 15,
        p: 0.01,
      },
    ]);

    const n3 = this.getWithProbability([
      {
        o: -7,
        p: 0.01,
      },
      {
        o: -6,
        p: 0.01,
      },
      {
        o: -5,
        p: 0.01,
      },
      {
        o: -4,
        p: 0.01,
      },
      {
        o: -3,
        p: 0.01,
      },
      {
        o: -2,
        p: 0.01,
      },
      {
        o: -1,
        p: 0.01,
      },
      {
        o: 0,
        p: 0.18,
      },
      {
        o: 1,
        p: 0.11,
      },
      {
        o: 2,
        p: 0.12,
      },
      {
        o: 3,
        p: 0.1,
      },
      {
        o: 4,
        p: 0.08,
      },
      {
        o: 5,
        p: 0.1,
      },
      {
        o: 6,
        p: 0.03,
      },
      {
        o: 7,
        p: 0.21,
      },
    ]);

    return `note_type ${n1} ${n2} ${n3}`;
  }

  getSpeed(baseSpeed) {
    const r = this.rand(100);
    if (r > 95) return (speeds.length + baseSpeed - 2) % speeds.length;
    if (r > 90) return (baseSpeed + 2) % speeds.length;
    if (r > 80) return (speeds.length + baseSpeed - 1) % speeds.length;
    if (r > 70) return (baseSpeed + 1) % speeds.length;
    return baseSpeed % speeds.length;
  }

  getNextChordNotes() {
    const commands = progressionToCommandList(this.state.progression);
    if (this.chordProgress >= commands.length) {
      this.chordProgress = 0;
      return this.getNextChordNotes();
    }

    return commands[this.chordProgress++];
  }

  syncChordChannels() {
    // they will be more or less in sync (<16)
    const max = Math.max(...this.seek.slice(1));

    for (let i = 1; i < 3; i++) {
      let d = max - this.seek[i];
      if (d > 0) {
        this.writeChannel(i, `rest ${d}`);
      }
    }
  }

  getNextPriceOptionsSize() {
    return 5;
  }

  applyPriceIndex(priceIndex) {
    const lMelody = this.getSpeed(this.state.melodySpeed);

    if (priceIndex > 1) {
      const lChord = this.state.chordSpeed;
      const chordNotes = this.getNextChordNotes();
      this.checkSync();

      if (Array.isArray(chordNotes)) {
        // it means we only need a single channel for playing the next chord.
        // the other channel can just play a random melody
        this.syncChordChannels();
        this.writeNote(1, chordNotes[0], lChord, this.state.chordBaseOctave);
        this.writeNote(2, chordNotes[1], lChord, this.state.chordBaseOctave);
      } else {
        this.writeNote(1, chordNotes, lChord, this.state.chordBaseOctave);
        //this.writeNote(2, this.rand(14), this.rand(speeds.length));
      }
    }

    // melody rest disabled altogether
    if (false && priceIndex === 3) {
      this.writeChannel(0, `rest ${speeds[lMelody]}`);
    } else {
      const octaveDistance = this.octaves[0] - this.state.melodyBaseOctave;
      this.melodyLastNote +=
        (octaveDistance > 1 ? -3 : octaveDistance < -1 ? -1 : -2) + priceIndex;
      this.writeNote(
        0,
        this.melodyLastNote,
        lMelody,
        this.state.melodyBaseOctave
      );
    }
  }
}
