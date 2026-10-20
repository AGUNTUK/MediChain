import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Truck,
  RotateCcw,
  Mic,
  MicOff,
  AlertCircle,
  Tag
} from "lucide-react";
import { copilotService } from "../services/copilot";
import { CopilotMessage, CopilotProductSummary } from "../lib/geminiCopilotService";
import { toBengaliNumber } from "../lib/utils";

interface PharmacyCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyName?: string;
  onAddToCart?: (productId: string, quantity: number) => Promise<boolean>;
  onOpenCart?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: CopilotProductSummary[];
  deliveryInfo?: any;
  timestamp: Date;
  isError?: boolean;
}

const ACTUALLY_CONFIGURED_AI_MODEL = "gemini-3.8-flash";

const SUGGESTED_PROMPTS = [
  { text: "সেকলো ২০ না থাকলে ভালো বিকল্প কী?", icon: "💊", label: "বিকল্প জেনেরিক" },
  { text: "কোন কোন গ্যাস্ট্রিকের ওষুধে বিশেষ ট্রেড ডিসকাউন্ট?", icon: "💰", label: "দাম ও ডিসকাউন্ট" },
  { text: "ইন-স্টক গ্যাস্ট্রিক ও অ্যান্টিবায়োটিক ওষুধ দেখান", icon: "📦", label: "স্টক যাচাই" },
  { text: "এখন অর্ডার করলে ডেলিভারি কখন পাব?", icon: "🚚", label: "ডেলিভারি সিডিউল" }
];

export default function PharmacyCopilotModal({
  isOpen,
  onClose,
  pharmacyName = "City Pharma",
  onAddToCart,
  onOpenCart
}: PharmacyCopilotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      text: `স্বাগতম **${pharmacyName}**! আমি মেডিচেইন **AI Copilot**।\n\nপাইকারি ওষুধের স্টক যাচাই, বিকল্প জেনেরিক সন্ধান বা সরাসরি কার্টে অর্ডার যোগ করতে সাহায্য চাইলে আমাকে জানান।`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Setup Web Speech API for hands-free Bengali speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "bn-BD";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setSpeechError("ভয়েস সনাক্ত করতে সমস্যা হয়েছে। অনুগ্রহ করে টাইপ করুন।");
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      alert("আপনার ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট নেই। অনুগ্রহ করে টাইপ করুন।");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 100);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText("");
    setSpeechError(null);

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyPayload: CopilotMessage[] = newMessages
        .filter((m) => m.id !== "initial" && !m.isError)
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          text: m.text
        }));

      const res = await copilotService.sendMessage(historyPayload);

      const assistantMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: res.reply || "অনুরোধটি প্রক্রিয়া সম্পন্ন হয়েছে।",
        products: res.recommendedProducts || [],
        deliveryInfo: res.deliveryInfo || null,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.cartUpdated) {
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          text: "দুঃখিত, সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।",
          isError: true,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async (product: CopilotProductSummary) => {
    const qty = quantities[product.id] || 1;
    setAddingId(product.id);

    try {
      if (onAddToCart) {
        await onAddToCart(product.id, qty);
      } else {
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      }

      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [product.id]: false }));
      }, 2500);
    } catch (e) {
      console.error("Error adding product to cart:", e);
    } finally {
      setAddingId(null);
    }
  };

  const setQty = (productId: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, val) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        text: `নমস্কার **${pharmacyName}**! নতুন সেশন শুরু হয়েছে। কীভাবে সাহায্য করতে পারি?`,
        timestamp: new Date()
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#F8F7FC] w-full max-w-xl h-[88vh] sm:h-[90vh] max-h-[720px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-purple-100/80 transition-all">
        {/* Compact Redesigned Header */}
        <div className="bg-white px-4 py-3 border-b border-purple-100 flex items-center justify-between shrink-0 shadow-xs relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100/80 border border-purple-200/60 flex items-center justify-center text-purple-700 shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">MediChain AI Copilot</h2>
                <span className="bg-purple-50 text-purple-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200/60">
                  {ACTUALLY_CONFIGURED_AI_MODEL}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">আপনার স্মার্ট ফার্মেসি সহকারী</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetChat}
              title="নতুন চ্যাট শুরু করুন"
              className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="বন্ধ করুন"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Accent bottom stripe */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-purple-400 to-[#A3E635]" />
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 border border-purple-200/60">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                    isUser
                      ? "bg-[#9333EA] text-white rounded-tr-xs"
                      : "bg-white text-slate-800 border border-purple-100 rounded-tl-xs"
                  }`}
                >
                  {/* Message formatted text */}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {m.text.split("\n").map((line, i) => {
                      if (line.startsWith("- ")) {
                        return (
                          <div key={i} className="flex items-start gap-1.5 my-0.5">
                            <span className={isUser ? "text-purple-200 font-bold" : "text-purple-600 font-bold"}>•</span>
                            <span>{line.replace(/^- /, "")}</span>
                          </div>
                        );
                      }
                      return (
                        <p key={i} className={i > 0 ? "mt-1" : ""}>
                          {line}
                        </p>
                      );
                    })}
                  </div>

                  {/* Delivery Schedule Info Box */}
                  {m.deliveryInfo && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/80 border border-purple-200/60 text-slate-800 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 font-extrabold text-purple-800">
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                        <span>{m.deliveryInfo.deliveryScheduleLabel}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        কাট-অফ: {m.deliveryInfo.cutoffTimeLabel} • ফ্ল্যাট ৳৪০ কনসোলিডেটেড ডেলিভারি চার্জ
                      </p>
                    </div>
                  )}

                  {/* Compact Medicine Search Result Cards */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-purple-100/80">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">
                        ক্যাটালগ ফলাফল ({toBengaliNumber(m.products.length)}টি):
                      </p>

                      <div className="space-y-2">
                        {m.products.map((p) => {
                          const currentQty = quantities[p.id] || 1;
                          const isOutOfStock = (p.availableStock ?? 0) <= 0;
                          const isAdded = addedIds[p.id];
                          const isAdding = addingId === p.id;
                          const hasValidDiscount = p.discountPercentage && p.discountPercentage > 0;

                          return (
                            <div
                              key={p.id}
                              className="bg-white rounded-xl p-2.5 border border-purple-100 hover:border-purple-300 shadow-2xs transition-all flex flex-col gap-2"
                            >
                              {/* Header: Name + Strength Badge + Stock */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                      {p.name}
                                    </span>
                                    {p.strength && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 border border-purple-200/50">
                                        {p.strength}
                                      </span>
                                    )}
                                    {p.category && (
                                      <span className="text-[10px] font-medium text-slate-500">
                                        • {p.category}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-500 truncate">
                                    {p.genericName} • <span className="font-semibold text-slate-700">{p.company}</span>
                                  </p>
                                </div>

                                {/* Live Stock Badge */}
                                <div className="shrink-0">
                                  {isOutOfStock ? (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                                      × স্টকে নেই
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                                      ✓ স্টকে আছে ({toBengaliNumber(p.availableStock)})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price Row & Stepper + Cart Button */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <span className="font-black text-purple-700 text-xs sm:text-sm">
                                    ট্রেড: ৳{toBengaliNumber(p.sellingPrice)}
                                  </span>
                                  {p.mrp > p.sellingPrice && (
                                    <span className="text-slate-400 line-through text-[11px]">
                                      MRP: ৳{toBengaliNumber(p.mrp)}
                                    </span>
                                  )}
                                  {hasValidDiscount && (
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/50 flex items-center gap-0.5">
                                      <Tag className="w-2.5 h-2.5" />
                                      {toBengaliNumber(p.discountPercentage!)}% ছাড়
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400">• {p.packSize || "Box"}</span>
                                </div>

                                {/* Quantity & Add Button */}
                                {!isOutOfStock && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setQty(p.id, currentQty - 1)}
                                        disabled={currentQty <= 1}
                                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-5 text-center font-bold text-xs">
                                        {toBengaliNumber(currentQty)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setQty(p.id, currentQty + 1)}
                                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleAddProduct(p)}
                                      disabled={isAdding}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                                        isAdded
                                          ? "bg-emerald-600 text-white"
                                          : "bg-[#70C016] hover:bg-[#62AA12] text-white active:scale-95 shadow-2xs"
                                      }`}
                                    >
                                      {isAdded ? (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>যুক্ত হয়েছে</span>
                                        </>
                                      ) : (
                                        <>
                                          <ShoppingCart className="w-3.5 h-3.5" />
                                          <span>কার্টে দিন</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
                <span className="text-xs text-slate-600 font-medium">
                  ক্যাটালগ যাচাই ও প্রতিক্রিয়া তৈরি হচ্ছে...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Compact Suggested Prompts */}
        <div className="px-3 py-2 border-t border-purple-100 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
            {SUGGESTED_PROMPTS.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(sp.text)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-purple-50/80 hover:bg-purple-100 border border-purple-200/60 text-[11px] font-bold text-purple-900 flex items-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <span>{sp.icon}</span>
                <span>{sp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Message Composer */}
        <div className="p-3 sm:p-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-purple-100 bg-white shrink-0 shadow-lg">
          {speechError && (
            <p className="text-[11px] text-rose-500 mb-1.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {speechError}
            </p>
          )}

          <div className="flex items-center gap-2">
            {/* Functional Voice Input Button */}
            <button
              type="button"
              onClick={toggleSpeech}
              title={isListening ? "ভয়েস বন্ধ করুন" : "মুখে বলুন"}
              className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-md"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Multiline Input */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "বলুন... আপনার ওষুধের নাম শুনছি"
                  : "ওষুধের নাম লিখুন বা প্রশ্ন করুন..."
              }
              className="flex-1 bg-slate-50 border border-purple-100 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none max-h-20 overflow-y-auto"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-400 font-medium">
            <span>Enter চাপুন পাঠাতে • Shift+Enter নতুন লাইন</span>
            {onOpenCart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCart();
                }}
                className="text-purple-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <ShoppingCart className="w-3 h-3" />
                কার্ট দেখুন
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
