
import React, { useState } from 'react';
import { useScene, Scene } from '../contexts/SceneContext';
import { CyberCard, CyberInput, CyberButton } from './ui/CyberControls';

export const SceneManager: React.FC = () => {
    const { scenes, saveScene, loadScene, deleteScene, exportScenes } = useScene();
    const [newName, setNewName] = useState('');

    const handleSave = () => {
        if (!newName.trim()) return;
        saveScene(newName);
        setNewName('');
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleString();

    return (
        <div className="h-full flex flex-col gap-4 p-1 overflow-y-auto custom-scrollbar">
            <CyberCard title="Session Persistence">
                <div className="flex gap-2 items-end mb-4">
                    <div className="flex-1">
                        <CyberInput 
                            label="New Snapshot Name" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Opening Act V1"
                            className="mb-0"
                        />
                    </div>
                    <div className="mb-[1px]">
                        <CyberButton onClick={handleSave} disabled={!newName}>
                            SAVE STATE
                        </CyberButton>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {scenes.length === 0 && (
                        <div className="text-center py-8 text-gray-600 text-xs italic border border-dashed border-gray-800 rounded">
                            NO SAVED SCENES
                        </div>
                    )}
                    
                    {scenes.map((scene) => (
                        <div key={scene.id} className="bg-locus-bg border border-locus-border p-2 rounded flex justify-between items-center group hover:border-locus-accent transition-colors">
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-xs text-locus-textLight truncate">{scene.name}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{formatDate(scene.timestamp)}</span>
                            </div>
                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => loadScene(scene.id)} 
                                    className="px-2 py-1 bg-locus-accent text-white text-[10px] font-bold rounded hover:bg-white hover:text-black"
                                >
                                    LOAD
                                </button>
                                <button 
                                    onClick={() => deleteScene(scene.id)} 
                                    className="px-2 py-1 bg-red-900/50 text-red-400 text-[10px] rounded hover:bg-red-600 hover:text-white"
                                >
                                    DEL
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-locus-border flex justify-end">
                    <CyberButton variant="outline" size="sm" onClick={exportScenes}>
                        EXPORT JSON
                    </CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};
