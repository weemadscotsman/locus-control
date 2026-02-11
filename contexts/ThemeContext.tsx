import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getStorageService } from '../services/StorageService';

type SystemMode = 'work' | 'playground';

interface ThemeContextType {
    mode: SystemMode;
    toggleMode: () => void;
    setMode: (mode: SystemMode) => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};

const STORAGE_KEY = 'locus_mode';
const DEFAULT_MODE: SystemMode = 'work';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<SystemMode>(DEFAULT_MODE);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved theme on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                setIsLoading(true);
                const storage = getStorageService();
                const data = await storage.load();
                
                // Check storage service first
                if (data.settings?.theme) {
                    setModeState(data.settings.theme);
                    return;
                }
                
                // Fallback to localStorage for backward compatibility
                if (typeof window !== 'undefined') {
                    const saved = localStorage.getItem(STORAGE_KEY) as SystemMode;
                    if (saved && (saved === 'work' || saved === 'playground')) {
                        setModeState(saved);
                    }
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadTheme();
    }, []);

    // Persist theme when it changes
    useEffect(() => {
        if (isLoading) return;

        const saveTheme = async () => {
            try {
                // Save to storage service
                const storage = getStorageService();
                const data = await storage.load();
                await storage.save({
                    ...data,
                    settings: { ...data.settings, theme: mode }
                });

                // Also save to localStorage for backward compatibility
                if (typeof window !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY, mode);
                }

                // Apply theme to document for CSS selectors
                document.documentElement.setAttribute('data-theme', mode);
            } catch (error) {
                console.error('Failed to save theme:', error);
            }
        };

        saveTheme();
    }, [mode, isLoading]);

    const toggleMode = useCallback(() => {
        setModeState(prev => prev === 'work' ? 'playground' : 'work');
    }, []);

    const setMode = useCallback((newMode: SystemMode) => {
        setModeState(newMode);
    }, []);

    const value = useMemo(() => ({
        mode,
        toggleMode,
        setMode,
        isLoading
    }), [mode, toggleMode, setMode, isLoading]);

    return (
        <ThemeContext.Provider value={value}>
            <div className={`h-full w-full transition-colors duration-700 ease-in-out ${mode === 'playground' ? 'theme-playground scanlines' : 'theme-work'}`}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
