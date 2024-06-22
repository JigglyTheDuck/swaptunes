import { Composer } from "./composer";
import config from "../config";

export class ParsingError extends Error {
  line;
  channelIndex;
  constructor(msg, channelIndex, line) {
    super(msg);

    this.channelIndex = channelIndex;
    this.line = line;
  }
}

export class Parser {
  loopDefinitions = [{}, {}, {}, {}];
  composer = null;
  preActionHook = null;
  Composer;

  constructor(preActionHook, _Composer = Composer) {
    this.preActionHook = preActionHook;
    this.Composer = _Composer;
    this.composer = new this.Composer();
  }

  commit(value) {
    const options = this.composer.getNextOptions();

    const optionIndex = options
      .map((i) => i.option)
      .findIndex((o) => o === value);

    if (optionIndex === -1) {
      throw new ParsingError(
        `unrecognized command/value ${value} cmd:${
          this.composer.currentCommand.cmd
        } values:${this.composer.currentCommand.values.join(",")}`,
        this.composer.currentChannelIndex,
        this.composer.track[this.composer.currentChannelIndex].length
      );
    }

    if (this.preActionHook) this.preActionHook(optionIndex, options);

    this.composer.applyOption(optionIndex);
  }

  parseCmd(channelIndex, cmd, values) {
    const options = this.composer.getNextOptions().map((i) => i.option);

    if (cmd.includes(":")) {
      this.loopDefinitions[channelIndex][cmd.slice(0, -1)] = Object.keys(
        this.loopDefinitions[channelIndex]
      ).length;
      cmd = "new_loop";
    }

    if (cmd === "sound_loop") {
      values[1] = this.loopDefinitions[channelIndex][values[1]];
    }

    if (cmd === "note_type") {
      values[0] = "12";
    }

    this.commit(cmd);

    for (const v of values) {
      this.commit(v);
    }
  }

  parse(str) {
    this.loopDefinitions = [{}, {}, {}, {}];
    this.composer = new this.Composer();
    let currentChannel = -1;
    for (const line of str.split("\n")) {
      if (line.trim().length === 0 || line.includes("unused")) continue;

      if (line.includes("::")) {
        currentChannel += 1;
        if (currentChannel > this.composer.currentChannelIndex) {
          // sound_ret was missing...
          this.parseCmd(currentChannel, "sound_ret", []);
          //this.composer.startNewChannel();
        }
        continue;
      }
      let [cmd, ...values] = line.trim().split(" ");
      if (config.sampling.unsupported_commands.includes(cmd)) continue;
      values = values.map((v) => (v.endsWith(",") ? v.slice(0, -1) : v));
      this.parseCmd(currentChannel, cmd, values);
    }

    return this.composer.renderTrack();
  }
}
