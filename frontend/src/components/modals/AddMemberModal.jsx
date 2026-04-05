import { useState } from 'react';
import api from '../../services/api';
import { toast } from '../Toast';
import { useAuth } from '../../context/AuthContext';

export default function AddMemberModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [role, setRole] = useState('VOLUNTEER');
  const [sameCollege, setSameCollege] = useState(false);
  const [studentCollegeName, setStudentCollegeName] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setStudent(null);
    try {
      const res = await api.get(`/api/club/search-student?q=${query}`);
      if (res.data.student && res.data.student.id === user.id) {
          setError("You cannot assign a role to yourself.");
          setStudent(null);
          return;
      }
      setStudent(res.data.student);
      setSameCollege(res.data.sameCollege);
      setStudentCollegeName(res.data.student?.college_name || 'Another college');
      setRole('VOLUNTEER');
    } catch (e) {
      setError(e.response?.data?.message || 'Student not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!student) return;
    setLoading(true);
    try {
      await api.post('/api/club/roles/assign', { studentId: student.id, role });
      toast('Success!', 'success');
      onSuccess();
    } catch (e) {
      toast(e.response?.data?.message || 'Action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] animate-slideUp sm:animate-fadeIn pb-12 sm:pb-8">
        <div className="absolute top-0 right-0 p-4">
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </div>

        <h2 className="text-white font-bold text-xl mb-2 italic uppercase tracking-tighter">Add to Club</h2>
        <p className="text-slate-500 text-xs mb-6">Search student by Email or ID Number</p>

        <div className="flex gap-2 mb-6">
          <input
            autoFocus
            type="text"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none"
            placeholder="Email or Student ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="px-6 bg-white text-slate-950 font-bold rounded-2xl text-xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[100px]"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

        {student && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`border p-4 rounded-2xl ${
              sameCollege ? 'bg-slate-800/50 border-slate-700' : 'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-white font-bold">{student.name}</p>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  sameCollege ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'
                }`}>
                  {sameCollege ? 'Same College' : 'Different College'}
                </span>
              </div>
              <p className="text-slate-500 text-xs">{student.email}</p>
            </div>

            {!sameCollege ? (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                <p className="text-red-400 text-xs leading-relaxed font-medium">
                  ⚠️ <strong>Action Blocked:</strong> {student.name} is from {studentCollegeName}. 
                  You can only assign roles to students from your own college.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">Select Role</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-all font-bold"
                >
                  <option value="VOLUNTEER">🙋 Volunteer</option>
                  <option value="STUDENT_COORDINATOR">👥 Student Coordinator</option>
                </select>
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={loading || !sameCollege}
              className={`w-full py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-[0.98] ${
                !sameCollege 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
              }`}
            >
              {loading ? 'Processing...' : 'Assign Role'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
