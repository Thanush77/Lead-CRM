import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('sales@apex.com');
  const [password, setPassword] = useState('sales'); 
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const success = await login(email, password);
    
    if (success) {
      navigate('/');
    } else {
      setError('Invalid email or password, or unable to connect to server.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
             <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto flex items-center justify-center mb-4">
                <span className="text-white font-bold text-3xl">A</span>
             </div>
             <h2 className="text-2xl font-bold text-white">Welcome to Apex CRM</h2>
             <p className="text-blue-100 mt-2">Sign in to manage your leads and pipeline.</p>
        </div>
        
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Email Address</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="name@company.com"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-700 block">Password</label>
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    {isSubmitting ? 'Authenticating...' : 'Sign In'}
                    {!isSubmitting && <ArrowRight size={18} className="ml-2" />}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-center text-xs text-gray-500 mb-3">Default credentials (created in Google Sheets):</p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => {setEmail('admin@apex.com'); setPassword('admin');}} className="text-xs bg-gray-50 hover:bg-gray-100 p-2 rounded text-gray-600 border border-gray-200">
                        Admin: admin / admin
                    </button>
                    <button onClick={() => {setEmail('sales@apex.com'); setPassword('sales');}} className="text-xs bg-gray-50 hover:bg-gray-100 p-2 rounded text-gray-600 border border-gray-200">
                        Sales: sales / sales
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;