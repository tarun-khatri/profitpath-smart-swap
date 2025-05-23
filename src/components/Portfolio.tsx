
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Portfolio: React.FC = () => {
  const tokens = [
    { symbol: 'SOL', balance: '12.5', value: '$2,485.50', change: '+5.2%', positive: true },
    { symbol: 'USDT', balance: '1,250', value: '$1,250.00', change: '+0.1%', positive: true },
    { symbol: 'ETH', balance: '0.8', value: '$1,960.00', change: '-2.1%', positive: false },
  ];

  const totalValue = tokens.reduce((sum, token) => {
    return sum + parseFloat(token.value.replace('$', '').replace(',', ''));
  }, 0);

  return (
    <Card className="bg-slate-800/50 border-purple-800/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>💼</span>
          <span>Portfolio</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
          <p className="text-sm text-gray-400">Total Value</p>
          <p className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</p>
          <p className="text-sm text-green-400">+3.2% (24h)</p>
        </div>
        
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.symbol} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{token.symbol[0]}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{token.symbol}</p>
                  <p className="text-sm text-gray-400">{token.balance}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{token.value}</p>
                <p className={`text-sm ${token.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {token.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
