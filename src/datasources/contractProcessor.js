import { Contract, id, dataSlice, parseUnits } from "ethers";
import { Composer as SimpleComposer } from "../modules/simpleComposer";
import abi from "./contract";
import config from "../config";

const routerABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amountIn",
        type: "uint256",
      },
      {
        internalType: "address[]",
        name: "path",
        type: "address[]",
      },
    ],
    name: "getAmountsOut",
    outputs: [
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export class ContractProcessor {
  adddress;
  routerContract;
  contract;
  contractCreation; // won't be necessary once emit on constructor
  composer;
  provider;
  previousTimestamp;
  lastSegmentOption;
  initialBlock;
  lastBlock;
  blockRequestLimit = config.contract.blockRequestLimit;
  latestBlockCache = {
    timestamp: 0,
    blockHeight: 0,
  };
  constructor(address, provider) {
    this.contractCreationBlock = null;
    this.address = address;
    this.composer = new SimpleComposer();
    this.provider = provider;
    this.contract = new Contract(address, abi, provider);
    this.routerContract = new Contract(
      config.contract.routerAddress,
      routerABI,
      provider
    );
  }

  getLatestBlock() {
    return this.provider.getBlockNumber();
  }

  async getCurrentPrice() {
    return (
      await this.routerContract.getAmountsOut(parseUnits("1", 'ether'), [
        config.contract.wrappedTokenAddress,
        config.contract.tokenAddress
      ])
    )[1];
  }

  // for now we don't have a choice but to go back to the beginning to start composing
  // in reality we will have the dedicated event that limits songs
  async process(listener, fromBlock, _nextEvents) {
    const events = _nextEvents || (await this.getSegmentsSinceBlock(fromBlock));
    const nextEvents = this.getSegmentsSinceBlock(
      fromBlock + this.blockRequestLimit
    );

    const notify = (isOver) =>
      listener
        ? listener(
            this.composer.renderTrack(),
            { segment: this.getNextSegment(), lastBlock: this.lastBlock },
            isOver
          )
        : null;

    if (events === null) {
      notify(true);
      return;
    }

    for (const event of events) {
      this.processEvent(event);

      await new Promise((r) => setTimeout(r, 50));

      if (this.composer.isFinished) {
        notify(true);
        return;
      }
      notify(false);
    }

    notify(false);

    return this.process(
      listener,
      fromBlock + this.blockRequestLimit,
      await nextEvents
    );
  }

  async getRewardPoolSize() {
    return this.contract.segmentPoolSize();
  }

  async getSegmentVoteCount() {
    return this.contract.segmentVoteCount();
  }

  processEvent(event) {
    const option = parseInt(dataSlice(event.data, 31, 32), 16);
    this.composer.applyOption(option);

    if (this.composer.getNextOptions().length === 1) {
      // automatically move on from 0 option actions
      this.composer.applyOption(0);
    }
    this.lastSegmentOption = option;
    if (event.blockNumber > config.contract.initialBlock)
      this.previousTimestamp += this.segmentLength;
  }

  async initializeSong(blockNumber) {
    this.segmentLength = config.contract.segmentLength;
    this.previousTimestamp =
      config.contract.initialTimestamp ||
      BigInt((await this.provider.getBlock(blockNumber)).timestamp);
  }

  fetchLatestContribution(address) {
    return this.contract.contributions(address);
  }

  // finds the first block of the previous new song
  async findSongFirstBlock(fromBlock) {
    const toBlock = fromBlock + this.blockRequestLimit;
    if (fromBlock < config.contract.initialBlock - this.blockRequestLimit) {
      return null;
    }
    const filter = {
      address: this.address,
      fromBlock,
      toBlock,
      topics: [id("Limit()")],
    };

    const results = await this.tryToGetLogs(filter);

    if (results.length === 0) {
      return this.findSongFirstBlock(toBlock);
    }

    this.initialBlock = results[0].blockNumber;

    this.initializeSong(this.initialBlock);

    return Promise.resolve(this.initialBlock);
  }

  async tryToGetLogs(filter, retryCount = 0) {
    if (retryCount > 5) throw new Error("unable to load logs");
    try {
      return await this.provider.getLogs(filter);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
      return this.tryToGetLogs(filter, retryCount + 1);
    }
  }

  async getSegmentsSinceBlock(blockNumber) {
    if (Date.now() - this.latestBlockCache.timestamp > 5000) {
      this.latestBlockCache = {
        timestamp: Date.now(),
        blockHeight: await this.getLatestBlock(),
      };
    }
    if (blockNumber > this.latestBlockCache.blockHeight) return null;
    const toBlock = blockNumber + this.blockRequestLimit;
    const filter = {
      address: this.address,
      fromBlock: blockNumber,
      toBlock,
      topics: [id("Segment(uint256)")],
    };

    const results = await this.tryToGetLogs(filter);

    this.lastBlock =
      toBlock > this.latestBlockCache.blockHeight
        ? this.latestBlockCache.blockHeight
        : toBlock;

    return results;
  }

  getNextSegment() {
    return Number(this.previousTimestamp + this.segmentLength);
  }

  getVotes() {
    // also, first check for recent blocks in case we are through
    return this.process(null, this.lastBlock + 1).then(() =>
      Promise.all(
        this.composer
          .getNextOptions()
          .map(({ option }, index) => this.contract.optionVotes(index))
      )
    );
  }

  async findContributions(fromBlock = this.initialBlock) {
    const toBlock = fromBlock + this.blockRequestLimit;
    const filter = {
      address: this.address,
      fromBlock,
      toBlock,
      topics: [id("RewardsClaimed(address,uint256)")],
    };

    const results = await this.tryToGetLogs(filter);
  }
}
