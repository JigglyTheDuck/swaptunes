import { shuffle, checksum } from "../utils";
import { getProbabilities } from "./probabilities";
import config from "../config";

const samplingConfig = config.sampling;

export class Composer {
  track = [[]];
  currentTempo = null; // not needed for on chain
  currentChannelIndex = 0;
  optionCount = 0;
  channelLoopCount = 0;
  currentOptionsCache = null; // not needed for on chain

  currentCommand = {
    cmd: null,
    values: [],
  };

  constructor(maxChannels) {
    // TODO
  }

  resetTrack() {
    this.track = [[]];
    this.currentChannelIndex = 0;
  }

  get isFinished() {
    // TODO: not true sometimes file just ends.
    return this.currentChannelIndex === 3;
  }

  /*
   * this is supposed to be one of the most sophisticated functions
   * it defines the eventual price range for each action.
   *
   * it is important to note, that this should not affect parsing
   * when parsing order doesn't matter so probabilities won't come into play
   * */
  _getProbabilities() {
    if (this.track[this.currentChannelIndex]) {
      const probabilities = getProbabilities(
        this.track[this.currentChannelIndex],
        this.currentCommand,
        this.currentTempo
      );

      if (probabilities) return probabilities;
    }

    // no preference, assuming equal distribution

    const options = this._getCurrentOptions();

    return options.map(() => 1 / options.length);
  }

  _getCurrentOptions() {
    if (!this.currentCommand.cmd) {
      return samplingConfig.commands
        .map(({ cmd }) => cmd)
        .filter(
          (cmd) => this.currentChannelIndex !== 2 || cmd !== "duty_cycle"
        );
    }

    if (
      this.currentCommand.cmd === "sound_loop" &&
      this.currentCommand.values.length === 1
    ) {
      return [...new Array(this.channelLoopCount)].map((_, i) => i);
    }

    let { options } = samplingConfig.commands.find(
      ({ cmd }) => cmd === this.currentCommand.cmd
    );

    if (options[0].options) {
      // it means we are dealing with a nested command
      options = options[this.currentCommand.values.length].options;
    }

    return options;
  }

  _getCommandOptions() {
    return samplingConfig.commands.find(
      ({ cmd }) => cmd === this.currentCommand.cmd
    ).options;
  }

  getNextOptions() {
    if (this.currentOptionsCache === null) {
      const probabilities = this._getProbabilities();
      const options = this._getCurrentOptions();
      this.currentOptionsCache = options.map((option, i) => ({
        option,
        probability: probabilities[i],
      }));

      shuffle(this.currentOptionsCache, checksum(this.renderTrack()));
    }

    return this.currentOptionsCache;
  }

  applyOption(optionIndex) {
    if (this.isFinished) return;
    const selectedOption = this.getNextOptions()[optionIndex]?.option;

    if (selectedOption === undefined) throw new Error("unsupported option");

    this.currentOptionsCache = null;

    if (this.currentCommand.cmd === null) {
      this.currentCommand.cmd = selectedOption;
    } else {
      this.currentCommand.values.push(selectedOption);
    }

    this._finalizeCommand();
  }

  _resetCommand() {
    this.track[this.currentChannelIndex].push(this.currentCommand);

    if (this.currentCommand.cmd === "new_loop") this.channelLoopCount += 1;
    if (
      this.currentCommand.cmd === "sound_ret" //||
      //this.currentCommand.cmd === "sound_loop" nope we'll wait for explicit sound_ret now
    )
      this.startNewChannel();
    if (this.currentCommand.cmd === "tempo")
      this.currentTempo = this.currentCommand.values;

    this.currentCommand = {
      cmd: null,
      values: [],
    };
  }

  _finalizeCommand() {
    this.optionCount += 1;
    const commandOptions = this._getCommandOptions();

    if (commandOptions.length === 0) return this._resetCommand();

    const isNested = commandOptions[0].options !== undefined;

    if (isNested && commandOptions.length === this.currentCommand.values.length)
      this._resetCommand();

    if (!isNested && this.currentCommand.values.length > 0)
      return this._resetCommand();
  }

  startNewChannel() {
    this.channelLoopCount = 0;
    this.currentChannelIndex += 1;
    if (this.currentChannelIndex < 3) this.track.push([]);
  }

  // not needed for on chain
  static _renderTrack(track) {
    let trackStr = ``;
    let currentChannel = 0;
    for (const channel of track) {
      trackStr += `channel${++currentChannel}::\n`;
      let currentLoop = -1;
      for (const command of channel) {
        if (command.cmd === "new_loop") {
          currentLoop += 1;
          trackStr += `.loop${currentLoop}:\n`;
          continue;
        }

        if (command.cmd === "sound_loop") {
          trackStr += `  sound_loop ${command.values[0]}, .loop${command.values[1]}\n`;
          continue;
        }

        trackStr += `  ${command.cmd} ${command.values.join(", ")}\n`;
      }
    }

    return trackStr;
  }

  renderTrack() {
    return Composer._renderTrack(this.track);
  }

  copy() {
    const c = new Composer();
    for (let i = 0; i < this.track.length; ++i) {
      c.track[i] = [...this.track[i]];
    }
    c.currentTempo = this.currentTempo;
    c.currentChannelIndex = this.currentChannelIndex;
    c.channelLoopCount = this.channelLoopCount;
    if (this.currentOptionsCache)
      c.currentOptionsCache = { ...this.currentOptionsCache };
    c.currentCommand = {
      cmd: this.currentCommand.cmd,
      values: [...this.currentCommand.values],
    };
    return c;
  }
}
