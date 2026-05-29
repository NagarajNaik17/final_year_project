import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { UserPlus, CheckCircle, XCircle, Loader2, Trash2, Eye, FileText, X, DownloadCloud } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useMetaMask } from '../context/MetaMaskContext';

export default function SuperAdminDashboard() {
  const { isConnected, sendApprovalTransaction } = useMetaMask();
  const [documents, setDocuments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewDocUrl, setViewDocUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });

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
  
  const location = useLocation();
  // Determine active tab based on route
  const currentTab = location.pathname.includes('create-admin') ? 'create-admin' 
                   : location.pathname.includes('pending') ? 'pending' 
                   : location.pathname.includes('all') ? 'all' 
                   : 'dashboard';

  useEffect(() => {
    if (currentTab === 'pending' || currentTab === 'dashboard') {
      fetchDocs();
    }
    if (currentTab === 'all' || currentTab === 'dashboard') {
      fetchAdmins();
    }
  }, [currentTab]);

  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/superadmin/admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAdmins(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleApprove = async (docId) => {
    const doc = documents.find(d => d._id === docId);
    if (!doc) {
      toast.error("Document not found");
      return;
    }

    if (!isConnected) {
        toast.error("Please connect your MetaMask wallet first using the button in the header!");
        return;
    }

    setProcessingId(docId);
    
    // 1. Trigger MetaMask lightweight transaction approval
    try {
      await sendApprovalTransaction(doc.hash_value, doc.doc_type || doc.document_type || "Unknown");
    } catch (txErr) {
      toast.error(txErr.message || "MetaMask verification request rejected/failed.");
      setProcessingId(null);
      return;
    }

    const loadingToast = toast.loading('Securing manual approval and anchor on Blockchain...');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`http://localhost:8000/api/superadmin/approve-document/${docId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        if (res.data.data?.status === 'duplicate') {
           toast.error(`⚠️ ${res.data.message}`, { id: loadingToast, duration: 6000 });
        } else {
           toast.success(`✅ ${res.data.message}`, { id: loadingToast, duration: 6000 });
        }
        fetchDocs();
      } else {
        toast.error(res.data.message || 'Approve Failed', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Failed to communicate with Blockchain', { id: loadingToast });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (docId) => {
    setProcessingId(docId);
    const loadingToast = toast.loading('Rejecting document...');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/superadmin/reject-document/${docId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Document rejected successfully!', { id: loadingToast });
      fetchDocs();
    } catch (error) {
      toast.error('Failed to reject document', { id: loadingToast });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminForm.email)) {
      toast.error("Invalid email format");
      return;
    }
    
    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating admin account...');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8000/api/superadmin/create-admin', adminForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message, { id: loadingToast });
        setAdminForm({ name: '', email: '', password: '' });
        if (currentTab === 'dashboard' || currentTab === 'all') fetchAdmins(); // auto refresh
      } else {
        toast.error(res.data.message, { id: loadingToast });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create Admin", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminRole) => {
    if (adminRole === 'Super Admin') {
      toast.error("Cannot delete Super Admin account");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this admin?")) return;

    const loadingToast = toast.loading('Deleting admin...');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:8000/api/superadmin/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success(res.data.message, { id: loadingToast });
        fetchAdmins();
      } else {
        toast.error(res.data.message, { id: loadingToast });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete admin', { id: loadingToast });
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

  const SkeletonRow = () => (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-200 rounded w-1/2"></div></td>
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div><div className="h-2 bg-slate-200 rounded w-full"></div></td>
      <td className="p-6"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
      <td className="p-6 flex justify-end gap-2"><div className="h-8 bg-slate-200 rounded w-20"></div><div className="h-8 bg-slate-200 rounded w-20"></div></td>
    </tr>
  );

  const SkeletonAdminRow = () => (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div><div className="h-3 bg-slate-200 rounded w-1/4"></div></td>
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-3/4"></div></td>
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-1/3"></div></td>
      <td className="p-6"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td>
      <td className="p-6 flex justify-end"><div className="h-8 bg-slate-200 rounded w-8"></div></td>
    </tr>
  );

  const renderCreateAdmin = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><UserPlus /> Create New Admin</h2>
      <form onSubmit={handleCreateAdmin} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Name</label>
          <input type="text" required value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Admin Name" disabled={isSubmitting} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Email</label>
          <input type="email" required value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="admin@system.local" disabled={isSubmitting} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Password</label>
          <input type="password" required value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="••••••••" disabled={isSubmitting} />
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2 flex justify-center items-center rounded-lg font-bold transition-colors">
          {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={20} /> Creating...</> : "Create Admin User"}
        </button>
      </form>
    </div>
  );

  const renderAdminsTable = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full transition-all duration-300">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <th className="p-6">Name & ID</th>
            <th className="p-6">Email</th>
            <th className="p-6">Role</th>
            <th className="p-6">Created Date</th>
            <th className="p-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loadingAdmins ? (
            <><SkeletonAdminRow/> <SkeletonAdminRow/> <SkeletonAdminRow/></>
          ) : admins.map(admin => (
            <tr key={admin._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-6">
                <div className="font-bold text-slate-800 text-base">{admin.username}</div>
                <div className="text-xs font-mono text-slate-400 bg-white border border-slate-100 p-1 rounded inline-block mt-1">
                  ID: {admin._id.substring(0, 8)}
                </div>
              </td>
              <td className="p-6 text-sm font-medium text-slate-600">{admin.email}</td>
              <td className="p-6">
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {admin.role}
                </span>
              </td>
              <td className="p-6 text-sm text-slate-500">
                {new Date(admin.created_at).toLocaleDateString()}
              </td>
              <td className="p-6 text-right">
                {admin.role !== 'Super Admin' && (
                  <button onClick={() => handleDeleteAdmin(admin._id, admin.role)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors" title="Delete Admin">
                    <Trash2 size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loadingAdmins && admins.length === 0 && (
        <div className="p-10 text-center text-slate-500 font-medium">No admins found.</div>
      )}
    </div>
  );

  const renderDocumentTable = (docsToRender) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full transition-all duration-300">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <th className="p-6 w-1/3">Document Details</th>
            <th className="p-6 w-1/4">Verification Score</th>
            <th className="p-6 w-1/6">Status</th>
            <th className="p-6 w-1/4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loadingDocs ? (
            <><SkeletonRow/> <SkeletonRow/> <SkeletonRow/></>
          ) : docsToRender.map(doc => (
            <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-6">
                <div className="font-bold text-slate-800 text-base">{doc.doc_type || doc.document_type || "Unknown Document"}</div>
                <div className="text-xs font-mono text-slate-400 bg-white border border-slate-100 p-1 rounded inline-block mt-1">
                  Upload ID: {doc._id.substring(0, 8)} | Target User: {doc.username || "Unknown"}
                </div>
              </td>
              <td className="p-6">
                {(doc.total_score !== undefined && doc.total_score !== null) ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-700">{(doc.total_score).toFixed(1)}</span>
                      <span className="text-xs text-slate-400">/ 100 API Base Check</span>
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-2">
                       <div className={`h-1.5 rounded-full ${doc.total_score >= 60 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${Math.min((doc.total_score/100)*100, 100)}%`}}></div>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Awaiting...</span>
                )}
              </td>
              <td className="p-6">
                <span className={`px-4 py-1.5 text-xs font-bold rounded-full border ${
                  doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' 
                  : doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {doc.status}
                </span>
              </td>
              <td className="p-6 text-right space-x-2">
                <div className="flex justify-end items-center gap-2">
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewDoc(doc); }} className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" title="View Document Image">
                    <Eye size={18} />
                  </button>
                  {doc.status !== 'Approved' && doc.status !== 'Rejected' ? (
                    <>
                      <button onClick={() => handleApprove(doc._id)} disabled={processingId === doc._id} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded text-sm font-bold transition-colors disabled:opacity-50 flex items-center">
                        {processingId === doc._id ? <Loader2 size={16} className="animate-spin mr-1" /> : <CheckCircle size={16} className="mr-1" />} Approve
                      </button>
                      <button onClick={() => handleReject(doc._id)} disabled={processingId === doc._id} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded text-sm font-bold transition-colors disabled:opacity-50 flex items-center">
                        {processingId === doc._id ? <Loader2 size={16} className="animate-spin mr-1" /> : <XCircle size={16} className="mr-1" />} Reject
                      </button>
                    </>
                  ) : (
                    <span className={`text-sm font-bold flex items-center space-x-1 ${doc.status === 'Approved' ? 'text-green-600' : 'text-red-600'}`}>
                      {doc.status === 'Approved' ? <><CheckCircle size={16} /> <span>Done</span></> : <><XCircle size={16} /> <span>Rejected</span></>}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loadingDocs && docsToRender.length === 0 && (
        <div className="p-10 text-center text-slate-500 font-medium">No documents found.</div>
      )}
    </div>
  );

  const pendingDocs = documents.filter(d => d.status && d.status.toLowerCase().includes('pending'));

  return (
    <div className="animate-in fade-in duration-300">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">
        {currentTab === 'create-admin' ? 'Create Admin User'
         : currentTab === 'pending' ? 'Pending Approvals'
         : currentTab === 'all' ? 'All Admins'
         : 'System Dashboard'}
      </h1>

      {currentTab === 'create-admin' && renderCreateAdmin()}
      
      {currentTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-sm font-bold mb-1">Pending Approvals</div>
             <div className="text-4xl font-extrabold text-orange-600">{loadingDocs ? '-' : pendingDocs.length}</div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-sm font-bold mb-1">Total Admins</div>
             <div className="text-4xl font-extrabold text-indigo-600">{loadingAdmins ? '-' : admins.length}</div>
           </div>
        </div>
      )}

      {currentTab === 'dashboard' && renderDocumentTable(documents)}
      {currentTab === 'pending' && renderDocumentTable(pendingDocs)}
      {currentTab === 'all' && renderAdminsTable()}

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
                            <span className="font-bold text-indigo-600">{(viewDoc.total_score || 0).toFixed(1)} / 100</span>
                        </div>
                        {viewDoc.ai_feedback && <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-indigo-50/50 p-4 rounded-lg">{viewDoc.ai_feedback}</p>}
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setViewDoc(null)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
                    {(viewDoc.status === 'Approved' || viewDoc.status === 'Rejected' || viewDoc.status === 'Pending') && (
                        <button onClick={() => {
                            handleDownload(viewDoc._id, viewDoc.original_filename);
                        }} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors flex items-center gap-2">
                           <DownloadCloud size={18} /> Download Copy
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
