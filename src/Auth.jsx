import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Registration successful! You can now sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 font-sans p-4">
      
      <div className="w-full max-w-md p-8 bg-slate-800 border border-slate-700 shadow-2xl rounded-xl animate-[fadeIn_0.3s_ease-out]">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Echo Valley</h1>
          <p className="text-xs uppercase font-medium text-slate-400 mt-2 tracking-wider">Enterprise Access Portal</p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Corporate Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="auditor@echovalley.corp"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : (isSignUp ? 'Register Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need access? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
}