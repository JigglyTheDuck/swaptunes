# Introduction

Jiggly transforms the dynamic world of cryptocurrency trades into a platform for collaborative music creation. Each trade on the Uniswap platform contributes to a larger composition, created and refined by the collective efforts of all participants.

## How It Works

Jiggly is an ERC20 token that monitors all trades going into specified Uniswap V2 liquidity pools and translates those trades into sound commands for a simplified Gameboy sound system synthesizer.

### Trading as Composing

Every 15 minutes, the on-chain composer generates a set of possible sound commands, up to a maximum of 16 options. Participants influence the next command by adding tokens to the liquidity pool on Uniswap either by selling tokens or adding them directly as pools.

Each trade is a vote, where the integer value before the decimal indicates the weight and the decimal value determines the specific command.

#### Live example

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

_In this example, adding 100.05 tokens to the liquidity pool casts 100 votes for the 5th sound command option - in this case, note E_ - in the current segment.\_

Once the segment concludes the composer then offers options to set the note's length similarly.

### Community Collaboration

As the segment nears its end, the command with the highest number of votes is chosen. Once the time expires, this command is immortalized on the blockchain as a `Segment` event. The transition to the next segment incorporates a random factor where initial votes for each command option are influenced by the number of votes the winning command received in the previous segment.

A segment requires at least 8 votes to proceed making it possible for segments to "pile up" and allowing for quick segment rollover.

### Dynamic Voting Mechanism

Non-LP trades (or buys) redistribute votes from the most popular command to others, creating a fluid and competitive voting environment. This system ensures that the composition remains dynamic and reflects the collective will of the participants at each moment.

### Real-time Composition Monitoring

Users can follow the progress of the current composition in real time through the dedicated web app. The app allows users to view the ongoing composition and enables them to experiment with creating music, providing a hands-on experience of the synthesizer's capabilities.

### Finalization of Composition

The composition process is deemed complete when all three sound channels have received their final (`end_channel`) command. Although the compositions themselves are not stored on the blockchain, the series of commands making up the composition are recorded as blockchain events, providing a decentralized and transparent record of the musical creation process.

The created songs are available for anyone to listen to within the app.

## Tokenomics

Jiggly introduces a token ecosystem designed to incentivize participation and reward active users within the platform. The economic model revolves around a fixed token supply, a reward system, and a small transaction tax that sustains the reward pool.

### Token Supply and Distribution

- **Maximum Total Supply**: 42 million tokens
- **Initial Liquidity Pool (LP) Value**: 1 million tokens
- **Beta Testers Allocation**: 1 million tokens
- **Initial Reward Pool**: 40 million tokens

The fixed supply of 42 million tokens ensures a controlled economy that can support the long-term sustainability of the project. The initial allocation is strategically designed to encourage early participation and reward those who help refine the platform.

### Reward System

The reward system is crafted to acknowledge and compensate users who actively participate in the voting process.

1. **Voting and Rewards**: If a user votes for the winning option in any given segment (segment N), they become eligible for rewards. The amount of the reward is based on the size of their vote relative to the total vote weight for the winning option.
2. **Claiming Rewards**: Eligible users must claim their rewards by voting in the subsequent segment. This requirement ensures ongoing engagement.
3. **Forfeit of Rewards**: If users do not participate in the next segment, their rewards are forfeited. This rule encourages consistent activity and engagement within the community, ensuring that the rewards go to those who are actively contributing to the decision-making process.

By voting multiple times, users can adjust their position or strategy throughout the segment; however, only the last vote cast by each user is considered for reward eligibility. This approach encourages thoughtful and strategic participation in each voting round.

### Transaction Tax

Each transaction on the platform incurs a modest tax of 1%, which is directed into the reward pool. This tax mechanism ensures the continual replenishment of the reward pool, maintaining a steady flow of incentives for user participation.

## Governance and DAO

Jiggly is a community-driven project that empowers its users to shape its future. Through the DAO, participants have a significant voice in proposing and voting on critical changes that can influence the project’s direction and functionality.

### Proposals for Platform Evolution

Users can submit proposals regarding several key aspects of the platform:

- **Composer Upgrades**: Proposals can be made to upgrade or change the on-chain composer mechanism, allowing the platform to evolve in its ability to create music or other forms of creative media. Changing the composer comes into effect, once the current composition is finished.
- **New Liquidity Pool Contracts**: To ensure that the platform’s tokens are not tied to a single secondary currency, proposals can be made to add new liquidity pools with different cryptocurrencies.
- **Removal of Liquidity Pool Contracts**: Likewise, if a token is no longer relevant, token holders can initiate the removal of a pool contract.
- **Free structure adjustments**: The DAO is capable of changing the 1% fee that goes to the reward pool by either halving or doubling it.
- **Change segment length**: The initial segment length is 15 minutes. This is useful for the music composer application, however new composers might require different values.
- **Change minimum segment vote requirement**: Initially 8 votes are at least required to consider the segment valid. This value however can be insufficient with a larger audience.

### Voting Mechanism

Each proposal requires at least 10% support from the total token supply (excluding tokens in the reward pool) to be considered for approval. This threshold ensures that any changes made have significant backing from the community, aligning with the interests and the collective will of a substantial portion of token holders.

Since only about 5% of the total supply is released initially, the DAO does not come into play until more tokens are released via the reward pool.

## Technical Architecture

Jiggly is designed with simplicity and transparency at its core, enabling an accessible and easy-to-use platform for merging cryptocurrency trading with musical creation. The technical setup is streamlined, ensuring that users can interact with the app without concern for complex configurations or security issues due to its fully public nature.

### Key Components

The Jiggly composer has 2 basic components, the composer smart contract and its corresponding application.

#### Smart Contract

The backbone of Jiggly is a smart contract deployed on the BASE L2 chain, chosen for its scalability and lower transaction costs compared to mainnet solutions. This contract handles all core functionalities, including generating sound commands, tallying votes based on token contributions in Uniswap, and immortalizing the winning musical commands on the blockchain.

Upgradabaility: The smart contract is detached from the original token contract allowing for future upgrades.

#### Web Application

The user interface of Jiggly is a web application that is fully open-source, allowing anyone to review, modify, or even host their version of the app. The app is designed to be plug-and-play, requiring only the RPC URL configuration to connect to the blockchain. This ensures that users can start interacting with the platform immediately, without any setup hurdles.

The web app provides a real-time view of ongoing compositions, enabling users to vote on musical commands, view the current state of voting, and listen to the generated music as it is being created by the community.

## Roadmap

Jiggly begins its journey as the on-chain music composer. The beta phase is expected to last ~1-2 months after which the token launches, with all potential issues identified. The purpose of the beta is to make sure the smart contract behaves correctly and provides an opportunity to fine tune the initial variables.

Once the Jiggly DAO takes effect (more than 10% of supply is released through rewards) Jiggly might shift its focus from music composition to some other - community chosen - form of medium and the musical composer will instead move to support other arbitrary data sources.
