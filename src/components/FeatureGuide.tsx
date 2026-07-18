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
    <div className="w-full bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-sm mb-4">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <HelpCircle className="w-4 h-4 text-[#FF2E2E]" />
          <span className="text-xs font-bold uppercase tracking-wider">How to use this feature</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {isOpen ? "Hide Guide" : "Show Guide"}
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-slate-50 text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{data.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{data.description}</p>
              </div>
              <div className="space-y-2 pt-1">
                {data.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
