import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Brain } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await register(name, email, password);
        if (result.success) {
            navigate('/login');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Neon Orbs */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-[#FF00FF]/5 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-20 right-20 w-80 h-80 bg-[#00FFFF]/5 rounded-full blur-[100px]"></div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-[#00FFFF] to-[#FF00FF] rounded-2xl shadow-[0_0_30px_#FF00FF] mb-4 animate-float">
                        <Brain className="w-10 h-10 text-[#0A0A0F]" />
                    </div>
                    <h1 className="text-4xl font-bold gradient-text">Manovyavastha</h1>
                    <p className="text-[#888] mt-2">Create your account</p>
                </div>

                <div className="glass-card p-8">
                    <h2 className="text-2xl font-semibold text-center mb-6">Get Started</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[#AAA] mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#FF00FF]" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-neon pl-10"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#AAA] mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#FF00FF]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-neon pl-10"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#AAA] mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#FF00FF]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-neon pl-10"
                                    placeholder="Min 6 characters"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-magenta py-3 disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-[#888] mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#FF00FF] hover:text-[#00FFFF] transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}