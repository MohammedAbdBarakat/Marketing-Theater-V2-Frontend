"use client";

import { useRef, useState, useCallback } from "react";

/* ─── types ─────────────────────────────────────────────── */
type PickerState = "idle" | "preview" | "generating";

interface ImagePickerProps {
  label?: string;
  onImageComplete?: (url: string) => void;
}

/* ─── component ──────────────────────────────────────────── */
export default function ImagePicker({ label = "Character", onImageComplete }: ImagePickerProps) {
  const [state, setState] = useState<PickerState>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef(false);

  /* upload handler (Mocked for UI preview) */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setState("preview");
    if (onImageComplete) onImageComplete(url);
  }, [onImageComplete]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragRef.current = false;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  /* generate handler (Mocked for UI preview) */
  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Please describe the image."); return; }
    setError("");
    setState("generating");

    try {
      // Mocking the API call for the UI
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed.");
      
      const generatedUrl = `data:image/png;base64,${data.image}`;
      setImageUrl(generatedUrl);
      setState("preview");
      setModalOpen(false);
      setPrompt("");
      if (onImageComplete) onImageComplete(generatedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  };

  const discard = () => {
    if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setState("idle");
    if (onImageComplete) onImageComplete("");
  };

  return (
    <div className="space-y-2">
      {/* Optional Label matching SetupPhase */}
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
          {label}
        </label>
      )}

      <div className="relative aspect-square w-full min-w-[120px] bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition-colors">
        
        {/* ── IDLE STATE ── */}
        {state === "idle" && (
          <div className="flex flex-col h-full divide-y divide-gray-100">
            {/* Generate Button */}
            <div
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
              onClick={() => { setError(""); setModalOpen(true); }}
            >
              <span className="material-symbols-outlined text-gray-400 group-hover:text-black transition-colors mb-1">
                auto_awesome
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-black transition-colors">
                Generate
              </span>
            </div>

            {/* Upload Button */}
            <div
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); dragRef.current = true; }}
              onDrop={onDrop}
            >
              <span className="material-symbols-outlined text-gray-400 group-hover:text-black transition-colors mb-1">
                upload
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-black transition-colors">
                Upload
              </span>
            </div>
          </div>
        )}

        {/* ── PREVIEW STATE ── */}
        {state === "preview" && imageUrl && (
          <div className="relative w-full h-full group">
            <img src={imageUrl} alt="Selected" className="w-full h-full object-cover" />
            
            {/* Discard Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <button 
                className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-transform hover:scale-105"
                onClick={discard} 
                aria-label="Remove image"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* ── GENERATING STATE ── */}
        {state === "generating" && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
             <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-black mb-3" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                Generating...
             </span>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* ── MODAL ── */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">Generate Reference</h3>
              <button 
                className="text-gray-400 hover:text-black transition-colors flex items-center justify-center"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
              Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A minimalist living room, cinematic lighting..."
              className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-black focus:border-black resize-none placeholder:text-gray-300 text-gray-900 h-24 custom-scrollbar"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            />

            {error && (
              <div className="mt-3 text-[11px] font-medium text-red-500 bg-red-50 px-3 py-2 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <button
              className="mt-6 w-full bg-black text-white rounded-lg py-3 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleGenerate}
              disabled={state === "generating"}
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Generate Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}