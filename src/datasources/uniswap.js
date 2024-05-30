/*
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";

import gql from "graphql-tag";

export const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
  }),
  cache: new InMemoryCache(),
});

export const DAI_QUERY = gql`
  query tokens($tokenAddress: Bytes!) {
    tokens(where: { id: $tokenAddress }) {
      derivedETH
      totalLiquidity
    }
  }
`;

export const ETH_PRICE_QUERY = gql`
  query ethPrice {
    bundle(id: "1") {
      ethPrice
    }
  }
`;

export const GET_SWAPS = gql`
  query test($tokenAddress: Bytes!, $since: Int, $skip: Int, $to: Int) {
    swaps(
      skip: $skip
      orderBy: timestamp
      orderDirection: asc
      where: { pair: $tokenAddress, timestamp_gte: $since, timestamp_lte: $to, amount0In_gt: 0 }
    ) {
      pair {
        token0 {
          symbol
        }
        token1 {
          symbol
        }
      }
      timestamp
      amount0In
      amount0Out
      amount1In
      amount1Out
      amountUSD
      from
      to
    }
  }
`;*/
