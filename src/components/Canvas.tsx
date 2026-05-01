import React, { useState, useEffect, useRef, useCallback } from "react";
import { LogOut, Plus, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { API_BASE_URL, getAuthHeaders } from "../api";
import { CanvasElement, NoteElement } from "./CanvasElement";

interface CanvasProps {
  username: string;
  onLogout: () => void;
}

export function Canvas({ username, onLogout }: CanvasProps) {
  const [elements, setElements] = useState<NoteElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notes`, {
          headers: getAuthHeaders(),
        });
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid response from server: ${text.substring(0, 50)}...`);
        }
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch notes");
        }
        
        setElements(data.elements || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, []);

  // Auto save with debounce
  const triggerAutoSave = useCallback((newElements: NoteElement[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ elements: newElements }),
        });
        if (!response.ok) {
          const text = await response.text();
          let errorMessage = "Failed to save notes";
          try {
            const data = JSON.parse(text);
            errorMessage = data.error || errorMessage;
          } catch (e) {
            if (response.status === 413 || text.includes("Entity Too Large") || text.includes("Too Large")) {
              errorMessage = "Image or note is too large to save (max 1MB). Please use a smaller image.";
            } else {
              errorMessage = `Server Error (${response.status}): ${text.substring(0, 50)}...`;
            }
          }
          setError("Save failed: " + errorMessage);
          return;
        }
      } catch (err: any) {
        setError("Save failed: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1s debounce
  }, []);

  const addTextElement = () => {
    const maxZIndex = Math.max(...elements.map(e => e.zIndex || 1), 0);
    const newElement: NoteElement = {
      id: Date.now().toString(),
      type: "text",
      content: "",
      x: window.innerWidth / 2 - 100, // Roughly center
      y: window.innerHeight / 2 - 100,
      width: 200,
      height: 150,
      zIndex: maxZIndex + 1,
    };
    const updated = [...elements, newElement];
    setElements(updated);
    triggerAutoSave(updated);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 800; // compress to max 800px width/height
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = (height / width) * MAX_SIZE;
              width = MAX_SIZE;
            } else {
              width = (width / height) * MAX_SIZE;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject("No context");
          
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.8;
          let mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
          if (file.type === "image/webp") mimeType = "image/webp";
          
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addImageElement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB upload limit
      setError("File size should be less than 10MB");
      return;
    }

    try {
      setIsLoading(true);
      const base64Content = await compressImage(file);
      const maxZIndex = Math.max(...elements.map(e => e.zIndex || 1), 0);
      const newElement: NoteElement = {
        id: Date.now().toString(),
        type: "image",
        content: base64Content,
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 150,
        width: 300,
        height: 300,
        zIndex: maxZIndex + 1,
      };
      const updated = [...elements, newElement];
      setElements(updated);
      triggerAutoSave(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to process image");
    } finally {
      setIsLoading(false);
    }
    
    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addStickerElement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB upload limit
      setError("File size should be less than 10MB");
      return;
    }

    try {
      setIsLoading(true);
      // For stickers, keep transparency. Usually it's PNG
      const base64Content = await compressImage(file);
      const maxZIndex = Math.max(...elements.map(e => e.zIndex || 1), 0);
      const newElement: NoteElement = {
        id: Date.now().toString(),
        type: "sticker",
        content: base64Content,
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 150,
        width: 300,
        height: 300,
        zIndex: maxZIndex + 1,
      };
      const updated = [...elements, newElement];
      setElements(updated);
      triggerAutoSave(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to process sticker");
    } finally {
      setIsLoading(false);
    }
    
    // reset file input
    if (stickerInputRef.current) {
      stickerInputRef.current.value = "";
    }
  };

  const handleBringForward = useCallback((id: string) => {
    setElements((prev) => {
      const maxZIndex = Math.max(...prev.map(e => e.zIndex || 1), 0);
      const updated = prev.map(e => e.id === id ? { ...e, zIndex: maxZIndex + 1 } : e);
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  const handleSendBackward = useCallback((id: string) => {
    setElements((prev) => {
      const minZIndex = Math.min(...prev.map(e => e.zIndex || 1), 2);
      const updated = prev.map(e => e.id === id ? { ...e, zIndex: minZIndex - 1 } : e);
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  const updateElement = useCallback((id: string, updates: Partial<NoteElement>) => {
    setElements((prevElements) => {
      const updated = prevElements.map((el) => (el.id === id ? { ...el, ...updates } : el));
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  const deleteElement = useCallback((id: string) => {
    setElements((prevElements) => {
      const updated = prevElements.filter((el) => el.id !== id);
      triggerAutoSave(updated);
      return updated;
    });
  }, [triggerAutoSave]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0A0A] text-white">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 z-50 flex flex-wrap items-center justify-between border-b border-white/10 p-3 sm:p-4 gap-3 sm:gap-4 text-white backdrop-blur bg-[#0A0A0A]/90">
        
        {/* Left Side: Brand and Actions */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 flex-grow lg:flex-grow-0">
          {/* Brand */}
          <div className="flex items-baseline gap-2">
            <h1 className="bold-title text-2xl sm:text-3xl uppercase">KARAMEL<span className="text-blue-500">NOTE</span></h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={addTextElement}
              className="flex items-center justify-center gap-2 bg-white px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-blue-500 hover:text-white border border-white whitespace-nowrap flex-shrink-0"
            >
              <Plus size={14} className="sm:w-4 sm:h-4 w-3 h-3" /> Add Text
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 border border-white/20 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white whitespace-nowrap flex-shrink-0"
            >
              <ImageIcon size={14} className="sm:w-4 sm:h-4 w-3 h-3" /> Add Image
            </button>
            <button
              onClick={() => stickerInputRef.current?.click()}
              className="flex items-center justify-center gap-2 border border-white/20 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white transition-colors hover:border-white whitespace-nowrap flex-shrink-0"
              title="Add Transparent PNG or Sticker"
            >
              <Sparkles size={14} className="sm:w-4 sm:h-4 w-3 h-3" /> Add Sticker
            </button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={addImageElement}
            />
            <input
              type="file"
              accept="image/png,image/svg+xml,image/gif,image/webp"
              className="hidden"
              ref={stickerInputRef}
              onChange={addStickerElement}
            />
          </div>
        </div>

        {/* Right Side: Status and User */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 flex-grow lg:flex-grow-0 ml-auto">
          <div className="flex items-center gap-2">
            {error && <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 whitespace-nowrap">{error}</span>}
            {isSaving && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap"><Loader2 size={12} className="animate-spin" /> <span className="hidden sm:inline">Saving</span></span>}
            {!isSaving && elements.length > 0 && <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 whitespace-nowrap">Saved</span>}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-[10px] sm:text-xs uppercase font-bold text-white/50 whitespace-nowrap">User // <span className="text-white truncate max-w-[100px] inline-block align-bottom">{username}</span></div>
            <button
              onClick={onLogout}
              className="flex items-center justify-center border border-white/10 p-2 text-white/50 hover:text-white hover:border-white transition-colors flex-shrink-0"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Infinite Canvas Environment Container */}
      <div className="canvas-grid relative flex-grow w-full overflow-auto">
        <div className="relative min-w-[3000px] min-h-[3000px] h-full">
          {elements.length === 0 && (
            <div className="pointer-events-none absolute left-0 top-0 flex h-[calc(100vh-100px)] w-screen items-center justify-center">
              <p className="bold-title text-center text-xl sm:text-3xl opacity-20 text-white px-4">Click "Add Text" to start your canvas.</p>
            </div>
          )}
          {elements.map((el) => (
            <CanvasElement
              key={el.id}
              element={el}
              onUpdate={updateElement}
              onDelete={deleteElement}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
