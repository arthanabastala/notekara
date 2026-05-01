import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X } from "lucide-react";

interface IconPickerProps {
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

export function IconPicker({ onSelect, onClose }: IconPickerProps) {
  const [search, setSearch] = useState("");

  // Filter valid icon components. They start with an uppercase letter and are functions or objects.
  const allIcons = useMemo(() => {
    return Object.keys(LucideIcons).filter((key) => {
      // Exclude non-icons or utility functions
      if (key === "createLucideIcon" || key === "LucideProps" || !/^[A-Z]/.test(key)) {
        return false;
      }
      return true;
    });
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return allIcons.slice(0, 100); // show 100 initially for performance
    const lowerSearch = search.toLowerCase();
    return allIcons.filter(name => name.toLowerCase().includes(lowerSearch)).slice(0, 100);
  }, [search, allIcons]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#0A0A0A] border border-white/20 w-full max-w-2xl rounded shadow-2xl flex flex-col h-[80vh]">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search size={20} className="text-white/50" />
          <input 
            type="text"
            className="flex-grow bg-transparent text-white outline-none font-sans placeholder-white/50"
            placeholder="Search aesthetic icons (e.g., star, heart, sparkle...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
          {filteredIcons.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/50 text-sm font-bold uppercase tracking-widest">
              No icons found
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
              {filteredIcons.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                if (!IconComponent) return null;
                return (
                  <button
                    key={iconName}
                    onClick={() => onSelect(iconName)}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-white/5 rounded hover:bg-white/10 hover:border-white/20 transition-all group"
                    title={iconName}
                  >
                    <IconComponent size={24} className="text-white/70 group-hover:text-white transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
