import { ethers } from 'ethers';
import { provider, getVaultContract, getSwapContract, getErc20Contract, VaultAbi, SwapAbi, Erc20Abi } from '../config/blockchain';
import { env } from '../config/env';
import { BlockchainTransaction } from '../models/BlockchainTransaction';
import { ApiError } from '../utils/ApiError';

export const BlockchainService = {
  /** Public config the frontend needs to construct its own ethers contract instances. */
  getPublicConfig() {
    return {
      rpcUrl: env.blockchain.rpcUrl,
      chainId: env.blockchain.chainId,
      vaultAddress: env.blockchain.vaultAddress,
      swapAddress: env.blockchain.swapAddress,
      mockTokenAddress: env.blockchain.mockTokenAddress,
      abis: { vault: VaultAbi, swap: SwapAbi, erc20: Erc20Abi },
    };
  },

  /** A user's balance held inside the OpenBankX vault (token=zero address means ETH). */
  async getVaultBalance(walletAddress: string, token: string): Promise<string> {
    const vault = getVaultContract();
    const balance = await vault.balanceOf(token, walletAddress);
    return (balance as bigint).toString();
  },

  /** A user's raw on-chain balance in their own wallet (not yet deposited to the vault). */
  async getWalletBalance(walletAddress: string, token: string): Promise<string> {
    if (token === ethers.ZeroAddress) {
      const balance = await provider.getBalance(walletAddress);
      return balance.toString();
    }
    const erc20 = getErc20Contract(token);
    const balance = await erc20.balanceOf(walletAddress);
    return (balance as bigint).toString();
  },

  async getSwapQuote(tokenIn: string, tokenOut: string, amountIn: string): Promise<string> {
    const swap = getSwapContract();
    try {
      const amountOut = await swap.getAmountOut(tokenIn, tokenOut, amountIn);
      return (amountOut as bigint).toString();
    } catch {
      throw ApiError.badRequest('No pool exists for this token pair, or quote failed');
    }
  },

  async listTransactions(
    walletAddress: string,
    opts: { page: number; limit: number; eventType?: string }
  ) {
    const filter: Record<string, unknown> = {
      $or: [{ walletAddress }, { counterpartyAddress: walletAddress }],
    };
    if (opts.eventType) filter.eventType = opts.eventType;

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      BlockchainTransaction.find(filter)
        .sort({ blockNumber: -1, logIndex: -1 })
        .skip(skip)
        .limit(opts.limit),
      BlockchainTransaction.countDocuments(filter),
    ]);

    return {
      items,
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.ceil(total / opts.limit),
    };
  },
};
