import { useNavigate } from 'react-router-dom';
import { Shield, FileSearch, Database, ArrowRight, Layers, CheckCircle } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden font-sans text-slate-100 selection:bg-indigo-500/30">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-900/40 via-purple-900/20 to-transparent blur-3xl pointer-events-none -z-10"></div>
      
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-8 flex items-center justify-between z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield className="text-white" size={20} absoluteStrokeWidth />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-white drop-shadow-sm">DocuVerify</span>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => navigate('/verify')}
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            Public Registry
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
          >
            Sign In <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-24 pb-32 text-center z-10 relative flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Ethereum Sepolia Active</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-8 max-w-4xl leading-tight">
          Trustless Document <br className="hidden md:block" /> Authentication
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          The unified platform combining Advanced Optical Character Recognition, Gemini AI Forensics, and Immutable Blockchain ledgers to completely eliminate document fraud.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
          >
            <Layers size={20} /> Access Portal
          </button>
          <button 
            onClick={() => navigate('/verify')}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold border border-slate-700 hover:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
          >
            <FileSearch size={20} /> Verify a Document
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-slate-800/60 transition-colors overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
              <FileSearch size={120} />
            </div>
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
              <FileSearch className="text-blue-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">AI Forensics</h3>
            <p className="text-slate-400 leading-relaxed">
              Proprietary pipelines utilizing EasyOCR combined with Gemini Pro deep semantic validation to detect invisible data manipulation and logical mismatches across native structural zones.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-slate-800/60 transition-colors overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
              <Database size={120} />
            </div>
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30">
              <Database className="text-purple-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Immutable Ledgers</h3>
            <p className="text-slate-400 leading-relaxed">
               Mathematical cryptographic bounds guarantee documents are permanently registered. Hashes are dropped via Smart Contracts onto Ethereum, permanently sealing their authenticity.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl backdrop-blur-sm hover:bg-slate-800/60 transition-colors overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
              <Shield size={120} />
            </div>
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 border border-green-500/30">
              <Shield className="text-green-400" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Zero-Knowledge Proofs</h3>
            <p className="text-slate-400 leading-relaxed">
              Verify any document universally without ever touching internal networks. Our public gateway compares raw localized hashes independently to assert validity openly and transparently.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
