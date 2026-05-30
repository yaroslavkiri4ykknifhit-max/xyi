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
  HelpCircle
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
  const [copied, setCopied] = useState(false);
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
          setIsOwnProfile(true); // Since it's their own guest profile
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

    // Update state to render immediately
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

    // If username changed, redirect to new username page silently
    if (data.username.toLowerCase() !== rawUsername.toLowerCase()) {
      router.replace(`/${encodeURIComponent(data.username)}`);
    }
  };

  const handleStartCoListening = () => {
    // Generate a fresh random room code (5 uppercase letters)
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
    <main className="min-h-screen bg-[#050508] text-white flex flex-col relative select-none overflow-x-hidden pb-12">
      {/* Background soft glowing auroras */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-[#ff5500]/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[45%] h-[45%] bg-[#00b4d8]/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Global Minimal Nav Bar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => router.push("/")}>
          <span className="text-3xl font-black tracking-tighter text-white">xyi</span>
          <span className="w-5 h-5 rounded-md bg-[#ff5500] flex items-center justify-center text-[10px] font-black text-black select-none">▶</span>
        </div>
        
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 hover:border-[#ff5500]/30 rounded-full text-xs font-bold transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4 text-[#ff5500]" /> На главную
        </button>
      </nav>

      {/* LOADING SCREEN */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#ff5500] border-r-2 border-r-transparent animate-spin"></div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-black animate-pulse">Загрузка профиля...</p>
        </div>
      )}

      {/* PROFILE CONTENT */}
      {!loading && profile && (
        <div className="flex-1 max-w-xl mx-auto w-full px-6 flex flex-col items-center justify-center z-10 py-8 animate-fadeIn">
          
          {/* Dynamic Full Screen Profile Card */}
          <div className="w-full bg-[#0d0d12]/80 border border-white/8 rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative select-text">
            
            {/* Direct Copy URL Trigger inside Profile banner */}
            <div 
              className="w-full h-40 relative transition-all duration-500"
              style={getBannerStyle(myBannerUrl)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent"></div>
              
              <button 
                onClick={handleCopyProfileLink}
                className="absolute top-4 right-4 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/5 hover:border-white/15 rounded-full text-[9px] font-black uppercase tracking-wider text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Ссылка
                  </>
                )}
              </button>
            </div>

            {/* Avatar & Floating Badge and Body Content */}
            <div className="w-full px-8 relative flex flex-col items-center -mt-14 pb-10 text-center">
              
              {/* Pulsing halo indicator */}
              <div 
                className="w-28 h-28 rounded-full border-[5px] border-[#0d0d12] flex items-center justify-center shadow-2xl relative overflow-hidden transition-all duration-300 bg-zinc-800"
                style={{ backgroundColor: myAvatarColor }}
              >
                {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                  <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl filter drop-shadow-md">{myAvatarUrl}</span>
                )}
              </div>

              {/* Title Section */}
              <div className="mt-4 flex flex-col gap-1 items-center w-full">
                <div className="flex items-center gap-2 justify-center min-w-0">
                  <h2 className="text-2xl font-black tracking-tight text-white truncate max-w-[280px]">
                    {myUsername}
                  </h2>
                  {myCustomBadge && (
                    <span className="px-2.5 py-0.5 rounded-[6px] bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/25 text-[8.5px] font-black uppercase tracking-widest flex-shrink-0">
                      {myCustomBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-bold -mt-0.5">
                  @{myUsername ? myUsername.toLowerCase() : "user"}
                </span>
              </div>

              {/* Status / Bio Quote container */}
              <div className="w-full mt-6 px-4">
                <div className="w-full p-4 rounded-3xl bg-black/40 border border-white/5 italic text-sm text-zinc-300 break-words leading-relaxed min-h-[64px] flex items-center justify-center relative shadow-inner">
                  {myBio ? `"${myBio}"` : "Этот сослушатель еще не настроил свой статус. Но уже готов слушать SoundCloud! 🎧"}
                </div>
              </div>

              {/* Actions panel */}
              <div className="w-full flex flex-col gap-3 mt-8">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowCustomizer(true)}
                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#ff5500]" /> Настроить Профиль
                  </button>
                ) : (
                  <button
                    onClick={handleStartCoListening}
                    className="w-full py-4 bg-[#ff5500] hover:bg-[#ff661a] text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#ff5500]/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" /> Слушать Вместе
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleCopyProfileLink}
                    className="py-3.5 bg-zinc-900 hover:bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Ссылка на профиль
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="py-3.5 bg-zinc-900 hover:bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col items-center justify-center z-10 py-12 animate-fadeIn text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-900/60 border border-white/5 flex items-center justify-center mb-6">
            <HelpCircle className="w-10 h-10 text-zinc-600" />
          </div>
          
          <div className="flex flex-col gap-2 mb-8">
            <h2 className="text-2xl font-black tracking-tight text-white">Профиль не найден</h2>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
              Пользователь с никнеймом <strong>@{decodeURIComponent(rawUsername)}</strong> не зарегистрирован в базе данных, либо это временная сессия гостя, которая уже закрылась.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              На главную
            </button>
            <button
              onClick={() => router.push("/?auth=open")}
              className="w-full py-4 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Зарегистрироваться
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
