import React from 'react';
import { FileText, Check } from 'lucide-react';

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
  canApprove?: boolean;
}

export const PendingPaymentItem: React.FC<PendingPaymentItemProps> = ({
  payment,
  onApprove,
  onViewProof,
  canApprove = true,
}) => {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">{payment.coins} Coins Top-up</h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">R{payment.priceRand},00 • ID: {payment.id.slice(0, 6)}</p>
          {payment.userEmail && (
            <p className="text-[11px] text-slate-500 font-medium mt-1">User: {payment.userEmail}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending Admin Review
        </span>
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
          disabled={!canApprove}
          onClick={() => onApprove(payment.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg transition-colors shadow-sm ${
            canApprove 
              ? 'text-white bg-slate-900 hover:bg-slate-800' 
              : 'text-slate-400 bg-slate-100 cursor-not-allowed border border-slate-200 shadow-none'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {canApprove ? 'Approve Now' : 'Pending Review'}
        </button>
      </div>
    </div>
  );
};
