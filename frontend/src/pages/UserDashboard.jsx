import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, DownloadCloud, Eye, X, CheckCircle, Clock, XCircle, FileImage } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function UserDashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewDocUrl, setViewDocUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (viewDoc) {
      const fetchImage = async () => {
        setLoadingImage(true);
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`http://localhost:8000/api/documents/${viewDoc._id}/download`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          setViewDocUrl(url);
        } catch (err) {
          toast.error("Failed to load document preview");
        } finally {
          setLoadingImage(false);
        }
      };
      fetchImage();
    } else {
      if (viewDocUrl) {
          window.URL.revokeObjectURL(viewDocUrl);
          setViewDocUrl(null);
      }
    }
  }, [viewDoc]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (error) {
      toast.error("Failed to load your documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const loadingToast = toast.loading('Downloading...');
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download started", { id: loadingToast });
    } catch (err) {
      toast.error("Failed to download document");
    }
  };
  
  const stats = {
      total: documents.length,
      approved: documents.filter(d => d.status === 'Approved').length,
      pending: documents.filter(d => d.status.toLowerCase().includes('pending')).length,
      rejected: documents.filter(d => d.status === 'Rejected').length
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">User Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="text-slate-500 text-sm font-bold mb-1">Total Docs</div>
           <div className="text-4xl font-extrabold text-slate-700">{loading ? '-' : stats.total}</div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="text-slate-500 text-sm font-bold mb-1 flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Approved</div>
           <div className="text-4xl font-extrabold text-green-600">{loading ? '-' : stats.approved}</div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="text-slate-500 text-sm font-bold mb-1 flex items-center gap-1"><Clock size={16} className="text-orange-500"/> Pending</div>
           <div className="text-4xl font-extrabold text-orange-600">{loading ? '-' : stats.pending}</div>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <div className="text-slate-500 text-sm font-bold mb-1 flex items-center gap-1"><XCircle size={16} className="text-red-500"/> Rejected</div>
           <div className="text-4xl font-extrabold text-red-600">{loading ? '-' : stats.rejected}</div>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full transition-all duration-300">
         <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <h2 className="text-xl font-bold text-slate-800">My Uploaded Documents</h2>
         </div>
         <div className="overflow-x-auto">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                 <th className="p-6">Document Type</th>
                 <th className="p-6">File Name</th>
                 <th className="p-6">Status</th>
                 <th className="p-6">Blockchain Hash</th>
                 <th className="p-6 text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
               {loading ? (
                    <tr className="animate-pulse"><td colSpan="5" className="p-6"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td></tr>
               ) : documents.map(doc => (
                 <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                     <td className="p-6 font-bold text-slate-800 flex items-center gap-2">
                         <FileText size={18} className="text-indigo-500" />
                         {doc.doc_type || doc.document_type || "Unknown Document"}
                     </td>
                     <td className="p-6 text-sm font-medium text-slate-600">
                         {doc.original_filename || "document.pdf"}
                     </td>
                     <td className="p-6">
                         <span className={`px-4 py-1.5 text-xs font-bold rounded-full border flex inline-flex items-center gap-1 ${
                             doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' 
                             : doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' 
                             : 'bg-orange-50 text-orange-700 border-orange-200'
                           }`}>
                           {doc.status === 'Approved' ? 'Verified ✅' : doc.status === 'Rejected' ? 'Rejected ❌' : 'Pending ⏳'}
                         </span>
                     </td>
                     <td className="p-6 font-mono text-xs">
                        {doc.blockchain_tx_hash ? (
                             <span className="bg-slate-100 border border-slate-200 p-1.5 rounded text-slate-500" title={doc.blockchain_tx_hash}>
                                {doc.blockchain_tx_hash.substring(0, 10)}...{doc.blockchain_tx_hash.slice(-4)}
                             </span>
                        ) : <span className="text-slate-400">Not Stored</span>}
                     </td>
                     <td className="p-6 text-right space-x-2 whitespace-nowrap">
                         <button onClick={() => setViewDoc(doc)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors inline-flex items-center">
                             <Eye size={16} className="mr-1" /> View
                         </button>
                         {doc.status === 'Approved' && (
                             <button onClick={() => handleDownload(doc._id, doc.original_filename)} className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors inline-flex items-center">
                                 <DownloadCloud size={16} className="mr-1" /> Download
                             </button>
                         )}
                     </td>
                 </tr>
               ))}
            </tbody>
         </table>
         </div>
         {!loading && documents.length === 0 && (
             <div className="p-16 text-center text-slate-500 font-medium bg-slate-50 flex flex-col items-center">
                 <FileImage size={48} className="text-slate-300 mb-4" />
                 No documents uploaded yet.
             </div>
         )}
      </div>

      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animation-fade-in">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-indigo-600" /> Document Viewer</h2>
                 <button onClick={() => setViewDoc(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8">
                 <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="col-span-2 md:col-span-1">
                        <p className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Document Type</p>
                        <p className="font-bold text-slate-800 text-lg">{viewDoc.doc_type || viewDoc.document_type || 'Unknown'}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <p className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Status</p>
                        <p className="font-bold text-slate-800 text-lg">{viewDoc.status}</p>
                    </div>
                    
                    <div className="col-span-2 mt-2 mb-4 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 relative" style={{minHeight: "200px", maxHeight: "400px"}}>
                        {viewDocUrl && !loadingImage && (
                            <button onClick={() => setViewDoc(null)} className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-full shadow-md z-10 transition-colors" title="Close Preview">
                               <X size={20} />
                            </button>
                        )}
                        {loadingImage ? (
                            <div className="text-slate-400 flex flex-col items-center p-8">
                               <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                               <span className="font-semibold text-sm">Loading visual preview...</span>
                            </div>
                        ) : viewDocUrl ? (
                            <img src={viewDocUrl} alt="Document Preview" className="object-contain w-full h-full hover:scale-105 transition-transform duration-500" style={{maxHeight: '400px'}} />
                        ) : (
                            <span className="text-slate-400 font-medium p-8">Preview not available</span>
                        )}
                    </div>

                    <div className="col-span-2 bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase">Verification Details</p>
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 font-mono text-sm mb-2 shadow-sm">
                            <span className="text-slate-500 font-sans font-semibold">Total Match Score</span>
                            <span className="font-bold text-indigo-600">{(viewDoc.total_score || 0).toFixed(1)} / 70</span>
                        </div>
                        {viewDoc.ai_feedback && <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-indigo-50/50 p-4 rounded-lg">{viewDoc.ai_feedback}</p>}
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setViewDoc(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
                    {viewDoc.status === 'Approved' && (
                        <button onClick={() => {
                            handleDownload(viewDoc._id, viewDoc.original_filename);
                            setViewDoc(null);
                        }} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors flex items-center gap-2">
                           <DownloadCloud size={18} /> Download Verified Copy
                        </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
