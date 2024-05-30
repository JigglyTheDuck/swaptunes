import config from "../config";

const newCommandProbabilities = (channelHistory, currentCommand, hasTempo) => {
  // we want to avoid duplicates for
  // octave, duty_cycle, note_type
  //
  // we really don't want to set vibrato, tempo multiple times
  //
  //
  const defaultDistance = 10;

  const telemetry = {
    lastOctaveDistance: defaultDistance,
    lastDutyCycleDistance: defaultDistance,
    lastNoteTypeDistance: defaultDistance,
    hasVibrato: false,
    hasLoop: false,
    noteCount: 0,
    isPreviousRest:
      channelHistory.length > 0 &&
      channelHistory[channelHistory.length - 1].cmd === "rest",
  };

  const max = (v, def) => v > def ? def : v;

  for (let i = 0; i < channelHistory.length; i += 1) {
    const reverseIndex = channelHistory.length - 1 - i;
    const { cmd } = channelHistory[reverseIndex];

    if (cmd === "note") telemetry.noteCount += 1;

    if (
      telemetry.lastOctaveDistance === defaultDistance &&
      cmd === "octave"
    ) {
      telemetry.lastOctaveDistance = max(i, defaultDistance);
    }
    if (
      telemetry.lastDutyCycleDistance === defaultDistance &&
      telemetry.lastDutyCycleDistance === defaultDistance &&
      cmd === "duty_cycle"
    ) {
      telemetry.lastDutyCycleDistance = max(i, defaultDistance);
    }
    if (
      telemetry.lastNoteTypeDistance === defaultDistance &&
      cmd === "note_type"
    ) {
      telemetry.lastNoteTypeDistance = max(i, defaultDistance);
    }
    if (cmd === "vibrato") {
      telemetry.hasVibrato = true;
    }
    if (cmd === "new_loop") {
      telemetry.hasLoop = true;
    }
  }
  const commands = config.sampling.commands;

  // if tempo or vibrato is not is not set we treat them as special cases
  if (!hasTempo) {
    return commands.map((command) =>
      command.cmd === "tempo" ? 0.85 : 0.15 / (commands.length - 1)
    );
  }

  if (!telemetry.hasVibrato) {
    return commands.map((command) =>
      command.cmd === "vibrato" ? 0.85 : 0.15 / (commands.length - 1)
    );
  }

  const probabilities = {
    tempo: 0.02,
    vibrato: 0.02,
  };

  probabilities.rest = telemetry.isPreviousRest ? 0.01 : 0.0875;
  probabilities.octave = telemetry.lastOctaveDistance * 0.02;
  probabilities.duty_cycle = telemetry.lastDutyCycleDistance * 0.01;
  probabilities.note_type = telemetry.lastNoteTypeDistance * 0.015;
  probabilities.new_loop = telemetry.hasLoop ? 0 : 0.12;
  //const channelEndMultiplier = telemetry.noteCount > 100 ? 5 : telemetry.noteCount / 20
  const channelEndMultiplier = 1;
  probabilities.sound_loop = telemetry.hasLoop
    ? 0.05 * channelEndMultiplier
    : 0;
  probabilities.sound_ret = telemetry.hasLoop ? 0 : 0.01 * channelEndMultiplier;

  probabilities.note =
    1 - Object.values(probabilities).reduce((acc, v) => acc + v, 0);

  return commands.map(({ cmd }) => probabilities[cmd]);
};

const keys = {
  "C major": ["C_", "D_", "E_", "F_", "G_", "A_", "B_"],
  "G major": ["G_", "A_", "B_", "C_", "D_", "E_", "F#"],
  "D major": ["D_", "E_", "F#", "G_", "A_", "B_", "C#"],
  "A major": ["A_", "B_", "C#", "D_", "E_", "F#", "G#"],
  "E major": ["E_", "F#", "G#", "A_", "B_", "C#", "D#"],
  "B major": ["B_", "C#", "D#", "E_", "F#", "G#", "A#"],
  "F# major": ["F#", "G#", "A#", "B_", "C#", "D#", "E#"],
  "C# major": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
  "F major": ["F_", "G_", "A_", "A#", "C_", "D_", "E_"],
  "A# major": ["A#", "C_", "D_", "D#", "F_", "G_", "A_"],
  "D# major": ["D#", "F_", "G_", "G#", "A#", "C_", "D_"],
  "G# major": ["G#", "A#", "C_", "C#", "D#", "F_", "G_"],
};

function determineKey(notes) {
  const scores = {};
  for (const key in keys) {
    scores[key] = notes.reduce((score, note) => {
      return score + (keys[key].includes(note) ? 1 : 0);
    }, 0);
  }

  const maxScore = Math.max(...Object.values(scores));
  const bestMatches = Object.keys(scores).filter(
    (key) => scores[key] === maxScore
  );
  const accuracy = maxScore / notes.length;

  return {
    keys: bestMatches,
    accuracy: accuracy,
  };
}

const getNoteProbabilities = (channelHistory, currentCommand) => {
  const noteConfig = config.sampling.commands.find(({ cmd }) => cmd === "note");
  if (currentCommand.values.length === 0) {
    // note

    // we can also only look after the next loop in case loop is in different key
    const previousChannelNotes = channelHistory
      .filter((command) => command.cmd === "note")
      .map((command) => command.values[0]);

    // fancy let's determine what key we're in
    const { keys } = determineKey(previousChannelNotes);

    const scores = [];
    let totalScore = 0;
    for (const note of noteConfig.options[0].options) {
      const score = keys.reduce(
        (acc, key) => (acc + key.includes(note) ? 1 : 0),
        1
      );

      scores.push(score);

      totalScore += score;
    }

    return scores.map((s) => s / totalScore);
  }

  if (currentCommand.values.length === 1) {
    // note length

    // giving far more weight to quarters
    //
    // add more probabilities to quarter notes....
    return noteConfig.options[1].options.map((noteLength) =>
      noteLength % 4 === 0 ? 0.8 / 4 : 0.2 / 12
    );
  }

  return null;
};

const getVibratoProbabilities = (currentCommand) => {
  const noteTypeConfig = config.sampling.commands.find(
    ({ cmd }) => cmd === "vibrato"
  );
  if (currentCommand.values.length === 0) {
    return noteTypeConfig.options[0].options.map((option) => {
      switch (option) {
        case "0":
          return 0.07;
        /*
        case "3":
          return 0.00;*/
        case "4":
          return 0.04;
        case "5":
          return 0.03;
        case "6":
          return 0.12;
        case "8":
          return 0.28;
        case "9":
          return 0.03;
        case "10":
          return 0.16;
        case "11":
          return 0.04;
        case "12":
          return 0.08;
        case "16":
          return 0.06;
        case "18":
          return 0.03;
        case "20":
          return 0.03;
        case "24":
          return 0.03;
        default:
          return 0;
      }
    });
  }

  if (currentCommand.values.length === 1) {
    // first note, predefined distribution
    return noteTypeConfig.options[1].options.map((option) => {
      switch (option) {
        case "0":
          return 0.03;
        case "1":
          return 0.21;
        case "2":
          return 0.45;
        case "3":
          return 0.25;
        case "4":
          return 0.03;
        case "8":
          return 0.03;
        default:
          return 0;
      }
    });
  }
  if (currentCommand.values.length === 2) {
    // first note, predefined distribution
    return noteTypeConfig.options[2].options.map((option) => {
      switch (option) {
        case "0":
          return 0.05;
        case "1":
          return 0.05;
        case "2":
          return 0.09;
        case "3":
          return 0.08;
        case "4":
          return 0.33;
        case "5":
          return 0.24;
        case "6":
          return 0.1;
        case "7":
          return 0.03;
        case "8":
          return 0.03;
        default:
          return 0;
      }
    });
  }
};

const getNoteTypeProbabilities = (currentCommand) => {
  const noteTypeConfig = config.sampling.commands.find(
    ({ cmd }) => cmd === "note_type"
  );
  if (currentCommand.values.length === 0) {
    // first note, predefined distribution
    return noteTypeConfig.options[0].options.map((option) => {
      switch (option) {
        case "4":
          return 0.02;
        case "6":
          return 0.1;
        case "8":
          return 0.05;
        case "12":
          return 0.84;
        case "13":
          return 0.01;
        default:
          return 0;
      }
    });
  }

  if (currentCommand.values.length === 1) {
    // first note, predefined distribution
    return noteTypeConfig.options[1].options.map((option) => {
      switch (option) {
        case "0":
          return 0.01;
        case "1":
          return 0.05;
        case "2":
          return 0.01;
        case "3":
          return 0.01;
        case "4":
          return 0.02;
        case "5":
          return 0.01;
        case "6":
          return 0.02;
        case "7":
          return 0.01;
        case "8":
          return 0.03;
        case "9":
          return 0.04;
        case "10":
          return 0.1;
        case "11":
          return 0.3;
        case "12":
          return 0.32;
        case "13":
          return 0.04;
        case "14":
          return 0.02;
        case "15":
          return 0.01;
        default:
          return 0;
      }
    });
  }
  if (currentCommand.values.length === 2) {
    // first note, predefined distribution
    return noteTypeConfig.options[2].options.map((option) => {
      switch (option) {
        case "-7":
          return 0.01;
        case "-6":
          return 0.01;
        case "-5":
          return 0.01;
        case "-4":
          return 0.01;
        case "-3":
          return 0.01;
        case "-2":
          return 0.01;
        case "-1":
          return 0.01;
        case "0":
          return 0.18;
        case "1":
          return 0.11;
        case "2":
          return 0.12;
        case "3":
          return 0.1;
        case "4":
          return 0.08;
        case "5":
          return 0.1;
        case "6":
          return 0.03;
        case "7":
          return 0.21;
        default:
          return 0;
      }
    });
  }
};

const getOctaveProbabilities = () =>
  config.sampling.commands
    .find(({ cmd }) => cmd === "octave")
    .options.map((octave) => {
      switch (octave) {
        case "1":
          return 0.05;
        case "2":
          return 0.12;
        case "3":
          return 0.3;
        case "4":
          return 0.3;
        case "5":
          return 0.12;
        case "6":
          return 0.04;
        case "7":
          return 0.04;
        case "8":
          return 0.03;
        default:
          return 0.0;
      }
    });

const getRestProbabilities = () =>
  config.sampling.commands
    .find(({ cmd }) => cmd === "rest")
    .options.map((length) => {
      switch (length) {
        case "1":
          return 0.3;
        case "2":
          return 0.12;
        case "3":
          return 0.12;
        case "4":
          return 0.05;
        case "5":
          return 0.02;
        case "6":
          return 0.05;
        case "7":
          return 0.04;
        case "8":
          return 0.02;
        case "9":
          return 0.02;
        case "10":
          return 0.04;
        case "11":
          return 0.02;
        case "12":
          return 0.02;
        case "13":
          return 0.02;
        case "14":
          return 0.04;
        case "15":
          return 0.02;
        case "16":
          return 0.1;
        default:
          return 0.0;
      }
    });

const getDutyCycleProbabilities = () =>
  config.sampling.commands
    .find(({ cmd }) => cmd === "duty_cycle")
    .options.map((value) => {
      switch (value) {
        case "0":
          return 0.05;
        case "1":
          return 0.1;
        case "2":
          return 0.3;
        case "3":
          return 0.55;
        default:
          return 0.0;
      }
    });

// will simplify and just get the outliers
const getTempoProbabilities = () =>
  config.sampling.commands
    .find(({ cmd }) => cmd === "tempo")
    .options.map((speed) => {
      switch (speed) {
        case "112":
          return 0.15;
        case "144":
          return 0.15;
        case "160":
          return 0.15;
        default:
          return (
            0.55 /
            (config.sampling.commands.find(({ cmd }) => cmd === "tempo").options
              .length -
              3)
          );
      }
    });

export const getProbabilities = (channelHistory, currentCommand, hasTempo) => {
  if (!currentCommand.cmd)
    return newCommandProbabilities(channelHistory, currentCommand, hasTempo);

  switch (currentCommand.cmd) {
    case "note":
      return getNoteProbabilities(channelHistory, currentCommand);
    case "note_type":
      return getNoteTypeProbabilities(currentCommand);
    case "octave":
      return getOctaveProbabilities();
    case "duty_cycle":
      return getDutyCycleProbabilities();
    default:
      return null; // assumes equal distribution
  }

  return null;
};
