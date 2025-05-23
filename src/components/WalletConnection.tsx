
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WalletConnectionProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  isConnected,
  onConnect,
  onDisconnect,
}) => {
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  const wallets = [
    { name: 'OKX Wallet', icon: '🦄', color: 'from-purple-500 to-blue-500' },
    { name: 'Phantom', icon: '👻', color: 'from-purple-600 to-pink-600' },
    { name: 'MetaMask', icon: '🦊', color: 'from-orange-500 to-yellow-500' },
  ];

  const handleConnect = (walletName: string) => {
    setSelectedWallet(walletName);
    onConnect();
    console.log(`Connecting to ${walletName}...`);
  };

  if (isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span>0x1234...5678</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-slate-800 border-slate-700">
          <DropdownMenuItem onClick={onDisconnect} className="text-red-400 hover:bg-red-500/20">
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
          Connect Wallet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700 w-56">
        {wallets.map((wallet) => (
          <DropdownMenuItem
            key={wallet.name}
            onClick={() => handleConnect(wallet.name)}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${wallet.color} flex items-center justify-center`}>
              <span className="text-sm">{wallet.icon}</span>
            </div>
            <span className="text-white">{wallet.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
