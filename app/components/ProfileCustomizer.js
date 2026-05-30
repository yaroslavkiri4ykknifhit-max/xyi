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

// Predefined gorgeous gradient presets for banners
export const BANNER_GRADIENTS = [
  { id: "sunset", name: "Sunset Pulse", style: "linear-gradient(135deg, #ff5500 0%, #ff007f 100%)" },
  { id: "cyberpunk", name: "Cyber Neon", style: "linear-gradient(135deg, #8a2be2 0%, #00b4d8 100%)" },
  { id: "emerald", name: "Emerald Dusk", style: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
  { id: "gold", name: "Liquid Gold", style: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)" },
  { id: "darkmatter", name: "Dark Matter", style: "linear-gradient(135deg, #1e1b4b 0%, #030712 100%)" },
  { id: "soundwave", name: "Soundwave Glow", style: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" }
];

// Aesthetic music-focused preset avatars (emojis)
export const AVATAR_PRESETS = [
  "🎧", "🔥", "🌌", "🎹", "⚡", "👾", "🪐", "🦊", "👑", "🧊", "🎵", "⭐", "💿", "🧬"
];

// Custom colors for avatars
export const AVATAR_COLORS = [
  "#FF5500", "#00B4D8", "#8A2BE2", "#10B981", "#EC4899",
  "#F59E0B", "#3B82F6", "#EF4444", "#6366F1", "#14B8A6"
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
  const [avatarColor, setAvatarColor] = useState("#FF5500");
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
      setAvatarColor(currentProfile.avatarColor || currentProfile.avatar_color || "#FF5500");
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
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/75 backdrop-blur-lg px-4 select-text animate-fadeIn">
      <div className="w-full max-w-2xl glass-panel rounded-[16px] border-[#ff5500]/25 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row relative max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/40 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT COLUMN: LIVE CARD PREVIEW (iOS STYLE CARD) */}
        <div className="w-full md:w-[240px] bg-black/40 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-6 items-center justify-center flex-shrink-0">
          <div className="text-center w-full">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#ff5500] pl-0.5">Предпросмотр</span>
            <p className="text-[9px] text-zinc-550 mt-0.5">Строгий стиль хастл-клуба</p>
          </div>

          {/* Premium Hustler Profile Mockup Card */}
          <div className="w-full max-w-[200px] bg-[#08080c] border border-[#ff5500]/20 rounded-xl overflow-hidden flex flex-col shadow-2xl select-none group relative">
            {/* Card Banner */}
            <div 
              className="w-full h-16 relative transition-all duration-500"
              style={getBannerStyle(bannerUrl)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>

            {/* Card Avatar - Strict Rounded Square */}
            <div className="w-full px-4 relative flex flex-col items-center -mt-8 pb-4">
              <div 
                className="w-14 h-14 rounded-xl border-2 border-[#ff5500]/35 flex items-center justify-center shadow-lg relative overflow-hidden transition-all duration-300 bg-zinc-950"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarUrl && avatarUrl.startsWith("data:image") ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-none" />
                ) : (
                  <span className="text-2xl filter drop-shadow-sm">{avatarUrl || "🎧"}</span>
                )}
              </div>

              {/* Card User Info */}
              <div className="text-center mt-2 w-full flex flex-col gap-1">
                <div className="flex items-center justify-center gap-1 min-w-0">
                  <span className="text-xs font-black text-white truncate max-w-[120px]">
                    {username || "Guest"}
                  </span>
                  {customBadge && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20 text-[7px] font-black uppercase tracking-wider scale-90 origin-left flex-shrink-0">
                      {customBadge.substring(0, 10)}
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-zinc-500 font-bold -mt-0.5">
                  @{username ? username.toLowerCase() : "guest"}
                </span>

                {/* Card Bio */}
                <p className="text-[9px] text-zinc-400 font-medium px-1 mt-1 line-clamp-2 italic break-words leading-tight bg-black/20 p-1.5 rounded-lg border border-white/3 min-h-[28px] flex items-center justify-center">
                  {bio ? `"${bio}"` : "Слушает музыку в реальном времени 🎧"}
                </p>
              </div>
            </div>

            {/* View Full Profile Route Shortcut Button */}
            <button
              type="button"
              onClick={() => window.open(`/${username || "Guest"}`, "_blank")}
              className="mt-3 w-full py-2 bg-zinc-900 hover:bg-white/5 border border-white/5 hover:border-[#ff5500]/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" /> Открыть страницу
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: TABS & INPUT CONTROLS */}
        <form onSubmit={handleSaveSubmit} className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto min-h-0 text-left select-text">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#ff5500]" /> Кастомизация аккаунта
            </h3>
            <p className="text-xs text-zinc-400">
              Создайте крутую идентичность в плеере
            </p>
          </div>

          {/* Database Alert Warning */}
          {isDbTableMissing && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Таблица отсутствует</span>
                <p className="text-[9.5px] text-zinc-400 leading-relaxed">
                  Таблица профилей еще не создана в Supabase. Ваши настройки будут временно работать и сохраняться локально в <strong>localStorage</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Segmented Control Tabs */}
          <div className="grid grid-cols-3 bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "info"
                  ? "bg-white/10 text-white shadow-sm border border-white/5"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Инфо
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("avatar")}
              className={`py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "avatar"
                  ? "bg-white/10 text-white shadow-sm border border-white/5"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Аватар
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("banner")}
              className={`py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "banner"
                  ? "bg-white/10 text-white shadow-sm border border-white/5"
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
                <label className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1 flex items-center justify-between">
                  <span>Ваш Никнейм</span>
                  <span className="text-[8px] normal-case text-zinc-600 font-semibold">3-18 символов, без спецсимволов</span>
                </label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="Например, LofiVibe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/60 border border-white/8 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-[#ff5500] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1 flex items-center justify-between">
                    <span>Кастомный бейдж</span>
                    <span className="text-[8px] normal-case text-zinc-600 font-semibold">Макс. 10 симв.</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Например, DJ, PROD"
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    className="w-full bg-black/60 border border-white/8 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-[#ff5500] transition-all font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1">
                    Цвет аватара (для подложки)
                  </label>
                  <div className="flex flex-wrap gap-2 p-2 bg-black/40 rounded-xl border border-white/5 min-h-[46px] items-center justify-center">
                    {AVATAR_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setAvatarColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-6 h-6 rounded-lg transition-transform active:scale-90 cursor-pointer flex items-center justify-center border border-black/30 ${
                          avatarColor === col ? "scale-125 ring-2 ring-[#ff5500]/50" : "hover:scale-110"
                        }`}
                      >
                        {avatarColor === col && <Check className="w-3 h-3 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1">Статус / Биография</label>
                <textarea
                  rows={2}
                  maxLength={64}
                  placeholder="Расскажите о своих вкусах..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-black/60 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#ff5500] transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: AVATAR CUSTOMIZATION */}
          {activeTab === "avatar" && (
            <div className="flex flex-col gap-5 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1">Загрузить свой аватар</span>
                
                <div className="flex items-center gap-4 bg-black/40 p-4 border border-white/5 rounded-xl">
                  <div 
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border border-white/10 flex flex-col gap-1 items-center justify-center bg-black/50 hover:bg-white/5 transition-all cursor-pointer text-zinc-500 hover:text-white"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-wider">Фото</span>
                  </div>

                  <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg bg-white/5 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-white/10 active:scale-[0.98] w-fit"
                    >
                      {uploadingAvatar ? "Сжатие..." : "Выбрать файл"}
                    </button>
                    <span className="text-[8.5px] text-zinc-500 leading-normal">
                      PNG/JPG. Изображение будет автоматически сжато в Canvas до компактного разрешения (120x120px) для мгновенной загрузки.
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
                  <span className="text-[10px] uppercase font-extrabold text-zinc-500">Эстетичные Эмодзи-аватары</span>
                  {avatarUrl && avatarUrl.startsWith("data:image") && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("🎧")}
                      className="text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      Сбросить к эмодзи
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                  {AVATAR_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarUrl(emoji)}
                      className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                        avatarUrl === emoji 
                          ? "bg-[#ff5500]/10 border border-[#ff5500]/40 scale-110 shadow-md"
                          : "bg-black/30 border border-white/5 hover:bg-white/5 hover:scale-105"
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
                <span className="text-[10px] uppercase font-extrabold text-zinc-500 pl-1">Загрузить свой баннер</span>
                
                <div className="flex items-center gap-4 bg-black/40 p-4 border border-white/5 rounded-xl">
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-16 h-12 rounded-xl border border-white/10 flex flex-col gap-1 items-center justify-center bg-black/50 hover:bg-white/5 transition-all cursor-pointer text-zinc-500 hover:text-white"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-[7px] font-black uppercase tracking-wider">Баннер</span>
                  </div>

                  <div className="flex flex-col gap-1 text-left min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg bg-white/5 text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-white/10 active:scale-[0.98] w-fit"
                    >
                      {uploadingBanner ? "Сжатие..." : "Выбрать баннер"}
                    </button>
                    <span className="text-[8.5px] text-zinc-500 leading-normal">
                      PNG/JPG. Изображение будет автоматически сжато до разрешения (500x160px) для быстродействия плеера.
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
                  <span className="text-[10px] uppercase font-extrabold text-zinc-500">Градиентные Пресеты</span>
                  {bannerUrl && bannerUrl.startsWith("data:image") && (
                    <button
                      type="button"
                      onClick={() => setBannerUrl("sunset")}
                      className="text-[9px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors cursor-pointer"
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
                      className={`h-14 rounded-xl p-3 flex flex-col justify-end text-left relative overflow-hidden transition-all duration-300 cursor-pointer ${
                        bannerUrl === gradient.id
                          ? "ring-2 ring-[#ff5500] scale-[1.02] shadow-lg"
                          : "hover:scale-[1.01] hover:brightness-110"
                      }`}
                      style={{ background: gradient.style }}
                    >
                      <div className="absolute inset-0 bg-black/35 hover:bg-black/10 transition-colors"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white relative z-10">
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
            <div className="text-red-500 text-xs font-semibold pl-1">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-emerald-500 text-xs font-black uppercase tracking-widest pl-1 flex items-center gap-1.5 animate-pulse">
              <Check className="w-4 h-4 stroke-[3]" /> {successMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={saving || uploadingAvatar || uploadingBanner}
              className="flex-1 py-4 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              {saving ? "Сохранение..." : "Сохранить профиль"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-black/40 hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
