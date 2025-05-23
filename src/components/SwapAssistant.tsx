
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const SwapAssistant: React.FC = () => {
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);

  const tokens = ['SOL', 'ETH', 'USDT', 'USDC', 'BTC'];
  const chains = ['Solana', 'Ethereum', 'BSC', 'Polygon'];

  const routes = [
    {
      id: 1,
      route: 'SOL → USDT',
      path: 'Solana → Jupiter',
      rate: '1 SOL = 198.45 USDT',
      slippage: '0.1%',
      gas: '$0.02',
      time: '~15s',
      rating: 'Best Price',
      color: 'border-green-500 bg-green-500/10',
    },
    {
      id: 2,
      route: 'SOL → USDT',
      path: 'Solana → Orca',
      rate: '1 SOL = 197.89 USDT',
      slippage: '0.2%',
      gas: '$0.02',
      time: '~20s',
      rating: 'Low Slippage',
      color: 'border-blue-500 bg-blue-500/10',
    },
    {
      id: 3,
      route: 'SOL → USDT',
      path: 'Solana → Raydium',
      rate: '1 SOL = 196.23 USDT',
      slippage: '0.5%',
      gas: '$0.03',
      time: '~12s',
      rating: 'Fastest',
      color: 'border-purple-500 bg-purple-500/10',
    },
  ];

  const handleQuote = () => {
    setShowRoutes(true);
    console.log('Fetching routes from OKX DEX Aggregator API...');
  };

  return (
    <Card className="bg-slate-800/50 border-purple-800/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>🤖</span>
          <span>AI Swap Assistant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Swap Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">From</label>
              <Select onValueChange={setFromToken}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {tokens.map((token) => (
                    <SelectItem key={token} value={token} className="text-white hover:bg-slate-600">
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">To</label>
              <Select onValueChange={setToToken}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {tokens.map((token) => (
                    <SelectItem key={token} value={token} className="text-white hover:bg-slate-600">
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder-gray-400"
            />
          </div>

          <Button
            onClick={handleQuote}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            disabled={!fromToken || !toToken || !amount}
          >
            Find Best Routes 🔍
          </Button>
        </div>

        {/* Route Results */}
        {showRoutes && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Recommended Routes</h3>
            {routes.map((route) => (
              <div key={route.id} className={`p-4 rounded-lg border-2 ${route.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{route.route}</span>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                      {route.rating}
                    </span>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                    Swap Now
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Rate</p>
                    <p className="text-white font-medium">{route.rate}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Slippage</p>
                    <p className="text-white font-medium">{route.slippage}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Gas</p>
                    <p className="text-white font-medium">{route.gas}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Time</p>
                    <p className="text-white font-medium">{route.time}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">Via: {route.path}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
