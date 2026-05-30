"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  Home, 
  Copy, 
  Check, 
  Radio, 
  User, 
  Compass,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Play,
  ChevronRight,
  Lock,
  ExternalLink,
  Settings,
  Headphones,
  Users,
  Pencil
} from "lucide-react";
import ProfileCustomizer, { BANNER_GRADIENTS, AVATAR_COLORS } from "../components/ProfileCustomizer";

export default function UserProfilePage({ params }) {
  const resolvedParams = use(params);
  const rawUsername = resolvedParams?.username || "";
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  
  // Auth states
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isDbTableMissing, setIsDbTableMissing] = useState(false);

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // User details state (for local updates)
  const [myUsername, setMyUsername] = useState("");
  const [myAvatarColor, setMyAvatarColor] = useState("#007aff");
  const [myAvatarUrl, setMyAvatarUrl] = useState("🎧");
  const [myBannerUrl, setMyBannerUrl] = useState("sunset");
  const [myBio, setMyBio] = useState("");
  const [myCustomBadge, setMyCustomBadge] = useState("");

  // Check auth user and load profile
  useEffect(() => {
    const saved = localStorage.getItem("xyi_theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light-theme");
    } else {
      setIsDark(true);
      document.documentElement.classList.remove("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      setIsDark(false);
      localStorage.setItem("xyi_theme", "light");
      document.documentElement.classList.add("light-theme");
    } else {
      setIsDark(true);
      localStorage.setItem("xyi_theme", "dark");
      document.documentElement.classList.remove("light-theme");
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      fetchProfileData(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      fetchProfileData(user);
    });

    return () => subscription?.unsubscribe();
  }, [rawUsername]);

  const fetchProfileData = async (loggedUser) => {
    setLoading(true);
    const targetUsername = decodeURIComponent(rawUsername).trim();

    try {
      // 1. Query profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", targetUsername)
        .maybeSingle();

      if (error) {
        if (error.code === "42P01" || (error.message && error.message.includes("relation") && error.message.includes("does not exist"))) {
          setIsDbTableMissing(true);
          throw new Error("Table missing");
        }
        throw error;
      }

      if (data) {
        setProfile(data);
        updateLocalStates(data);

        // Check if this is the logged-in user's profile
        if (loggedUser && loggedUser.id === data.id) {
          setIsOwnProfile(true);
        } else {
          setIsOwnProfile(false);
        }
      } else {
        // 2. Profile not found in database. Check if it matches current guest's own username!
        const guestName = localStorage.getItem("xyi_guest_username");
        if (guestName && guestName.toLowerCase() === targetUsername.toLowerCase()) {
          const guestProfile = {
            username: guestName,
            avatar_color: localStorage.getItem("xyi_guest_avatar_color") || "#007aff",
            avatar_url: localStorage.getItem("xyi_guest_avatar_url") || "🎧",
            banner_url: localStorage.getItem("xyi_guest_banner_url") || "sunset",
            bio: localStorage.getItem("xyi_guest_bio") || "",
            custom_badge: localStorage.getItem("xyi_guest_custom_badge") || ""
          };
          setProfile(guestProfile);
          updateLocalStates(guestProfile);
          setIsOwnProfile(true);
        } else {
          setProfile(null);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch profile:", err);
      // Fallback guest check if DB fails
      const guestName = localStorage.getItem("xyi_guest_username");
      if (guestName && guestName.toLowerCase() === targetUsername.toLowerCase()) {
        const guestProfile = {
          username: guestName,
          avatar_color: localStorage.getItem("xyi_guest_avatar_color") || "#007aff",
          avatar_url: localStorage.getItem("xyi_guest_avatar_url") || "🎧",
          banner_url: localStorage.getItem("xyi_guest_banner_url") || "sunset",
          bio: localStorage.getItem("xyi_guest_bio") || "",
          custom_badge: localStorage.getItem("xyi_guest_custom_badge") || ""
        };
        setProfile(guestProfile);
        updateLocalStates(guestProfile);
        setIsOwnProfile(true);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocalStates = (data) => {
    setMyUsername(data.username || "");
    setMyAvatarColor(data.avatar_color || "#007aff");
    setMyAvatarUrl(data.avatar_url || "🎧");
    setMyBannerUrl(data.banner_url || "sunset");
    setMyBio(data.bio || "");
    setMyCustomBadge(data.custom_badge || "");
  };

  const handleSaveProfile = async (data) => {
    if (currentUser && !isDbTableMissing) {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: currentUser.id,
          username: data.username,
          avatar_color: data.avatar_color,
          avatar_url: data.avatar_url,
          banner_url: data.banner_url,
          bio: data.bio,
          custom_badge: data.custom_badge,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } else {
      localStorage.setItem("xyi_guest_username", data.username);
      localStorage.setItem("xyi_guest_avatar_color", data.avatar_color);
      localStorage.setItem("xyi_guest_avatar_url", data.avatar_url);
      localStorage.setItem("xyi_guest_banner_url", data.banner_url);
      localStorage.setItem("xyi_guest_bio", data.bio);
      localStorage.setItem("xyi_guest_custom_badge", data.custom_badge);
    }

    const updatedProfile = {
      username: data.username,
      avatar_color: data.avatar_color,
      avatar_url: data.avatar_url,
      banner_url: data.banner_url,
      bio: data.bio,
      custom_badge: data.custom_badge
    };

    setProfile(updatedProfile);
    updateLocalStates(updatedProfile);

    sessionStorage.setItem("xyi_username", data.username);
    sessionStorage.setItem("xyi_avatar_color", data.avatar_color);

    if (data.username.toLowerCase() !== rawUsername.toLowerCase()) {
      router.replace(`/${encodeURIComponent(data.username)}`);
    }
  };

  const handleStartCoListening = () => {
    const code = "ROOM_" + Math.random().toString(36).substring(2, 7).toUpperCase();
    router.push(`/?room=${code}`);
  };

  const handleCopyProfileLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getBannerStyle = (url) => {
    const matchedGradient = BANNER_GRADIENTS.find(g => g.id === url);
    if (matchedGradient) {
      return { background: matchedGradient.style };
    }
    if (url && url.startsWith("data:image")) {
      return { 
        backgroundImage: `url(${url})`, 
        backgroundSize: "cover", 
        backgroundPosition: "center" 
      };
    }
    return { background: BANNER_GRADIENTS[0].style };
  };

  return (
    <main className="premium-silk-bg min-h-screen text-white flex flex-col relative select-none overflow-x-hidden pb-16">
      <div className="tech-grid-overlay" />
      
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[-10%] w-[60%] h-[50%] bg-[#007aff]/3 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/2 rounded-full blur-[160px] pointer-events-none z-0"></div>
      
      {/* LOADING SCREEN */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen gap-4 z-10">
          <div className="w-12 h-12 rounded-none border-t-2 border-white border-r-2 border-r-transparent animate-spin"></div>
          <p className="text-zinc-550 text-[10px] uppercase font-black tracking-widest animate-pulse">Идентификация в базе клуба...</p>
        </div>
      )}

      {/* FULL-SCREEN HERO BANNER ROUTE */}
      {!loading && profile && (
        <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-4 md:px-6 relative z-10 animate-fadeIn gap-6 mt-6">
          
          {/* 1. FLOATING HEADER NAVBAR */}
          <header className="w-full premium-glass-card rounded-full px-6 py-3 flex items-center justify-between border border-white/5 backdrop-blur-md z-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/5 transition-all" onClick={() => router.push("/")}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 10v4M8 6v12M12 4v16M16 8v8M20 11v2" strokeLinecap="round" />
              </svg>
              <span className="font-black tracking-tighter text-white text-sm">SoundWave</span>
            </div>

            {/* Center Nav tabs */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
              <button onClick={() => router.push("/")} className="hover:text-white transition-all cursor-pointer">Комнаты</button>
              <span className="opacity-20">|</span>
              <button onClick={() => router.push("/")} className="hover:text-white transition-all cursor-pointer">Как это работает</button>
              <span className="opacity-20">|</span>
              <button className="bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/10 text-xs font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] transition-all">Мой профиль</button>
            </nav>

            {/* Right elements */}
            <div className="flex items-center gap-2.5">
              {/* Theme Button */}
              <button 
                onClick={toggleTheme} 
                className="w-8 h-8 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs transition-all cursor-pointer"
                title="Переключить тему"
              >
                {isDark ? "☀️" : "🌙"}
              </button>

              {/* Home button */}
              <button 
                onClick={handleStartCoListening}
                className="px-3.5 py-1.5 border border-white/5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-zinc-400" />
                <span>Моя комната</span>
              </button>

              {/* Profile Dropdown */}
              <div className="bg-black/40 border border-white/5 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-black/60 transition-all select-none cursor-pointer">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-black" style={{ backgroundColor: myAvatarColor }}>
                  {myUsername ? myUsername.slice(0, 2) : "G"}
                </div>
                <span className="text-xs font-semibold text-zinc-200">{myUsername ? myUsername.toLowerCase() : "guest"}</span>
                <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </header>

          {/* 2. MASSIVE HERO IDENTITY CARD */}
          <section className="w-full premium-glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8 border border-white/5">
            {/* Glossy abstract lines grid on the right side */}
            <div className="absolute top-0 right-0 w-[40%] h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[45%] h-full opacity-10 pointer-events-none" style={{
              backgroundImage: `radial-gradient(circle at 100% 0%, transparent 60%, rgba(255,255,255,0.05) 100%), linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.03) 100%)`,
              clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)"
            }} />

            {/* Massive White Squared Avatar */}
            <div className="w-36 h-36 md:w-40 md:h-40 bg-white rounded-2xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden flex-shrink-0 border-4 border-zinc-950">
               {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                 <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-black font-extrabold text-4xl font-mono tracking-tight transform rotate-[-4deg]">
                   {myUsername ? myUsername.slice(0, 3).toUpperCase() : "NWO"}
                 </span>
               )}
               {/* Green Active Dot */}
               <div className="absolute bottom-3 right-3 w-4.5 h-4.5 rounded-full bg-[#10b981] border-3 border-white live-pulse-dot shadow-lg"></div>
            </div>

            {/* Profile Metadata */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase">
                  {myUsername}
                </h1>
                <span className="px-2.5 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] font-black uppercase tracking-wider rounded">
                  {myCustomBadge || "CEO"}
                </span>
              </div>
              
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
                ID: @{myUsername ? myUsername.toLowerCase() : "colddev"} // РЕЗИДЕНТ КЛУБА XYI
              </p>

              {/* Elegant Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mt-8 w-full">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-white/70">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Резидент клуба</span>
                    <span className="text-xs font-semibold text-zinc-200">XYI</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-white/70">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">В сообществе</span>
                    <span className="text-xs font-semibold text-zinc-200">с янв 2023</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-white/70">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Провел комнат</span>
                    <span className="text-xs font-semibold text-zinc-200">27</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 text-[#10b981]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Участников</span>
                    <span className="text-xs font-semibold text-zinc-200">1.2K</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. ASYMMETRICAL DETAILS SPLIT ROW */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Bio Card (2/3 width) */}
            <div className="lg:col-span-2 premium-glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col gap-6 h-full min-h-[220px]">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Манифест / Статус</span>
                <span className="text-[9px] font-mono text-zinc-500 font-bold">STRICT CHILL VIBE</span>
              </div>

              <div className="flex-1 flex items-start gap-4">
                <MessageSquare className="w-8 h-8 text-[#007aff] opacity-20 transform rotate-180 flex-shrink-0 mt-1" />
                <p className="text-sm md:text-base text-zinc-350 font-medium leading-relaxed italic break-words mt-1">
                  {myBio ? `"${myBio}"` : '"Этот хастлер пока не оставил свое описание. Он зашел в клуб просто расслабиться и послушать SoundCloud."'}
                </p>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setShowCustomizer(true)}
                  className="self-end px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-zinc-350 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Редактировать</span>
                </button>
              )}
            </div>

            {/* Right Actions Panel (1/3 width) */}
            <div className="premium-glass-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5 text-[10px] text-zinc-400 font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500/80" />
                <span>Клубные Действия</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Action 1: Copy link */}
                <button 
                  onClick={handleCopyProfileLink}
                  className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#007aff]/10 flex items-center justify-center text-[#007aff] group-hover:scale-105 transition-all">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-200 block uppercase tracking-wider">Копировать ссылку на профиль</span>
                      <span className="text-[9px] text-zinc-500 block">Поделитесь своим профилем с другими</span>
                    </div>
                  </div>
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-450" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>

                {/* Action 2: Rooms */}
                <button 
                  onClick={() => router.push("/")}
                  className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-200 block uppercase tracking-wider">Обзор созданных комнат</span>
                      <span className="text-[9px] text-zinc-500 block">Посмотрите все ваши комнаты</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Action 3: Followers */}
                <button 
                  onClick={() => alert("Система подписчиков находится в разработке")}
                  className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-450 group-hover:scale-105 transition-all">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-200 block uppercase tracking-wider">Мои подписчики</span>
                      <span className="text-[9px] text-zinc-500 block">Кто следит за вашими комнатами</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Action 4: Report */}
                <button 
                  onClick={() => alert("Спасибо за бдительность! Жалоба отправлена модераторам.")}
                  className="w-full p-3 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-xl flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-450 group-hover:scale-105 transition-all">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-200 block uppercase tracking-wider">Пожаловаться на профиль</span>
                      <span className="text-[9px] text-zinc-500 block">Сообщить о нарушении правил</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. FULL-WIDTH REFLECTIVE LIQUID GLASS PROFILE EDIT BUTTON */}
          {isOwnProfile ? (
            <button
              onClick={() => setShowCustomizer(true)}
              className="w-full py-4.5 liquid-glass-btn font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4 text-zinc-300 animate-spin-slow" />
              <span>Настроить Профиль</span>
            </button>
          ) : (
            <button
              onClick={handleStartCoListening}
              className="w-full py-4.5 liquid-glass-btn font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Radio className="w-4 h-4 text-[#007aff] animate-pulse" />
              <span>Слушать Вместе</span>
            </button>
          )}

          {/* 5. THREE-COLUMN BENTO GRID FOOTER */}
          <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Status */}
            <div className="premium-glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col gap-1 text-left min-h-[130px]">
              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] live-pulse-dot"></span>
                <span>Статус сессии</span>
              </span>
              <h3 className="text-xl font-extrabold text-zinc-100 uppercase tracking-tight mt-3">В сети</h3>
              <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Сейчас на платформе</p>
              {/* Background fluid wave decoration */}
              <div className="silk-wave-graphic" />
            </div>

            {/* Column 2: Access Rights */}
            <div className="premium-glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col gap-1 text-left min-h-[130px]">
              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                <span>Права доступа</span>
              </span>
              <h3 className="text-xl font-extrabold text-zinc-100 uppercase tracking-tight mt-3">Резидент ✨</h3>
              <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Постоянный участник клуба XYI</p>
              
              {/* Subtle dark geometric background facets */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(45deg,#fff_25%,transparent_25%),linear-gradient(-45deg,#fff_25%,transparent_25%),linear-gradient(135deg,#fff_25%,transparent_25%),linear-gradient(-135deg,#fff_25%,transparent_25%)] bg-[size:24px_24px] z-0" />
            </div>

            {/* Column 3: SoundCloud Chill Zone */}
            <div className="premium-glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col gap-1 text-left min-h-[130px] group cursor-pointer" onClick={() => window.open("https://soundcloud.com", "_blank")}>
              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#FF5500] animate-pulse" />
                <span>Зона чилла</span>
              </span>
              <h3 className="text-xl font-extrabold text-zinc-100 group-hover:text-[#FF5500] transition-colors uppercase tracking-tight mt-3 flex items-center gap-2">
                <span>Soundcloud</span>
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </h3>
              <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Музыка. Поток. Атмосфера.</p>
              {/* Background fluid wave decoration */}
              <div className="silk-wave-graphic" />
            </div>

          </section>

        </div>
      )}

      {/* NOT FOUND SCREEN */}
      {!loading && !profile && (
        <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col items-center justify-center z-10 py-16 animate-fadeIn text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-950/80 border border-white/5 flex items-center justify-center mb-6 shadow-xl">
            <HelpCircle className="w-10 h-10 text-zinc-500" />
          </div>
          
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-xl font-black tracking-tight text-white uppercase">Хастлер не опознан</h2>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
              Пользователь с никнеймом <strong>@{decodeURIComponent(rawUsername)}</strong> не зарегистрирован в базе резидентов клуба XYI, либо его временная сессия уже истекла.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full premium-glass-card p-6 rounded-3xl border border-white/5">
            <button
              onClick={() => router.push("/")}
              className="w-full py-4.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-full transition-all active:scale-[0.98] cursor-pointer shadow-lg"
            >
              На главную
            </button>
            <button
              onClick={() => router.push("/?auth=open")}
              className="w-full py-4 bg-transparent border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-full transition-all active:scale-[0.98] cursor-pointer"
            >
              Зарегистрировать аккаунт
            </button>
          </div>
        </div>
      )}

      {/* Profile Customizer Modal */}
      {showCustomizer && (
        <ProfileCustomizer
          currentUser={currentUser}
          currentProfile={{
            username: myUsername,
            avatarColor: myAvatarColor,
            avatarUrl: myAvatarUrl,
            bannerUrl: myBannerUrl,
            bio: myBio,
            customBadge: myCustomBadge
          }}
          onSave={handleSaveProfile}
          onClose={() => setShowCustomizer(false)}
          isDbTableMissing={isDbTableMissing}
        />
      )}
    </main>
  );
}
