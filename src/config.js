// TODO: we can get clever here, just use the 5m one
// 
export default {
  confirmationDelay: 360, // amount of seconds to wait until confirmation for recent price movements.
  sampleRate: 300, // in seconds
  priceRange: 1.005, // defaulted to 1% not sure if that's good enough though, that means to set a secondary tempo you'd need to get the price down to 0.01%

  contract: {
    tokenAddress: "0x7A8Fe8fee5dE707aa64A0Fe5c945F9c664DF11B3",
    address: "0x0C32122cb8fFB378297d6B560DD7bb100121419e", // composer
    rpcUrls: {
      PUBLIC: "wss://base-rpc.publicnode.com",
      TENDERLY: 'wss://base.gateway.tenderly.co',
      LLAMA: "https://base.llamarpc.com",
    },
    initialBlock: 15745505,
    blockRequestLimit: 10000
  },
  market: {
    songLengthOptions: [50, 100, 150, 200],
    composerOptions: ["Musical", "Simple", "Experimental"],
    stocks: {
      Nvalues: [5, 5, 5, 1.5],
      sampleRates: [1800, 3600, 86400],
      indices: [
        {
          ticker: 'ETH-USD',
          name: 'Ether',
        },
        {
          ticker: "TSLA",
          name: "TESLA",
        },
        {
          ticker: "GME",
          name: "GameStop",
        },
        {
          ticker: "^DJI",
          name: "US30",
        },
        {
          ticker: "^GSPC",
          name: "US500",
        },
      ],
    },
    uniswap: {
      N: 2,
      pools: [
        {
          pair: "WETH/USDT",
          address: "0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852",
          minSampleRate: 600,
          maxSampleRate: 7200,
          sampleRateSteps: 900,
        },
        {
          pair: "PEPE/ETH",
          address: "0xa43fe16908251ee70ef74718545e4fe6c5ccec9f",
          minSampleRate: 1800,
          maxSampleRate: 14400,
          sampleRateSteps: 1800,
        },
      ],
    },
  },
  sampling: {
    unsupported_commands: [
      "pitch_slide",
      "execute_music",
      "volume",
      "toggle_perfect_pitch",
      "duty_cycle_pattern",
      "vibrato",
    ],
    commands: [
      {
        name: "tempo",
        cmd: "tempo",
        options: [
          "100",
          "1024",
          "104",
          "112",
          "120",
          "124",
          "128",
          "132",
          "136",
          "138",
          "140",
          "144",
          "150",
          "148",
          "152",
          "156",
          "160",
          "168",
          "176",
          "184",
          "192",
          "200",
          "208",
          "216",
          "224",
          "232",
          "288",
          "416",
          "98",
        ],
      },
      {
        name: "duty cycle",
        cmd: "duty_cycle",
        options: ["0", "1", "2", "3"],
      },
      {
        name: "vibrato",
        cmd: "vibrato",
        options: [
          {
            options: [
              "0",
              //"3",
              "4",
              "5",
              "6",
              "8",
              "9",
              "10",
              "11",
              "12",
              "16",
              "18",
              "20",
              "24",
            ],
          },
          { options: ["0", "1", "2", "3", "4", "8"] },
          { options: ["0", "1", "2", "3", "4", "5", "6", "7", "8"] },
        ],
      },
      {
        cmd: "octave",
        options: ["1", "2", "3", "4", "5", "6", "7", "8"],
        probability: 0.15,
      },
      {
        cmd: "note_type",
        options: [
          { options: ["13", "12", "4", "6", "8"] },
          {
            options: [
              "0",
              "1",
              "10",
              "11",
              "12",
              "13",
              "14",
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
        cmd: "sound_loop",
        options: [
          { options: ["0", "2", "3", "4", "8", "14"] }, // probably this doesn't do anything in our case
          { options: [] }, // dynamically filled up
        ],
      },
      /*
      {
        cmd: "sound_call",
        options: [
          { options: ["1", "2", "3", "4", "5", "6", "7", "8"] }, // this is a little bit more difficult, as subs are defined in the future, we won't actually know the options
        ],
      },*/
      {
        cmd: "sound_ret",
        options: [],
      },
      {
        cmd: "new_loop",
        options: [],
      },
    ],
  },
};
