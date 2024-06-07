# Jiggly Whitepaper

_Introducing a unique trade-to-vote system for a collaborative trading experience._

## Introduction

Jiggly is a standard ERC20 token with a built-in feature to support a trade-to-vote mechanism, powered by Uniswap V2 liquidity pools.

Jiggly is fully on-chain, and its supporting web application does not rely on any third-party service (apart from a customizable web3 RPC endpoint, of course).

Voting is done by simply selling the token at registered Uniswap V2 liquidity pools and specifying the decimal value in the trade (or adding liquidity to the pool).

## The Composer

The Jiggly smart contract has a composer that dictates the next possible set of options (segment) that traders can vote on. Initially, Jiggly comes with a music composer, driving a Game Boy-like sound synthesizer.

The composer is essentially a segment-based state machine with the following interface:

```
getNextOptions(): number [0-16] // returns the number of possible options
applyOption(optionIndex: number): boolean // updates the state and returns whether the composition is final
```

The `applyOption` function should be restricted so that it can be called only from the Jiggly ERC20 contract.

### Segments

Segments are time-limited (initially 30 minutes) and require a certain number of votes to pass. This way, if there is low trading volume, segments can "pile up," and once volume picks up again, segment turnover increases.

### Immortalizing Segments

Each time `applyOption` is called, the segment is considered concluded, and a `Segment` event is fired with the selected option as its parameter.

If the composition is deemed final by the composer, a `Limit` event is also fired to indicate the end of the current composition.

#### Tracking contributions

Each time rewards are claimed the contract fires a `RewardClaimed` event. These events offer an inexpensive way to transparently track contribution fractions by address.

In case an NFT is created from the final composition, its ownership can be initialized based on these parameters of these events.

## Trade-to-Vote

The trade-to-vote mechanism translates token movements into registered Uniswap V2 liquidity pools into composer options by checking the decimal value of the trade.

To illustrate, here is an example:

```
The composer has 4 options for the next segment.

The user sells 100.02 tokens into a registered liquidity pool.

Result: 100 votes will be cast for the 2nd option.
```

### Built-in Randomization

There are 2 built-in mechanisms in the contract to make engagement more exciting:

1. Every non-valid trade (any trade that does not target a valid liquidity pool or specifies an invalid option) removes votes from the most popular choice.
2. Each segment is initialized with a random set of votes in proportion to the last winning vote.

Once again, to better illustrate, let's take the previous example:

```
The composer has 4 options for the next segment.

The user sends 100 tokens to another user (not a registered liquidity pool).

Result: 100 votes will be taken from the most popular choice and added to a random one.
```

// TODO: illustrate with picture

## The Reward Pool

At its core, Jiggly is all about rewarding honest participation. Most of the tokens can only be unlocked by participating in compositions and releasing them from the reward pool.

To keep the reward pool filled up to a certain level - and to discourage multiple votes - each transaction comes with a transparent 0.5% fee that goes directly back to the reward pool.

### Rewards

Traders can earn rewards simply by voting on the eventually most popular option. To unlock the rewards, they need to vote in the next immediate segment (with any amount), and the tokens will be released with the same transaction. If they do not do so, the rewards are forfeited.

The amount of rewards depends on their previous contribution and is calculated as 5x the tax.

An example of how rewards work:

```
A user casts 200 votes (tokens) for a winning option.

At a 0.5% tax rate, they pay 1 token as tax.

In the next segment, they cast 1 vote (token) for any valid option.

In return, they get 5 tokens as rewards.
```

#### Casting Multiple Votes

Users are allowed to vote multiple times, and those votes will be counted, but only their latest one is considered for rewards.

## Tokenomics

The token's name is Jiggly, and its symbol is GLY.

### Token Supply and Distribution

- **Maximum Total Supply**: 42 million GLY
- **Initial Liquidity Pool (LP) Value**: 1 million GLY
- **Beta Testers Allocation**: 1 million GLY
- **Initial Reward Pool**: 40 million GLY

### Reward pool token release cycle

The provisional unlocking of the reward pool looks like this:

![Rewards And Fees](https://github.com/JigglyTheDuck/swaptunes/blob/master/public/fees_rewards.svg)

The above chart assumes perfect behavior (every single trade is voting on the eventual winner and all rewards are claimed), in reality however, the distribution of the reward pool (the equilibrium point) will most probably take place after a few thousand segments.


## DAO - Straight in the Contract

Jiggly is not perfect. It is ready to evolve exactly how the community wants it to evolve. That is why it has a very straightforward voting system that allows token holders to change almost any characteristic of the system. Any change requires ~6% support of the total supply.

### Proposals for Platform Evolution

Users can submit proposals regarding several key aspects of the platform:

- **Composer Upgrades**: Proposals can be made to upgrade or change the on-chain composer mechanism, allowing the platform to evolve in its ability to create music or other forms of creative media. Changing the composer takes effect once the current composition is finished.
- **New Liquidity Pool Contracts**: To ensure that the platform’s tokens are not tied to a single secondary currency, proposals can be made to add new liquidity pools with different cryptocurrencies.
- **Removal of Liquidity Pool Contracts**: Likewise, if a token is no longer relevant, token holders can initiate the removal of a pool contract.
- **Fee Structure Adjustments**: The DAO can change the 1% fee that goes to the reward pool by either halving or doubling it.
- **Change Segment Length**: The initial segment length is 30 minutes. This is useful for the music composer application; however, new composers might require different values.
- **Change Minimum Segment Vote Requirement**: Initially, 5 votes are at least required to consider the segment valid. This value, however, can be insufficient with a larger audience.
- **Change the Decimal Value**: As price fluctuations are difficult to foresee, the community has the power to change the decimal value at which the votes will be considered.

### Voting Limitations

- An address can only vote on a single proposal at a time.
- Votes (and the tokens) are locked for 14 days.
- To initiate a proposal, the proposer must have at least 1% of the required funds.

## Post launch

Jiggly will eventually transform into a general market composer making it possible to compose music out of arbitrary market data. Meanwhile the smart contract is expected to evolve beyond music into other creative mediums dictated by the DAO.
