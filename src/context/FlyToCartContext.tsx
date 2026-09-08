import React, { createContext, useContext, useState, useRef, useCallback, useMemo, ReactNode } from "react";

interface CartFeedbackContextType {
  registerCartTarget: (node: HTMLElement | null) => void;
  triggerCartFeedback: () => void;
  isCartPulsing: boolean;
  isBadgePopping: boolean;
  triggerButtonFeedback: (productId: string) => void;
  isButtonAdded: (productId: string) => boolean;
  burstOrigin: { x: number; y: number } | null;
  setBurstOrigin: (origin: { x: number; y: number } | null) => void;
}

const CartFeedbackContext = createContext<CartFeedbackContextType | undefined>(undefined);

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [isCartPulsing, setIsCartPulsing] = useState(false);
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const [addedButtons, setAddedButtons] = useState<Record<string, boolean>>({});
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(null);

  const cartTargetRef = useRef<HTMLElement | null>(null);

  const registerCartTarget = useCallback((node: HTMLElement | null) => {
    cartTargetRef.current = node;
  }, []);

  const triggerCartFeedback = useCallback(() => {
    setIsCartPulsing(true);
    setIsBadgePopping(true);

    if (cartTargetRef.current) {
      const rect = cartTargetRef.current.getBoundingClientRect();
      setBurstOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      setTimeout(() => setBurstOrigin(null), 600);
    }

    setTimeout(() => setIsCartPulsing(false), 400);
    setTimeout(() => setIsBadgePopping(false), 500);
  }, []);

  const triggerButtonFeedback = useCallback((productId: string) => {
    setAddedButtons(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setAddedButtons(prev => ({ ...prev, [productId]: false }));
    }, 1200);
  }, []);

  const isButtonAdded = useCallback((productId: string) => {
    return !!addedButtons[productId];
  }, [addedButtons]);

  const contextValue = useMemo(
    () => ({
      registerCartTarget,
      triggerCartFeedback,
      isCartPulsing,
      isBadgePopping,
      triggerButtonFeedback,
      isButtonAdded,
      burstOrigin,
      setBurstOrigin
    }),
    [
      registerCartTarget,
      triggerCartFeedback,
      isCartPulsing,
      isBadgePopping,
      triggerButtonFeedback,
      isButtonAdded,
      burstOrigin
    ]
  );

  return (
    <CartFeedbackContext.Provider value={contextValue}>
      {children}
    </CartFeedbackContext.Provider>
  );
}

export function useCartFeedback() {
  const context = useContext(CartFeedbackContext);
  if (!context) {
    throw new Error("useCartFeedback must be used within a CartFeedbackProvider");
  }
  return context;
}
