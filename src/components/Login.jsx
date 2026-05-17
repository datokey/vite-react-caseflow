import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sukses, setSukses] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSukses('');

    const hasil = await login(email, password);
    
    if (hasil.success) {
      setSukses('Selamat, login berhasil menggunakan HttpOnly Cookie!');
      // Di sini kamu bisa arahkan user ke dashboard menggunakan useNavigate() dari react-router-dom
    } else {
      setError(hasil.error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow-md border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Login Akun</h2>
      
      {error && <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>}
      {sukses && <div className="mb-4 p-3 text-sm text-emerald-600 bg-emerald-50 rounded-xl">{sukses}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
            required
          />
        </div>
        <button 
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          Masuk
        </button>
      </form>
    </div>
  );
};

export default Login;