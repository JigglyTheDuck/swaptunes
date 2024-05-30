import { Composer } from "./composer";
import { Parser } from "./parser";
import config from "../config";

// parse -> cmds to indices -> indices to hex (tempo 2) -> treat hex array as byte stream -> gxip -> base64 -> url compatible
//
// url comp -> base 64 -> gunzip -> byte array to hex -> hex to indices -> indices to params
//
//

const HEX = "0123456789abcdef";

/*
export class SimpleEncoder {
  async compress(dataArray) {
    let stream = new ReadableStream({
      start(controller) {
        controller.enqueue(dataArray);
        controller.close();
      },
    });
    const compressionStream = new CompressionStream("gzip");

    const compressedStream = stream.pipeThrough(compressionStream);

    const reader = compressedStream.getReader();
    let chunks = [];
    let result;
    while (!(result = await reader.read()).done) {
      chunks.push(result.value);
    }

    let compressed = new Uint8Array(
      chunks.reduce((acc, val) => acc.concat(Array.from(val)), [])
    );

    return compressed;
  }
}*/

export class Encoder {
  getCommandIndex(_cmd) {
    return config.sampling.commands.findIndex(({ cmd }) => cmd === _cmd);
  }

  toBase64(data) {
    let textData = "";
    for (let i = 0; i < data.length; i++) {
      textData += String.fromCharCode(data[i]);
    }
    return btoa(textData)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/\=+$/, "");
  }

  parseHexString(str) {
    var result = [];
    while (str.length >= 2) {
      result.push(parseInt(str.substring(0, 2), 16));
      str = str.substring(2, str.length);
    }

    return result;
  }

  async compress(dataArray) {
    return Promise.resolve(dataArray);
    let stream = new ReadableStream({
      start(controller) {
        controller.enqueue(dataArray);
        controller.close();
      },
    });
    const compressionStream = new CompressionStream("gzip");

    const compressedStream = stream.pipeThrough(compressionStream);

    const reader = compressedStream.getReader();
    let chunks = [];
    let result;
    while (!(result = await reader.read()).done) {
      chunks.push(result.value);
    }

    let compressed = new Uint8Array(
      chunks.reduce((acc, val) => acc.concat(Array.from(val)), [])
    );

    return compressed;
  }

  encode(input) {
    const parser = new Parser();
    parser.parse(input);

    const indices = [];
    let hex = "";

    for (const channel of parser.composer.track) {
      for (const command of channel) {
        const index = this.getCommandIndex(command.cmd);
        indices.push(index);
        hex += HEX[index];

        if (command.values.length > 1) {
          for (let i = 0; i < command.values.length; ++i) {
            // add exception for sound_loop
            if (command.cmd === "sound_loop" && i === 1) {
              hex += HEX[command.values[1]];
              indices.push(command.values[1]);
              continue;
            }
            const optionIndex = config.sampling.commands[index].options[
              i
            ].options.findIndex((v) => v === command.values[i]);
            hex += HEX[optionIndex];
            indices.push(optionIndex);
          }
        } else if (command.values.length === 1) {
          // add exception for tempo as it has too many values
          const optionIndex = config.sampling.commands[index].options.findIndex(
            (v) => v === command.values[0]
          );

          if (command.cmd === "tempo") {
            if (optionIndex < 16) {
              hex += `0${HEX[optionIndex]}`;
            } else {
              hex += `1${HEX[optionIndex - 16]}`;
            }
          } else {
            hex += HEX[optionIndex];
          }

          indices.push(optionIndex);
        }
      }
    }

    if (hex.length % 2 !== 0) hex += `0`;

    return this.compress(new Uint8Array(this.parseHexString(hex)))
      .then(this.toBase64.bind(this))
  }
}

export class Decoder {
  async decode(input) {
    const hex = this.createHexString(
      Array.from(await this.decompress(this.fromBase64(input)))
    );

    const composer = new Composer();
    for (let i = 0; i < hex.length; ++i) {
      let options = composer.getNextOptions().map((o) => o.option);

      let optionIndex = -1;
      let index = parseInt(
        composer.currentCommand.cmd === "tempo"
          ? `${hex[i]}${hex[++i]}`
          : hex[i],
        16
      );

      if (composer.currentCommand.cmd === null) {
        optionIndex = options.findIndex(
          (cmd) => config.sampling.commands[index].cmd === cmd
        );
        if (optionIndex === -1) throw new Error("option not found");
        composer.applyOption(optionIndex);
      } else {
        // get command
        const commandBlueprint = config.sampling.commands.find(
          ({ cmd }) => cmd === composer.currentCommand.cmd
        );

        if (commandBlueprint.options[0].options) {
          for (let j = 0; j < commandBlueprint.options.length; ++j) {
            optionIndex =
              commandBlueprint.options[j].options.length === 0
                ? index
                : options.findIndex(
                    (value) =>
                      commandBlueprint.options[j].options[index] == value
                  );
            if (optionIndex === -1) {
              throw new Error("option not found");
            }
            composer.applyOption(optionIndex);
            if (composer.currentCommand.cmd === null) break;

            options = composer.getNextOptions().map((o) => o.option);
            index = parseInt(hex[++i], 16);
          }
          // multi options
        } else {
          // single option
          optionIndex = options.findIndex(
            (value) => commandBlueprint.options[index] == value
          );
          if (optionIndex === -1) throw new Error("option not found");
          composer.applyOption(optionIndex);
        }
      }
    }
    return composer.renderTrack();
  }

  async decompress(compressedData) {
    return Promise.resolve(compressedData);
    let stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedData);
        controller.close();
      },
    });

    const decompressionStream = new DecompressionStream("gzip");

    const decompressedStream = stream.pipeThrough(decompressionStream);

    const reader = decompressedStream.getReader();
    let chunks = [];
    let result;
    while (!(result = await reader.read()).done) {
      chunks.push(result.value);
    }

    let decompressed = new Uint8Array(
      chunks.reduce((acc, val) => acc.concat(Array.from(val)), [])
    );

    return decompressed;
  }

  fromBase64(str) {
    if (str.length % 4 != 0) {
      str += "===".slice(0, 4 - (str.length % 4));
    }
    const textData = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const data = new Uint8Array(textData.length);
    for (let i = 0; i < textData.length; i++) {
      data[i] = textData.charCodeAt(i);
    }
    return new Uint8Array(data);
  }

  createHexString(arr) {
    var result = "";
    for (const i in arr) {
      var str = arr[i].toString(16);
      str =
        str.length == 0
          ? "00"
          : str.length == 1
          ? "0" + str
          : str.length == 2
          ? str
          : str.substring(str.length - 2, str.length);
      result += str;
    }
    return result;
  }
}
