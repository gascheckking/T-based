"use client";

import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { EthereumClient, w3mConnectors, w3mProvider } from "@web3modal/ethereum";
import { Web3Modal } from "@web3modal/react";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const chains = [base];
const { publicClient } = configureChains(chains, [
  w3mProvider({ projectId }),
  publicProvider()
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient
});

const ethereumClient = new EthereumClient(wagmiConfig, chains);

export default function Web3Provider({ children }) {
  return (
    <>
      <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
      {/* This registers <w3m-button /> and opens QR / wallet list */}
      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
    </>
  );
}
