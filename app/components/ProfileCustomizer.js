"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Save, 
  User, 
  Image as ImageIcon, 
  Sparkles, 
  X, 
  Check, 
  FileText, 
  Activity, 
  AlertCircle 
} from "lucide-react";

// Predefined gorgeous premium gradient presets for banners (WCAG AA Compliant contrasts)
export const BANNER_GRADIENTS = [
  { id: "sunset", name: "Deep Cobalt", style: "linear-gradient(135deg, #003087 0%, #0052d4 50%, #4364f7 100%)" },
  { id: "cyberpunk", name: "Cyber Neon", style: "linear-gradient(135deg, #4c0519 0%, #311042 50%, #0b3c5d 100%)" },
  { id: "emerald", name: "Emerald Dusk", style: "linear-gradient(135deg, #022c22 0%, #064e3b 100%)" },
  { id: "gold", name: "Vapor Space", style: "linear-gradient(135deg, #050508 0%, #1e1b4b 50%, #4c0519 100%)" },
  { id: "darkmatter", name: "Dark Matter", style: "linear-gradient(135deg, #030712 0%, #090e1a 100%)" },
  { id: "soundwave", name: "Indigo Wave", style: "linear-gradient(135deg, #0a0f24 0%, #172554 50%, #1d4ed8 100%)" }
];

// Aesthetic music-focused preset avatars (emojis)
export const AVATAR_PRESETS = [
  "🎧", "🔥", "🌌", "🎹", "⚡", "👾", "🪐", "🦊", "👑", "🧊", "🎵", "⭐", "💿", "🧬"
];

// Custom brand-inspired premium colors for avatars
export const AVATAR_COLORS = [
  "#007aff", "#00b4d8", "#8a2be2", "#10b981", "#ec4899",
  "#3b82f6", "#ef4444", "#6366f1", "#14b8a6", "#1e293b"
];

export default function ProfileCustomizer({ 
  currentUser, 
  currentProfile, 
  onSave, 
  onClose,
  isDbTableMissing = false
}) {
  // Input fields
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState("#007aff");
  const [avatarUrl, setAvatarUrl] = useState(""); // preset-emoji OR base64 custom img
  const [bannerUrl, setBannerUrl] = useState("sunset"); // preset ID OR base64 custom img
  const [bio, setBio] = useState("");
  const [customBadge, setCustomBadge] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("info"); // "info" | "avatar" | "banner"

  // Image Uploading indicators
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Initialize values from current profile state
  useEffect(() => {
    if (currentProfile) {
      setUsername(currentProfile.username || "");
      setAvatarColor(currentProfile.avatarColor || currentProfile.avatar_color || "#007aff");
      setAvatarUrl(currentProfile.avatarUrl || currentProfile.avatar_url || "🎧");
      setBannerUrl(currentProfile.bannerUrl || currentProfile.banner_url || "sunset");
      setBio(currentProfile.bio || "");
      setCustomBadge(currentProfile.customBadge || currentProfile.custom_badge || "");
    }
  }, [currentProfile]);

  // Utility to compress and downscale uploaded images
  const processImageFile = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Файл должен быть изображением"));
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Downscale calculations
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Export as optimized low-size JPEG
          const base64Str = canvas.toDataURL("image/jpeg", 0.75);
          resolve(base64Str);
        };
        img.onerror = (err) => reject(new Error("Не удалось загрузить изображение"));
      };
      reader.onerror = (err) => reject(new Error("Ошибка чтения файла"));
    });
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg("");
    try {
      // Small avatar resolution: 120x120px
      const base64Result = await processImageFile(file, 120, 120);
      setAvatarUrl(base64Result);
    } catch (err) {
      setErrorMsg(err.message || "Ошибка загрузки аватарки");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    setErrorMsg("");
    try {
      // Optimal banner resolution: 500x160px
      const base64Result = await processImageFile(file, 500, 160);
      setBannerUrl(base64Result);
    } catch (err) {
      setErrorMsg(err.message || "Ошибка загрузки баннера");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg("Никнейм не может быть пустым");
      return;
    }
    
    // Regular expression to check username format (only alphanumeric and underscores, length 3-18)
    const usernameRegex = /^[a-zA-Z0-9_а-яА-ЯёЁ]{3,18}$/;
    if (!usernameRegex.test(username.trim())) {
      setErrorMsg("Никнейм должен быть от 3 до 18 символов и не содержать спецсимволы");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await onSave({
        username: username.trim(),
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        bio: bio.trim(),
        custom_badge: customBadge.trim()
      });

      setSuccessMsg("Профиль успешно обновлен!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 select-text animate-fadeIn">
      {/* Decorative Wavy Background Glow */}
      <div className="absolute top-[25%] left-[-15%] w-[45%] h-[45%] bg-[#007aff]/5 rounded-full blur-[150px] pointer-events-none z-0"></div>
      
      <div className="w-full max-w-3xl premium-glass-card rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col md:flex-row relative max-h-[92vh] z-10 border border-white/5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-50 p-2.5 rounded-full bg-black/40 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer hover:rotate-90 duration-300"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT COLUMN: LIVE CARD PREVIEW (iOS STYLE CARD) */}
        <div className="w-full md:w-[260px] bg-black/55 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-6 items-center justify-center flex-shrink-0">
          <div className="text-center w-full">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#007aff] pl-0.5">Предпросмотр</span>
            <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">Ваша карточка</p>
          </div>

          {/* Premium Hustler Profile Mockup Card */}
          <div className="w-full max-w-[200px] bg-[#0c0c12] border border-white/8 rounded-[24px] overflow-hidden flex flex-col shadow-2xl select-none group relative">
            
            {/* Card Banner */}
            <div 
              className="w-full h-20 relative transition-all duration-500"
              style={getBannerStyle(bannerUrl)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12]/95 to-transparent"></div>
            </div>

            {/* Card Avatar - Strict Squared Logo Box */}
            <div className="w-full px-4 relative flex flex-col items-center -mt-9 pb-5">
              <div 
                className="w-16 h-16 rounded-[18px] border-2 border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden transition-all duration-300 bg-zinc-950"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarUrl && avatarUrl.startsWith("data:image") ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl filter drop-shadow-sm select-none">{avatarUrl || "🎧"}</span>
                )}
                
                {/* Active Indicator Dot */}
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950 live-pulse-dot"></div>
              </div>

              {/* Card User Info */}
              <div className="text-center mt-2.5 w-full flex flex-col gap-1">
                <div className="flex items-center justify-center gap-1.5 min-w-0">
                  <span className="text-xs font-black text-white truncate max-w-[110px] uppercase tracking-tight">
                    {username || "Guest"}
                  </span>
                  {customBadge && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/20 text-[6.5px] font-black uppercase tracking-widest flex-shrink-0">
                      {customBadge.substring(0, 10)}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-500 font-black -mt-0.5 tracking-wider uppercase font-mono">
                  @{username ? username.toLowerCase() : "guest"}
                </span>

                {/* Card Bio */}
                <p className="text-[9px] text-zinc-300 font-medium px-2 mt-2 py-2 rounded-xl bg-black/40 border border-white/5 min-h-[36px] flex items-center justify-center italic break-words leading-tight">
                  {bio ? `"${bio}"` : "Совместно слушает музыку на XYI! 🎧"}
                </p>
              </div>
            </div>

            {/* View Full Profile Route Shortcut Button */}
            <button
              type="button"
              onClick={() => window.open(`/${username || "Guest"}`, "_blank")}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border-t border-white/5 rounded-none text-[8.5px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3 h-3 text-[#007aff]" /> Страница резидента
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: TABS & INPUT CONTROLS */}
        <form onSubmit={handleSaveSubmit} className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto min-h-0 text-left select-text scroll-smooth custom-slim-scrollbar">
          <div className="flex flex-col gap-1 pr-4">
            <h3 className="text-xl font-black tracking-tighter text-white flex items-center gap-2 uppercase">
              <Sparkles className="w-5 h-5 text-[#007aff] animate-pulse" /> Настройка Профиля
            </h3>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              Персонализируйте вашу музыкальную карточку и карточку резидента
            </p>
          </div>

          {/* Database Alert Warning */}
          {isDbTableMissing && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-[18px] flex gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Локальный режим (Supabase отсутствует)</span>
                <p className="text-[9.5px] text-zinc-400 leading-relaxed font-medium">
                  Ваши настройки будут временно работать и сохраняться локально в <strong>localStorage</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Segmented Control Tabs */}
          <div className="grid grid-cols-3 bg-black/45 p-1 rounded-full border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "info"
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Инфо
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("avatar")}
              className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "avatar"
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Аватар
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("banner")}
              className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "banner"
                  ? "bg-white/10 text-white shadow-md border border-white/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Баннер
            </button>
          </div>

          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === "info" && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500 pl-1 flex items-center justify-between tracking-widest">
                  <span>Ваш Никнейм</span>
                  <span className="text-[8px] normal-case text-zinc-650 font-black">3-18 символов</span>
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="Например, LofiVibe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/55 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#007aff]/50 transition-all font-semibold uppercase tracking-wide"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 pl-1 flex items-center justify-between tracking-widest">
                    <span>Кастомный бейдж</span>
                    <span className="text-[8px] normal-case text-zinc-650 font-black">Макс. 10 симв.</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Например, DJ, PROD"
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    className="w-full bg-black/55 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#007aff]/50 transition-all font-black tracking-widest uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500 pl-1 tracking-widest">
                    Цвет аватара
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-black/45 rounded-xl border border-white/5 min-h-[42px] items-center justify-center">
                    {AVATAR_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setAvatarColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-5.5 h-5.5 rounded-full transition-all active:scale-75 cursor-pointer flex items-center justify-center border border-black/35 ${
                          avatarColor === col ? "scale-115 ring-2 ring-[#007aff]/60 border-white/10" : "hover:scale-105"
                        }`}
                      >
                        {avatarColor === col && <Check className="w-3 h-3 text-black stroke-[4]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500 pl-1 tracking-widest">Статус / Биография</label>
                <textarea
                  rows={2}
                  maxLength={64}
                  placeholder="Например: Любитель ночных виниловых сессий..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-black/55 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#007aff]/50 transition-all resize-none leading-relaxed font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AVATAR CUSTOMIZATION */}
          {activeTab === "avatar" && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-black text-zinc-500 pl-1 tracking-widest">Загрузить свой аватар</span>
                
                <div className="flex items-center gap-4 bg-black/45 p-4 border border-white/5 rounded-[18px]">
                  <div 
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-14 h-14 rounded-xl border border-white/8 flex flex-col gap-1 items-center justify-center bg-black/50 hover:bg-white/5 transition-all cursor-pointer text-zinc-500 hover:text-white"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[7.5px] font-black uppercase tracking-widest">Фото</span>
                  </div>

                  <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3.5 py-1.5 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 active:scale-[0.98] w-fit transition-all text-white"
                    >
                      {uploadingAvatar ? "Сжатие..." : "Выбрать файл"}
                    </button>
                    <span className="text-[8.5px] text-zinc-500 leading-normal font-semibold uppercase tracking-wider">
                      PNG/JPG. Автоматическое сжатие до 120x120px для оптимизации трафика
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Эмодзи-Аватары</span>
                  {avatarUrl && avatarUrl.startsWith("data:image") && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("🎧")}
                      className="text-[9px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
                    >
                      Сбросить к эмодзи
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2.5 p-4 bg-black/45 rounded-[18px] border border-white/5">
                  {AVATAR_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarUrl(emoji)}
                      className={`h-10 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                        avatarUrl === emoji 
                          ? "bg-[#007aff]/10 border border-[#007aff]/45 scale-110 shadow-md"
                          : "bg-black/35 border border-white/5 hover:bg-white/5 hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANNER CUSTOMIZATION */}
          {activeTab === "banner" && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-black text-zinc-500 pl-1 tracking-widest">Загрузить свой баннер</span>
                
                <div className="flex items-center gap-4 bg-black/45 p-4 border border-white/5 rounded-[18px]">
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-14 h-11 rounded-xl border border-white/8 flex flex-col gap-0.5 items-center justify-center bg-black/50 hover:bg-white/5 transition-all cursor-pointer text-zinc-500 hover:text-white"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-[7.5px] font-black uppercase tracking-widest">Баннер</span>
                  </div>

                  <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3.5 py-1.5 border border-white/10 hover:border-white/20 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 active:scale-[0.98] w-fit transition-all text-white"
                    >
                      {uploadingBanner ? "Сжатие..." : "Выбрать баннер"}
                    </button>
                    <span className="text-[8.5px] text-zinc-500 leading-normal font-semibold uppercase tracking-wider">
                      PNG/JPG. Автоматическое сжатие до 500x160px для быстродействия
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Градиентные Пресеты</span>
                  {bannerUrl && bannerUrl.startsWith("data:image") && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl("sunset")}
                      className="text-[9px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
                    >
                      Сбросить к градиенту
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {BANNER_GRADIENTS.map((gradient) => (
                    <button
                      key={gradient.id}
                      type="button"
                      onClick={() => setBannerUrl(gradient.id)}
                      className={`h-12 rounded-xl p-3 flex flex-col justify-end text-left relative overflow-hidden transition-all duration-300 cursor-pointer ${
                        bannerUrl === gradient.id
                          ? "ring-2 ring-[#007aff]/60 scale-[1.01] shadow-lg border-white/10"
                          : "hover:scale-[1.005] hover:brightness-105"
                      }`}
                      style={{ background: gradient.style }}
                    >
                      <div className="absolute inset-0 bg-black/40 hover:bg-black/15 transition-colors"></div>
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-white relative z-10">
                        {gradient.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="text-rose-500 text-xs font-semibold pl-1">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-emerald-450 text-xs font-black uppercase tracking-widest pl-1 flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4 stroke-[3]" /> {successMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={saving || uploadingAvatar || uploadingBanner}
              className="flex-1 py-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              {saving ? "Сохранение..." : "Сохранить профиль"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-black/40 hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
