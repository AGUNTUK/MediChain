import React, { useState, useRef } from "react";
import { Camera, Upload, X, Send, Image as ImageIcon, FileText } from "lucide-react";
import { apiFetch } from "../lib/apiFetch";

interface Props {
  onClose: () => void;
}

export default function PhysiciansProductSheet({ onClose }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (files.length === 0) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      
      const res = await apiFetch("/api/physicians-product-request", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary
        headers: {
          // Remove default application/json
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send request");
      }
      
      setSendSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
      
    } catch (err: any) {
      setSendError(err.message || "Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up pb-safe">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Physicians Product</h2>
            <p className="text-sm font-medium text-brand-purple">ফিজিসিয়ানস্ প্রোডাক্ট</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {sendSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Request Sent!</h3>
              <p className="text-slate-600">Our team will contact you shortly.</p>
              <p className="text-sm font-medium text-slate-500 mt-1">আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।</p>
            </div>
          ) : (
            <>
              {/* Info Banner */}
              <div className="bg-brand-purple/5 border border-brand-purple/10 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-bold text-brand-purple block mb-1">Pricing & Discounts: 25% - 55%</span>
                  Upload your physician's product list or prescription. Final pricing and availability will be confirmed by our team after review.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-700">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Take Photo</span>
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors"
                >
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-700">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Upload File</span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileChange}
                multiple
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
              />

              {/* File Preview */}
              {files.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Selected Files ({files.length})</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative flex-none w-20 snap-start">
                        <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                          {file.type.startsWith("image/") ? (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt="preview" 
                              className="w-full h-full object-cover"
                              onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] text-center mt-1 text-slate-500 truncate px-1">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {sendError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-2">
                  <span className="font-bold">Error:</span>
                  <span>{sendError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSend}
                disabled={files.length === 0 || isSending}
                className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  files.length === 0 || isSending
                    ? "bg-slate-300 shadow-none cursor-not-allowed"
                    : "bg-gradient-to-r from-brand-purple to-purple-600 hover:opacity-90 shadow-brand-purple/25 hover:shadow-brand-purple/40"
                }`}
              >
                {isSending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send to Place Order</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
