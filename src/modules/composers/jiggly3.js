import BasePriceComposer, { notes, keys, noteLengths } from "./_priceComposer";

const noteTypes = [`note_type 12, 0, 4`];

const noteCharacteristics = [
  {
    key: "rest",
    options: noteLengths,
  },
  {
    key: "baseOctave",
    options: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  /*
  {
    key: "key",
    options: [1,2,3,4], // ah this is dynamic?
  },*/
];

const compositionCharacteristics = [
  {
    key: "loop", // start/end
    options: [],
  },

  /*
   *
   * umm why not allow multiple loops again?
   * makes sync incredibly difficult
   * currently we should even disable loop definitions altogether
   * all channels play from the start
   * */
  /*
  {
    key: "noteType",
    options: [], // TBD
  },*/
  {
    key: "dutyCycle",
    options: [1, 2, 3, 4],
  },
];

export default class Jiggly3 extends BasePriceComposer {
  state = {
    baseOctave: 4,
    currentNote: null,
    hasLoop: false,
    currentChannel: 0,
  };

  lastNote = 0;
  activeStateQuery = 0;
  targetChannelCount = 0;

  constructor(limit = 100, n = 4, avg = 2, targetChannelCount = 3) {
    super(limit, n, avg);
    this.targetChannelCount = targetChannelCount;
    this.octaves[0] = 4;
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
    if (this.state.currentChannel === 2) return
    this.writeChannel(this.state.currentChannel, `duty_cycle ${dutyCycle}`);
  }

  changeKey(keyIndex) {
    const _keys = Object.keys(keys);
    this.scale = _keys[keyIndex];
  }

  changeBaseOctave(index) {
    this.state.baseOctave = index;
  }

  getNextPriceOptionsSize() {
    if (this.activeStateQuery === -1) {
      // note specific options
      return noteCharacteristics.length;
    }

    if (this.activeStateQuery === 1) {
      // composition speicific options
      return compositionCharacteristics.length;
    }

    if (this.activeStateQuery === "rest") {
      return noteLengths.length - 1;
    }

    if (this.activeStateQuery === "baseOctave") {
      return 8;
    }

    if (this.activeStateQuery === "key") {
      return keys.length;
    }

    if (this.activeStateQuery === "dutyCycle") {
      return 4;
    }

    if (this.activeStateQuery === "noteType") {
      // TBD
      return 1;
    }

    if (this.state.currentNote === null) {
      // number of notes in a key
      return 7;
    }

    return noteLengths.length - 1;
  }

  finishChannel() {
    // this.writeChannel(this.state.currentChannel, `sound_loop 0, .loop`);

    if (this.state.currentChannel === this.targetChannelCount - 1) {
      return this.finishSong();
    }

    this.state.currentChannel += 1;
    this.state.hasLoop = false;
  }

  processLoopChange() {
    this.activeStateQuery = 0;

    if (this.state.hasLoop) {
      return this.finishChannel();
    }

    this.state.hasLoop = true;

    this.writeChannel(this.state.currentChannel, `.loop:`);
  }

  applyStateChangeOption(index) {
    if (this.activeStateQuery === -1) {
      this.activeStateQuery = noteCharacteristics[index].key;
      return;
    }

    if (this.activeStateQuery === 1) {
      this.activeStateQuery = compositionCharacteristics[index].key;
      if (this.activeStateQuery === "loop") this.processLoopChange();
      return;
    }

    if (this.activeStateQuery === "rest") {
      this.writeChannel(
        this.state.currentChannel,
        `rest ${noteLengths[index]}`
      );
    } else if (this.activeStateQuery === "baseOctave") {
      this.changeBaseOctave(index);
    } else if (this.activeStateQuery === "key") {
      this.changeKey(index);
    } else if (this.activeStateQuery === "dutyCycle") {
      this.changeDutyCycle(index);
    } else if (this.activeStateQuery === "noteType") {
      this.changeNoteType(index);
    }

    this.activeStateQuery = 0;
  }

  applyPriceIndex(index) {
    if (this.activeStateQuery !== 0) return this.applyStateChangeOption(index);

    if (this.state.currentNote === null) {
      const octaveDistance = this.octaves[0] - this.state.baseOctave;
      this.state.currentNote +=
        (octaveDistance > 1 ? -4 : octaveDistance < -1 ? -2 : -3) + index;
      this.lastNote = this.state.currentNote;
      return;
    }

    const length = index;

    this.writeNote(
      this.state.currentChannel,
      this.lastNote,
      length,
      this.state.baseOctave
    );

    this.state.currentNote = null;
  }
}
