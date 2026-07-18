import React, { useState, useEffect } from 'react';
import { FileText, Check, ShieldCheck, Zap } from 'lucide-react';

interface PendingPaymentItemProps {
  payment: {
    id: string;
    coins: number;
    priceRand: number;
    documentUrl?: string;
    userId?: string;
    userEmail?: string;
  };
  onApprove: (id: string) => void;
  onViewProof: () => void;
}

export const PendingPaymentItem: React.FC<PendingPaymentItemProps> = ({
  payment,
  onApprove,
  onViewProof,
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const onApproveRef = React.useRef(onApprove);

  useEffect(() => {
    onApproveRef.current = onApprove;
  }, [onApprove]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onApproveRef.current(payment.id);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, payment.id]);

  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">{payment.coins} Coins Top-up</h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">R{payment.priceRand},00 • ID: {payment.id.slice(0, 6)}</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending Review
        </span>
      </div>

      {/* Progress & Auto-approval Info */}
      <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1 text-[#FF2E2E]">
            <Zap className="w-3.5 h-3.5 fill-[#FF2E2E]/10" />
            Sandbox Mode Auto-Approval
          </span>
          <span>{timeLeft}s remaining</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-[#FF2E2E] to-red-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onViewProof}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 py-2 rounded-lg transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          View Proof
        </button>
        <button
          type="button"
          onClick={() => onApprove(payment.id)}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          Approve Now
        </button>
      </div>
    </div>
  );
};
