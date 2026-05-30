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
  Play
} from "lucide-react";
import ProfileCustomizer, { BANNER_GRADIENTS, AVATAR_COLORS } from "../components/ProfileCustomizer";

export default function UserProfilePage({ params }) {
  const resolvedParams = use(params);
  const rawUsername = resolvedParams?.username || "";
  const router = useRouter();

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
  const [myAvatarColor, setMyAvatarColor] = useState("#FF5500");
  const [myAvatarUrl, setMyAvatarUrl] = useState("🎧");
  const [myBannerUrl, setMyBannerUrl] = useState("sunset");
  const [myBio, setMyBio] = useState("");
  const [myCustomBadge, setMyCustomBadge] = useState("");

  // Check auth user and load profile
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
            avatar_color: localStorage.getItem("xyi_guest_avatar_color") || "#FF5500",
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
          avatar_color: localStorage.getItem("xyi_guest_avatar_color") || "#FF5500",
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
    setMyAvatarColor(data.avatar_color || "#FF5500");
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
    <main className="min-h-screen bg-[#020204] text-white flex flex-col relative select-none overflow-x-hidden pb-16">
      
      {/* Dynamic Background Glowing elements */}
      <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-[#ff5500]/5 rounded-full blur-[160px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-[#00b4d8]/4 rounded-full blur-[160px] pointer-events-none z-0"></div>

      {/* LOADING SCREEN */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[100vh] gap-4">
          <div className="w-10 h-10 border-t-2 border-[#ff5500] border-r-2 border-r-transparent animate-spin"></div>
          <p className="text-zinc-600 text-[10px] uppercase font-black tracking-widest animate-pulse">Идентификация в клубе...</p>
        </div>
      )}

      {/* FULL-SCREEN HERO BANNER ROUTE */}
      {!loading && profile && (
        <div className="flex-1 flex flex-col w-full z-10 animate-fadeIn relative">
          
          {/* 1. Page-Wide Hero Banner (Stretches 100% Edge-to-Edge) */}
          <div 
            className="w-full h-[280px] md:h-[380px] relative transition-all duration-500 border-b border-[#ff5500]/25 shadow-2xl"
            style={getBannerStyle(myBannerUrl)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-[#020204]/30 to-transparent"></div>
            
            {/* Embedded Floating Transparent Navbar */}
            <div className="absolute top-0 left-0 right-0 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-20">
              <div className="flex items-center gap-1.5 cursor-pointer bg-black/40 backdrop-blur-md px-3.5 py-2 border border-white/5 rounded-xl hover:bg-black/60 transition-all" onClick={() => router.push("/")}>
                <span className="text-xl font-black tracking-tighter text-white">xyi</span>
                <span className="w-4 h-4 rounded bg-[#ff5500] flex items-center justify-center text-[8px] font-black text-black select-none">▶</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyProfileLink}
                  className="px-4 py-2.5 bg-black/50 backdrop-blur-md border border-white/5 hover:border-[#ff5500]/25 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Ссылка скопирована
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Поделиться профилем
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2.5 bg-black/50 backdrop-blur-md border border-white/5 hover:border-[#ff5500]/25 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-[#ff5500]" /> Выйти в плеер
                </button>
              </div>
            </div>

            {/* Subtle banner tech grid overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
          </div>

          {/* 2. Overlapping Profile Identity Container */}
          <div className="w-full max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center md:items-start -mt-20 md:-mt-24 pb-8 text-center md:text-left">
            
            {/* Identity Header Grid */}
            <div className="w-full flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
              
              {/* Massive Custom Strict Avatar (Rounded Square!) */}
              <div 
                className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-[#020204] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden bg-zinc-950 flex-shrink-0"
                style={{ backgroundColor: myAvatarColor }}
              >
                {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                  <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl filter drop-shadow-md">{myAvatarUrl}</span>
                )}
                
                {/* Active Tech Indicator */}
                <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#020204] live-pulse-dot shadow-md"></div>
              </div>

              {/* Text Meta Info */}
              <div className="flex-1 flex flex-col gap-1 items-center md:items-start pb-2">
                <div className="flex items-center gap-2.5 justify-center md:justify-start min-w-0">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase truncate max-w-[320px] md:max-w-[450px]">
                    {myUsername}
                  </h1>
                  {myCustomBadge && (
                    <span className="px-3 py-1 bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/25 text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm">
                      {myCustomBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-extrabold tracking-widest uppercase mt-0.5">
                  ID: @{myUsername ? myUsername.toLowerCase() : "hustler"} // ЧЛЕН КЛУБА XYI
                </span>
              </div>
            </div>

            {/* 3. Strict Glassmorphic Body Grid Layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-10">
              
              {/* Left Bio and Status Column (8/12 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6 w-full">
                <div className="glass-panel p-8 rounded-xl text-left flex flex-col gap-4 border-[#ff5500]/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff5500]/2 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ff5500]">Манифест / Статус</span>
                    <span className="text-[9px] text-zinc-500 font-mono font-bold">STRICT CHILL VIBE</span>
                  </div>
                  
                  <p className="text-sm text-zinc-300 font-medium break-words leading-relaxed italic min-h-[52px]">
                    {myBio ? `"${myBio}"` : "Этот хастлер пока не оставил свое описание. Он зашел в клуб просто расслабиться и послушать SoundCloud."}
                  </p>
                </div>

                {/* Additional Tech Stats panel for club vibe */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Статус сессии</span>
                    <p className="text-xs font-bold text-emerald-450 uppercase mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot"></span> В сети
                    </p>
                  </div>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Права доступа</span>
                    <p className="text-xs font-bold text-zinc-200 mt-1 uppercase">Резидент</p>
                  </div>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Зона чилла</span>
                    <p className="text-xs font-bold text-[#ff5500] mt-1 uppercase flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> SoundCloud
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Action Column (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4 w-full">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowCustomizer(true)}
                    className="w-full py-4.5 bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                  >
                    <Sparkles className="w-4 h-4 text-[#ff5500]" /> Настроить Профиль
                  </button>
                ) : (
                  <button
                    onClick={handleStartCoListening}
                    className="w-full py-4.5 bg-[#ff5500] hover:bg-[#ff661a] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-[#ff5500]/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" /> Слушать Вместе
                  </button>
                )}

                <div className="flex flex-col gap-2.5 w-full bg-black/30 border border-white/5 p-4 rounded-xl">
                  <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest text-center block mb-1">
                    Клубные Действия
                  </span>
                  
                  <button
                    onClick={handleCopyProfileLink}
                    className="w-full py-3.5 bg-[#0d0d12] hover:bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Копировать ссылку
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full py-3.5 bg-[#0d0d12] hover:bg-white/5 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#ff5500]" /> Обзор комнат
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* NOT FOUND SCREEN */}
      {!loading && !profile && (
        <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col items-center justify-center z-10 py-16 animate-fadeIn text-center">
          <div className="w-20 h-20 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center mb-6">
            <HelpCircle className="w-10 h-10 text-zinc-650" />
          </div>
          
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-xl font-black tracking-tight text-white uppercase">Хастлер не опознан</h2>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
              Пользователь с никнеймом <strong>@{decodeURIComponent(rawUsername)}</strong> не зарегистрирован в базе резидентов клуба XYI, либо его временная сессия уже истекла.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full bg-[#0d0d12] border border-white/5 p-6 rounded-xl">
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              На главную
            </button>
            <button
              onClick={() => router.push("/?auth=open")}
              className="w-full py-4 bg-transparent border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-[0.98] cursor-pointer"
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
