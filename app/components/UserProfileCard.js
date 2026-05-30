"use client";

import { X, Sparkles, Calendar, Music } from "lucide-react";
import { BANNER_GRADIENTS } from "./ProfileCustomizer";

export default function UserProfileCard({ 
  userProfile, 
  onClose 
}) {
  if (!userProfile) return null;

  const {
    username,
    avatarColor,
    avatarUrl,
    bannerUrl,
    bio,
    customBadge,
    joinedAt,
    latency
  } = userProfile;

  // Helper to determine banner styling
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

  // Helper to format date safely
  const formatJoinedDate = (dateStr) => {
    if (!dateStr) return "Только что";
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Только что";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 select-text animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm glass-panel rounded-[36px] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative scale-up-animation"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-black/40 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Banner with gorgeous gradient or custom uploaded picture */}
        <div 
          className="w-full h-28 relative transition-all duration-500"
          style={getBannerStyle(bannerUrl)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
          
          {/* Audio Aura indicator */}
          <div className="absolute bottom-2 right-4 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-full text-[8px] font-black uppercase tracking-wider text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot"></span>
            Сослушатель
          </div>
        </div>

        {/* User Card Content */}
        <div className="w-full px-6 relative flex flex-col items-center -mt-10 pb-8 text-center">
          
          {/* User Avatar */}
          <div 
            className="w-20 h-20 rounded-full border-[4px] border-[#08080a] flex items-center justify-center shadow-xl relative overflow-hidden transition-all duration-300 bg-zinc-800"
            style={{ backgroundColor: avatarColor || "#ff5500" }}
          >
            {avatarUrl && avatarUrl.startsWith("data:image") ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl filter drop-shadow-sm">{avatarUrl || "🎧"}</span>
            )}
          </div>

          {/* User Information */}
          <div className="mt-3 w-full flex flex-col gap-1 items-center">
            <div className="flex items-center gap-1.5 min-w-0 justify-center">
              <h4 className="text-lg font-black tracking-tight text-white truncate max-w-[180px]">
                {username || "Guest"}
              </h4>
              {customBadge && (
                <span className="px-2 py-0.5 rounded-[6px] bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/25 text-[8px] font-extrabold uppercase tracking-widest flex-shrink-0 scale-90">
                  {customBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 font-bold -mt-0.5">
              @{username ? username.toLowerCase() : "guest"}
            </span>

            {/* Bio Status */}
            <p className="text-xs text-zinc-300 font-medium px-4 mt-3 py-2.5 rounded-2xl bg-black/40 border border-white/5 max-w-xs italic break-words leading-relaxed min-h-[48px] flex items-center justify-center w-full shadow-inner">
              {bio ? `"${bio}"` : "Присоединился к совместному прослушиванию музыки на XYI! 🎧"}
            </p>
          </div>

          {/* Social Stats/Details panel */}
          <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5 text-left">
            <div className="p-2.5 bg-black/25 rounded-2xl border border-white/3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">В сети с</span>
                <span className="text-[10px] font-bold text-zinc-300">{formatJoinedDate(joinedAt)}</span>
              </div>
            </div>
            
            <div className="p-2.5 bg-black/25 rounded-2xl border border-white/3 flex items-center gap-2">
              <Music className="w-4 h-4 text-[#ff5500] flex-shrink-0 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Пинг / Пакеты</span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">{latency || "24ms"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
