/**
 * MediChain Depot Warehouse Utility Functions
 */

export const getRackLocation = (productId: string, name: string, category: string): string => {
  const saved = localStorage.getItem(`medichain_rack_${productId}`);
  if (saved) return saved;

  // Deterministic fallback based on name & category
  const firstChar = name.charAt(0).toUpperCase();
  const index = (firstChar.charCodeAt(0) % 5) + 1; // 1 to 5
  let section = "A";
  if (category === "Syrup" || category === "Suspension") section = "B";
  else if (category === "Injection" || category === "Infusion") section = "C";
  else if (category === "Cream" || category === "Ointment" || category === "Gel" || category === "Lotion") section = "D";
  else if (category === "Supplement" || category === "Vitamins") section = "E";
  
  const shelf = (name.length % 4) + 1;
  return `Rack ${section}-${index.toString().padStart(2, "0")}, Shelf ${shelf}`;
};

export const saveRackLocation = (productId: string, location: string): void => {
  localStorage.setItem(`medichain_rack_${productId}`, location);
};

/**
 * Returns registered barcode or deterministic fallback EAN-13 formatted string
 */
export const getBarcodeForProduct = (productId: string, registeredBarcode?: string): { barcode: string; isRegistered: boolean } => {
  if (registeredBarcode && registeredBarcode.trim().length > 0) {
    return { barcode: registeredBarcode.trim(), isRegistered: true };
  }
  // Deterministic fallback EAN-13 code (880 BD prefix + numeric hash)
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash * 31 + productId.charCodeAt(i)) % 100000000;
  }
  const numericStr = Math.abs(hash).toString().padStart(8, "0");
  const fallback = `880${numericStr}1`;
  return { barcode: fallback, isRegistered: false };
};

/**
 * Audio feedback for barcode scanning
 */
export const playScanSuccessSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {
    // AudioContext may be blocked before user gesture
  }
};

export const playScanErrorSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now); // Low buzz
    osc.frequency.setValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (e) {
    // AudioContext blocked
  }
};

// Simulated Delivery Riders list
export interface Rider {
  id: string;
  name: string;
  phone: string;
  status: "Available" | "En Route" | "Off Duty";
}

export const RIDERS: Rider[] = [
  { id: "R-1", name: "Sajjad Hossain", phone: "+8801712345671", status: "Available" },
  { id: "R-2", name: "Kamal Uddin", phone: "+8801812345672", status: "Available" },
  { id: "R-3", name: "Sumon Ali", phone: "+8801912345673", status: "Available" },
  { id: "R-4", name: "Rakibul Islam", phone: "+8801512345674", status: "Available" }
];
