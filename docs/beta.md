# Jiggly Beta

The purpose of the Jiggly beta is to cover all the scenarios in a live environment with a limited user base that are difficult to detect through automated tests.

**The beta is limited to the first 500 participants.**

## Beta Tokenomics

GLY-BETA ([0x0356Ee6D5c0a53f43D1AC2022B3d5bA7acf7e697](https://basescan.org/token/0x0356Ee6D5c0a53f43D1AC2022B3d5bA7acf7e697)) is an ERC20 token that serves as the asset for the initial liquidity pool.

1M tokens are minted and the supply is capped at this amount. Each participant receives 1 000 of these tokens whilst 500 000 are sent to the liquidity pool alongside the entire outsanding supply of 1 000 000 GLY tokens.

## Timeline

The beta will run for about 2 weeks, during which all key aspects of the contract will be tested.

## Participation

To participate in the beta, send an email to [theduck@jiggly.app](mailto:theduck@jiggly.app) or DM @JigglyTheDuck on Telegram with your Ethereum wallet address.

1 000 GLY-USD tokens will be sent to this address.

You can acquire GLY by trading the BETA tokens in the liquidity pool.

The distribution process is manual and previous wallet history is considered, so it may take up to 24 hours to process your request.

### Requirements

The wallet should have a relevant transaction history and have some native BASE ETH to qualify for beta participation - this is to prove that you will be able to participate).

### Rewards

During the beta, segment contributions are increased by 10x (5% of trading volume) and the segment length is also increased tenfold (5 hours instead of 30 minutes).

## Ending the beta

The beta ends when the first song is created (first Limit event).

Once the beta ends, the GLY-BETA liquidity pool is automatically removed and the wrapped Ether liquidity pool is added.

## Sample Song

The initial song we aim to compose during the beta is:

[https://jiggly.app/?previewTrack=AQQUaRMyYnaXanaXZ3aXYnaXZ3aXYHZ3ZXZHYHMWl3AIiA#composer](https://jiggly.app/?previewTrack=AQQUaRMyYnaXanaXZ3aXYnaXZ3aXYHZ3ZXZHYHMWl3AIiA#composer)

It consists of 64 segments, resulting in 320 hours of composition.

```
channel1::
  tempo 160
  note_type 12, 12, -7
.loop0:
  duty_cycle 3
  octave 3
  note D_, 2
  note A_, 2
  note A#, 2
  note A_, 2
  note G_, 2
  note A_, 2
  note D_, 2
  note A_, 2
  note G_, 2
  note A_, 2
  note C_, 2
  note G_, 2
  note F_, 2
  note E_, 2
  note C_, 2
  octave 2
  note A_, 2
  sound_loop 0, .loop0
  sound_ret
channel2::
  sound_ret
channel3::
  sound_ret
```
