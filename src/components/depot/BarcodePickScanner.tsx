import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Camera, CameraOff, Scan, CheckCircle2, AlertTriangle, X, 
  ArrowRight, ShieldAlert, KeyRound, RefreshCw, Barcode, Check
} from "lucide-react";
import { 
  getBarcodeForProduct, 
  playScanSuccessSound, 
  playScanErrorSound 
} from "./depotUtils";

export type VerificationStatus = "scanned" | "override" | "unverified";

export interface ScanVerificationResult {
  status: VerificationStatus;
  scannedCode: string;
  expectedCode: string;
  timestamp: string;
}

interface BarcodePickScannerProps {
  isOpen: boolean;
  product: {
    id: string;
    name: string;
    strength?: string;
    packSize?: string;
    shelfLocation?: string;
    barcode?: string;
  };
  onClose: () => void;
  onVerified: (result: ScanVerificationResult) => void;
}

export default function BarcodePickScanner({
  isOpen,
  product,
  onClose,
  onVerified
}: BarcodePickScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResultState, setScanResultState] = useState<"idle" | "matched" | "mismatched">("idle");
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [showOverridePrompt, setShowOverridePrompt] = useState(false);
  const [overridePin, setOverridePin] = useState("");
  const [overrideError, setOverrideError] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "wms-barcode-scanner-viewport";

  const { barcode: expectedBarcode, isRegistered } = getBarcodeForProduct(
    product.id,
    product.barcode
  );

  // Clean up camera on unmount or close
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setScanResultState("idle");
      setLastScannedCode("");
      setManualCode("");
      setShowOverridePrompt(false);
      setOverridePin("");
      setOverrideError(false);
      // Auto-start camera after slight mount delay
      const t = setTimeout(() => {
        startCameraScanner();
      }, 300);
      return () => clearTimeout(t);
    } else {
      stopCameraScanner();
    }
  }, [isOpen, product.id]);

  const startCameraScanner = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCameraScanner();
      }

      const qr = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qr;

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.333
        },
        (decodedText) => {
          handleProcessBarcode(decodedText);
        },
        () => {
          // Ignore frequent scan misses
        }
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start failed, falling back to manual barcode entry:", err);
      setCameraError(err.message || "Camera access not allowed or unavailable in this window. Use the barcode gun/manual input below.");
      setIsCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (e) {
      // Ignore cleanup error
    }
    setIsCameraActive(false);
  };

  const handleProcessBarcode = (scannedRaw: string) => {
    const cleanScanned = scannedRaw.trim();
    if (!cleanScanned) return;

    setLastScannedCode(cleanScanned);

    // Matching logic: compare against expectedBarcode or productId
    const isMatch =
      cleanScanned.toLowerCase() === expectedBarcode.toLowerCase() ||
      cleanScanned.toLowerCase() === product.id.toLowerCase() ||
      cleanScanned.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ===
        expectedBarcode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    if (isMatch) {
      playScanSuccessSound();
      setScanResultState("matched");
      stopCameraScanner();
      setTimeout(() => {
        onVerified({
          status: "scanned",
          scannedCode: cleanScanned,
          expectedCode: expectedBarcode,
          timestamp: new Date().toISOString()
        });
      }, 700);
    } else {
      playScanErrorSound();
      setScanResultState("mismatched");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessBarcode(manualCode.trim());
  };

  const handleManagerOverride = () => {
    // Standard Depot Manager Override PIN is 9999 or admin password
    if (overridePin.trim() === "9999" || overridePin.trim().toLowerCase() === "admin") {
      playScanSuccessSound();
      stopCameraScanner();
      onVerified({
        status: "override",
        scannedCode: lastScannedCode || "MANAGER-OVERRIDE",
        expectedCode: expectedBarcode,
        timestamp: new Date().toISOString()
      });
    } else {
      playScanErrorSound();
      setOverrideError(true);
    }
  };

  const handleAllowUnverifiedPick = () => {
    stopCameraScanner();
    onVerified({
      status: "unverified",
      scannedCode: "UNVERIFIED-PICK",
      expectedCode: expectedBarcode,
      timestamp: new Date().toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                WMS Pick Verification
              </span>
              <h3 className="text-base font-black text-white">
                Scan Medicine Barcode
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expected Item Specs Card */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm sm:text-base font-black text-white">
                {product.name}
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                {product.strength && <span>{product.strength} • </span>}
                {product.packSize || "Standard Pack"}
              </p>
            </div>

            {product.shelfLocation && (
              <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-black self-start sm:self-auto">
                📍 {product.shelfLocation}
              </div>
            )}
          </div>

          {/* Expected Barcode Display */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Expected Barcode:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono font-black text-amber-300 text-xs flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-amber-400" />
              {expectedBarcode}
            </span>

            {isRegistered ? (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                DB Registered
              </span>
            ) : (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Product currently lacks a permanent DB barcode. Using system EAN fallback. Needs backfill.">
                ⚠️ No DB Barcode (Needs Backfill)
              </span>
            )}
          </div>
        </div>

        {/* Scanner Viewport / Status View */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          
          {/* Match Alert banner */}
          {scanResultState === "matched" && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 text-center animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
              <h4 className="text-base font-black text-emerald-300">
                Barcode Verified Successfully!
              </h4>
              <p className="text-xs text-emerald-200/80 font-mono mt-0.5">
                Scanned Code: {lastScannedCode}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1 font-bold">
                Item confirmed & marked as picked.
              </p>
            </div>
          )}

          {/* Mismatch Alert Banner (Safety check block) */}
          {scanResultState === "mismatched" && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500 text-rose-200 animate-in shake duration-200 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-black text-white">
                    WRONG PRODUCT SCANNED!
                  </h4>
                  <p className="text-xs text-rose-300 mt-0.5">
                    Safety Warning: The scanned code does not match the required product. This item will NOT be marked as picked.
                  </p>
                  
                  <div className="mt-2.5 p-2.5 bg-rose-950/70 border border-rose-800/80 rounded-xl space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-rose-400">
                      <span>Scanned:</span>
                      <strong className="text-rose-200">{lastScannedCode}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Expected:</span>
                      <strong className="text-amber-300">{expectedBarcode}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution options */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setScanResultState("idle");
                    setLastScannedCode("");
                    startCameraScanner();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Again</span>
                </button>

                <button
                  onClick={() => setShowOverridePrompt(true)}
                  className="py-2 px-3 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700 text-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Manager Override</span>
                </button>
              </div>
            </div>
          )}

          {/* Manager Override Form Modal/Drawer */}
          {showOverridePrompt && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/50 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase">
                <KeyRound className="w-4 h-4" />
                <span>Manager Authorization Required</span>
              </div>
              <p className="text-xs text-slate-300">
                To override a barcode mismatch or missing package label, enter Depot Supervisor PIN (default: <code className="text-amber-300 font-mono">9999</code>):
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Supervisor PIN (9999)"
                  value={overridePin}
                  onChange={(e) => {
                    setOverridePin(e.target.value);
                    setOverrideError(false);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono flex-1 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleManagerOverride}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs cursor-pointer"
                >
                  Confirm Override
                </button>
                <button
                  onClick={() => setShowOverridePrompt(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {overrideError && (
                <p className="text-xs text-rose-400 font-bold">
                  Invalid PIN. Enter 9999 or manager credentials.
                </p>
              )}
            </div>
          )}

          {/* HTML5 Camera Viewport */}
          {scanResultState === "idle" && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 min-h-[190px] flex items-center justify-center">
                {/* Scanner Target Box Indicator */}
                <div 
                  id={scannerContainerId} 
                  className="w-full h-full min-h-[190px]"
                />

                {!isCameraActive && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-500" />
                    <p className="text-xs text-slate-400 max-w-xs">
                      {cameraError || "Camera scanner is standby. Click below to start live scanning."}
                    </p>
                    <button
                      onClick={startCameraScanner}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera Scanner</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hardware Barcode Gun / Manual Input Fallback */}
              <form onSubmit={handleManualSubmit} className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Hardware Barcode Gun / Manual Input</span>
                  <span className="text-slate-500 font-normal">Press Enter or Scan</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Scan with handheld gun or type barcode..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    Verify
                  </button>
                </div>
              </form>

              {/* Quick simulation buttons for desktop testing */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1.5">
                  Quick Simulation (Desktop Testing):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleProcessBarcode(expectedBarcode)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60 font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    Simulate Match ({expectedBarcode})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessBarcode("9999999999999")}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400 hover:bg-rose-900/60 font-mono text-[11px] font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Simulate Mismatch
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAllowUnverifiedPick}
            className="text-xs text-slate-500 hover:text-slate-300 underline font-medium cursor-pointer"
          >
            Mark Unverified (Without Scan)
          </button>

          <button
            type="button"
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
