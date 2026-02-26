
import React, { createContext, useContext, useState, useEffect } from 'react';

type SystemMode = 'work' | 'playground';

interface ThemeContextType {
    mode: SystemMode;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<SystemMode>('work');

    const toggleMode = () => {
        setMode(prev => prev === 'work' ? 'playground' : 'work');
    };

    return (
        <ThemeContext.Provider value={{ mode, toggleMode }}>
            <div className={mode === 'playground' ? 'theme-playground scanlines' : 'theme-work'}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
