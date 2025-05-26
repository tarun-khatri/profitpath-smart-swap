import React, { useState, useEffect } from 'react';
import { fetchCrossChainQuoteFromBackend } from '../lib/api';
import { CHAIN_INDEX_TO_NAME } from '../lib/utils';
import { useAvailableChains, useOkxTokenListByChain } from '../hooks/useChainAndTokenList';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";

// Add this helper function at the top level of the file, before the component
const getChainDisplayName = (chainId: string) => {
  return CHAIN_INDEX_TO_NAME[chainId] || chainId;
};

// Fix: ensure all type assertions are correct and all state is string[] or string
// Fix: use correct React.FC return type
const CrossChainSwapAssistant: React.FC = () => {
  // Use the same hooks as SwapAssistant
  const { chains: availableChains, loading: chainsLoading } = useAvailableChains();
  const [fromChain, setFromChain] = useState<string | null>(null);
  const [toChain, setToChain] = useState<string | null>(null);
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.01');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState('');
  const [openFromChain, setOpenFromChain] = useState(false);
  const [openToChain, setOpenToChain] = useState(false);
  const [openFromToken, setOpenFromToken] = useState(false);
  const [openToToken, setOpenToToken] = useState(false);

  // Fetch tokens for selected chains
  const { tokens: fromTokens, loading: fromTokensLoading } = useOkxTokenListByChain(fromChain);
  const { tokens: toTokens, loading: toTokensLoading } = useOkxTokenListByChain(toChain);

  // Use wagmi hooks for wallet connection
  const { address: account, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Check if destination chain is Solana
  const isSolanaDestination = toChain === '501';

  // Validate Solana address format
  const isValidSolanaAddress = (address: string) => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  // Set default chains when availableChains loads
  useEffect(() => {
    if (availableChains.length > 0) {
      setFromChain(availableChains[0]);
      setToChain(availableChains.length > 1 ? availableChains[1] : availableChains[0]);
    }
  }, [availableChains]);

  // Set default fromToken when fromTokens change
  useEffect(() => {
    if (fromTokens.length > 0) {
      setFromToken(fromTokens[0].address);
    } else {
      setFromToken('');
    }
  }, [fromTokens]);

  // Set default toToken when toTokens change
  useEffect(() => {
    if (toTokens.length > 0) {
      setToToken(toTokens[0].address);
    } else {
      setToToken('');
    }
  }, [toTokens]);

  const handleQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setQuote(null);
    const fromTokenObj = fromTokens.find(t => t.address === fromToken);
    const toTokenObj = toTokens.find(t => t.address === toToken);
    if (!fromChain || !toChain || !fromTokenObj || !toTokenObj || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        fromChain,
        toChain,
        fromToken: fromTokenObj.address,
        toToken: toTokenObj.address,
        amount,
        slippage,
        fromTokenDecimals: fromTokenObj.decimals,
      };
      const data = await fetchCrossChainQuoteFromBackend(payload);
      setQuote(data.quote);
      toast.success('Quote received!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch quote';
      setError(errorMessage);
      toast.error('Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  // Update handleSwap to include better error handling
  async function handleSwap() {
    if (!quote) {
      toast.error('Get a quote first');
      return;
    }
    if (!isConnected || !account) {
      toast.error('Connect your wallet');
      return;
    }

    if (isSolanaDestination && !solanaAddress) {
      toast.error('Enter Solana address');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet not found');
      return;
    }

    setSwapping(true);
    setError(null);
    setTxStatus(null);
    setTxHash(null);

    try {
      const res = await fetch('http://localhost:4000/crosschain/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          fromChain,
          toChain,
          fromToken,
          toToken,
          amount,
          userWalletAddress: account,
          receiveAddress: isSolanaDestination ? solanaAddress : account
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Swap failed');
      }

      const data = await res.json();
      
      if (!data.txData) {
        throw new Error('No transaction data');
      }

      try {
        const txHash = await walletClient.sendTransaction({
          account: account as `0x${string}`,
          chain: undefined,
          to: data.txData.to as `0x${string}`,
          data: data.txData.data as `0x${string}`,
          value: BigInt(data.txData.value || 0),
          gas: BigInt(data.txData.gasLimit),
          gasPrice: BigInt(data.txData.gasPrice),
          kzg: undefined
        });
        
        if (!txHash) {
          throw new Error('Transaction failed');
        }
        
        setTxHash(txHash);
        setTxStatus('pending');
        toast.success('Transaction sent!');
        pollTxStatus(txHash);
      } catch (txError: any) {
        if (txError.message?.includes('insufficient funds')) {
          toast.error('Insufficient balance');
        } else if (txError.message?.includes('user rejected')) {
          toast.error('Transaction cancelled');
        } else {
          toast.error('Transaction failed');
        }
        throw txError;
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Swap failed';
      setError(errorMessage);
      toast.error('Swap failed');
    } finally {
      setSwapping(false);
    }
  }

  // Update pollTxStatus to include toast notifications
  async function pollTxStatus(hash: string) {
    setTxStatus('pending');
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 5000;

    async function check() {
      attempts++;
      try {
        const res = await fetch(`http://localhost:4000/crosschain/tx-status?txHash=${hash}`);
        if (!res.ok) throw new Error(await res.text() || 'Status check failed');
        const data = await res.json();
        
        if (data.status === 'success') {
          setTxStatus('success');
          toast.success('Swap completed!');
          return;
        } else if (data.status === 'failed') {
          setTxStatus('failed');
          toast.error('Swap failed');
          return;
        }
      } catch (e) {
        setTxStatus('error');
        toast.error('Status check failed');
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(check, interval);
      } else {
        setTxStatus('timeout');
        toast.error('Status check timed out');
      }
    }
    check();
  }

  return (
    <div className="bg-slate-800/60 p-8 rounded-2xl border border-purple-800/40 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Cross Chain Swap Assistant
      </h2>
      <p className="text-gray-300 mb-6">
        Seamlessly swap tokens across different blockchains. Select your source and destination chains, tokens, and amount to get started.
      </p>
      <form className="flex flex-col gap-4" onSubmit={handleQuote}>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-gray-400 mb-1">From Chain</label>
            <Popover open={openFromChain} onOpenChange={setOpenFromChain}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openFromChain}
                  className="w-full justify-between bg-slate-900 text-white border-purple-700 hover:bg-slate-800"
                >
                  {fromChain ? getChainDisplayName(fromChain) : "Select chain..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-purple-700 max-h-[300px] overflow-y-auto">
                <Command className="bg-slate-900">
                  <CommandInput placeholder="Search chain..." className="text-white border-b border-purple-700/50" />
                  <CommandEmpty className="py-2 text-gray-400">No chain found.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto">
                    {availableChains.map((chainId) => (
                      <CommandItem
                        key={chainId}
                        value={getChainDisplayName(chainId)}
                        onSelect={(currentValue) => {
                          const selectedChainId = availableChains.find(
                            id => getChainDisplayName(id).toLowerCase() === currentValue.toLowerCase()
                          );
                          setFromChain(selectedChainId || null);
                          setOpenFromChain(false);
                        }}
                        className="text-white hover:bg-slate-800 cursor-pointer px-2 py-1.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fromChain === chainId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-sm">{getChainDisplayName(chainId)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <label className="block text-gray-400 mb-1">To Chain</label>
            <Popover open={openToChain} onOpenChange={setOpenToChain}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openToChain}
                  className="w-full justify-between bg-slate-900 text-white border-purple-700 hover:bg-slate-800"
                >
                  {toChain ? getChainDisplayName(toChain) : "Select chain..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-purple-700 max-h-[300px] overflow-y-auto">
                <Command className="bg-slate-900">
                  <CommandInput placeholder="Search chain..." className="text-white border-b border-purple-700/50" />
                  <CommandEmpty className="py-2 text-gray-400">No chain found.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto">
                    {availableChains.map((chainId) => (
                      <CommandItem
                        key={chainId}
                        value={getChainDisplayName(chainId)}
                        onSelect={(currentValue) => {
                          const selectedChainId = availableChains.find(
                            id => getChainDisplayName(id).toLowerCase() === currentValue.toLowerCase()
                          );
                          setToChain(selectedChainId || null);
                          setOpenToChain(false);
                        }}
                        className="text-white hover:bg-slate-800 cursor-pointer px-2 py-1.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            toChain === chainId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-sm">{getChainDisplayName(chainId)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-gray-400 mb-1">From Token</label>
            <Popover open={openFromToken} onOpenChange={setOpenFromToken}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openFromToken}
                  className="w-full justify-between bg-slate-900 text-white border-purple-700 hover:bg-slate-800"
                >
                  {fromToken ? fromTokens.find(t => t.address === fromToken)?.symbol || fromToken : "Select token..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-purple-700 max-h-[300px] overflow-y-auto">
                <Command className="bg-slate-900">
                  <CommandInput placeholder="Search token..." className="text-white border-b border-purple-700/50" />
                  <CommandEmpty className="py-2 text-gray-400">No token found.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto">
                    {fromTokens.map((token) => (
                      <CommandItem
                        key={token.address}
                        value={token.symbol}
                        onSelect={(currentValue) => {
                          const selectedToken = fromTokens.find(t => t.symbol === currentValue);
                          setFromToken(selectedToken?.address || '');
                          setOpenFromToken(false);
                        }}
                        className="text-white hover:bg-slate-800 cursor-pointer px-2 py-1.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fromToken === token.address ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-sm">{token.symbol}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <label className="block text-gray-400 mb-1">To Token</label>
            <Popover open={openToToken} onOpenChange={setOpenToToken}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openToToken}
                  className="w-full justify-between bg-slate-900 text-white border-purple-700 hover:bg-slate-800"
                >
                  {toToken ? toTokens.find(t => t.address === toToken)?.symbol || toToken : "Select token..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-slate-900 border-purple-700 max-h-[300px] overflow-y-auto">
                <Command className="bg-slate-900">
                  <CommandInput placeholder="Search token..." className="text-white border-b border-purple-700/50" />
                  <CommandEmpty className="py-2 text-gray-400">No token found.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto">
                    {toTokens.map((token) => (
                      <CommandItem
                        key={token.address}
                        value={token.symbol}
                        onSelect={(currentValue) => {
                          const selectedToken = toTokens.find(t => t.symbol === currentValue);
                          setToToken(selectedToken?.address || '');
                          setOpenToToken(false);
                        }}
                        className="text-white hover:bg-slate-800 cursor-pointer px-2 py-1.5"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            toToken === token.address ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-sm">{token.symbol}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Amount</label>
          <input className="w-full p-2 rounded bg-slate-900 text-white border border-purple-700 focus:outline-none" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Slippage (%)</label>
          <input className="w-full p-2 rounded bg-slate-900 text-white border border-purple-700 focus:outline-none" placeholder="0.01" value={slippage} onChange={e => setSlippage(e.target.value)} />
        </div>
        {isSolanaDestination && (
          <div>
            <label className="block text-gray-400 mb-1">Solana Receive Address</label>
            <input 
              className="w-full p-2 rounded bg-slate-900 text-white border border-purple-700 focus:outline-none" 
              placeholder="Enter your Solana wallet address" 
              value={solanaAddress} 
              onChange={e => setSolanaAddress(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Please enter the Solana wallet address where you want to receive the tokens
            </p>
          </div>
        )}
        <button type="submit" disabled={loading} className="mt-4 w-full py-3 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition disabled:opacity-60">
          {loading ? 'Fetching Quote...' : 'Get Cross-Chain Quote'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-400">{error}</div>}
      {quote && (
        <div className="mt-8 bg-gradient-to-br from-slate-900/90 to-purple-950/80 p-8 rounded-3xl border-2 border-purple-700/70 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow">Quote Details</span>
              <span className="text-xs text-purple-200 bg-purple-900/60 px-3 py-1 rounded-full font-semibold tracking-wide border border-purple-700/40 ml-3">Powered by OKX</span>
            </h3>
            <button
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold text-lg shadow-lg hover:from-blue-500 hover:to-green-400 transition disabled:opacity-60"
              onClick={handleSwap}
              disabled={swapping || txStatus === 'pending'}
            >
              {swapping ? 'Swapping...' : txStatus === 'pending' ? 'Transaction Pending...' : 'Swap'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-200 text-base">
            <div>
              <div className="mb-3"><span className="font-semibold text-purple-300">From Chain:</span> <span className="font-bold text-white">{CHAIN_INDEX_TO_NAME[quote.fromChainId] || quote.fromChainId}</span></div>
              <div className="mb-3"><span className="font-semibold text-purple-300">From Token:</span> <span className="font-bold text-white">{quote.fromToken?.tokenSymbol || '-'} <span className="text-xs text-gray-400 align-middle">({quote.fromToken?.tokenContractAddress?.slice(0, 6)}...{quote.fromToken?.tokenContractAddress?.slice(-4)})</span></span></div>
              <div className="mb-3"><span className="font-semibold text-purple-300">Amount In:</span> <span className="text-lg font-bold text-pink-300">{Number(quote.fromTokenAmount) / Math.pow(10, quote.fromToken?.decimals || 18)}</span> <span className="text-white">{quote.fromToken?.tokenSymbol || ''}</span></div>
              <div className="mb-3"><span className="font-semibold text-purple-300">From Token Decimals:</span> {quote.fromToken?.decimals ?? '-'}</div>
            </div>
            <div>
              <div className="mb-3"><span className="font-semibold text-green-300">To Chain:</span> <span className="font-bold text-white">{CHAIN_INDEX_TO_NAME[quote.toChainId] || quote.toChainId}</span></div>
              <div className="mb-3"><span className="font-semibold text-green-300">To Token:</span> <span className="font-bold text-white">{quote.toToken?.tokenSymbol || '-'} <span className="text-xs text-gray-400 align-middle">({quote.toToken?.tokenContractAddress?.slice(0, 6)}...{quote.toToken?.tokenContractAddress?.slice(-4)})</span></span></div>
              <div className="mb-3"><span className="font-semibold text-green-300">Amount Out (est):</span> <span className="text-lg font-bold text-purple-200">{quote.routerList?.[0]?.toTokenAmount ? (Number(quote.routerList[0].toTokenAmount) / Math.pow(10, quote.toToken?.decimals || 6)) : '-'}</span> <span className="text-white">{quote.toToken?.tokenSymbol || ''}</span></div>
              <div className="mb-3"><span className="font-semibold text-green-300">To Token Decimals:</span> {quote.toToken?.decimals ?? '-'}</div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/90 rounded-2xl p-6 border border-purple-700/60 shadow-md">
              <div className="mb-2 flex items-center gap-2"><span className="font-bold text-pink-400">Bridge:</span> <span className="inline-block bg-purple-900/60 text-purple-200 px-2 py-1 rounded-full text-xs font-semibold border border-purple-700/40">{quote.routerList?.[0]?.router?.bridgeName || 'N/A'}</span></div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Bridge Fee:</span> <span className="font-mono text-white">{quote.routerList?.[0]?.router?.crossChainFee || '-'}</span> {quote.routerList?.[0]?.router?.crossChainFeeTokenAddress ? <span className="text-xs text-gray-400">({quote.routerList[0].router.crossChainFeeTokenAddress.slice(0, 6)}...{quote.routerList[0].router.crossChainFeeTokenAddress.slice(-4)})</span> : ''}</div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Bridge Fee (USD):</span> <span className="font-mono text-white">{quote.routerList?.[0]?.router?.crossChainFeeUsd || '-'}</span></div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Other Native Fee:</span> <span className="font-mono text-white font-bold">{quote.routerList?.[0]?.router?.otherNativeFeeUsd ? `$${quote.routerList[0].router.otherNativeFeeUsd}` : '-'}</span> <span className="font-mono text-white">{quote.routerList?.[0]?.router?.otherNativeFee ? `(${quote.routerList[0].router.otherNativeFee})` : ''}</span></div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Estimated Time:</span> <span className="font-mono text-white">{quote.routerList?.[0]?.estimateTime || '-'}</span> <span className="text-xs text-gray-400">seconds</span></div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Minimum Received:</span> <span className="font-mono text-green-200 text-lg font-bold">{quote.routerList?.[0]?.minimumReceived ? (Number(quote.routerList[0].minimumReceived) / Math.pow(10, quote.toToken?.decimals || 6)) : '-'}</span> <span className="text-white">{quote.toToken?.tokenSymbol || ''}</span></div>
              <div className="mb-2"><span className="font-semibold text-pink-300">Price Impact:</span> <span className="font-mono text-yellow-200">{quote.routerList?.[0]?.priceImpactPercentage || '-'}</span><span className="text-xs text-gray-400">%</span></div>
            </div>
            <div className="bg-slate-800/90 rounded-2xl p-6 border border-purple-700/60 shadow-md">
              <div className="mb-2"><span className="font-semibold text-blue-300">From Chain Network Fee:</span> <span className="font-mono text-white">{quote.routerList?.[0]?.fromChainNetworkFee || '-'}</span></div>
              <div className="mb-2"><span className="font-semibold text-blue-300">To Chain Network Fee:</span> <span className="font-mono text-white">{quote.routerList?.[0]?.toChainNetworkFee || '-'}</span></div>
              <div className="mb-2"><span className="font-semibold text-blue-300">Estimated Gas Fee:</span> <span className="font-mono text-white font-bold">{quote.routerList?.[0]?.estimateGasFeeUsd ? `$${quote.routerList[0].estimateGasFeeUsd}` : '-'}</span> <span className="font-mono text-white">{quote.routerList?.[0]?.estimateGasFee ? `(${quote.routerList[0].estimateGasFee})` : ''}</span></div>
            </div>
          </div>
          {quote.routerList && quote.routerList.length > 0 && (
            <div className="mt-10">
              <h4 className="text-xl font-bold text-purple-200 mb-4 tracking-tight">Swap Route Details</h4>
              {quote.routerList.map((route: any, idx: number) => (
                <div key={idx} className="mb-8 bg-slate-900/90 rounded-2xl p-6 border border-purple-700/40 shadow">
                  {route.fromDexRouterList && route.fromDexRouterList.length > 0 && (
                    <div className="mt-4">
                      <div className="font-bold text-pink-300 mb-2">From Chain DEX Path</div>
                      {route.fromDexRouterList.map((dex: any, i: number) => (
                        <div key={i} className="mb-2 p-2 bg-slate-800/80 rounded-lg">
                          <div className="text-sm text-purple-300">Router: {dex.router}</div>
                          <div className="text-xs text-gray-400">Router Percent: {dex.routerPercent}%</div>
                          {dex.subRouterList && dex.subRouterList.length > 0 && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-300">SubRouters:</div>
                              {dex.subRouterList.map((sub: any, j: number) => (
                                <div key={j} className="ml-2 mb-1">
                                  <div className="text-xs text-yellow-200">DEX Protocols: {sub.dexProtocol?.map((d: any) => `${d.dexName} (${d.percent}%)`).join(', ')}</div>
                                  <div className="text-xs text-gray-400">From: {sub.fromToken?.tokenSymbol} ({sub.fromToken?.tokenContractAddress})</div>
                                  <div className="text-xs text-gray-400">To: {sub.toToken?.tokenSymbol} ({sub.toToken?.tokenContractAddress})</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {txHash && (
            <div className="mt-4 text-sm text-purple-200">
              Transaction Hash: <span className="font-mono">{txHash}</span>
            </div>
          )}
          {txStatus && (
            <div className={`mt-2 text-lg font-bold ${
              txStatus === 'success' ? 'text-green-400' : 
              txStatus === 'failed' ? 'text-red-400' : 
              txStatus === 'pending' ? 'text-yellow-300' : 
              'text-gray-400'
            }`}>
              Status: {txStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CrossChainSwapAssistant;
