import { useMetaMask } from '../context/MetaMaskContext';
import { Wallet, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function WalletConnector() {
  const {
    walletAddress,
    isConnected,
    isCorrectNetwork,
    isMetaMaskInstalled,
    isConnecting,
    connectWallet,
    switchNetwork
  } = useMetaMask();

  // Helper to format wallet address
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isMetaMaskInstalled) {
    return (
      <a 
        href="https://metamask.io/download/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-sm"
      >
        <AlertTriangle size={16} />
        Install MetaMask
      </a>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
      >
        <Wallet size={16} />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-xs md:text-sm rounded-xl transition-all shadow-sm animation-pulse"
        title="Click to switch to Sepolia network"
      >
        <AlertTriangle size={16} className="text-red-500" />
        <span>Switch to Sepolia</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl shadow-inner">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="font-mono text-xs md:text-sm font-semibold text-slate-700">
        {formatAddress(walletAddress)}
      </span>
      <span className="hidden md:inline px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase rounded-full tracking-wide">
        Sepolia
      </span>
    </div>
  );
}
