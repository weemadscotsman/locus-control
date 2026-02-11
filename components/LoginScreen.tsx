
import React, { useState } from 'react';
import { CyberButton, CyberInput } from './ui/CyberControls';
import { ReactiveBackground } from './ReactiveBackground';

interface LoginScreenProps {
    onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsAuthenticating(true);
        setError(false);

        // Simulated Auth Check
        setTimeout(() => {
            // Any code works for now, or empty. It's about the "Gate" feel.
            setIsAuthenticating(false);
            onLogin();
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Background Layer - Dimmed */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
                <ReactiveBackground />
            </div>

            <div className="relative z-10 w-full max-w-md p-1">
                <div className="bg-[#0f1115]/90 border border-locus-border p-8 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group">
                    
                    {/* Decorative Scanline */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-locus-accent to-transparent opacity-50 animate-scanline" />

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white tracking-[0.2em] mb-2">IDENTITY VERIFICATION</h2>
                        <div className="text-xs text-gray-500 font-mono">SECURE SESSION GATEWAY</div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <CyberInput 
                                label="ACCESS CODE" 
                                type="password" 
                                value={code} 
                                onChange={(e) => { setCode(e.target.value); setError(false); }}
                                placeholder="••••••••" 
                                className="text-center tracking-[0.5em] font-bold text-lg"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-red-500 text-xs text-center font-mono animate-pulse">
                                ACCESS DENIED. INVALID CREDENTIALS.
                            </div>
                        )}

                        <CyberButton 
                            type="submit" 
                            variant="primary" 
                            className="w-full h-12 text-sm"
                            disabled={isAuthenticating}
                        >
                            {isAuthenticating ? 'AUTHENTICATING...' : 'INITIALIZE SYSTEM'}
                        </CyberButton>
                    </form>
                    
                    <div className="mt-6 flex justify-between text-[9px] text-gray-600 font-mono uppercase">
                        <span>Encrypted: AES-256</span>
                        <span>Node: LOCUS-MASTER</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
