import { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, ShieldCheck, AlertCircle, FileText } from 'lucide-react';

export default function PublicVerify() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!file) return;
    
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post('http://localhost:8000/api/documents/verify/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (error) {
      console.error(error);
      setResult({ status: 'Error', message: 'Could not connect to verification server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-20 px-4">
      <div className="text-center mb-10 mt-10">
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-3">Blockchain Document Verification</h1>
        <p className="text-slate-500 font-medium">Verify the authenticity of any document by uploading it. We generate the SHA-256 hash locally and check the Sepolia registry.</p>
      </div>

      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-100 mb-8 z-10">
        <div 
          onClick={() => fileInputRef.current.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 hover:border-blue-500 transition-all group"
        >
          <UploadCloud className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 mb-4 transition-colors" />
          <p className="text-slate-600 font-semibold mb-1">Click to select or drag and drop document</p>
          <p className="text-sm text-slate-400">PNG, JPG up to 10MB</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>

        {file && (
          <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <FileText className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-700 truncate w-64">{file.name}</span>
            </div>
            <button 
              onClick={handleVerify} 
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {loading ? 'Verifying on Chain...' : 'Verify Authenticity'}
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className={`w-full max-w-2xl p-6 rounded-2xl border flex flex-col sm:flex-row items-start space-x-0 sm:space-x-6 space-y-4 sm:space-y-0 shadow-md transition-all ${
          result.status === 'Genuine' ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
        }`}>
          <div className={`p-4 rounded-full shadow-sm mx-auto sm:mx-0 ${result.status === 'Genuine' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {result.status === 'Genuine' ? <ShieldCheck size={36} /> : <AlertCircle size={36} />}
          </div>
          <div className="flex-1 w-full text-center sm:text-left">
            <h3 className={`text-2xl font-extrabold mb-1 tracking-tight ${result.status === 'Genuine' ? 'text-green-800' : 'text-red-800'}`}>
              {result.status === 'Genuine' ? 'Genuine Document' : 'Fake / Not Verified'}
            </h3>
            
            {result.hash_value && (
              <p className="text-xs font-mono text-slate-500 bg-white border border-slate-200 p-2 rounded truncate mt-2">
                SHA256: {result.hash_value}
              </p>
            )}

            {result.status === 'Genuine' ? (
              <div className="text-sm space-y-3 mt-4 w-full text-left">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm overflow-hidden">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Verified User</p>
                    <p className="font-semibold text-slate-800 text-sm truncate">{result.username || 'System Upload'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm overflow-hidden">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Admin Node</p>
                    <p className="font-semibold text-slate-800 text-sm truncate" title={result.owner_details}>{result.owner_details}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm overflow-hidden">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Document Type</p>
                    <p className="font-semibold text-slate-800 text-sm tracking-wider uppercase">{result.document_type}</p>
                  </div>
                </div>
                <div className="bg-green-100/50 p-3 rounded-lg mt-4 border border-green-200">
                  <p className="text-sm text-green-800 font-medium">This document's hash has been successfully located on the blockchain registry and matches an authenticated record.</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 bg-red-100/50 p-4 rounded-xl border border-red-200 text-left">
                <p className="text-red-800 text-sm font-medium">{result.message || "This document's hash does not match any approved document on the blockchain registry. It may be altered, fake or still pending review."}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mt-auto py-8">
        <a href="/" className="text-blue-600 font-semibold hover:underline">Return to Home</a>
        <span className="mx-4 text-slate-300">|</span>
        <a href="/login" className="text-indigo-600 font-semibold hover:underline">Platform Node Login</a>
      </div>
    </div>
  );
}
