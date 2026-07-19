import React, { useState } from 'react';
import { HelpCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type FeatureKey = 
  | 'gigs' 
  | 'seekers' 
  | 'chat' 
  | 'wallet' 
  | 'referrals' 
  | 'admin' 
  | 'notifications' 
  | 'profile' 
  | 'settings';

interface FeatureGuideProps {
  feature: FeatureKey;
}

export const FeatureGuide: React.FC<FeatureGuideProps> = ({ feature }) => {
  const [isOpen, setIsOpen] = useState(false);

  const guideData: Record<FeatureKey, { title: string; description: string; steps: string[] }> = {
    gigs: {
      title: "How to use GiGs",
      description: "Find local work or hire professionals to do tasks for you.",
      steps: [
        "Browse the listed gigs on the dashboard. Use the search bar to find matching roles.",
        "Click on a gig to view details like the price, description, and contact info.",
        "Tap 'Apply' or message the poster to discuss and coordinate details.",
        "To hire someone, tap 'Create GiG' to list a new task. Setting a gig costs 50c."
      ]
    },
    seekers: {
      title: "How to use Seekers",
      description: "Browse candidate profiles or post your own profile to get hired.",
      steps: [
        "Look through profiles of people offering their services in different categories.",
        "Tap on any seeker's profile to view their detailed skills, pricing, and bio.",
        "To get hired by others, tap 'Create Profile' to list your own seeker profile.",
        "You can edit or update your seeker card at any time to attract more clients."
      ]
    },
    chat: {
      title: "How to use Chat",
      description: "Coordinate with other users or reach out to our support team.",
      steps: [
        "Browse your inbox to see discussions with gig posters or prospective workers.",
        "Inside a chat room, type and send messages, share pictures, or send video files.",
        "Use the Support chat channel to contact an admin directly for platform assistance.",
        "You can like or react to messages by holding or double-tapping on a message."
      ]
    },
    wallet: {
      title: "How to use Wallet",
      description: "Manage your coin balance and upload Proof of Payment documents.",
      steps: [
        "Your Coin Balance is used to post gigs and gain premium candidate contacts.",
        "To add coins, select a Topup option (e.g. 500c, 1000c, 2000c) to get Bank Details.",
        "Make a bank transfer matching the price in Rands to the displayed account details.",
        "Upload your bank's PDF or image receipt as Proof of Payment and submit.",
        "An Admin will verify your deposit and credit your coins to your balance."
      ]
    },
    referrals: {
      title: "How to use Referrals",
      description: "Earn real money rewards (Rands) by sharing your unique invite link.",
      steps: [
        "Copy your personal invite code and share it with friends, family, or online groups.",
        "To cash out, you must first become a Verified Agent by doing a R20 topup once.",
        "Earn R15 + commissions at 10 referrals (Option 1) or R100 + commissions at 20 referrals (Option 2).",
        "Referrals are valid when your invitee registers and makes a standard topup."
      ]
    },
    admin: {
      title: "How to use Admin Panel",
      description: "Process payments, view platform statistics, and moderate submissions.",
      steps: [
        "Review the 'Pending Approvals' list for uploaded bank proof of payment documents.",
        "Click on the document attachment to preview the image or download the uploaded PDF.",
        "Cross-verify the payment amount against your actual bank statement receipts.",
        "Click 'Approve' to credit coins to the user, or 'Reject' to decline if unverified."
      ]
    },
    notifications: {
      title: "How to use Notifications",
      description: "Stay updated on your transactions, referrals, and gig status.",
      steps: [
        "New notification alerts appear automatically in the header bell icon.",
        "Review approval messages, seeker requests, and referral validation notifications.",
        "Tap the 'Clear All' button at the top-right to clean up your notification logs.",
        "Adjust alert sounds and options in your profile's Settings panel."
      ]
    },
    profile: {
      title: "How to use My Profile",
      description: "Manage your personal presence, location, and credentials.",
      steps: [
        "Your profile name, province, and location are visible on your seeker card and posts.",
        "Keep your phone and email active so prospective clients can contact you directly.",
        "Tap 'Edit Profile' to change your profile picture, provinces, or phone details.",
        "Verified Agent badges show other users you are a trusted platform partner."
      ]
    },
    settings: {
      title: "How to use Settings",
      description: "Configure security pins, update security keys, or test offline modes.",
      steps: [
        "Toggle 'Notifications Enabled' to pause or resume real-time sound/visual alerts.",
        "Enable 'Account Enabled' to simulate offline storage or secure offline testing.",
        "Set a 4-digit security PIN or update your Supabase account login password.",
        "Tap 'Clear App State' to reset local cache and synchronize fresh database entries."
      ]
    }
  };

  const data = guideData[feature];

  return (
    <div className="relative inline-block mb-4">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all focus:outline-none shadow-sm border ${
          isOpen 
            ? 'bg-[#FF2E2E] border-[#FF2E2E] text-white' 
            : 'bg-white border-slate-200 text-slate-600 hover:border-[#FF2E2E] hover:text-[#FF2E2E]'
        }`}
      >
        <HelpCircle className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-[#FF2E2E]'}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {isOpen ? "Close Guide" : "Guide"}
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="absolute left-0 top-full mt-2 w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[1001]"
            >
              <div className="p-5 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FF2E2E]/10 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-[#FF2E2E]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{data.title}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Feature Guide</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                    <HelpCircle className="w-4 h-4 text-slate-400 rotate-45" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {data.description}
                </p>

                <div className="space-y-3">
                  {data.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start group">
                      <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#FF2E2E] group-hover:text-white transition-colors">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                  Got it, Thanks
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
