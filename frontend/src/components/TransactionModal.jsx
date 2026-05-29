import { useMetaMask } from '../context/MetaMaskContext';
import { Loader2, CheckCircle2, XCircle, ExternalLink, ShieldAlert } from 'lucide-react';

export default function TransactionModal() {
  const { txState, resetTxState } = useMetaMask();

  if (txState.status === 'idle') return null;

  const isPending = txState.status === 'pending';
  const isSuccess = txState.status === 'success';
  const isRejected = txState.status === 'rejected';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
            🔒
          </div>
          <h3 className="font-extrabold text-slate-800 tracking-tight">MetaMask Action Required</h3>
        </div>

        {/* Content */}
        <div className="p-8 text-center space-y-6">
          
          {/* Status Icon */}
          <div className="flex justify-center">
            {isPending && !txState.txHash && (
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute font-bold text-lg text-indigo-600">🦊</div>
              </div>
            )}

            {isPending && txState.txHash && (
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                <div className="absolute font-bold text-lg text-amber-500">⏳</div>
              </div>
            )}

            {isSuccess && (
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={36} />
              </div>
            )}

            {isRejected && (
              <div className="w-16 h-16 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-500">
                <XCircle size={36} />
              </div>
            )}
          </div>

          {/* Heading and description */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-lg">
              {isPending && !txState.txHash && 'Confirm in MetaMask'}
              {isPending && txState.txHash && 'Transaction Pending'}
              {isSuccess && 'Verification Successful!'}
              {isRejected && 'Transaction Discarded'}
            </h4>
            
            <p className="text-sm text-slate-500 leading-relaxed px-2">
              {isPending && !txState.txHash && 'Open your MetaMask extension popup and sign the transaction request to verify and anchor this document.'}
              {isPending && txState.txHash && 'Your verification is being written to the Sepolia block ledger. This may take up to 30 seconds...'}
              {isSuccess && 'The verification transaction has been successfully confirmed and mined on the Sepolia network.'}
              {isRejected && (txState.error || 'The MetaMask transaction request was rejected or failed on the network.')}
            </p>
          </div>

          {/* Transaction Info / Links */}
          {txState.txHash && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-1.5 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Transaction Hash</span>
              <span className="font-mono text-xs text-slate-500 select-all truncate max-w-xs">{txState.txHash}</span>
              <a 
                href={`https://sepolia.etherscan.io/tx/${txState.txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold mt-1.5 transition-colors"
              >
                View on Etherscan
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {/* Footer action button */}
          <div className="pt-2">
            {isSuccess && (
              <button 
                onClick={resetTxState}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition-all"
              >
                Proceeding to DigiLocker...
              </button>
            )}
            {isRejected && (
              <button 
                onClick={resetTxState}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-md transition-all"
              >
                Close & Retry
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
