import React from "react";
import SmartOrderModal from "./SmartOrderModal";

interface PrescriptionScannerProps {
  onClose: () => void;
  onOpenCart?: () => void;
}

/**
 * Unified Prescription Scanner
 * Forwards seamlessly to the upgraded MediChain SmartOrder Engine.
 */
export default function PrescriptionScanner({ onClose, onOpenCart }: PrescriptionScannerProps) {
  return <SmartOrderModal onClose={onClose} onOpenCart={onOpenCart} />;
}
