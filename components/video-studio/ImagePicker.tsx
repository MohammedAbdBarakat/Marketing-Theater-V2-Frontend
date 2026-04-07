"use client";

import { useRef, useState } from "react";
import { API_BASE } from "../../lib/config";

type PickerState = "idle" | "preview" | "generating";

interface ImagePickerProps {
  label?: string;
  projectId: string;
  runId: string;
  imageTag: string; // "character", "product", or "logo"
  onImageComplete?: (url: string) => void;
}

export default function ImagePicker({ label, projectId, runId, imageTag, onImageComplete }: ImagePickerProps) {
  const [state, setState] = useState<PickerState>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  /* ─── 1. UPLOAD LOGIC (Direct to S3 -> DB Register) ─── */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setState("generating"); // Show spinner during upload
    setError("");

    try {
      // A: Get presigned URL
      const presignRes = await fetch(`${API_BASE}/api/uploads/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, filename: file.name, type: file.type, size: file.size })
      });
      if (!presignRes.ok) throw new Error("Failed to secure upload URL.");
      const presignData = await presignRes.json();

      // B: Upload directly to S3
      const formData = new FormData();
      Object.entries(presignData.fields || {}).forEach(([key, val]) => {
        formData.append(key, val as string);
      });
      formData.append("file", file);

      const uploadRes = await fetch(presignData.url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Direct S3 upload failed.");

      // C: Register the URL in the Database
      const finalPublicUrl = presignData.publicUrl;
      const registerRes = await fetch(`${API_BASE}/api/projects/${projectId}/reference-images/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage_url: finalPublicUrl, image_tag: imageTag })
      });
      if (!registerRes.ok) throw new Error("Failed to register image in DB.");

      setImageUrl(finalPublicUrl);
      setState("preview");
      if (onImageComplete) onImageComplete(finalPublicUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed.");
      setState("idle");
    } finally {
      e.target.value = ""; // Reset input
    }
  };

  /* ─── 2. GENERATE LOGIC (Trigger Celery -> Listen to SSE) ─── */
  const handleGenerate = async () => {
    if (!prompt.trim()) { setError("Please describe the image."); return; }
    setError("");
    setState("generating");

    try {
      // A: Trigger backend Task
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/reference-images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, run_id: runId, image_tag: imageTag }),
      });
      if (!res.ok) throw new Error("Failed to start generation.");

      // B: Listen to SSE Stream
      const eventSource = new EventSource(`${API_BASE}/runs/${runId}/stream`);

      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);

        // Ensure the event matches THIS specific picker instance
        if (parsed.type === "reference_image_update" && parsed.data.tag === imageTag) {
          const { status, url, progress_message } = parsed.data;

          if (status === "completed") {
            setImageUrl(url);
            setState("preview");
            setModalOpen(false);
            setPrompt("");
            if (onImageComplete) onImageComplete(url);
            eventSource.close();
          }
          else if (status === "failed") {
            setError(progress_message || "Generation failed.");
            setState("idle");
            eventSource.close();
          }
        }
      };

      eventSource.onerror = () => {
        setError("Lost connection to server.");
        setState("idle");
        eventSource.close();
      };
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setState("idle");
    }
  };

  const discard = () => {
    setImageUrl(null);
    setState("idle");
    if (onImageComplete) onImageComplete("");
  };

  /* ─── 3. RENDER UI ─── */
  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">{label}</label>}

      <div className="relative aspect-square w-full min-w-[120px] bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition-colors">

        {state === "idle" && (
          <div className="flex flex-col h-full divide-y divide-gray-100">
            <div
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 group"
              onClick={() => { setError(""); setModalOpen(true); }}
            >
              <span className="material-symbols-outlined text-gray-400 group-hover:text-black mb-1">auto_awesome</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-black">Generate</span>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 group"
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-gray-400 group-hover:text-black mb-1">upload</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-black">Upload</span>
            </div>
          </div>
        )}

        {state === "preview" && imageUrl && (
          <div className="relative w-full h-full group">
            <img src={imageUrl} alt="Selected" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <button
                className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:scale-105"
                onClick={discard}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {state === "generating" && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-black mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-black">Processing...</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">Generate Reference</h3>
              <button onClick={() => setModalOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="A minimalist living room, cinematic lighting..."
              className="w-full border rounded-lg p-3 text-sm focus:ring-1 focus:ring-black h-24 resize-none"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            />
            {error && <div className="mt-3 text-[11px] text-red-500 bg-red-50 px-3 py-2 rounded border border-red-100">{error}</div>}
            <button
              className="mt-6 w-full bg-black text-white rounded-lg py-3 text-xs font-bold uppercase hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={handleGenerate} disabled={state === "generating"}
            >
              <span className="material-symbols-outlined">auto_awesome</span> Generate Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}