import React, { useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";
import { Trash2, Plus, Minus, Eraser, Move } from "lucide-react";
import * as LucideIcons from "lucide-react";

export type ElementType = "text" | "image" | "icon" | "sticker";

export interface NoteElement {
  id: string;
  type: ElementType;
  title?: string;
  content: string; // for text it's the text, for image it's the base64 URL
  originalContent?: string;
  color?: string;
  fontSize?: number;
  showCaption?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

interface CanvasElementProps {
  element: NoteElement;
  onUpdate: (id: string, updates: Partial<NoteElement>) => void;
  onDelete: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  // Let parent know when we are dragging/resizing so we can prevent zooming or other interactions if needed
}

export function CanvasElement({ element, onUpdate, onDelete, onBringForward, onSendBackward }: CanvasElementProps) {
  const isImage = element.type === "image";
  const isIcon = element.type === "icon";
  const isSticker = element.type === "sticker";
  const bgColor = element.color || (element.type === "image" ? "bg-white" : "bg-yellow-300");
  const fontSize = element.fontSize || 16;
  const titleSize = fontSize * 1.125;
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const initialTouchDistance = useRef<number | null>(null);
  const initialStickerSize = useRef<{ w: number; h: number } | null>(null);

  const presetColors = [
    "bg-yellow-300",
    "bg-green-300",
    "bg-blue-300",
    "bg-pink-300",
    "bg-purple-300",
  ];

  const iconColors = [
    "bg-red-800",
    "bg-black",
    "bg-blue-900",
    "bg-green-900",
    "bg-purple-900",
  ];

  const handleRemoveBackground = async () => {
    if (!element.content || isRemovingBg) return;
    
    if (element.originalContent) {
      onUpdate(element.id, {
        content: element.originalContent,
        originalContent: ""
      });
      return;
    }

    setIsRemovingBg(true);
    
    try {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      
      const newContent = await new Promise<string>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 800;
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
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Determine background color by checking corners
          const corners = [
            0, // top-left
            (width - 1) * 4, // top-right
            (height - 1) * width * 4, // bottom-left
            ((height - 1) * width + (width - 1)) * 4 // bottom-right
          ];

          let bgR = 255, bgG = 255, bgB = 255; // Default white
          for (let corner of corners) {
            if (data[corner + 3] > 0) { // If not transparent
              bgR = data[corner];
              bgG = data[corner + 1];
              bgB = data[corner + 2];
              break;
            }
          }
          
          const tolerance = 45; // slightly higher tolerance
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a > 0 && Math.abs(r - bgR) < tolerance && Math.abs(g - bgG) < tolerance && Math.abs(b - bgB) < tolerance) {
              data[i + 3] = 0; // make transparent
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = element.content;
      });

      onUpdate(element.id, {
        originalContent: element.content,
        content: newContent
      });
    } catch (e) {
      console.error("Failed to remove background", e);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent | TouchEvent) => {
    if (isSticker && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistance.current = dist;
      initialStickerSize.current = { w: element.width, h: element.height };
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (isSticker && e.touches.length === 2 && initialTouchDistance.current && initialStickerSize.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / initialTouchDistance.current;
      
      onUpdate(element.id, {
        width: Math.max(50, initialStickerSize.current.w * scale),
        height: Math.max(50, initialStickerSize.current.h * scale)
      });
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistance.current = null;
    initialStickerSize.current = null;
  };

  return (
    <Rnd
      style={{ zIndex: element.zIndex || 1 }}
      default={{
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      }}
      position={{ x: element.x, y: element.y }}
      size={{ width: element.width, height: element.height }}
      onDragStop={(e, d) => {
        onUpdate(element.id, { x: d.x, y: d.y });
      }}
      dragHandleClassName="drag-handle"
      cancel="input, textarea, button, .resize-handle"
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate(element.id, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
      }}
      bounds="parent"
      className={`group absolute flex flex-col ${(isIcon || isSticker) ? 'bg-transparent' : `node-card element-shadow ${bgColor} border-2 border-transparent hover:border-black/10`} ${(isIcon || isSticker) ? 'text-white' : 'text-black'} transition-colors ${isSticker ? '' : 'drag-handle cursor-move'}`}
      resizeHandleComponent={(isImage || isIcon || isSticker) ? undefined : {
        bottomRight: <div className="resize-handle" />
      }}
      enableResizing={(isImage || isIcon || isSticker) ? { top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true } : { top: false, right: false, bottom: false, left: false, topRight: false, bottomRight: true, bottomLeft: false, topLeft: false }}
    >
      <div className="absolute -left-3 -top-3 z-30 flex opacity-100 sm:opacity-0 sm:pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-200">
        <div 
          className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center bg-white text-black border border-black/10 rounded-full shadow-md cursor-move drag-handle hover:bg-gray-100 transition-colors"
          title="Move"
          onTouchStart={(e) => e.stopPropagation()} /* Let react-rnd handle the touch start for dragging here */
        >
          <Move size={14} />
        </div>
      </div>

      <div className="absolute -right-3 -top-3 z-20 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-200">
        <button
          onClick={() => onBringForward(element.id)}
          className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center bg-black text-white outline-none hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
          title="Bring Forward"
          onTouchStart={(e) => { e.stopPropagation(); }}
        >
          <span className="text-sm font-bold">↑</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSendBackward(element.id); }}
          className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center bg-black text-white outline-none hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
          title="Send Backward"
          onTouchStart={(e) => { e.stopPropagation(); }}
        >
          <span className="text-sm font-bold">↓</span>
        </button>
        {isSticker && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveBackground();
            }}
            onTouchStart={(e) => { e.stopPropagation(); }}
            className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center ${element.originalContent ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black hover:bg-gray-800'} text-white outline-none transition-colors shadow-sm cursor-pointer ${isRemovingBg ? 'opacity-50 pointer-events-none' : ''}`}
            title={element.originalContent ? "Restore Background" : "Remove Background"}
          >
            <Eraser size={14} className={isRemovingBg ? "animate-pulse" : ""} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
          className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center bg-black text-white outline-none hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
          title="Delete"
          onTouchStart={(e) => { e.stopPropagation(); }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {element.type === "text" ? (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 flex flex-col opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-200 pt-3 cursor-default">
          <div className="bg-white px-2 py-1.5 shadow-md border border-black/10 items-center justify-center rounded flex flex-col gap-1">
            <div className="flex gap-2">
            {presetColors.map((colorClass) => (
              <button
                key={colorClass}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(element.id, { color: colorClass })
                }}
                className={`h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded-full border border-black/20 ${colorClass} hover:ring-2 hover:ring-black/30 transition-shadow`}
              />
            ))}
          </div>
          <div className="w-full h-[1px] bg-black/10 my-0.5" />
          <div className="flex gap-4 w-full justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(element.id, { fontSize: Math.max(10, fontSize - 2) })
              }}
              className="flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(element.id, { fontSize: Math.min(48, fontSize + 2) })
              }}
              className="flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          </div>
        </div>
      ) : isIcon ? (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 flex flex-col opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-200 pt-3 cursor-default">
          <div className="bg-white px-2 py-1.5 shadow-md border border-black/10 items-center justify-center rounded flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                 onClick={(e) => {
                   e.stopPropagation();
                   onUpdate(element.id, { color: 'bg-white' })
                 }}
                 className="h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded-full border border-black/20 bg-white hover:ring-2 hover:ring-black/30 transition-shadow"
              />
              {iconColors.map((colorClass) => (
                <button
                  key={colorClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(element.id, { color: colorClass })
                  }}
                  className={`h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded-full border border-black/20 ${colorClass} hover:ring-2 hover:ring-black/30 transition-shadow`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 flex flex-col opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-200 pt-3 cursor-default">
          <div className="bg-white px-3 py-1.5 shadow-md border border-black/10 items-center justify-center rounded flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer text-[10px] whitespace-nowrap font-bold uppercase tracking-wider text-black pb-1 border-b border-black/10 w-full justify-center">
            <input 
              type="checkbox"
              className="cursor-pointer"
              checked={element.showCaption || false}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate(element.id, { showCaption: e.target.checked });
              }}
            />
            Show Caption
          </label>
          {element.showCaption && (
            <div className="flex flex-col gap-2 pt-1 w-full items-center">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(element.id, { color: 'bg-white' })
                  }}
                  className={`h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded-full border border-black/20 bg-white hover:ring-2 hover:ring-black/30 transition-shadow`}
                />
                {presetColors.map((colorClass) => (
                  <button
                    key={colorClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(element.id, { color: colorClass })
                    }}
                    className={`h-5 w-5 sm:h-4 sm:w-4 cursor-pointer rounded-full border border-black/20 ${colorClass} hover:ring-2 hover:ring-black/30 transition-shadow`}
                  />
                ))}
              </div>
              <div className="w-full h-[1px] bg-black/10" />
              <div className="flex gap-4 w-full justify-center pb-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(element.id, { fontSize: Math.max(10, fontSize - 2) })
                  }}
                  className="flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center text-black/50 hover:text-black transition-colors"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(element.id, { fontSize: Math.min(48, fontSize + 2) })
                  }}
                  className="flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center text-black/50 hover:text-black transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {!isIcon && !isSticker && (
        <div className="flex h-6 w-full flex-shrink-0 items-center justify-between border-b-2 border-black/5 bg-black/5 opacity-50 sm:opacity-0 transition-opacity group-hover:opacity-100 px-2 pointer-events-none">
          <span className="text-[8px] sm:text-[10px] font-black uppercase opacity-50 pointer-events-none">ID: #{element.id.slice(-4)}</span>
        </div>
      )}

      <div className="flex-grow w-full overflow-hidden">
        {isSticker ? (
          <div 
            className="flex items-center justify-center w-full h-full"
            onTouchStart={handleTouchStart as any}
            onTouchMove={handleTouchMove as any}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={element.content}
              alt="Uploaded sticker"
              className="w-full h-full object-contain pointer-events-none"
              draggable="false"
            />
          </div>
        ) : isImage ? (
          <div className="flex h-full w-full flex-col">
            <div className={`flex-grow min-h-0 w-full ${bgColor} relative`}>
              <img
                src={element.content}
                alt="Uploaded note element"
                className="h-full w-full object-cover"
                draggable="false"
              />
            </div>
            {element.showCaption && (
              <div className={`flex-shrink-0 border-t-2 border-black/5 ${bgColor} p-2`}>
                <input
                  className={`w-full bg-transparent outline-none font-bold placeholder-black/40 text-center text-black font-high-spirited tracking-wide`}
                  style={{ fontSize: `${fontSize}px` }}
                  value={element.title || ""}
                  onChange={(e) => onUpdate(element.id, { title: e.target.value })}
                  placeholder="Type a caption..."
                />
              </div>
            )}
          </div>
        ) : isIcon ? (
          (() => {
            const IconComponent = (LucideIcons as any)[element.content];
            const iconColorClass = element.color && element.color.startsWith('bg-') 
              ? element.color.replace('bg-', 'text-') 
              : 'text-white';
            return (
              <div className="flex items-center justify-center w-full h-full px-6 py-6 pb-8">
                {IconComponent ? <IconComponent className={`w-full h-full ${iconColorClass} overflow-visible`} strokeWidth={1.5} style={{ filter: "url(#paper-cutout-filter)" }} /> : <span className="text-white">?</span>}
              </div>
            );
          })()
        ) : (
          <div className="flex h-full w-full flex-col">
            <input
              className={`w-full bg-transparent p-3 pb-1 outline-none font-bold placeholder-black/40 text-black font-sans`}
              style={{ fontSize: `${titleSize}px` }}
              value={element.title || ""}
              onChange={(e) => onUpdate(element.id, { title: e.target.value })}
              placeholder="Title..."
            />
            <textarea
              className={`flex-grow w-full resize-none bg-transparent px-3 pb-3 outline-none font-normal leading-relaxed placeholder-black/40 text-black font-sans`}
              style={{ fontSize: `${fontSize}px` }}
              value={element.content}
              onChange={(e) => onUpdate(element.id, { content: e.target.value })}
              placeholder="Description..."
            />
          </div>
        )}
      </div>
    </Rnd>
  );
}
