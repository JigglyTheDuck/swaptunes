const samplingConfig = {
  unsupported_commands: [
    "execute_music",
    "volume",
    "toggle_perfect_pitch",
    "duty_cycle_pattern",
  ],
  commands: [
    {
      name: "tempo",
      cmd: "tempo",
      options: [
        "98",
        "100",
        "104",
        "112",
        "120",
        "124",
        "128",
        "132",
        "138",
        "140",
        "144",
        "148",
        "152",
        "156",
        "160",
        "224",
      ],
    },
    {
      name: "duty cycle",
      cmd: "duty_cycle",
      options: ["0", "1", "2", "3"],
    },
    {
      cmd: "octave",
      options: ["1", "2", "3", "4", "5", "6", "7", "8"],
      probability: 0.15,
    },
    {
      cmd: "note_type",
      options: [
        { options: ["12"] },
        {
          options: [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
          ],
        },
        {
          options: [
            "-5",
            "-6",
            "-1",
            "-3",
            "-4",
            "-2",
            "-7",
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
          ],
        },
      ],
    },
    {
      cmd: "rest",
      options: [
        "1",
        "10",
        "11",
        "12",
        "13",
        "14",
        "16",
        "15",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
      ],
    },
    {
      cmd: "note",
      options: [
        {
          options: [
            "A_",
            "B_",
            "C_",
            "D_",
            "E_",
            "F_",
            "G_",
            "A#",
            "C#",
            "D#",
            "F#",
            "G#",
          ],
        },
        {
          options: [
            "1",
            "10",
            "11",
            "12",
            "14",
            "16",
            "15",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
          ],
        },
      ],
    },
    {
      cmd: "channel_end",
      options: [],
    },
    {
      cmd: "new_loop",
      options: [],
    },
  ],
};

export class Composer {
  track = [[]];
  currentTempo = null; // not needed for on chain
  currentChannelIndex = 0;
  channelLoopCount = 0;
  optionCount = 0;

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

  _getCurrentOptions() {
    if (!this.currentCommand.cmd)
      return samplingConfig.commands
        .slice(0, this.channelLoopCount > 0 ? -1 : undefined)
        .map(({ cmd }) => cmd);
    /*
        .filter(
          (cmd) => this.currentChannelIndex !== 2 || cmd !== "duty_cycle"
        );*/

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
    return this._getCurrentOptions().map((o) => ({ option: o }));
  }

  applyOption(optionIndex) {
    if (this.isFinished) return;
    const options = this.getNextOptions();
    if (optionIndex >= options.length) {
      debugger;
      return;
    }
    const selectedOption = this.getNextOptions()[optionIndex].option;

    if (selectedOption === undefined) throw new Error("unsupported option");

    if (this.currentCommand.cmd === null) {
      this.currentCommand.cmd = selectedOption;
    } else {
      this.currentCommand.values.push(selectedOption);
    }

    this._finalizeCommand();
  }

  _resetCommand() {
    this.track[this.currentChannelIndex].push(this.currentCommand);

    if (this.currentCommand.cmd === "new_loop") {
      if (this.channelLoopCount > 0) throw new Error("already has channel");
      this.channelLoopCount += 1;
    }
    if (this.currentCommand.cmd === "channel_end") this.startNewChannel();
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

        if (command.cmd === "channel_end") {
          if (currentLoop !== -1)
            trackStr += `  sound_loop 0, .loop${currentLoop}\n  sound_ret \n`;
          else trackStr += `  sound_ret \n`;

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
    c.currentCommand = {
      cmd: this.currentCommand.cmd,
      values: [...this.currentCommand.values],
    };
    return c;
  }
}
