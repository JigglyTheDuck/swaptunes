# Jiggly sound synthesizer

Jiggly is a deterministic music composer that turns a sequence of numbers into sound, using similar sound generation techniques as the Game Boy device. The sequence of numbers can be of any source but Jiggly focuses on financial markets.

## 3 channels

A composition created with Jiggly can use up to 3 distinct sound channels each capable of playing a separate tune. By default, the channels play notes one after another but they can overlap using loops.

## Trade to compose

Every 30 minutes, the on-chain composer generates a set of possible sound commands, up to a maximum of 16 options. Participants influence the next command by adding tokens to the liquidity pool on Uniswap by selling tokens in a registered V2 liquidity pool.

Each trade is a vote, where the integer value before the decimal indicates the weight and the decimal value determines the specific command.

### Live example

```
channel::
	duty_cycle 2
	note_type 12, 11, 2
	note G_, 4
	note B_, 4
	note G_, 2
	note B_, 4
	note ???
```

The next command has been already selected to be a `note`. Jiggly offers the following options with their associated vote numbers:

```
x.01 -> note C_
x.02 -> note C#
x.03 -> note D_
x.04 -> note D#
x.05 -> note E_
x.06 -> note F_
x.07 -> note F#
x.08 -> note G_
x.09 -> note G#
x.10 -> note A_
x.11 -> note A#
x.12 -> note B_
```
x is arbitrary and sets the weight of the vote.

_In this example, adding 100.05 tokens to the liquidity pool casts 100 votes for the 5th sound command option - in this case, note E_ - in the current segment._

Once the segment concludes the composer then offers options to set the note's length similarly.

## Jiggly sound language

Jiggly uses an assembly-like syntaxed language. It operates through a series of commands, each performing specific operations related to sound generation and manipulation.

### General Syntax Rules

1. Command Structure: Each command occupies a new line and consists of a command keyword followed by parameters separated by commas.
2. Whitespace: Spaces and tabs can be used for formatting but do not affect the execution unless they are within a parameter string that explicitly requires them.
3. Case Sensitivity: Commands and parameters are case-sensitive.

sample:
`note A# 2`

## Supported commands

### [channel_name]::

Purpose: Indicates the beginning of a new channel.

Parameters: None

Example: `AwesomeChannel::`

### note [note] [length]

Purpose: Plays the specified musical note for the duration.

Parameters:

- Note: The musical note to play
  - accepted values: `C_` `C#` `D_` `D#`, `E_`,`F_`, `F#`, `G_`, `G#`, `A_`, `A#`, `B_`
- Duration: The duration for which the note is sustained, typically measured in ticks or as a fraction of a beat.
  - accepted values: 1-16

Example: `note C_, 8`

### rest [length]

Purpose: Inserts a period of silence.

Parameters:

- Duration: The duration of the silence, similar to the duration in the note command.
  - accepted values: 1-16

Example: `rest 4`

### tempo [speed]

Purpose: Sets the musical tempo.

Parameters:

- BPM: Beats per minute, defining the pace of the music.
  - accepted values: 100, 1024, 104, 112, 120, 124, 128, 132, 136, 138, 140, 144, 150, 148, 152, 156, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 288, 416 ,98

Example: `tempo 120`

### octave [octave]

Purpose: Sets the octave for subsequent notes.

Parameters:

- Octave: The octave number (e.g., 4 would be middle C and the C above it).
  - accepted values: 1, 2, 3, 4, 5, 6, 7, 8

Example: `octave 4`

### duty_cycle [duty]

Purpose: Adjusts the duty cycle of the channels, affecting the waveform's shape and thus its timbre.

Parameters:

- Duty: Specifies the duty cycle setting. Jiggly allows for four different duty cycle settings, each giving a different wave pattern. The parameter accepts values from 0 to 3, corresponding to the following duty cycle options:
  - 0: 12.5% (the pulse is high for 12.5% of the cycle and low for the rest)
  - 1: 25% (the pulse is high for 25% of the cycle)
  - 2: 50% (the pulse is high for 50% of the cycle, also known as a square wave)
  - 3: 75% (the pulse is high for 75% of the cycle)

Example: `duty_cycle 2`

### .new_loop:

Purpose: indicates the beginning of the mainloop on the channel.

Parameters:

- None

Example: `.mainloop:`

### sound_loop

Purpose: Defines a loop in the sequence and concludes the current channel.

Parameters:

- Times: The number of times the loop should repeat. A value of 0 may indicate infinite looping until stopped by another command.
  - accepted values: 0, 2, 3, 4, 8 -> These values have no meaning however as there is only a single loop/channel and it is always infinite 
- Loop: the loop to repeat, currently, only one loop is supported/channel.

Example: `sound_loop 2 .mainloop`

### sound_ret

Purpose: Marks the end of the channel without a loop.

Parameters: None.

Example: `sound_ret`

### note_type

Purpose: Sets the characteristics and articulation style of subsequent notes based on predefined types and intensity levels, affecting how they are rendered by the sound processor.

Parameters:

- Type: Determines the general articulation or playing style of the notes. Possible values and their general interpretations might be:
  - 12: The first argument is not used and is defaulted to 12
  - Velocity: Since the first parameter is set to default this is more or less analogous to volume.
    - accepted values: 0-15
  - Fade: Sets how quickly the node fades, negative values cause note overlap.
    - accepted values: a number between -7 to +7

Example: `note_type 13, 4, -4`

### Example compositions

A great library of familiar tunes can be found at [https://github.com/pret/pokered/tree/master/audio/music](https://github.com/pret/pokered/tree/master/audio/music). You can copy the song into the composer and play it.

**Some of these are compatible with Jiggly. Just make sure the one you copy only has a single loop, no .sub and remove the 4th channel definition if specified.**
