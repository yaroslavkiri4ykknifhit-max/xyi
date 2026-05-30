"use client";

import { X, Sparkles, Calendar, Music, Wifi } from "lucide-react";
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
      className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 select-text animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm premium-glass-card rounded-[32px] overflow-hidden flex flex-col relative border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.9)] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4.5 right-4.5 z-50 p-2 rounded-full bg-black/45 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer hover:rotate-90 duration-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Banner with gorgeous gradient or custom uploaded picture */}
        <div 
          className="w-full h-32 relative transition-all duration-500"
          style={getBannerStyle(bannerUrl)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent"></div>
          
          {/* Audio Aura indicator */}
          <div className="absolute bottom-3 right-5 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-md border border-white/5 rounded-full text-[8.5px] font-black uppercase tracking-widest text-emerald-450 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot"></span>
            Сослушатель
          </div>
        </div>

        {/* User Card Content */}
        <div className="w-full px-6 relative flex flex-col items-center -mt-10 pb-8 text-center bg-[#0a0a0f]">
          
          {/* User Avatar - Strict Squared Logo Box */}
          <div 
            className="w-20 h-20 rounded-[20px] border-[4px] border-[#0a0a0f] flex items-center justify-center shadow-2xl relative overflow-hidden transition-all duration-300 bg-zinc-900"
            style={{ backgroundColor: avatarColor || "#007aff" }}
          >
            {avatarUrl && avatarUrl.startsWith("data:image") ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl filter drop-shadow-sm select-none">{avatarUrl || "🎧"}</span>
            )}
          </div>

          {/* User Information */}
          <div className="mt-3.5 w-full flex flex-col gap-1 items-center">
            <div className="flex items-center gap-1.5 min-w-0 justify-center">
              <h4 className="text-lg font-black tracking-tight text-white truncate max-w-[170px] uppercase">
                {username || "Guest"}
              </h4>
              {customBadge && (
                <span className="px-2 py-0.5 rounded-[4px] bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/20 text-[7px] font-black uppercase tracking-widest flex-shrink-0">
                  {customBadge}
                </span>
              )}
            </div>
            <span className="text-[9.5px] text-zinc-550 font-black -mt-0.5 tracking-wider uppercase font-mono">
              @{username ? username.toLowerCase() : "guest"}
            </span>

            {/* Bio Status */}
            <p className="text-xs text-zinc-300 font-medium px-4 mt-4 py-3 rounded-[18px] bg-black/40 border border-white/5 max-w-xs italic break-words leading-relaxed min-h-[52px] flex items-center justify-center w-full shadow-inner">
              {bio ? `"${bio}"` : "Присоединился к совместному прослушиванию музыки на XYI! 🎧"}
            </p>
          </div>

          {/* Social Stats/Details panel */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-white/5 text-left">
            <div className="p-3 bg-black/25 rounded-[18px] border border-white/3 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-650">В сети с</span>
                <span className="text-[9.5px] font-black text-zinc-350 mt-0.5">{formatJoinedDate(joinedAt)}</span>
              </div>
            </div>
            
            <div className="p-3 bg-black/25 rounded-[18px] border border-white/3 flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-emerald-500 flex-shrink-0 animate-pulse" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-zinc-650">Пинг / Канал</span>
                <span className="text-[9.5px] font-black text-emerald-450 font-mono mt-0.5">{latency || "24ms"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
