import BasePriceComposer, { notes, keys, noteLengths } from "./_priceComposer";

export default class Jiggly1 extends BasePriceComposer {
  baseOctave = 4;
  lastNote = 0;

  currentNote = null;

  activeStateQuery = 0;

  constructor(limit = 100, n = 4, avg = 2) {
    super(limit, n, avg);
    this.octaves[0] = 4;
  }

  processOutOfRange(direction) {
    this.activeStateQuery = direction;
  }

  changeDutyCycle(dutyCycle) {
    this.writeChannel(0, `duty_cycle ${this.state.dutyCycle}`);
  }

  changeKey(keyIndex) {
    const _keys = Object.keys(keys);
    this.scale = _keys[keyIndex];
  }

  getNextPriceOptionsSize() {
    if (this.activeStateQuery === -1) {
      return notes.length;
    }

    if (this.activeStateQuery === 1) {
      return 4;
    }

    if (this.currentNote === null) {
      return 7;
    }

    return noteLengths.length - 1;
  }

  applyPriceIndex(index) {
    if (this.activeStateQuery === -1) {
      this.activeStateQuery = 0;
      // changing key, too many options
      return this.changeKey(index);
    } else if (this.activeStateQuery === 1) {
      this.activeStateQuery = 0;
      // change duty cycle
      // return this.changeDutyCycle(index);
    }

    if (this.currentNote === null) {
      const octaveDistance = this.octaves[0] - this.baseOctave;
      this.lastNote +=
        (octaveDistance > 1 ? -4 : octaveDistance < -1 ? -2 : -3) + index;
      this.currentNote = this.lastNote;
      return;
    }

    const length = index;

    this.writeNote(0, this.lastNote, length, this.baseOctave);

    this.currentNote = null;
  }
}
