import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, UploadCloud, FileText, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', aadhaar_number: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [docType, setDocType] = useState('aadhaar');
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentTab = location.pathname.includes('create-user') ? 'create-user'
                   : location.pathname.includes('users') ? 'users'
                   : location.pathname.includes('upload-document') ? 'upload'
                   : location.pathname.includes('my-documents') ? 'my-documents'
                   : 'dashboard';

  const userIdRegex = /\/admin\/upload-document\/([^/]+)/;
  const match = location.pathname.match(userIdRegex);
  const selectedUserId = match ? match[1] : null;

  useEffect(() => {
    if (currentTab === 'dashboard') fetchStats();
    if (currentTab === 'users') fetchUsers();
    if (currentTab === 'my-documents') fetchDocuments();
  }, [currentTab]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/admin/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(res.data.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/admin/my-documents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDocuments(res.data.data);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating user...');
    try {
      const res = await axios.post('http://localhost:8000/api/auth/register/user', {
        ...userForm,
        role: "User"
      });
      toast.success("User created successfully", { id: loadingToast });
      setUserForm({ username: '', email: '', password: '', aadhaar_number: '' });
      navigate('/admin/users');
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create User", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedUserId) {
        toast.error("Please select a file to upload");
        return;
    }
    setIsSubmitting(true);
    const loadingToast = toast.loading('Running 70-Point Verification Pipeline (OCR + Gemini)...');
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('user_id', selectedUserId);
    formData.append('doc_type', docType);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8000/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success("AI Verification Complete", { id: loadingToast });
      setUploadResult(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload pipeline failed.', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="text-slate-500 text-sm font-bold mb-1">Total Users</div>
         <div className="text-4xl font-extrabold text-blue-600">{stats ? stats.total_users : '-'}</div>
       </div>
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="text-slate-500 text-sm font-bold mb-1">Approved Docs</div>
         <div className="text-4xl font-extrabold text-green-600">{stats ? stats.approved : '-'}</div>
       </div>
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="text-slate-500 text-sm font-bold mb-1">Pending Docs</div>
         <div className="text-4xl font-extrabold text-orange-600">{stats ? stats.pending : '-'}</div>
       </div>
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="text-slate-500 text-sm font-bold mb-1">Rejected Docs</div>
         <div className="text-4xl font-extrabold text-red-600">{stats ? stats.rejected : '-'}</div>
       </div>
    </div>
  );

  const renderUsersTable = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <th className="p-6">Username</th>
            <th className="p-6">Aadhaar</th>
            <th className="p-6">Email</th>
            <th className="p-6">Created</th>
            <th className="p-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="animate-pulse"><td colSpan="5" className="p-6"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td></tr>
          ) : users.map(user => (
            <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-6 font-bold text-slate-800">{user.username}</td>
              <td className="p-6 font-mono text-slate-500">{user.aadhaar_number}</td>
              <td className="p-6 text-slate-600">{user.email}</td>
              <td className="p-6 text-sm text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
              <td className="p-6 text-right">
                <button 
                  onClick={() => navigate(`/admin/upload-document/${user._id}`)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  <UploadCloud size={16} className="inline mr-1" /> Upload Doc
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && users.length === 0 && <div className="p-10 text-center text-slate-500 font-medium">No users found.</div>}
    </div>
  );

  const renderCreateUser = () => (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><UserPlus /> Create New User</h2>
      <form onSubmit={handleCreateUser} className="space-y-4">
        <div><label className="block text-sm font-semibold mb-1">Username</label><input type="text" required value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-2 border rounded-lg" disabled={isSubmitting} /></div>
        <div><label className="block text-sm font-semibold mb-1">Email</label><input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-2 border rounded-lg" disabled={isSubmitting} /></div>
        <div><label className="block text-sm font-semibold mb-1">Aadhaar Number</label><input type="text" required value={userForm.aadhaar_number} onChange={e => setUserForm({...userForm, aadhaar_number: e.target.value})} className="w-full p-2 border rounded-lg" disabled={isSubmitting} /></div>
        <div><label className="block text-sm font-semibold mb-1">Password</label><input type="password" required value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-2 border rounded-lg" disabled={isSubmitting} /></div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2 flex justify-center items-center rounded-lg font-bold transition-colors">
          {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={20} /> Creating...</> : "Create User"}
        </button>
      </form>
    </div>
  );

  const renderUploadFlow = () => (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800">Upload Document for Verification</h2>
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-slate-700">Select Document Type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)} disabled={isSubmitting} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-medium">
             <option value="aadhaar">Aadhaar Card</option>
             <option value="pan">PAN Card</option>
             <option value="voter">Voter ID</option>
          </select>
        </div>

        <div onClick={() => !isSubmitting && fileInputRef.current.click()} className={`border-2 border-dashed border-slate-300 rounded-xl p-12 text-center transition-all group ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50 hover:border-indigo-400'}`}>
          <UploadCloud className="mx-auto h-12 w-12 text-slate-400 group-hover:text-indigo-500 mb-4 transition-colors" />
          <p className="text-slate-600 font-semibold mb-1">Click to select or drag and drop</p>
          <p className="text-sm text-slate-400">PNG, JPG up to 10MB</p>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" disabled={isSubmitting} />
        </div>

        {uploadFile && (
          <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <FileText className="text-indigo-600" />
              <span className="text-sm font-semibold text-slate-700">{uploadFile.name}</span>
            </div>
            <button onClick={handleUpload} disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold flex items-center rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md">
              {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={16} /> Verifying...</> : 'Run Verification'}
            </button>
          </div>
        )}
      </div>

      {uploadResult && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animation-fade-in">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800">Verification Result</h2>
          </div>
          <div className="p-8 grid grid-cols-2 gap-8">
            <div className="col-span-2 space-y-4 text-slate-700 text-sm">
               <div className="flex justify-between font-semibold border-b pb-2 border-slate-100">
                 <span>OCR Score:</span>
                 <span className="font-mono">{(uploadResult.ocr_score || 0).toFixed(0)}/20</span>
               </div>
               <div className="flex justify-between font-semibold border-b pb-2 border-slate-100">
                 <span>AI Score:</span>
                 <span className="font-mono">{(uploadResult.ai_score || 0).toFixed(0)}/50</span>
               </div>
               <div className="flex justify-between font-bold text-lg mb-4 text-slate-800">
                 <span>Total:</span>
                 <span>{(uploadResult.total_score || 0).toFixed(0)}%</span>
               </div>
            </div>
            
            <div className="col-span-2 bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
               <div className="flex items-center gap-2 text-lg font-bold">
                  <span className="text-slate-600">Status:</span>
                  <span className={uploadResult.status === 'approved' ? 'text-green-600 uppercase tracking-wide' : 'text-orange-600 uppercase tracking-wide'}>
                     {uploadResult.status === 'approved' ? 'APPROVED ✅' : 'PENDING ⏳'}
                  </span>
               </div>
               
               <div className="flex flex-col gap-1">
                 <span className="font-bold text-slate-500 text-sm">Blockchain:</span>
                 <span className="font-semibold text-slate-800">{uploadResult.blockchain_status || 'Not Stored'}</span>
               </div>
               
               {uploadResult.transaction_hash && (
                 <div className="flex flex-col gap-1">
                   <span className="font-bold text-slate-500 text-sm">Txn:</span>
                   <span className="font-mono text-xs truncate bg-white p-2 border border-slate-200 rounded text-slate-500 shadow-sm" title={uploadResult.transaction_hash}>
                       {uploadResult.transaction_hash}
                   </span>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMyDocuments = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
            <th className="p-6">Document Info</th>
            <th className="p-6">User ID</th>
            <th className="p-6">Verification Score</th>
            <th className="p-6">Status & Blockchain</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
             <tr className="animate-pulse"><td colSpan="4" className="p-6"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td></tr>
          ) : documents.map(doc => (
            <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-6 font-bold text-slate-800">{doc.doc_type || 'Unknown'}</td>
              <td className="p-6 font-mono text-xs text-slate-500">{doc.user_id}</td>
              <td className="p-6 font-bold flex items-center gap-2">
                {(doc.total_score || 0).toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 70</span>
                {doc.total_score >= 50 ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-orange-500"/>}
              </td>
              <td className="p-6">
                <div className="mb-1"><span className={`px-3 py-1 text-xs font-bold rounded-full ${doc.status === 'Approved' ? 'bg-green-50 text-green-700' : doc.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>{doc.status}</span></div>
                {doc.blockchain_tx_hash && <div className="text-xs font-mono text-slate-400 truncate w-32" title={doc.blockchain_tx_hash}>{doc.blockchain_tx_hash}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && documents.length === 0 && <div className="p-10 text-center text-slate-500 font-medium">No documents uploaded yet.</div>}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">
        {currentTab === 'dashboard' ? 'Admin Overview'
         : currentTab === 'users' ? 'All Managed Users'
         : currentTab === 'create-user' ? 'Register Employee'
         : currentTab === 'upload' ? 'Upload Customer Document'
         : 'My Documents'}
      </h1>

      {currentTab === 'dashboard' && renderDashboard()}
      {currentTab === 'users' && renderUsersTable()}
      {currentTab === 'create-user' && renderCreateUser()}
      {currentTab === 'my-documents' && renderMyDocuments()}
      {currentTab === 'upload' && renderUploadFlow()}

    </div>
  );
}
