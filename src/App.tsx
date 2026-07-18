import React, { useState, useEffect, ChangeEvent } from 'react';
import { User as UserIcon, Bell, Wallet, Shield, Gift, Upload, CheckCircle, ArrowLeft, BadgeCheck, X, FileText, Trash2, Globe, MapPin, Mail, Plus, Edit3, Phone, MessageSquare, Briefcase, Search, Image as ImageIcon, Video, Heart, MoreVertical, ChevronRight, ChevronLeft, Settings, LogOut, Moon, Lock, HelpCircle, Volume2, VolumeX, Key, Power, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { FeatureGuide } from './components/FeatureGuide';
import { PendingPaymentItem } from './components/PendingPaymentItem';

const playCoinSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Coin chime effect
    playNote(987.77, 0, 0.1); // B5
    playNote(1318.51, 0.1, 0.4); // E6
  } catch (e) {
    console.error("Audio not supported", e);
  }
};

export default function App() {
  const [hasNotification, setHasNotification] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, text: string}[]>([]);
  const [activeTop, setActiveTop] = useState<string | null>(null);
  const [activeBottom, setActiveBottom] = useState<string | null>(null);
  
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [view, setView] = useState<'home' | 'wallet' | 'payment' | 'referral' | 'admin' | 'profile-edit' | 'chat' | 'gigs' | 'seekers' | 'create-gig' | 'create-seeker' | 'settings' | 'change-password' | 'set-pin' | 'about' | 'signup' | 'login'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationsEnabled: true,
    accountEnabled: true,
    pinEnabled: false,
    pinCode: ''
  });
  const [selectedTopup, setSelectedTopup] = useState<{coins: string, price: string} | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<{
    show: boolean;
    title: string;
    subtitle: string;
    type?: 'success' | 'error' | 'info';
  }>({
    show: false,
    title: '',
    subtitle: '',
    type: 'success'
  });

  const triggerAlert = (title: string, subtitle: string, type: 'success' | 'error' | 'info' = 'success') => {
    setShowPopup({
      show: true,
      title,
      subtitle,
      type
    });
  };
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', acceptTerms: false });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [pinForm, setPinForm] = useState('');

  // Persist login state
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session);
      if (session) {
        setView('wallet');
        setActiveBottom('wallet');
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoggedIn(!!session);
      if (session) {
        setView('wallet');
        setActiveBottom('wallet');
      } else {
        setView('login');
        setActiveBottom(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn && view === 'home') {
      setView('wallet');
      setActiveBottom('wallet');
    }
  }, [isLoggedIn, view]);

  const handleLogin = async () => {
    if (!supabase) {
      setUser({ id: 'demo-user', email: loginForm.email });
      setIsLoggedIn(true);
      setView('wallet');
      setActiveBottom('wallet');
      setUserName(loginForm.email.split('@')[0] || 'Demo User');
      setCoinBalance(150); // Start with some demo coins
      setReferralBalance(0);
      setIsAgent(false);
      triggerAlert('Sandbox Mode', 'Logged in in offline demo mode. Setup Supabase in settings to persist data.', 'success');
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) throw error;
    } catch (error: any) {
      triggerAlert('Login Failed', error.message, 'error');
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchGigs();
      fetchSeekers();
      fetchPayments();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ id: user.id, user_name: user.email?.split('@')[0] || 'User', coin_balance: 0, referral_balance: 0 }])
            .select()
            .single();
          
          if (createError) throw createError;
          if (newProfile) {
            setUserName(newProfile.user_name);
            setCoinBalance(newProfile.coin_balance);
            setReferralBalance(newProfile.referral_balance);
          }
        } else {
          throw error;
        }
      } else {
        setUserName(data.user_name);
        setProfilePic(data.profile_pic || profilePic);
        setCoinBalance(data.coin_balance);
        setReferralBalance(data.referral_balance);
        setIsAgent(data.is_agent);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const fetchGigs = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('gigs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setGigs(data.map(g => ({
          ...g,
          owner: g.owner || { name: 'Unknown', pic: '' }
        })));
      }
    } catch (error: any) {
      console.error('Error fetching gigs:', error.message);
    }
  };

  const fetchSeekers = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('seekers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setSeekers(data.map(s => ({
          ...s,
          owner: s.owner || { name: 'Unknown', pic: '' }
        })));
      }
    } catch (error: any) {
      console.error('Error fetching seekers:', error.message);
    }
  };

  const fetchPayments = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Payments table might not exist yet, using local state.', error.message);
        const saved = localStorage.getItem('timegig_pending_payments');
        if (saved) {
          setPendingPayments(JSON.parse(saved));
        }
        return;
      }
      
      if (data) {
        const formattedPayments = data.map(p => ({
          id: p.id,
          coins: p.coins,
          priceRand: p.price_rand,
          documentUrl: p.document_url,
          userId: p.user_id,
          userEmail: p.user_email
        }));
        setPendingPayments(formattedPayments);
        localStorage.setItem('timegig_pending_payments', JSON.stringify(formattedPayments));
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error.message);
    }
  };

  const handleSignup = async () => {
    if (!signupForm.acceptTerms) return;
    if (!supabase) {
      setUser({ id: 'demo-user', email: signupForm.email });
      setIsLoggedIn(true);
      setView('wallet');
      setActiveBottom('wallet');
      setUserName(signupForm.email.split('@')[0] || 'Demo User');
      setCoinBalance(150);
      setReferralBalance(0);
      setIsAgent(false);
      triggerAlert('Sandbox Mode', 'Welcome to TimeGiG! Account created in sandbox mode.', 'success');
      return;
    }
    try {
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
      });
      if (error) throw error;
      triggerAlert('Verification Sent', 'Check your email for the confirmation link!', 'success');
      setView('login');
    } catch (error: any) {
      triggerAlert('Signup Failed', error.message, 'error');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      setUser(null);
      setIsLoggedIn(false);
      setView('login');
      setActiveBottom(null);
    }
  };

  // Gig State
  const [gigs, setGigs] = useState<{
    id: string;
    title: string;
    description: string;
    category: string;
    province: string;
    location: string;
    images: string[];
    price: string;
    owner: { name: string; pic: string };
  }[]>(() => {
    return [
      {
        id: 'mock-gig-1',
        title: 'E-Commerce Website Frontend Developer Needed',
        category: 'Software & IT',
        province: 'Gauteng',
        location: 'Sandton, Johannesburg',
        price: 'R5000',
        description: 'We need an experienced React and Tailwind developer to design and implement the frontend for a new boutique clothing online store. Must be completed within 2 weeks.',
        images: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=300'],
        owner: { name: 'Sarah Jenkins', pic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' }
      },
      {
        id: 'mock-gig-2',
        title: 'Wedding Photographer for Cape Town outdoor venue',
        category: 'Photography',
        province: 'Western Cape',
        location: 'Stellenbosch, Cape Town',
        price: 'R3500',
        description: 'Looking for a professional wedding photographer to cover our outdoor ceremony next Saturday. Standard editing and high-resolution digital files required.',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=300'],
        owner: { name: 'David Peterson', pic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' }
      }
    ];
  });

  // Seeker State
  const [seekers, setSeekers] = useState<{
    id: string;
    name: string;
    industry: string;
    needs: string;
    category: string;
    province: string;
    location: string;
    images: string[];
    rate: string;
    owner: { name: string; pic: string };
  }[]>(() => {
    return [
      {
        id: 'mock-seeker-1',
        name: 'Lihle Khumalo',
        industry: 'Creative Design & Branding',
        needs: 'Looking for logo redesign, corporate branding, and cohesive social media post layouts.',
        category: 'Graphic Design',
        province: 'KwaZulu-Natal',
        location: 'Durban Central',
        rate: 'R350/hr',
        images: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'],
        owner: { name: 'Lihle Khumalo', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' }
      },
      {
        id: 'mock-seeker-2',
        name: 'Sipho Ndlovu',
        industry: 'Business Systems Analysis',
        needs: 'Providing financial audit readiness preparation, system setup, and coaching.',
        category: 'Finance',
        province: 'Gauteng',
        location: 'Pretoria',
        rate: 'R600/hr',
        images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300'],
        owner: { name: 'Sipho Ndlovu', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150' }
      }
    ];
  });

  const [newSeeker, setNewSeeker] = useState({
    name: '',
    industry: '',
    needs: '',
    category: '',
    province: '',
    location: '',
    images: [] as string[],
    rate: ''
  });

  const [gigSearchQuery, setGigSearchQuery] = useState('');
  const [seekerSearchQuery, setSeekerSearchQuery] = useState('');
  const [selectedGig, setSelectedGig] = useState<any | null>(null);
  const [selectedSeeker, setSelectedSeeker] = useState<any | null>(null);

  const [newGig, setNewGig] = useState({
    title: '',
    description: '',
    category: '',
    province: '',
    location: '',
    images: [] as string[],
    budget: ''
  });

  const [selectedGigMedia, setSelectedGigMedia] = useState<{images: string[], index: number} | null>(null);

  // Profile State
  const [profilePic, setProfilePic] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150');
  const [userName, setUserName] = useState('John Doe');
  const [personalInfo, setPersonalInfo] = useState({
    schoolLevel: '',
    experience: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [socialLinks, setSocialLinks] = useState<{platform: string, url: string}[]>([
    { platform: 'WhatsApp', url: '' }
  ]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const gigCategories = [
    'Pet Care', 'Creative', 'Tech & IT', 'Home Services', 'Delivery', 'Education', 'Events', 'Other'
  ];

  const provinces = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'
  ];

  const locationsByProvince: Record<string, string[]> = {
    'Gauteng': ['Johannesburg', 'Pretoria', 'Soweto', 'Sandton', 'Midrand'],
    'Western Cape': ['Cape Town', 'Stellenbosch', 'George', 'Paarl', 'Worcester'],
    'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay', 'Newcastle', 'Umhlanga'],
    'Eastern Cape': ['Gqeberha', 'East London', 'Mthatha', 'Makhanda', 'Bhisho'],
    'Free State': ['Bloemfontein', 'Welkom', 'Sasolburg', 'Bethlehem', 'Kroonstad'],
    'Limpopo': ['Polokwane', 'Tzaneen', 'Mokopane', 'Phalaborwa', 'Thohoyandou'],
    'Mpumalanga': ['Mbombela', 'Emalahleni', 'Secunda', 'Ermelo', 'Middelburg'],
    'North West': ['Mahikeng', 'Potchefstroom', 'Rustenburg', 'Klerksdorp', 'Brits'],
    'Northern Cape': ['Kimberley', 'Upington', 'De Aar', 'Springbok', 'Kuruman'],
  };

  const [coinBalance, setCoinBalance] = useState(0);
  const [isAgent, setIsAgent] = useState(false);
  const [referralBalance, setReferralBalance] = useState(0);
  const [validReferralsCount, setValidReferralsCount] = useState(0);
  const [cashoutStatus, setCashoutStatus] = useState<'none' | 'pending'>('none');
  const [referralProfit, setReferralProfit] = useState(0);
  const [normalTopupBalance, setNormalTopupBalance] = useState(0);
  const [agentPayouts, setAgentPayouts] = useState(0);
  const [profitFrom10Tier, setProfitFrom10Tier] = useState(0);
  const [profitFrom20Tier, setProfitFrom20Tier] = useState(0);
  const [bankingDetails, setBankingDetails] = useState('');
  const [isEnteringBankingDetails, setIsEnteringBankingDetails] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'10' | '20' | null>(null);
  const [adminCashoutRequests, setAdminCashoutRequests] = useState<{
    id: string;
    agentName: string;
    profilePicUrl: string;
    bankingDetails: string;
    validReferralsCount: number;
    amountOwed: number;
    status: 'pending' | 'paid';
    tier?: '10' | '20';
  }[]>([]);
  const [pendingPayments, setPendingPayments] = useState<{id: string, coins: number, priceRand: number, documentUrl?: string, userId?: string, userEmail?: string}[]>(() => {
    const saved = localStorage.getItem('timegig_pending_payments');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewingDocument, setViewingDocument] = useState<{id: string, coins: number, priceRand: number, documentUrl?: string, userId?: string, userEmail?: string} | null>(null);

  const [coinBash, setCoinBash] = useState<{show: boolean, amount: number}>({show: false, amount: 0});
  const [chatMessages, setChatMessages] = useState<{
    id: string, 
    sender: 'user' | 'support', 
    text?: string, 
    time: string, 
    liked?: boolean,
    reaction?: string,
    media?: { url: string, type: 'image' | 'video' }[]
  }[]>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [contactActionMenu, setContactActionMenu] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<{name: string, role: string, pic: string, blocked?: boolean} | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contacts, setContacts] = useState<{name: string, role: string, pic: string, blocked?: boolean}[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [viewingProfile, setViewingProfile] = useState<{name: string, role: string, pic: string, bio: string} | null>(null);
  const handleMediaUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const mediaItems: { url: string, type: 'image' | 'video' }[] = [];
    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' as const : 'image' as const;
      mediaItems.push({ url, type });
    });

    if (mediaItems.length > 0) {
      const newMessage = {
        id: Date.now().toString(),
        sender: 'user' as const,
        media: mediaItems,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, newMessage]);
    }
  };

  const handleMessageInteraction = (id: string, type: 'start' | 'end') => {
    if (type === 'start') {
      const timer = setTimeout(() => {
        setMessageMenuId(id);
      }, 1000);
      setLongPressTimer(timer);
    } else {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  };

  const toggleLike = (id: string) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, liked: !msg.liked } : msg
    ));
  };

  const deleteMessage = (id: string) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== id));
    setMessageMenuId(null);
  };

  const startEditMessage = (id: string, text: string) => {
    setEditingMessageId(id);
    setCurrentChatMessage(text);
    setMessageMenuId(null);
  };
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojiCategories = [
    { name: 'Smileys', emojis: ['😀', '😂', '😍', '😊', '😎', '🤩', '🤔', '😴'] },
    { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔'] },
    { name: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👊', '✌️'] },
    { name: 'Money', emojis: ['💸', '💰', '💵', '💳', '💹', '💎', '📈', '🚀'] },
    { name: 'Other', emojis: ['🔥', '⭐', '✨', '⚡', '🎉', '🎁', '💡', '✅'] }
  ];
  const [pendingCoinBash, setPendingCoinBash] = useState<number>(0);

  useEffect(() => {
    if (view !== 'admin' && pendingCoinBash > 0) {
      setCoinBash({show: true, amount: pendingCoinBash});
      playCoinSound();
      setTimeout(() => setCoinBash({show: false, amount: 0}), 3000);
      setPendingCoinBash(0);
    }
  }, [view, pendingCoinBash]);

  const handleApprove = async (id: string) => {
    const payment = pendingPayments.find(p => p.id === id);
    if (!payment) return;
    
    const isOwnPayment = !payment.userId || (user && payment.userId === user.id);
    
    if (isOwnPayment) {
      setCoinBalance(prev => prev + payment.coins);
      setNormalTopupBalance(prev => prev + payment.priceRand);
      
      if (payment.priceRand === 20 && !isAgent) {
        setIsAgent(true);
        setReferralBalance(prev => prev + 100);
      }
    }
    
    if (supabase) {
      try {
        await supabase
          .from('payments')
          .update({ status: 'approved' })
          .eq('id', id);
          
        const targetUserId = payment.userId || (user ? user.id : null);
        if (targetUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('coin_balance, referral_balance, is_agent')
            .eq('id', targetUserId)
            .single();
            
          if (profile) {
            const newCoins = (profile.coin_balance || 0) + payment.coins;
            let newReferral = profile.referral_balance || 0;
            let targetIsAgent = profile.is_agent || false;
            
            if (payment.priceRand === 20 && !targetIsAgent) {
              targetIsAgent = true;
              newReferral += 100;
            }
            
            await supabase
              .from('profiles')
              .update({
                coin_balance: newCoins,
                referral_balance: newReferral,
                is_agent: targetIsAgent
              })
              .eq('id', targetUserId);
          }
        }
      } catch (err: any) {
        console.error('Error syncing approval to Supabase:', err.message);
      }
    }

    if (view !== 'admin') {
      setCoinBash({show: true, amount: payment.coins});
      playCoinSound();
      setTimeout(() => setCoinBash({show: false, amount: 0}), 3000);
    } else {
      setPendingCoinBash(prev => prev + payment.coins);
    }

    if (payment.priceRand === 20 && (!isOwnPayment || !isAgent)) {
        setNotifications(prev => [{
           id: Date.now().toString(),
           text: isOwnPayment 
             ? 'Your R20,00 topup was approved! You are now a Verified Agent and received a R100,00 reward.'
             : `Approved topup of ${payment.coins}c for ${payment.userEmail || 'User'}.`
        }, ...prev]);
        setHasNotification(true);
    } else {
        setNotifications(prev => [{
           id: Date.now().toString(),
           text: isOwnPayment 
             ? `Your topup of ${payment.coins}c was approved.`
             : `Approved topup of ${payment.coins}c for ${payment.userEmail || 'User'}.`
        }, ...prev]);
        setHasNotification(true);
    }
    
    const updatedPayments = pendingPayments.filter(p => p.id !== id);
    setPendingPayments(updatedPayments);
    localStorage.setItem('timegig_pending_payments', JSON.stringify(updatedPayments));
  }

  const handleReject = async (id: string) => {
    const payment = pendingPayments.find(p => p.id === id);
    if (!payment) return;

    const isOwnPayment = !payment.userId || (user && payment.userId === user.id);

    if (supabase) {
      try {
        await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', id);
      } catch (err: any) {
        console.error('Error syncing rejection to Supabase:', err.message);
      }
    }

    setNotifications(prev => [{
       id: Date.now().toString(),
       text: isOwnPayment
         ? `Your topup of ${payment.coins}c was rejected.`
         : `Rejected topup of ${payment.coins}c for ${payment.userEmail || 'User'}.`
    }, ...prev]);
    setHasNotification(true);
    
    const updatedPayments = pendingPayments.filter(p => p.id !== id);
    setPendingPayments(updatedPayments);
    localStorage.setItem('timegig_pending_payments', JSON.stringify(updatedPayments));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 relative overflow-x-hidden">
      {/* Top Menu Bar */}
      {view !== 'chat' && view !== 'signup' && view !== 'login' && (
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0" id="top-menu">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl tracking-tight text-black font-display select-none">
                <span className="font-medium">Time</span><span className="font-extrabold">GiG</span><span className="text-[#FF2E2E] font-black">.</span>
              </h1>
            </div>
          </div>
          
          {/* Features at the top */}
          <div className="flex items-center space-x-2">
            {user?.email?.toLowerCase() === 'timegig2026@gmail.com' && (
              <button 
                className="flex items-center p-2 text-black hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                aria-label="Admin"
                id="btn-admin-top"
                onClick={() => {
                  setView('admin');
                  setActiveBottom(null);
                  setActiveTop('admin');
                }}
              >
                <Shield className={`w-5 h-5 text-black ${activeTop === 'admin' ? 'fill-black' : 'fill-white'}`} />
                {activeTop === 'admin' && <span className="text-xs font-medium pl-2 pr-1">Admin</span>}
              </button>
            )}

            <button 
              className="flex items-center relative p-2 text-black hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
              aria-label="Notifications"
              id="btn-notifications"
              onClick={() => {
                setHasNotification(false);
                if (activeTop === 'notifications') {
                  setActiveTop(null);
                } else {
                  setActiveTop('notifications');
                }
              }}
            >
              <motion.div
                animate={hasNotification && settings.notificationsEnabled ? { rotate: [0, -15, 15, -15, 15, 0] } : { rotate: 0 }}
                transition={{ repeat: hasNotification && settings.notificationsEnabled ? Infinity : 0, duration: 0.5, repeatDelay: 1 }}
              >
                <Bell className="w-5 h-5 text-black fill-white" />
              </motion.div>
              {hasNotification && settings.notificationsEnabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white"></span>
              )}
              {activeTop === 'notifications' && <span className="text-xs font-medium pl-2 pr-1">Notifications</span>}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowAppMenu(!showAppMenu)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center min-w-[40px] min-h-[40px]"
              >
                {uploadedFileUrl ? (
                  <img src={uploadedFileUrl} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 object-cover" />
                ) : (
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <AnimatePresence>
                {showAppMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAppMenu(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden"
                    >
                      <button 
                        onClick={() => {
                          setActiveTop('profile');
                          setShowAppMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 font-semibold"
                      >
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        My Profile
                      </button>
                      <button 
                        onClick={() => {
                          setView('settings');
                          setShowAppMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-semibold"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        Settings
                      </button>
                      <div className="border-t border-gray-100 my-0" />
                      <button 
                        onClick={() => {
                          setShowAppMenu(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-bold"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                      <button 
                        onClick={() => {
                          setView('about');
                          setShowAppMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-[10px] text-gray-400 hover:bg-gray-50 flex items-center gap-3 font-black uppercase tracking-widest border-t border-gray-50"
                      >
                        <Info className="w-3 h-3" />
                        About
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 ${view === 'chat' ? 'overflow-hidden' : 'overflow-y-auto p-4'}`} id="main-content">
        {activeTop === 'notifications' ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Notifications</h2>
              {notifications.length > 0 && (
                <button 
                  onClick={() => setNotifications([])}
                  className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <FeatureGuide feature="notifications" />
            {notifications.length === 0 ? (
              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(note => (
                  <div key={note.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-800 text-sm">
                    {note.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTop === 'profile' ? (
          <div className="max-w-md mx-auto space-y-4">
            <FeatureGuide feature="profile" />
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-3 overflow-hidden border-2 border-gray-200 relative">
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                {!settings.accountEnabled && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-lg tracking-tighter">Offline</span>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {userName}
                {isAgent && <BadgeCheck className="w-5 h-5 text-blue-500" />}
              </h2>
              <p className="text-gray-500 text-sm mb-4">{isAgent ? 'Verified Agent' : 'Standard User'}</p>
              
              <div className="w-full grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Province</p>
                  <p className="text-sm font-medium text-gray-800">{selectedProvince || 'Not set'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Location</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLocation || 'Not set'}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setView('profile-edit');
                  setActiveTop(null);
                }}
                className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-medium text-gray-800 mb-3">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{personalInfo.contactEmail || 'No email set'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{personalInfo.contactPhone || 'No phone set'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'profile-edit' ? (
          <div className="max-w-md mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
            </div>

            {/* Profile Picture */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <div className="relative group">
                <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-md">
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <label className="absolute bottom-4 right-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setProfilePic(url);
                      }
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Tap the plus to change photo</p>
            </div>

            {/* Personal Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Personal Information
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">School Level</label>
                <input 
                  type="text" 
                  value={personalInfo.schoolLevel}
                  onChange={(e) => setPersonalInfo({...personalInfo, schoolLevel: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="e.g. Bachelor of Commerce"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Experiences</label>
                <textarea 
                  value={personalInfo.experience}
                  onChange={(e) => setPersonalInfo({...personalInfo, experience: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[80px]"
                  placeholder="Briefly describe your work experience..."
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Contact Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={personalInfo.contactEmail}
                    onChange={(e) => setPersonalInfo({...personalInfo, contactEmail: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={personalInfo.contactPhone}
                    onChange={(e) => setPersonalInfo({...personalInfo, contactPhone: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="+27 12 345 6789"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Social Media Links
                </h3>
                <button 
                  onClick={() => setSocialLinks([...socialLinks, { platform: 'Facebook', url: '' }])}
                  className="p-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition-transform hover:scale-110"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {socialLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <select 
                    value={link.platform}
                    onChange={(e) => {
                      const newLinks = [...socialLinks];
                      newLinks[index].platform = e.target.value;
                      setSocialLinks(newLinks);
                    }}
                    className="w-1/3 px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option>WhatsApp</option>
                    <option>Facebook</option>
                    <option>Instagram</option>
                    <option>Twitter</option>
                    <option>LinkedIn</option>
                    <option>TikTok</option>
                  </select>
                  <input 
                    type="text" 
                    value={link.url}
                    onChange={(e) => {
                      const newLinks = [...socialLinks];
                      newLinks[index].url = e.target.value;
                      setSocialLinks(newLinks);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
                    placeholder="Username or Link"
                  />
                  {socialLinks.length > 1 && (
                    <button 
                      onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Location */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Province</label>
                  <select 
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value);
                      setSelectedLocation('');
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                
                {selectedProvince && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">City / Town</label>
                    <select 
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Location</option>
                      {locationsByProvince[selectedProvince].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button 
              onClick={async () => {
                if (!user) return;
                try {
                  if (supabase) {
                    const { error } = await supabase
                      .from('profiles')
                      .update({
                        user_name: userName,
                        profile_pic: profilePic,
                        school_level: personalInfo.schoolLevel,
                        experience: personalInfo.experience,
                        contact_email: personalInfo.contactEmail,
                        contact_phone: personalInfo.contactPhone
                      })
                      .eq('id', user.id);

                    if (error) throw error;
                  }

                  setShowPopup({
                    show: true,
                    title: 'Congratulations!',
                    subtitle: 'Your profile has been updated successfully.'
                  });
                  setNotifications(prev => [{
                    id: Date.now().toString(),
                    text: 'Congratulations! Your profile has been updated successfully.'
                  }, ...prev]);
                  setHasNotification(true);
                  setTimeout(() => {
                    setShowPopup({show: false, title: '', subtitle: ''});
                    setView('referral');
                    setActiveBottom('referral');
                  }, 3000);
                } catch (error: any) {
                  triggerAlert('Update Failed', error.message, 'error');
                }
              }}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all transform active:scale-95"
            >
              Save Profile
            </button>
          </div>
        ) : view === 'home' ? (
          <div className="max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center space-y-8 px-6 text-center">
            <div className="w-24 h-24 bg-black rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-12 transform hover:rotate-0 transition-transform duration-500">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
             <div className="space-y-4 font-display select-none">
              <h1 className="text-5xl tracking-tight text-black leading-tight">
                Start Earning with <br/>
                <span className="inline-block font-extrabold mt-2">
                  <span className="font-medium">Time</span><span className="font-black">GiG</span><span className="text-[#FF2E2E]">.</span>
                </span>
              </h1>
              <p className="text-gray-500 font-bold max-w-[300px] mx-auto text-sm uppercase tracking-wider font-sans">
                Join thousands of local professionals and find your next opportunity today.
              </p>
            </div>
            
            <div className="w-full space-y-4 pt-10">
              <button
                onClick={() => setView('signup')}
                className="w-full py-6 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_10px_0_0_rgba(0,0,0,1)] hover:bg-black transition-all active:translate-y-1 active:shadow-none"
              >
                Create Account
              </button>
              <button
                onClick={() => setView('gigs')}
                className="w-full py-6 bg-white text-black border-4 border-black rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95 shadow-[0_10px_0_0_rgba(220,38,38,1)]"
              >
                Browse Gigs
              </button>
            </div>
          </div>
        ) : view === 'signup' ? (
          <div className="max-w-lg mx-auto min-h-full flex flex-col justify-center px-6 py-12 relative">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF2E2E]/5 blur-[120px] rounded-full -z-10"></div>
            
            <div className="text-center space-y-2 mb-10 font-display select-none">
              <h2 className="text-4xl tracking-tight text-black">
                <span className="font-medium">Time</span><span className="font-black">GiG</span><span className="text-[#FF2E2E] font-black">.</span>
              </h2>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.25em]">Join the Revolution</p>
            </div>

            <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border border-gray-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF2E2E]/30 to-transparent"></div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Your Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF2E2E] transition-colors" />
                    <input 
                      type="email" 
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com" 
                      className="w-full pl-14 pr-6 py-5 bg-[#F7F7F7] border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-[#FF2E2E]/50 focus:ring-4 focus:ring-[#FF2E2E]/5 font-bold text-lg transition-all placeholder:text-gray-400 text-black" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Secure Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF2E2E] transition-colors" />
                    <input 
                      type="password" 
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••" 
                      className="w-full pl-14 pr-6 py-5 bg-[#F7F7F7] border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-[#FF2E2E]/50 focus:ring-4 focus:ring-[#FF2E2E]/5 font-bold text-lg transition-all placeholder:text-gray-400 text-black" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 bg-[#F7F7F7] rounded-2xl border border-transparent group cursor-pointer" onClick={() => setSignupForm(prev => ({ ...prev, acceptTerms: !prev.acceptTerms }))}>
                <div 
                  className={`w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center shrink-0 ${signupForm.acceptTerms ? 'bg-[#FF2E2E] border-[#FF2E2E] shadow-lg shadow-[#FF2E2E]/20' : 'bg-white border-gray-300 group-hover:border-[#FF2E2E]'}`}
                >
                  {signupForm.acceptTerms && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <p className="text-xs text-gray-500 font-bold leading-tight select-none">
                  I accept the <span className="text-gray-900 underline decoration-[#FF2E2E]/40 decoration-2">Terms of Service</span>
                </p>
              </div>

              <button 
                disabled={!signupForm.acceptTerms || !signupForm.email || !signupForm.password}
                onClick={handleSignup}
                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 text-sm ${signupForm.acceptTerms && signupForm.email && signupForm.password ? 'bg-[#FF2E2E] text-white hover:bg-[#D11A1A] shadow-[#FF2E2E]/20' : 'bg-[#F2F2F2] text-[#C1C1C1] cursor-not-allowed border-none'}`}
              >
                Create My Account
              </button>

              <div className="pt-4 text-center">
                <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                  Already a member? <span className="text-[#FF2E2E] underline ml-1 cursor-pointer hover:text-[#D11A1A] transition-colors" onClick={() => setView('login')}>Sign In</span>
                </p>
              </div>
            </div>
          </div>
        ) : view === 'login' ? (
          <div className="max-w-lg mx-auto min-h-full flex flex-col justify-center px-6 py-12 relative">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF2E2E]/5 blur-[120px] rounded-full -z-10"></div>

            <div className="text-center space-y-2 mb-10 font-display select-none">
              <h2 className="text-4xl tracking-tight text-black">
                <span className="font-medium">Time</span><span className="font-black">GiG</span><span className="text-[#FF2E2E] font-black">.</span>
              </h2>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.25em]">Welcome Back</p>
            </div>

            <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border border-gray-100 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF2E2E]/30 to-transparent"></div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF2E2E] transition-colors" />
                    <input 
                      type="email" 
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com" 
                      className="w-full pl-14 pr-6 py-5 bg-[#F7F7F7] border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-[#FF2E2E]/50 focus:ring-4 focus:ring-[#FF2E2E]/5 font-bold text-lg transition-all placeholder:text-gray-400 text-black" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Password</label>
                    <span className="text-[10px] font-black text-[#FF2E2E] uppercase tracking-widest underline cursor-pointer hover:text-[#D11A1A]">Forgot?</span>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF2E2E] transition-colors" />
                    <input 
                      type="password" 
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••" 
                      className="w-full pl-14 pr-6 py-5 bg-[#F7F7F7] border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-[#FF2E2E]/50 focus:ring-4 focus:ring-[#FF2E2E]/5 font-bold text-lg transition-all placeholder:text-gray-400 text-black" 
                    />
                  </div>
                </div>
              </div>

              <button 
                disabled={!loginForm.email || !loginForm.password}
                onClick={handleLogin}
                className={`w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 text-sm ${loginForm.email && loginForm.password ? 'bg-[#FF2E2E] text-white hover:bg-[#D11A1A] shadow-[#FF2E2E]/20' : 'bg-[#F2F2F2] text-[#C1C1C1] cursor-not-allowed border-none'}`}
              >
                Access Account
              </button>

              <div className="pt-4 text-center">
                <p className="text-xs text-gray-500 font-black uppercase tracking-widest">
                  Not a member? <span className="text-[#FF2E2E] underline ml-1 cursor-pointer hover:text-[#D11A1A] transition-colors" onClick={() => setView('signup')}>Join Today</span>
                </p>
              </div>
            </div>
          </div>
        ) : view === 'wallet' ? (
          <div className="max-w-md mx-auto space-y-4">
            <FeatureGuide feature="wallet" />
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="text-gray-500 font-medium mb-1">Coin Balance</h2>
              <div className="text-4xl font-bold text-gray-900">{coinBalance}c</div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Topup Options</h3>
              <div className="space-y-3">
                {[
                  { coins: '500c', price: 'R5,00' },
                  { coins: '1000c', price: 'R10,00' },
                  { coins: '2000c', price: 'R20,00' },
                ].map((option) => (
                  <button
                    key={option.coins}
                    onClick={() => {
                      setSelectedTopup(option);
                      setView('payment');
                      setFileUploaded(false);
                      setUploadedFileUrl(null);
                      setUploadedFileName(null);
                      setUploadedFileType(null);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <span className="font-semibold text-gray-800">{option.coins}</span>
                    <span className="text-gray-600">{option.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* User's Pending Payments Section */}
            {pendingPayments.filter(p => !user || p.userId === user.id).length > 0 && (
              <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Pending Proof Reviews</h3>
                <div className="space-y-3">
                  {pendingPayments
                    .filter(p => !user || p.userId === user.id)
                    .map((p) => (
                      <PendingPaymentItem
                        key={p.id}
                        payment={p}
                        onApprove={handleApprove}
                        onViewProof={() => setViewingDocument(p)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : view === 'payment' && selectedTopup ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center mb-6">
                <h2 className="text-xl font-medium text-gray-800">Bank Transfer Details</h2>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700 mb-6 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank:</span>
                  <span className="font-medium text-gray-900">Capitec</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name:</span>
                  <span className="font-medium text-gray-900">Matthews</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Number:</span>
                  <span className="font-medium text-gray-900">1334067366</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reference:</span>
                  <span className="font-medium text-red-600">{selectedTopup.coins}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200 mt-2">
                  <span className="text-gray-500">Amount to pay:</span>
                  <span className="font-semibold text-gray-900 text-base">{selectedTopup.price}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-800">Upload Proof of Payment</h3>
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => {
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                        setUploadedFileName(file.name);
                        setUploadedFileType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : ''));
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFileUploaded(true);
                          setUploadedFileUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      } else {
                        triggerAlert('Invalid File', 'Please upload an image or a PDF file.', 'error');
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all relative ${
                    fileUploaded 
                      ? 'border-green-400 bg-green-50/50' 
                      : isDragging 
                        ? 'border-[#FF2E2E] bg-red-50/10 scale-[1.02]' 
                        : 'border-gray-200 hover:border-[#FF2E2E]/40 hover:bg-gray-50'
                  }`}
                >
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setUploadedFileName(file.name);
                        setUploadedFileType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : ''));
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFileUploaded(true);
                          setUploadedFileUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {fileUploaded ? (
                    <div className="flex flex-col items-center justify-center p-2">
                      {uploadedFileType?.startsWith('image/') ? (
                        <div className="relative w-32 h-32 mb-3 rounded-lg overflow-hidden border border-green-200 shadow-sm">
                          <img 
                            src={uploadedFileUrl || ''} 
                            alt="Proof Preview" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm max-w-xs mb-3">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="text-xs font-semibold text-gray-900 truncate max-w-[160px]">{uploadedFileName || 'Document.pdf'}</p>
                            <p className="text-[10px] text-gray-400 font-mono">PDF Document</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-1" />
                        </div>
                      )}
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-0.5">Proof of Payment Ready</p>
                      <p className="text-[10px] text-gray-400">Tap or drag file to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900">Tap to select file</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG</p>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!fileUploaded) return;
                    setShowPopup({
                      show: true,
                      title: 'Payment Submitted',
                      subtitle: 'Your topup is under review.'
                    });
                    setHasNotification(true);
                    setNotifications(prev => [{
                      id: Date.now().toString(),
                      text: `Your topup request for ${selectedTopup.coins} is currently under review. Your balance will be updated upon approval.`
                    }, ...prev]);
                    
                    const coinsVal = parseInt(selectedTopup.coins.replace('c', ''));
                    const priceVal = parseInt(selectedTopup.price.replace('R', '').replace(',00', ''));
                    
                    const docUrl = uploadedFileUrl || 'https://placehold.co/600x800/e2e8f0/64748b?text=Proof+of+Payment';
                    const paymentId = Date.now().toString() + Math.random();
                    
                    const paymentObj = {
                      id: paymentId,
                      coins: coinsVal,
                      priceRand: priceVal,
                      documentUrl: docUrl,
                      userId: user ? user.id : undefined,
                      userEmail: user ? user.email : 'local@example.com'
                    };

                    if (supabase) {
                      supabase.from('payments').insert([{
                        user_id: user ? user.id : null,
                        user_email: user ? user.email : 'local@example.com',
                        coins: coinsVal,
                        price_rand: priceVal,
                        document_url: docUrl,
                        status: 'pending'
                      }]).then(({ error }) => {
                        if (error) {
                          console.error('Error saving payment to Supabase:', error.message);
                        } else {
                          fetchPayments();
                        }
                      });
                    }

                    setPendingPayments(prev => [...prev, paymentObj]);
                    
                    const savedLocal = localStorage.getItem('timegig_pending_payments');
                    const savedLocalList = savedLocal ? JSON.parse(savedLocal) : [];
                    localStorage.setItem('timegig_pending_payments', JSON.stringify([...savedLocalList, paymentObj]));

                    setView('wallet');
                    setUploadedFileUrl(null);
                    setFileUploaded(false);
                    setUploadedFileName(null);
                    setUploadedFileType(null);
                    
                    setTimeout(() => setShowPopup({show: false, title: '', subtitle: ''}), 4000);
                  }}
                  disabled={!fileUploaded}
                  className={`w-full py-3 rounded-lg font-medium text-white transition-colors focus:outline-none ${
                    fileUploaded ? 'bg-black hover:bg-gray-800 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Submit Payment
                </button>
              </div>
            </div>
          </div>
        ) : view === 'referral' ? (
          <div className="max-w-md mx-auto space-y-4">
            <FeatureGuide feature="referrals" />
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-2 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600" />
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                Referral program ends in 90 days. Cashout before the deadline!
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="text-gray-500 font-medium mb-1">Referral Balance</h2>
              <div className="text-4xl font-bold text-gray-900">R{referralBalance},00</div>
              {isAgent && (
                 <p className="text-sm text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                   <BadgeCheck className="w-4 h-4" /> Agent Verified
                 </p>
              )}
            </div>
            
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-800 mb-2">How it works</h3>
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4 mb-6">
                <li>Top up R20,00 (2000c) to become a verified Agent.</li>
                <li><strong>Option 1 (10 Referrals):</strong> Cashout at 10 valid referrals to receive 15% of the welcome reward (R15,00) and 15% commission (R3,00) per topup. (Total R45,00)</li>
                <li><strong>Option 2 (20 Referrals):</strong> Cashout at 20 valid referrals to receive 100% of the welcome reward (R100,00) and 25% commission (R5,00) per topup. (Total R200,00)</li>
                <li>A valid referral topup is exactly R20,00 (2000c). If they topup less (e.g. 500c or 1000c) or make a 2nd topup, you earn nothing.</li>
                <li>Payments are made after 12 hours or less.</li>
              </ul>

              {!isAgent ? (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-100">
                  You are not an agent yet. Top up R20,00 in the Wallet to get verified!
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Your Referral Link</p>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="flex-1 bg-white p-2 border border-gray-200 rounded text-sm text-gray-800 font-mono">app.com/ref/user123</code>
                      <button className="px-3 py-2 bg-black text-white rounded text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1">Copy</button>
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-gray-500">Referrals Progress</p>
                        <p className="text-xs font-bold text-gray-900">{validReferralsCount} / 20</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${Math.min((validReferralsCount / 20) * 100, 100)}%` }}></div>
                      </div>
                      
                      <div className="space-y-2">
                        {isEnteringBankingDetails ? (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                            <h4 className="text-sm font-medium text-gray-800">Enter Banking Details</h4>
                            <textarea
                              value={bankingDetails}
                              onChange={(e) => setBankingDetails(e.target.value)}
                              placeholder="e.g. FNB - Account Name - Account Number"
                              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-black focus:border-black outline-none h-20"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIsEnteringBankingDetails(false)}
                                className="flex-1 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={!bankingDetails.trim()}
                                onClick={() => {
                                  const amount = selectedTier === '10' ? (15 + (validReferralsCount * 3)) : referralBalance;
                                  setCashoutStatus('pending');
                                  setHasNotification(true);
                                  setNotifications(prev => [{
                                      id: Date.now().toString(),
                                      text: `Cashout for R${amount},00 requested! Payment will be made in 12 hours or less.`
                                  }, ...prev]);
                                  setAdminCashoutRequests(prev => [{
                                    id: Date.now().toString(),
                                    agentName: 'You (Current Agent)',
                                    profilePicUrl: 'https://i.pravatar.cc/150?u=current',
                                    bankingDetails: bankingDetails,
                                    validReferralsCount: validReferralsCount,
                                    amountOwed: amount,
                                    status: 'pending',
                                    tier: selectedTier || '10'
                                  }, ...prev]);
                                  setIsEnteringBankingDetails(false);
                                }}
                                className="flex-1 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                Submit Request
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button 
                              disabled={validReferralsCount < 10 || cashoutStatus === 'pending'}
                              onClick={() => {
                                setSelectedTier('10');
                                setIsEnteringBankingDetails(true);
                              }}
                              className={`w-full py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
                                validReferralsCount >= 10 && cashoutStatus !== 'pending'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {cashoutStatus === 'pending' ? 'Cashout Pending' : `Cashout R${15 + (validReferralsCount * 3)},00 (10+ Tier)`}
                            </button>

                            <button 
                              disabled={validReferralsCount < 20 || cashoutStatus === 'pending'}
                              onClick={() => {
                                setSelectedTier('20');
                                setIsEnteringBankingDetails(true);
                              }}
                              className={`w-full py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
                                validReferralsCount >= 20 && cashoutStatus !== 'pending'
                                  ? 'bg-black text-white hover:bg-gray-800 focus:ring-black'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {cashoutStatus === 'pending' ? 'Cashout Pending' : `Cashout R${referralBalance},00 (20+ Tier)`}
                            </button>
                          </>
                        )}
                      </div>
                      {cashoutStatus === 'pending' && (
                        <p className="text-xs text-center text-green-600 mt-2 font-medium">
                          Payment will be processed within 12 hours.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Top Agents</h3>
              <div className="space-y-4">
                {[].length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">No agents verified yet.</p>
                ) : (
                  [].map((agent: any) => (
                    <div 
                      key={agent.name} 
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setViewingProfile(agent)}
                    >
                      <div className="flex items-center gap-3">
                        <img src={agent.pic} alt={agent.name} className="w-10 h-10 rounded-full border border-gray-100" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{agent.role}</p>
                        </div>
                      </div>
                      <button className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">View</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : view === 'chat' ? (
          <div className="w-full h-full flex flex-col bg-gray-50">
            {!selectedContact ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setView('home');
                        setActiveBottom('gigs');
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900">Messages</h2>
                  </div>
                </div>
                
                <div className="p-4 bg-white border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search contacts..." 
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={() => setContactActionMenu(null)}>
                  <FeatureGuide feature="chat" />
                  {contacts
                    .filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                    .map(contact => (
                    <div 
                      key={contact.name}
                      onPointerDown={() => {
                        const timer = setTimeout(() => {
                          setContactActionMenu(contact.name);
                          if (window.navigator.vibrate) window.navigator.vibrate(50);
                        }, 1000);
                        setLongPressTimer(timer);
                      }}
                      onPointerUp={() => {
                        if (longPressTimer) {
                          clearTimeout(longPressTimer);
                          setLongPressTimer(null);
                        }
                      }}
                      onPointerLeave={() => {
                        if (longPressTimer) {
                          clearTimeout(longPressTimer);
                          setLongPressTimer(null);
                        }
                      }}
                      onClick={(e) => {
                        if (!contactActionMenu) {
                          setSelectedContact(contact);
                        }
                      }}
                      className={`flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all cursor-pointer group shadow-sm relative ${contact.blocked ? 'opacity-60 border-red-100' : 'border-gray-100 hover:border-black'}`}
                    >
                      <div className="relative">
                        <img src={contact.pic} alt={contact.name} className="w-12 h-12 rounded-full border border-gray-100" />
                        {!contact.blocked && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                        {contact.blocked && <div className="absolute inset-0 bg-white/40 flex items-center justify-center rounded-full"><Shield className="w-4 h-4 text-red-500" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{contact.name}</h3>
                          {contact.blocked && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Blocked</span>}
                        </div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider truncate">{contact.role}</p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />

                      <AnimatePresence>
                        {contactActionMenu === contact.name && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-around px-4 border border-black shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={() => {
                                setContacts(prev => prev.map(c => c.name === contact.name ? { ...c, blocked: !c.blocked } : c));
                                setContactActionMenu(null);
                              }}
                              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${contact.blocked ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                            >
                              <Shield className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase">{contact.blocked ? 'Unblock' : 'Block'}</span>
                            </button>
                            
                            <button 
                              onClick={() => {
                                setContacts(prev => prev.filter(c => c.name !== contact.name));
                                setContactActionMenu(null);
                              }}
                              className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase">Remove</span>
                            </button>

                            <button 
                              onClick={() => setContactActionMenu(null)}
                              className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                              <X className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase">Cancel</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  {contacts.filter(c => c.name.toLowerCase().includes(contactSearchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-sm">No contacts found</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedContact(null)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-black overflow-hidden flex items-center justify-center">
                        <img src={selectedContact.pic} alt={selectedContact.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{selectedContact.name}</p>
                        {selectedContact.blocked ? (
                          <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Blocked</p>
                        ) : (
                          <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const isBlocked = !selectedContact.blocked;
                      setContacts(prev => prev.map(c => c.name === selectedContact.name ? { ...c, blocked: isBlocked } : c));
                      setSelectedContact(prev => prev ? { ...prev, blocked: isBlocked } : null);
                    }}
                    className={`p-2 rounded-lg transition-colors ${selectedContact.blocked ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                  >
                    <Shield className="w-5 h-5" />
                  </button>
                </div>
                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 p-4 no-scrollbar pb-32"
                  onClick={() => setReactingMessageId(null)}
                >
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} relative group`}>
                      <div 
                        onDoubleClick={(e) => { e.stopPropagation(); setReactingMessageId(msg.id); }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={() => handleMessageInteraction(msg.id, 'start')}
                        onPointerUp={() => handleMessageInteraction(msg.id, 'end')}
                        onPointerLeave={() => handleMessageInteraction(msg.id, 'end')}
                        className={`max-w-[80%] p-3 rounded-2xl text-sm relative transition-all active:scale-[0.98] cursor-pointer ${msg.sender === 'user' ? 'bg-black text-white rounded-tr-none shadow-lg' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'} ${reactingMessageId === msg.id ? 'z-[60]' : 'z-0'}`}
                      >
                        <AnimatePresence>
                          {reactingMessageId === msg.id && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 8, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.8 }}
                              className={`absolute top-full ${msg.sender === 'user' ? 'right-0' : 'left-0'} z-[100] bg-white shadow-2xl border border-gray-100 rounded-full p-2 flex gap-1 items-center`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    setChatMessages(prev => prev.map(m => 
                                      m.id === msg.id ? { ...m, liked: true, reaction: emoji } : m
                                    ));
                                    setReactingMessageId(null);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors text-xl"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {msg.media && msg.media.length > 0 && (
                          <div className={`grid gap-2 mb-2 ${msg.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {msg.media.map((item, idx) => (
                              item.type === 'video' ? (
                                <div key={idx} className="relative group/media" onClick={(e) => { e.stopPropagation(); setFullscreenMedia(item); }}>
                                  <video src={item.url} className="rounded-lg w-full max-h-48 object-cover cursor-pointer" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                    <Video className="w-8 h-8 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <img 
                                  key={idx} 
                                  src={item.url} 
                                  alt="Media" 
                                  className="rounded-lg w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                  onClick={(e) => { e.stopPropagation(); setFullscreenMedia(item); }}
                                />
                              )
                            ))}
                          </div>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                        <div className="flex items-center justify-between mt-1 gap-4">
                          <p className={`text-[10px] ${msg.sender === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>{msg.time}</p>
                          {msg.liked && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center">
                              {msg.reaction ? (
                                <span className="text-[14px] leading-none">{msg.reaction}</span>
                              ) : (
                                <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {messageMenuId === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute z-50 bg-white border border-gray-100 rounded-xl shadow-2xl p-1 mt-2 top-full flex flex-col min-w-[120px]"
                        >
                          <button 
                            onClick={() => startEditMessage(msg.id, msg.text || '')}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>
                          <button 
                            onClick={() => deleteMessage(msg.id)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                          <button onClick={() => setMessageMenuId(null)} className="px-3 py-2 text-[10px] text-gray-400 text-center uppercase font-bold">Cancel</button>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : view === 'gigs' ? (
          <div className="max-w-4xl mx-auto space-y-6 pb-24 relative">
            <FeatureGuide feature="gigs" />
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">GiGs Dashboard</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-md">
                Find available opportunities or post your own. New gigs are posted daily.
              </p>
              
              <div className="w-full max-w-sm mt-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search gigs..." 
                    value={gigSearchQuery}
                    onChange={(e) => setGigSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setView('create-gig')}
                    className="flex flex-col items-center justify-center p-4 bg-black text-white rounded-xl font-medium shadow-lg hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="text-xs">Create GiG</span>
                  </button>
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-800 rounded-xl font-medium border border-gray-200">
                    <span className="text-xl font-bold">{gigs.length}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Live GiGs</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {gigs.filter(g => g.title.toLowerCase().includes(gigSearchQuery.toLowerCase())).length === 0 ? (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">No GiGs found</p>
                    <p className="text-xs text-gray-400">Be the first to create an opportunity!</p>
                  </div>
                </div>
              ) : (
                gigs.filter(g => g.title.toLowerCase().includes(gigSearchQuery.toLowerCase())).map((gig) => (
                  <div key={gig.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedGig(gig)}>
                    <div className="h-36 w-full relative overflow-hidden">
                      <img src={gig.images[0]} alt={gig.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">R{gig.budget}</div>
                      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md text-black text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                        <ImageIcon className="w-3 h-3" /> {gig.images.length}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 text-sm truncate leading-tight mb-0.5">{gig.title}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <p className="text-[10px] text-gray-500 font-medium truncate">{gig.location}, {gig.province}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact({ name: gig.owner.name, role: 'Gig Owner', pic: gig.owner.pic });
                          setChatMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            sender: 'user',
                            text: `Hi, I'm interested in your gig: "${gig.title}". Is it still available?`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }]);
                          setView('chat');
                        }}
                        className="w-full py-2 bg-gray-50 hover:bg-black hover:text-white text-black text-[10px] font-bold rounded-lg transition-all border border-gray-100"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : view === 'create-gig' ? (
          <div className="max-w-2xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">Create a New GiG</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              {/* Media Upload */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Upload Images (Max 5)</label>
                <div className="grid grid-cols-3 gap-3">
                  {newGig.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewGig({...newGig, images: newGig.images.filter((_, i) => i !== idx)})}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newGig.images.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold">Add Photo</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            const newImages = Array.from(files).map((f: any) => URL.createObjectURL(f));
                            setNewGig({...newGig, images: [...newGig.images, ...newImages].slice(0, 5)});
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Gig Title</label>
                  <input 
                    type="text" 
                    value={newGig.title}
                    onChange={(e) => setNewGig({...newGig, title: e.target.value})}
                    placeholder="e.g. Professional Dog Walker"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Budget (Rands)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R</span>
                    <input 
                      type="number" 
                      value={newGig.budget}
                      onChange={(e) => setNewGig({...newGig, budget: e.target.value})}
                      placeholder="e.g. 500"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Description</label>
                  <textarea 
                    value={newGig.description}
                    onChange={(e) => setNewGig({...newGig, description: e.target.value})}
                    placeholder="Describe your service in detail..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none transition-all min-h-[120px] resize-none"
                  />
                </div>
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
                  <select 
                    value={newGig.category}
                    onChange={(e) => setNewGig({...newGig, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                  >
                    <option value="">Select Category</option>
                    {gigCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Province</label>
                  <select 
                    value={newGig.province}
                    onChange={(e) => setNewGig({...newGig, province: e.target.value, location: ''})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {newGig.province && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Specific Location</label>
                  <select 
                    value={newGig.location}
                    onChange={(e) => setNewGig({...newGig, location: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                  >
                    <option value="">Select Location</option>
                    {locationsByProvince[newGig.province].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              <button 
                onClick={async () => {
                  if (!newGig.title || !newGig.images.length || !user) return;
                  try {
                    const createdGig = {
                      id: 'sandbox-gig-' + Date.now(),
                      title: newGig.title,
                      description: newGig.description,
                      category: newGig.category,
                      province: newGig.province,
                      location: newGig.location,
                      images: newGig.images,
                      price: 'R' + newGig.budget,
                      owner_id: user.id,
                      owner: { name: userName, pic: profilePic }
                    };

                    if (supabase) {
                      const { error } = await supabase
                        .from('gigs')
                        .insert([{
                          title: newGig.title,
                          description: newGig.description,
                          category: newGig.category,
                          province: newGig.province,
                          location: newGig.location,
                          images: newGig.images,
                          budget: newGig.budget,
                          owner_id: user.id,
                          owner: { name: userName, pic: profilePic }
                        }]);

                      if (error) throw error;
                      fetchGigs();
                    } else {
                      setGigs(prev => [createdGig as any, ...prev]);
                    }

                    setShowPopup({
                      show: true,
                      title: 'GiG Created!',
                      subtitle: 'Your opportunity is now live for seekers to find.'
                    });
                    setNotifications(prev => [{
                      id: Date.now().toString(),
                      text: `Your GiG "${newGig.title}" has been published successfully.`
                    }, ...prev]);
                    setHasNotification(true);
                    setTimeout(() => {
                      setShowPopup({show: false, title: '', subtitle: ''});
                      setView('gigs');
                      setNewGig({title: '', description: '', category: '', province: '', location: '', images: [], budget: ''});
                    }, 3000);
                  } catch (error: any) {
                    triggerAlert('Creation Failed', error.message, 'error');
                  }
                }}
                className="w-full py-4 bg-black text-white rounded-xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95"
              >
                Publish GiG
              </button>
            </div>
          </div>
        ) : view === 'seekers' ? (
          <div className="max-w-4xl mx-auto space-y-6 pb-24 relative">
            <FeatureGuide feature="seekers" />
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Find Seekers</h2>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-md">
                Connect with clients looking for your specific skill set. Review requirements and start collaborating.
              </p>
              
              <div className="w-full max-w-sm mt-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search seekers..." 
                    value={seekerSearchQuery}
                    onChange={(e) => setSeekerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setView('create-seeker')}
                    className="flex flex-col items-center justify-center p-4 bg-green-600 text-white rounded-xl font-medium shadow-lg hover:bg-green-700 transition-all active:scale-95"
                  >
                    <Plus className="w-6 h-6 mb-2" />
                    <span className="text-xs">Create Profile</span>
                  </button>
                  <div className="flex flex-col items-center justify-center p-4 bg-gray-100 text-gray-800 rounded-xl font-medium border border-gray-200">
                    <span className="text-xl font-bold">{seekers.length}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Seekers</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {seekers.filter(s => s.name.toLowerCase().includes(seekerSearchQuery.toLowerCase()) || s.industry.toLowerCase().includes(seekerSearchQuery.toLowerCase())).length === 0 ? (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                    <Search className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">No seekers found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search or check back later.</p>
                  </div>
                </div>
              ) : (
                seekers.filter(s => s.name.toLowerCase().includes(seekerSearchQuery.toLowerCase()) || s.industry.toLowerCase().includes(seekerSearchQuery.toLowerCase())).map((seeker) => (
                  <div key={seeker.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedSeeker(seeker)}>
                    <div className="h-36 w-full relative overflow-hidden">
                      <img src={seeker.images[0]} alt={seeker.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">Active</div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 text-sm truncate leading-tight mb-0.5">{seeker.name}</h3>
                      <p className="text-[10px] text-gray-500 font-medium truncate mb-1">{seeker.industry}</p>
                      <p className="text-[11px] text-green-600 font-black">{seeker.rate}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContact({ name: seeker.owner.name, role: 'Seeker', pic: seeker.owner.pic });
                          setChatMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            sender: 'user',
                            text: `Hi ${seeker.name}, I'm interested in your services for "${seeker.industry}".`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }]);
                          setView('chat');
                        }}
                        className="mt-3 w-full py-2 bg-gray-50 hover:bg-green-600 hover:text-white text-black text-[10px] font-bold rounded-lg transition-all border border-gray-100"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : view === 'create-seeker' ? (
          <div className="max-w-2xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">Create Seeker Profile</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              {/* Media Upload */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Upload Images (Max 5)</label>
                <div className="grid grid-cols-3 gap-3">
                  {newSeeker.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setNewSeeker({...newSeeker, images: newSeeker.images.filter((_, i) => i !== idx)})}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newSeeker.images.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <ImageIcon className="w-6 h-6 text-gray-300 mb-1" />
                      <span className="text-[10px] text-gray-400 font-bold">Add Photo</span>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            const newImages = Array.from(files).map((f: any) => URL.createObjectURL(f));
                            setNewSeeker({...newSeeker, images: [...newSeeker.images, ...newImages].slice(0, 5)});
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Industry / Skill</label>
                  <input 
                    type="text" 
                    value={newSeeker.industry}
                    onChange={(e) => setNewSeeker({...newSeeker, industry: e.target.value})}
                    placeholder="e.g. Graphic Designer, Plumber"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Rate (e.g. R200/hr)</label>
                  <input 
                    type="text" 
                    value={newSeeker.rate}
                    onChange={(e) => setNewSeeker({...newSeeker, rate: e.target.value})}
                    placeholder="e.g. R200/hr"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Service Information</label>
                  <textarea 
                    value={newSeeker.needs}
                    onChange={(e) => setNewSeeker({...newSeeker, needs: e.target.value})}
                    placeholder="Tell us about the services you offer..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none transition-all min-h-[120px] resize-none"
                  />
                </div>
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
                  <select 
                    value={newSeeker.category}
                    onChange={(e) => setNewSeeker({...newSeeker, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none"
                  >
                    <option value="">Select Category</option>
                    {gigCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Province</label>
                  <select 
                    value={newSeeker.province}
                    onChange={(e) => setNewSeeker({...newSeeker, province: e.target.value, location: ''})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {newSeeker.province && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Specific Location</label>
                  <select 
                    value={newSeeker.location}
                    onChange={(e) => setNewSeeker({...newSeeker, location: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 outline-none"
                  >
                    <option value="">Select Location</option>
                    {locationsByProvince[newSeeker.province].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              <button 
                onClick={async () => {
                  if (!newSeeker.industry || !newSeeker.images.length || !user) return;
                  try {
                    const createdSeeker = {
                      id: 'sandbox-seeker-' + Date.now(),
                      name: userName,
                      industry: newSeeker.industry,
                      needs: newSeeker.needs,
                      category: newSeeker.category,
                      province: newSeeker.province,
                      location: newSeeker.location,
                      images: newSeeker.images,
                      rate: newSeeker.rate,
                      owner_id: user.id,
                      owner: { name: userName, pic: profilePic }
                    };

                    if (supabase) {
                      const { error } = await supabase
                        .from('seekers')
                        .insert([{
                          name: userName,
                          industry: newSeeker.industry,
                          needs: newSeeker.needs,
                          category: newSeeker.category,
                          province: newSeeker.province,
                          location: newSeeker.location,
                          images: newSeeker.images,
                          rate: newSeeker.rate,
                          owner_id: user.id,
                          owner: { name: userName, pic: profilePic }
                        }]);

                      if (error) throw error;
                      fetchSeekers();
                    } else {
                      setSeekers(prev => [createdSeeker as any, ...prev]);
                    }

                    setShowPopup({
                      show: true,
                      title: 'Profile Created!',
                      subtitle: 'Your seeker profile is now live for clients to find.'
                    });
                    setTimeout(() => {
                      setShowPopup({show: false, title: '', subtitle: ''});
                      setView('seekers');
                      setNewSeeker({name: '', industry: '', needs: '', category: '', province: '', location: '', images: [], rate: ''});
                    }, 3000);
                  } catch (error: any) {
                    triggerAlert('Creation Failed', error.message, 'error');
                  }
                }}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
              >
                Publish Seeker Profile
              </button>
            </div>
          </div>
        ) : view === 'admin' ? (
          user?.email?.toLowerCase() === 'timegig2026@gmail.com' ? (
            <div className="max-w-md mx-auto space-y-4">
            <FeatureGuide feature="admin" />
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="text-gray-500 font-medium mb-1">Total Admin Revenue</h2>
              <div className="text-4xl font-bold text-gray-900">R{referralProfit + normalTopupBalance},00</div>
              <p className="text-xs text-gray-400 mt-1">Sum of Referral Profit & Normal Topup Profit</p>
            </div>

            <div className="p-6 bg-green-50 rounded-xl shadow-sm border border-green-100 flex flex-col items-center">
              <h2 className="text-green-700 font-medium mb-1">Profit to Take Home</h2>
              <div className="text-4xl font-bold text-green-800">R{referralProfit + normalTopupBalance},00</div>
              <p className="text-xs text-green-600 mt-1">R{referralProfit} (Referral Profit) + R{normalTopupBalance} (Normal Profit)</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <h2 className="text-gray-500 font-medium text-sm mb-1 leading-tight">20-Tier Ref Profit</h2>
                <div className="text-xl font-bold text-gray-900">R{profitFrom20Tier},00</div>
                <p className="text-[10px] text-gray-400 mt-1">75% profit (R15) per topup</p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <h2 className="text-gray-500 font-medium text-sm mb-1 leading-tight">Total Agent Payouts</h2>
                <div className="text-xl font-bold text-gray-900">R{agentPayouts},00</div>
                <p className="text-[10px] text-gray-400 mt-1">Sum of rewards & commissions</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center text-center">
                <h2 className="text-blue-700 font-medium text-sm mb-1 leading-tight">10-Tier Ref Profit</h2>
                <div className="text-xl font-bold text-blue-900">R{profitFrom10Tier},00</div>
                <p className="text-[10px] text-blue-500 mt-1">85% profit (R17) per topup</p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="text-gray-500 font-medium mb-1">Normal Topup Profit</h2>
              <div className="text-4xl font-bold text-gray-900">R{normalTopupBalance},00</div>
              <p className="text-xs text-gray-400 mt-1">100% profit from normal topups</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-800">Pending Approvals</h3>
              </div>
              <div className="p-4 space-y-3">
                {pendingPayments.length === 0 ? (
                   <p className="text-sm text-gray-500 text-center py-4">No pending payments</p>
                ) : (
                   pendingPayments.map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                         <div>
                            <p className="font-medium text-gray-900">{payment.coins}c</p>
                            <p className="text-xs text-gray-500">R{payment.priceRand},00</p>
                            {payment.userEmail && (
                               <p className="text-[10px] text-gray-400 font-mono mt-0.5">{payment.userEmail}</p>
                            )}
                         </div>
                         <div className="flex items-center gap-2">
                           <button 
                              onClick={() => setViewingDocument(payment)}
                              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-md focus:outline-none"
                              aria-label="View Document"
                           >
                             <FileText className="w-5 h-5" />
                           </button>
                           <button 
                              onClick={() => handleApprove(payment.id)}
                              className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
                           >
                             Approve
                           </button>
                         </div>
                      </div>
                   ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-800">Agent Cashout Requests</h3>
              </div>
              <div className="p-4 space-y-3">
                {adminCashoutRequests.length === 0 ? (
                   <p className="text-sm text-gray-500 text-center py-4">No pending cashouts</p>
                ) : (
                   adminCashoutRequests.map(req => (
                      <div key={req.id} className="p-4 border border-gray-200 rounded-lg space-y-3 relative overflow-hidden">
                         {req.tier && (
                           <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold uppercase rounded-bl-lg ${req.tier === '10' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                             {req.tier}-Tier
                           </div>
                         )}
                         <div className="flex items-center gap-3">
                           <img src={req.profilePicUrl} alt={req.agentName} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                           <div>
                             <p className="font-medium text-gray-900 leading-tight">{req.agentName}</p>
                             <p className="text-xs text-gray-500">{req.validReferralsCount} Valid Referrals</p>
                           </div>
                         </div>
                         <div className="bg-gray-50 p-2 rounded border border-gray-100">
                           <p className="text-xs text-gray-500 mb-1">Banking Details</p>
                           <p className="text-sm font-mono text-gray-800 break-all">{req.bankingDetails}</p>
                         </div>
                         <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                           <div>
                             <p className="text-xs text-gray-500">Amount Owed</p>
                             <p className="font-bold text-gray-900">R{req.amountOwed},00</p>
                           </div>
                           <button 
                              onClick={() => {
                                setAdminCashoutRequests(prev => prev.filter(p => p.id !== req.id));
                                setAgentPayouts(prev => prev + req.amountOwed);
                                
                                // Deduct Welcome Reward from specific tier profit for accurate tracking
                                if (req.tier === '10') {
                                  setProfitFrom10Tier(prev => prev - 15);
                                  setReferralProfit(prev => prev - 15);
                                } else if (req.tier === '20') {
                                  setProfitFrom20Tier(prev => prev - 100);
                                  setReferralProfit(prev => prev - 100);
                                }

                                if (req.agentName === 'You (Current Agent)') {
                                  setCashoutStatus('none');
                                  setReferralBalance(0);
                                  setValidReferralsCount(0);
                                  setHasNotification(true);
                                  setNotifications(n => [{
                                      id: Date.now().toString(),
                                      text: `Your cashout of R${req.amountOwed},00 was paid!`
                                  }, ...n]);
                                } else {
                                  setHasNotification(true);
                                  setNotifications(n => [{
                                      id: Date.now().toString(),
                                      text: `Paid R${req.amountOwed},00 to ${req.agentName}`
                                  }, ...n]);
                                }
                              }}
                              className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
                           >
                             Mark Paid
                           </button>
                         </div>
                      </div>
                   ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium text-gray-800">Simulation Controls</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Test Only</span>
              </div>
              <div className="p-4 grid grid-cols-1 gap-2">
                <button 
                   onClick={() => {
                     const id = Date.now().toString();
                     const coins = [500, 1000, 2000][Math.floor(Math.random() * 3)];
                     const price = coins / 100;
                     setPendingPayments(prev => [...prev, {
                       id,
                       coins,
                       priceRand: price,
                       documentUrl: `https://i.pravatar.cc/150?u=${id}`
                     }]);
                     setHasNotification(true);
                     setNotifications(n => [{
                        id: Date.now().toString(),
                        text: `New simulated topup request: ${coins}c (R${price},00)`
                     }, ...n]);
                   }}
                   className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  Simulate New Topup Request
                </button>
                
                <button 
                   onClick={() => {
                     const id = Date.now().toString();
                     const names = ['Lindiwe Sisulu', 'Naledi Pandor', 'Cyril Ramaphosa', 'Julius Malema'];
                     const name = names[Math.floor(Math.random() * names.length)];
                     const tier = Math.random() > 0.5 ? '10' : '20';
                     const amount = tier === '10' ? 45 : 200;
                     setAdminCashoutRequests(prev => [{
                       id,
                       agentName: name,
                       profilePicUrl: `https://i.pravatar.cc/150?u=${id}`,
                       bankingDetails: 'Standard Bank - 987654321',
                       validReferralsCount: tier === '10' ? 10 : 20,
                       amountOwed: amount,
                       status: 'pending',
                       tier
                     }, ...prev]);
                     setHasNotification(true);
                     setNotifications(n => [{
                        id: Date.now().toString(),
                        text: `New ${tier}-tier cashout request from agent: ${name}`
                     }, ...n]);
                   }}
                   className="w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  Simulate Agent Cashout Request
                </button>

                <button 
                   onClick={() => {
                     setReferralProfit(prev => prev + 15);
                     setProfitFrom20Tier(prev => prev + 15);
                     setHasNotification(true);
                     setNotifications(n => [{
                        id: Date.now().toString(),
                        text: `Simulated a referral topup: Admin +R15, Agent +R5 (25% Tier)`
                     }, ...n]);
                   }}
                   className="w-full py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors border border-green-200"
                >
                  Simulate 20-Tier Referral Sale (R20)
                </button>

                <button 
                   onClick={() => {
                     setReferralProfit(prev => prev + 17);
                     setProfitFrom10Tier(prev => prev + 17);
                     setHasNotification(true);
                     setNotifications(n => [{
                        id: Date.now().toString(),
                        text: `Simulated a referral topup: Admin +R17, Agent +R3 (15% Tier)`
                     }, ...n]);
                   }}
                   className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  Simulate 10-Tier Referral Sale (R20)
                </button>
              </div>
            </div>
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <Shield className="w-16 h-16 text-gray-200" />
              <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
              <p className="text-gray-500">Only authorized administrators can access this feature.</p>
              <button onClick={() => setView('home')} className="px-6 py-2 bg-black text-white rounded-lg">Go Home</button>
            </div>
          )
        ) : view === 'settings' ? (
          <div className="max-w-md mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            </div>
            <FeatureGuide feature="settings" />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Audio & Alerts</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${settings.soundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                      {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">App Sound</p>
                      <p className="text-[10px] text-gray-500">Toggle application sound effects</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <motion.div 
                      animate={{ x: settings.soundEnabled ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${settings.notificationsEnabled ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Notification Messages</p>
                      <p className="text-[10px] text-gray-500">Enable or disable push alerts</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }))}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.notificationsEnabled ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <motion.div 
                      animate={{ x: settings.notificationsEnabled ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account & Security</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button 
                  onClick={() => setView('change-password')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Change Password</p>
                      <p className="text-[10px] text-gray-500">Update your security credentials</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
                <button 
                  onClick={() => setView('set-pin')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${settings.pinEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">PIN Code Lock</p>
                      <p className="text-[10px] text-gray-500">{settings.pinEnabled ? 'Secure PIN access enabled' : 'Set a 4-digit security PIN'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${settings.accountEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {settings.accountEnabled ? <Power className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{settings.accountEnabled ? 'Account Active' : 'Account Disabled'}</p>
                      <p className="text-[10px] text-gray-500">Enable or disable your account</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newState = !settings.accountEnabled;
                      setSettings(prev => ({ ...prev, accountEnabled: newState }));
                      setShowPopup({ 
                        show: true, 
                        title: newState ? 'Account Enabled' : 'Account Disabled', 
                        subtitle: newState ? 'Your account is now active.' : 'Your account has been disabled.' 
                      });
                    }}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.accountEnabled ? 'bg-black' : 'bg-red-500'}`}
                  >
                    <motion.div 
                      animate={{ x: settings.accountEnabled ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Support</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button 
                  onClick={() => setView('about')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <Info className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">About TimeGiG</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">TimeGiG v1.0.42</p>
            </div>
          </div>
        ) : view === 'about' ? (
          <div className="max-w-md mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">About TimeGiG</h2>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 text-center border-b border-gray-50">
                <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl tracking-tight text-black font-display select-none">
                  <span className="font-medium">Time</span><span className="font-black">GiG</span><span className="text-[#FF2E2E] font-black">.</span>
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Version 1.0.42</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900">The Ultimate GiG Marketplace</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    TimeGiG is a revolutionary platform designed to connect skilled individuals with local opportunities. Whether you're looking for a quick task or a long-term project, we provide the tools to make it happen.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                    <h5 className="text-xs font-bold text-gray-900">Secure Payments</h5>
                    <p className="text-[10px] text-gray-500 mt-1">Integrated wallet and secure transactions.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <BadgeCheck className="w-5 h-5 text-blue-600 mb-2" />
                    <h5 className="text-xs font-bold text-gray-900">Verified Agents</h5>
                    <p className="text-[10px] text-gray-500 mt-1">Work with trusted professionals.</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Global Vision</p>
                      <p className="text-xs text-gray-500">Connecting communities worldwide.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-600">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">User Focused</p>
                      <p className="text-xs text-gray-500">Designed with your needs in mind.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-medium">© 2026 TimeGiG Inc. All rights reserved.</p>
              </div>
            </div>
          </div>
        ) : view === 'change-password' ? (
          <div className="max-w-md mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-gray-900">New Password</h2>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" 
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                    placeholder="Enter current password" 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                    placeholder="Minimum 8 characters" 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative">
                  <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="password" 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                    placeholder="Repeat new password" 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5" 
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
                    setShowPopup({ show: true, title: 'Error', subtitle: 'Please fill in all fields.' });
                    return;
                  }
                  if (passwordForm.new !== passwordForm.confirm) {
                    setShowPopup({ show: true, title: 'Error', subtitle: 'New passwords do not match.' });
                    return;
                  }
                  setShowPopup({ show: true, title: 'Success', subtitle: 'Your password has been updated.' });
                  setTimeout(() => {
                    setShowPopup({ show: false, title: '', subtitle: '' });
                    setView('settings');
                    setPasswordForm({ current: '', new: '', confirm: '' });
                  }, 2000);
                }}
                className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg mt-4 active:scale-95"
              >
                Update Password
              </button>
            </div>
          </div>
        ) : view === 'set-pin' ? (
          <div className="max-w-md mx-auto h-full flex flex-col pb-24">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-xl font-bold text-gray-900">Set 4-Digit PIN</h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-gray-500">Enter a secure PIN for login</p>
                <div className="flex gap-4 mt-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pinForm.length >= i ? 'bg-black border-black scale-110' : 'bg-gray-100 border-gray-200'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => pinForm.length < 4 && setPinForm(prev => prev + num)}
                    className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-50 active:scale-90 transition-all shadow-sm"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => setPinForm('')}
                  className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-red-500"
                >
                  Clear
                </button>
                <button
                  onClick={() => pinForm.length < 4 && setPinForm(prev => prev + '0')}
                  className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-50 active:scale-90 transition-all shadow-sm"
                >
                  0
                </button>
                <button 
                  onClick={() => setPinForm(prev => prev.slice(0, -1))}
                  className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-gray-500"
                >
                  Del
                </button>
              </div>

              <div className="w-full max-w-[280px]">
                <button 
                  disabled={pinForm.length !== 4}
                  onClick={() => {
                    setSettings(prev => ({ ...prev, pinEnabled: true, pinCode: pinForm }));
                    setShowPopup({ show: true, title: 'PIN Set', subtitle: 'PIN lock has been enabled successfully.' });
                    setTimeout(() => {
                      setShowPopup({ show: false, title: '', subtitle: '' });
                      setView('settings');
                      setPinForm('');
                    }, 2000);
                  }}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${pinForm.length === 4 ? 'bg-black text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  Confirm PIN
                </button>
                
                {settings.pinEnabled && (
                   <button 
                    onClick={() => {
                      setSettings(prev => ({ ...prev, pinEnabled: false, pinCode: '' }));
                      setShowPopup({ show: true, title: 'PIN Disabled', subtitle: 'PIN lock has been removed.' });
                      setTimeout(() => {
                        setShowPopup({ show: false, title: '', subtitle: '' });
                        setView('settings');
                      }, 1000);
                    }}
                    className="w-full py-3 mt-4 text-xs font-bold text-red-500 uppercase tracking-widest"
                  >
                    Disable PIN Lock
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Area: Chat Input if chatting */}
      {view === 'chat' && selectedContact && (
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 flex flex-col gap-2 relative z-50" id="chat-input-bar">
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-2 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 overflow-y-auto max-h-[300px]"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Emoji Picker</span>
                    <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-gray-100 rounded-full">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {emojiCategories.map(category => (
                      <div key={category.name}>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{category.name}</h4>
                        <div className="grid grid-cols-8 gap-1">
                          {category.emojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                setCurrentChatMessage(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="text-xl p-1 hover:bg-gray-50 rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <input 
                type="file" 
                id="media-upload" 
                multiple 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleMediaUpload} 
              />
              <button 
                onClick={() => document.getElementById('media-upload')?.click()}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <div className="text-xl">😊</div>
              </button>
              <input 
                type="text" 
                value={currentChatMessage}
                onChange={(e) => setCurrentChatMessage(e.target.value)}
                disabled={selectedContact?.blocked}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentChatMessage.trim() && !selectedContact?.blocked) {
                    if (editingMessageId) {
                      setChatMessages(prev => prev.map(msg => 
                        msg.id === editingMessageId ? { ...msg, text: currentChatMessage } : msg
                      ));
                      setEditingMessageId(null);
                    } else {
                      const newMessage = {
                        id: Date.now().toString(),
                        sender: 'user' as const,
                        text: currentChatMessage,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setChatMessages([...chatMessages, newMessage]);
                    }
                    setCurrentChatMessage('');
                    
                    if (!editingMessageId) {
                      // Auto response
                      setTimeout(() => {
                         setChatMessages(prev => [...prev, {
                            id: (Date.now() + 1).toString(),
                            sender: 'support',
                            text: "Thank you for your message. An agent will be with you shortly.",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                         }]);
                      }, 1000);
                    }
                  }
                }}
                placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                className={`flex-1 min-w-0 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 ${editingMessageId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
              />
              <button 
                onClick={() => {
                  if (currentChatMessage.trim() && !selectedContact?.blocked) {
                    if (editingMessageId) {
                      setChatMessages(prev => prev.map(msg => 
                        msg.id === editingMessageId ? { ...msg, text: currentChatMessage } : msg
                      ));
                      setEditingMessageId(null);
                    } else {
                      const newMessage = {
                        id: Date.now().toString(),
                        sender: 'user' as const,
                        text: currentChatMessage,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setChatMessages([...chatMessages, newMessage]);
                    }
                    setCurrentChatMessage('');
                    
                    if (!editingMessageId) {
                      // Auto response
                      setTimeout(() => {
                         setChatMessages(prev => [...prev, {
                            id: (Date.now() + 1).toString(),
                            sender: 'support',
                            text: "Thank you for your message. An agent will be with you shortly.",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                         }]);
                      }, 1000);
                    }
                  }
                }}
                className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {editingMessageId ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5 rotate-45" />}
              </button>
            </div>
          </div>
        )}

      {/* Bottom Navigation Menu Bar */}
      {view !== 'signup' && view !== 'login' && (
        <nav className="flex items-center justify-around px-2 py-2 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] shrink-0 z-[100] sticky bottom-0 pb-safe-offset-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }} id="bottom-menu">
          <button 
            className="flex flex-col items-center justify-center p-1 text-black hover:bg-gray-100 rounded-lg transition-colors focus:outline-none min-w-[50px]"
            id="btn-gigs"
            onClick={() => {
              setActiveBottom('gigs');
              setActiveTop(null);
              setView('gigs');
            }}
          >
            <Briefcase className={`w-5 h-5 text-black fill-white transition-all ${activeBottom === 'gigs' ? 'mb-1' : ''}`} />
            {activeBottom === 'gigs' && <span className="text-[8px] font-bold uppercase tracking-wider text-black">GiGs</span>}
          </button>

          <button 
            className="flex flex-col items-center justify-center p-1 text-black hover:bg-gray-100 rounded-lg transition-colors focus:outline-none min-w-[50px]"
            id="btn-seekers"
            onClick={() => {
              setActiveBottom('seekers');
              setActiveTop(null);
              setView('seekers');
            }}
          >
            <Search className={`w-5 h-5 text-black fill-white transition-all ${activeBottom === 'seekers' ? 'mb-1' : ''}`} />
            {activeBottom === 'seekers' && <span className="text-[8px] font-bold uppercase tracking-wider text-black">Seekers</span>}
          </button>

          <button 
            className="flex flex-col items-center justify-center p-1 text-black hover:bg-gray-100 rounded-lg transition-colors focus:outline-none min-w-[50px] relative"
            id="btn-chat"
            onClick={() => {
              setActiveBottom('chat');
              setActiveTop(null);
              setView('chat');
              setUnreadMessages(0);
            }}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 text-black fill-white transition-all ${activeBottom === 'chat' ? 'mb-1' : ''}`} />
              {unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-white">
                  {unreadMessages}
                </span>
              )}
            </div>
            {activeBottom === 'chat' && <span className="text-[8px] font-bold uppercase tracking-wider text-black">Chat</span>}
          </button>

          <button 
            className="flex flex-col items-center justify-center p-1 text-black hover:bg-gray-100 rounded-lg transition-colors focus:outline-none min-w-[50px]"
            id="btn-wallet"
            onClick={() => {
              setActiveBottom('wallet');
              setActiveTop(null);
              setView('wallet');
            }}
          >
            <Wallet className={`w-5 h-5 text-black fill-white transition-all ${activeBottom === 'wallet' ? 'mb-1' : ''}`} />
            {activeBottom === 'wallet' && <span className="text-[8px] font-bold uppercase tracking-wider text-black">Wallet</span>}
          </button>
          
          <button 
            className="flex flex-col items-center justify-center p-1 text-black hover:bg-gray-100 rounded-lg transition-colors focus:outline-none min-w-[50px]"
            id="btn-referral"
            onClick={() => {
              setActiveBottom('referral');
              setActiveTop(null);
              setView('referral');
            }}
          >
            <Gift className={`w-5 h-5 text-black fill-white transition-all ${activeBottom === 'referral' ? 'mb-1' : ''}`} />
            {activeBottom === 'referral' && <span className="text-[8px] font-bold uppercase tracking-wider text-black">Referrals</span>}
          </button>
        </nav>
      )}

      {/* Review Popup */}
      <AnimatePresence>
        {viewingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setViewingProfile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-32 bg-gradient-to-br from-black to-gray-800">
                <button 
                  onClick={() => setViewingProfile(null)}
                  className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pb-8 -mt-12">
                <div className="relative">
                  <img 
                    src={viewingProfile.pic} 
                    alt={viewingProfile.name} 
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
                  />
                  <div className="absolute bottom-0 right-0 p-1.5 bg-green-500 rounded-full border-4 border-white"></div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900">{viewingProfile.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">{viewingProfile.role}</span>
                  </div>
                  <p className="mt-4 text-gray-600 leading-relaxed">
                    {viewingProfile.bio}
                  </p>
                  <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => {
                        setViewingProfile(null);
                        setView('chat');
                      }}
                      className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-black/10"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPopup.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 pointer-events-none z-[100] w-[calc(100%-2rem)] max-w-sm"
          >
            <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-sm">{showPopup.title}</p>
              <p className="text-xs text-gray-300">{showPopup.subtitle}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 text-white shrink-0">
              <h3 className="font-medium text-lg">Proof of Payment</h3>
              <button 
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex justify-center items-center p-4">
              {viewingDocument.documentUrl ? (
                viewingDocument.documentUrl.startsWith('data:application/pdf') || viewingDocument.documentUrl.endsWith('.pdf') ? (
                  <div className="text-white flex flex-col items-center max-w-md text-center p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <FileText className="w-20 h-20 mb-4 text-[#FF2E2E]" />
                    <p className="font-bold text-lg mb-1">PDF Document Uploaded</p>
                    <p className="text-sm text-gray-400 mb-6">This proof of payment is a PDF document.</p>
                    <a 
                      href={viewingDocument.documentUrl} 
                      download={`proof_of_payment_${viewingDocument.id}.pdf`}
                      className="px-6 py-3 bg-[#FF2E2E] hover:bg-[#D11A1A] text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                    >
                      Download & Open PDF
                    </a>
                  </div>
                ) : (
                  <img 
                    src={viewingDocument.documentUrl} 
                    alt="Proof of Payment" 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white" 
                  />
                )
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <FileText className="w-16 h-16 mb-4 opacity-50" />
                  <p>Document not available</p>
                </div>
              )}
            </div>
            
            {view === 'admin' ? (
              <div className="p-4 border-t border-white/10 flex gap-3 bg-black shrink-0 pb-safe">
                 <button 
                   onClick={() => { 
                     handleReject(viewingDocument.id); 
                     setViewingDocument(null); 
                   }} 
                   className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
                 >
                   Reject
                 </button>
                 <button 
                   onClick={() => { 
                     handleApprove(viewingDocument.id); 
                     setViewingDocument(null); 
                   }} 
                   className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black"
                 >
                   Approve
                 </button>
              </div>
            ) : (
              <div className="p-4 border-t border-white/10 flex justify-center bg-black shrink-0 pb-safe">
                <button 
                  onClick={() => setViewingDocument(null)}
                  className="w-full max-w-xs py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors focus:outline-none"
                >
                  Close Preview
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coin Bash Animation */}
      <AnimatePresence>
        {coinBash.show && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -100, x: (Math.random() - 0.5) * window.innerWidth, opacity: 1, scale: 0.5 }}
                animate={{ 
                  y: window.innerHeight + 100,
                  x: (Math.random() - 0.5) * window.innerWidth + (Math.random() - 0.5) * 200,
                  rotate: Math.random() * 360 * 5,
                }}
                transition={{ 
                  duration: 1.5 + Math.random(), 
                  ease: "easeIn",
                  delay: Math.random() * 0.3
                }}
                className="absolute top-0 w-12 h-12 rounded-full bg-yellow-400 border-4 border-yellow-500 shadow-lg flex items-center justify-center text-yellow-600 font-bold text-xl"
              >
                ¢
              </motion.div>
            ))}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.5, times: [0, 0.1, 0.8, 1] }}
              className="text-4xl md:text-6xl font-bold text-yellow-500 drop-shadow-lg bg-black/50 px-6 py-3 rounded-2xl backdrop-blur-sm"
            >
              +{coinBash.amount} Coins!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Gig Info */}
      <AnimatePresence>
        {selectedGig && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[150] bg-white flex flex-col"
          >
            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0">
              <div className="w-10"></div>
              <h2 className="text-lg font-bold text-gray-900">GiG Details</h2>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="aspect-video w-full bg-gray-100 relative group" onClick={() => setSelectedGigMedia({ images: selectedGig.images, index: 0 })}>
                <img src={selectedGig.images[0]} alt={selectedGig.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {selectedGig.images.length} Photos
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">{selectedGig.category}</span>
                    <span className="text-gray-400 text-xs">•</span>
                    <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                      <MapPin className="w-3 h-3" /> {selectedGig.location}, {selectedGig.province}
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{selectedGig.title}</h1>
                  <p className="text-2xl font-black text-black mt-2">R{selectedGig.budget}</p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <img src={selectedGig.owner.pic} alt={selectedGig.owner.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Posted by</p>
                    <p className="font-bold text-gray-900">{selectedGig.owner.name}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedContact({ name: selectedGig.owner.name, role: 'Gig Owner', pic: selectedGig.owner.pic });
                      setView('chat');
                      setSelectedGig(null);
                    }}
                    className="p-3 bg-white border border-gray-100 rounded-xl text-black hover:bg-black hover:text-white transition-all shadow-sm"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Description</h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedGig.description}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white pb-safe">
              <button 
                onClick={() => {
                  setSelectedContact({ name: selectedGig.owner.name, role: 'Gig Owner', pic: selectedGig.owner.pic });
                  setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: 'user',
                    text: `Hi, I'm interested in your gig: "${selectedGig.title}".`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }]);
                  setView('chat');
                  setSelectedGig(null);
                }}
                className="w-full py-4 bg-black text-white rounded-xl font-bold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all active:scale-95"
              >
                Apply Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Seeker Info */}
      <AnimatePresence>
        {selectedSeeker && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[150] bg-white flex flex-col"
          >
            <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0">
              <div className="w-10"></div>
              <h2 className="text-lg font-bold text-gray-900">Seeker Profile</h2>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="aspect-video w-full bg-gray-100 relative group" onClick={() => setSelectedGigMedia({ images: selectedSeeker.images, index: 0 })}>
                <img src={selectedSeeker.images[0]} alt={selectedSeeker.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> {selectedSeeker.images.length} Photos
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img src={selectedSeeker.owner.pic} alt={selectedSeeker.name} className="w-16 h-16 rounded-full border-2 border-white shadow-lg" />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedSeeker.name}</h1>
                    <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                      <MapPin className="w-3 h-3" /> {selectedSeeker.location}, {selectedSeeker.province}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-green-600">{selectedSeeker.rate}</p>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Rate</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Industry</p>
                    <p className="text-sm font-bold text-gray-900">{selectedSeeker.industry}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Category</p>
                    <p className="text-sm font-bold text-gray-900">{selectedSeeker.category}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">About Services</h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{selectedSeeker.needs}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white pb-safe">
              <button 
                onClick={() => {
                  setSelectedContact({ name: selectedSeeker.owner.name, role: 'Seeker', pic: selectedSeeker.owner.pic });
                  setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: 'user',
                    text: `Hi ${selectedSeeker.name}, I saw your seeker profile for "${selectedSeeker.industry}". I'd like to collaborate with you.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }]);
                  setView('chat');
                  setSelectedSeeker(null);
                }}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
              >
                Hire Seeker
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Gig Media Gallery */}
      <AnimatePresence>
        {selectedGigMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black flex flex-col"
          >
            <div className="p-4 flex items-center justify-between z-10">
              <div className="text-white text-sm font-medium">
                {selectedGigMedia.index + 1} / {selectedGigMedia.images.length}
              </div>
              <button 
                onClick={() => setSelectedGigMedia(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedGigMedia.index}
                  src={selectedGigMedia.images[selectedGigMedia.index]}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="max-w-full max-h-full object-contain select-none"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    const swipeThreshold = 50;
                    if (info.offset.x < -swipeThreshold && selectedGigMedia.index < selectedGigMedia.images.length - 1) {
                      setSelectedGigMedia({ ...selectedGigMedia, index: selectedGigMedia.index + 1 });
                    } else if (info.offset.x > swipeThreshold && selectedGigMedia.index > 0) {
                      setSelectedGigMedia({ ...selectedGigMedia, index: selectedGigMedia.index - 1 });
                    }
                  }}
                />
              </AnimatePresence>

              {/* Navigation Arrows (Desktop) */}
              {selectedGigMedia.index > 0 && (
                <button 
                  onClick={() => setSelectedGigMedia({ ...selectedGigMedia, index: selectedGigMedia.index - 1 })}
                  className="absolute left-4 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white hidden md:block z-20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {selectedGigMedia.index < selectedGigMedia.images.length - 1 && (
                <button 
                  onClick={() => setSelectedGigMedia({ ...selectedGigMedia, index: selectedGigMedia.index + 1 })}
                  className="absolute right-4 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white hidden md:block z-20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="p-8 flex justify-center gap-2 overflow-x-auto no-scrollbar">
              {selectedGigMedia.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedGigMedia({ ...selectedGigMedia, index: idx })}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedGigMedia.index === idx ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Media Viewer */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setFullscreenMedia(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[110]"
              onClick={() => setFullscreenMedia(null)}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {fullscreenMedia.type === 'video' ? (
                <video 
                  src={fullscreenMedia.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                />
              ) : (
                <img 
                  src={fullscreenMedia.url} 
                  alt="Fullscreen" 
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Alert / Success Popup Modal */}
      <AnimatePresence>
        {showPopup.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPopup({ show: false, title: '', subtitle: '' })}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative top bar */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                showPopup.type === 'error' 
                  ? 'bg-gradient-to-r from-red-400 to-rose-600' 
                  : showPopup.type === 'info' 
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-600' 
                    : 'bg-gradient-to-r from-green-400 to-emerald-500'
              }`}></div>
              
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center border ${
                showPopup.type === 'error'
                  ? 'bg-red-50 border-red-100 text-red-500'
                  : showPopup.type === 'info'
                    ? 'bg-blue-50 border-blue-100 text-blue-500'
                    : 'bg-green-50 border-green-100 text-green-500'
              }`}>
                {showPopup.type === 'error' ? (
                  <X className="w-8 h-8" />
                ) : showPopup.type === 'info' ? (
                  <Info className="w-8 h-8" />
                ) : (
                  <CheckCircle className="w-8 h-8 animate-bounce" />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">{showPopup.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{showPopup.subtitle}</p>
              </div>

              <button 
                onClick={() => setShowPopup({ show: false, title: '', subtitle: '' })}
                className={`w-full py-4 text-white rounded-xl font-bold transition-all active:scale-95 text-xs uppercase tracking-wider ${
                  showPopup.type === 'error'
                    ? 'bg-red-600 hover:bg-red-700'
                    : showPopup.type === 'info'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-slate-950 hover:bg-slate-800'
                }`}
              >
                {showPopup.type === 'error' ? 'Dismiss' : 'Got it'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
