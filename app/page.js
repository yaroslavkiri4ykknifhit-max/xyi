"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import ProfileCustomizer from "./components/ProfileCustomizer";
import UserProfileCard from "./components/UserProfileCard";
import {
  Play,
  Pause,
  Plus,
  List,
  Copy,
  Check,
  Music,
  SkipForward,
  SkipBack,
  Link2,
  Trash2,
  Radio,
  ExternalLink,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Send,
  MessageSquare,
  Users,
  Wifi,
  Heart,
  Compass,
  Search,
  Disc,
  ChevronRight
} from "lucide-react";

// List of cool music-related nicknames for random generation
const NICKNAMES = [
  "SynthWave", "BassDrop", "BeatMaker", "LofiVibe", "VocalChords",
  "EchoDelay", "ReverbKing", "TrebleClef", "RhythmSoul", "SonicBoom",
  "PitchPerfect", "MelodyDream", "TempoHustle", "SubWoofer", "VinylSpin"
];

// Harmonious custom colors for avatars
const AVATAR_COLORS = [
  "#007aff", "#00B4D8", "#00c6ff", "#10B981", "#EC4899",
  "#F59E0B", "#3B82F6", "#EF4444", "#6366F1", "#14B8A6"
];

// 1. Loading UI inside the Suspense Boundary
function PageLoading() {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-none border-t-2 border-[#007aff] border-r-2 border-r-transparent animate-spin"></div>
        <p className="text-zinc-400 text-xs tracking-widest font-light animate-pulse uppercase">
          Загрузка XYI...
        </p>
      </div>
    </div>
  );
}

// 2. Main Sync Player Application
function SyncPlayerApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomCode = searchParams.get("room") || "";
  const [isDark, setIsDark] = useState(true);

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

  // User details state (Realtime Presence)
  const [myUsername, setMyUsername] = useState("");
  const [myAvatarColor, setMyAvatarColor] = useState("");
  const [participants, setParticipants] = useState([]);
  const [copied, setCopied] = useState(false);

  // Component States
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);

  // Playlist and Track states
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [addingTrack, setAddingTrack] = useState(false);

  // Audio Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [widgetReady, setWidgetReady] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isHearted, setIsHearted] = useState(false);

  // Real-time Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [needInteractionSync, setNeedInteractionSync] = useState(false);

  // Personal Favorites states
  const [personalLibrary, setPersonalLibrary] = useState([]);
  const [newPersonalUrl, setNewPersonalUrl] = useState("");
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  // SoundCloud accounts and imports
  const [activeLibraryTab, setActiveLibraryTab] = useState("favorites"); // 'favorites' | 'playlist' | 'bulk'
  const [importUrl, setImportUrl] = useState("");
  const [importingPlaylist, setImportingPlaylist] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [importingBulk, setImportingBulk] = useState(false);
  const [tempIframeUrl, setTempIframeUrl] = useState("");

  // ==================== SUPABASE AUTH & ROOMS STATES ====================
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState("login"); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);

  const [roomSettings, setRoomSettings] = useState({
    owner_id: null,
    is_public: false,
    room_name: ""
  });
  const [newRoomNameInput, setNewRoomNameInput] = useState("");

  // Profile Customization States
  const [myBio, setMyBio] = useState("");
  const [myCustomBadge, setMyCustomBadge] = useState("");
  const [myAvatarUrl, setMyAvatarUrl] = useState("🎧");
  const [myBannerUrl, setMyBannerUrl] = useState("sunset");
  const [isDbTableMissing, setIsDbTableMissing] = useState(false);
  const [showProfileCustomizer, setShowProfileCustomizer] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  // Refs to handle realtime synchronization and prevent circular feedback loops
  const widgetRef = useRef(null);
  const currentTrackIdRef = useRef(null);
  const isSyncingRef = useRef(false);
  const chatContainerRef = useRef(null);
  const channelRef = useRef(null);
  const iframeRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const playlistRef = useRef([]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  const loadAndSyncProfile = async (user, cidToUse) => {
    const finalCid = cidToUse || clientId;
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          if (error.code === "42P01" || (error.message && error.message.includes("relation") && error.message.includes("does not exist"))) {
            setIsDbTableMissing(true);
            throw new Error("Table missing");
          }
          throw error;
        }

        if (profile) {
          setMyUsername(profile.username || user.email.split("@")[0]);
          setMyAvatarColor(profile.avatar_color || "#007aff");
          setMyAvatarUrl(profile.avatar_url || "🎧");
          setMyBannerUrl(profile.banner_url || "sunset");
          setMyBio(profile.bio || "");
          setMyCustomBadge(profile.custom_badge || "");

          sessionStorage.setItem("xyi_username", profile.username || user.email.split("@")[0]);
          sessionStorage.setItem("xyi_avatar_color", profile.avatar_color || "#007aff");
        } else {
          const defaultNick = user.email.split("@")[0];
          const defaultColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
          const newProfile = {
            id: user.id,
            username: defaultNick,
            avatar_color: defaultColor,
            avatar_url: "🎧",
            banner_url: "sunset",
            bio: "",
            custom_badge: ""
          };

          const { error: insertError } = await supabase
            .from("profiles")
            .upsert(newProfile);

          if (!insertError) {
            setMyUsername(defaultNick);
            setMyAvatarColor(defaultColor);
            setMyAvatarUrl("🎧");
            setMyBannerUrl("sunset");
            setMyBio("");
            setMyCustomBadge("");

            sessionStorage.setItem("xyi_username", defaultNick);
            sessionStorage.setItem("xyi_avatar_color", defaultColor);
          }
        }
      } catch (err) {
        console.warn("Failed to load user profile from database, falling back to local storage:", err);
        loadGuestProfile(finalCid);
      }
    } else {
      loadGuestProfile(finalCid);
    }
  };

  const loadGuestProfile = (finalCid) => {
    let guestName = localStorage.getItem("xyi_guest_username");
    let guestColor = localStorage.getItem("xyi_guest_avatar_color");
    let guestAvatar = localStorage.getItem("xyi_guest_avatar_url");
    let guestBanner = localStorage.getItem("xyi_guest_banner_url");
    let guestBio = localStorage.getItem("xyi_guest_bio");
    let guestBadge = localStorage.getItem("xyi_guest_custom_badge");

    if (!guestName) {
      guestName = sessionStorage.getItem("xyi_username") || (NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + "_" + Math.floor(100 + Math.random() * 900));
      localStorage.setItem("xyi_guest_username", guestName);
    }
    if (!guestColor) {
      guestColor = sessionStorage.getItem("xyi_avatar_color") || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      localStorage.setItem("xyi_guest_avatar_color", guestColor);
    }
    if (!guestAvatar) {
      guestAvatar = "🎧";
      localStorage.setItem("xyi_guest_avatar_url", guestAvatar);
    }
    if (!guestBanner) {
      guestBanner = "sunset";
      localStorage.setItem("xyi_guest_banner_url", guestBanner);
    }
    if (!guestBio) {
      guestBio = "";
      localStorage.setItem("xyi_guest_bio", guestBio);
    }
    if (!guestBadge) {
      guestBadge = "";
      localStorage.setItem("xyi_guest_custom_badge", guestBadge);
    }

    setMyUsername(guestName);
    setMyAvatarColor(guestColor);
    setMyAvatarUrl(guestAvatar);
    setMyBannerUrl(guestBanner);
    setMyBio(guestBio);
    setMyCustomBadge(guestBadge);

    sessionStorage.setItem("xyi_username", guestName);
    sessionStorage.setItem("xyi_avatar_color", guestColor);
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

    setMyUsername(data.username);
    setMyAvatarColor(data.avatar_color);
    setMyAvatarUrl(data.avatar_url);
    setMyBannerUrl(data.banner_url);
    setMyBio(data.bio);
    setMyCustomBadge(data.custom_badge);

    sessionStorage.setItem("xyi_username", data.username);
    sessionStorage.setItem("xyi_avatar_color", data.avatar_color);

    if (channelRef.current) {
      await channelRef.current.track({
        id: clientId,
        username: data.username,
        avatarColor: data.avatar_color,
        avatarUrl: data.avatar_url,
        bannerUrl: data.banner_url,
        bio: data.bio,
        customBadge: data.custom_badge,
        joinedAt: new Date().toISOString(),
        latency: "15ms"
      });
    }

    sendChatSystemMessage(`👤 ${data.username} обновил свой профиль!`);
  };

  const getBannerStyle = (url) => {
    const BANNER_GRADIENTS = [
      { id: "sunset", name: "Sunset Pulse", style: "linear-gradient(135deg, #007aff 0%, #ff007f 100%)" },
      { id: "cyberpunk", name: "Cyber Neon", style: "linear-gradient(135deg, #00c6ff 0%, #00b4d8 100%)" },
      { id: "emerald", name: "Emerald Dusk", style: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
      { id: "gold", name: "Liquid Gold", style: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)" },
      { id: "darkmatter", name: "Dark Matter", style: "linear-gradient(135deg, #1e1b4b 0%, #030712 100%)" },
      { id: "soundwave", name: "Soundwave Glow", style: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" }
    ];
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

  // 3. Initialize unique client session ID, username, and avatar color
  useEffect(() => {
    let cid = sessionStorage.getItem("xyi_client_id");
    if (!cid) {
      cid = "client_" + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("xyi_client_id", cid);
    }
    setClientId(cid);

    // Initial Chat messages
    setChatMessages([
      {
        id: "sys_1",
        username: "🎧 XYI BOT",
        avatarColor: "#007aff",
        avatarUrl: "🎧",
        text: "Добро пожаловать в комнату! Музыка играет синхронно для всех участников в реальном времени. Вставьте ссылку на SoundCloud-трек в центре, чтобы добавить его в очередь!",
        timestamp: "Система",
        isSystem: true
      }
    ]);

    // LocalStorage Volume sync
    const savedVol = localStorage.getItem("xyi_volume");
    if (savedVol) {
      setVolume(parseInt(savedVol));
    }

    // LocalStorage Personal Favorites sync
    const savedFav = localStorage.getItem("xyi_favorites");
    if (savedFav) {
      try {
        setPersonalLibrary(JSON.parse(savedFav));
      } catch (e) {
        console.error(e);
      }
    }

    // Load custom profile
    supabase.auth.getUser().then(({ data: { user } }) => {
      loadAndSyncProfile(user, cid);
    });
  }, []);

  // ==================== SUPABASE AUTH & ROOMS ACTIONS ====================
  useEffect(() => {
    // Check initial user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      loadAndSyncProfile(user);
    });

    // Listen for real-time authentication events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      loadAndSyncProfile(user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [clientId]);

  // Fetch Public Rooms List periodically
  const fetchPublicRooms = async () => {
    setLoadingPublicRooms(true);
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, room_name, is_public, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPublicRooms(data || []);
    } catch (err) {
      console.error("Error fetching public rooms:", err);
    } finally {
      setLoadingPublicRooms(false);
    }
  };

  useEffect(() => {
    if (!roomCode) {
      fetchPublicRooms();
      const interval = setInterval(fetchPublicRooms, 15000);
      return () => clearInterval(interval);
    }
  }, [roomCode]);

  // Auth Form Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Заполните все поля");
      return;
    }
    setAuthLoading(true);
    setAuthError("");

    try {
      if (authTab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert("Регистрация успешна! Теперь вы можете войти.");
        setAuthTab("login");
      }
    } catch (err) {
      setAuthError(err.message || "Ошибка авторизации");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    sessionStorage.removeItem("xyi_username");
    sessionStorage.removeItem("xyi_avatar_color");
    
    loadGuestProfile();
    router.push("/");
  };

  // Navigates authenticated user to their one permanent room, or creates it if none exists
  const handleGoToMyRoom = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("id")
        .eq("owner_id", currentUser.id)
        .maybeSingle();

      if (existingRoom) {
        router.push(`/?room=${existingRoom.id}`);
      } else {
        await handleCreateRoomAction();
      }
    } catch (err) {
      console.error("Error navigating to my room:", err);
    } finally {
      setLoading(false);
    }
  };

  // Room Settings Handlers
  const handleToggleRoomPublicity = async () => {
    if (!currentUser || roomSettings.owner_id !== currentUser.id) return;
    
    const nextPublicState = !roomSettings.is_public;
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ is_public: nextPublicState })
        .eq("id", roomCode.toUpperCase());

      if (error) throw error;
      setRoomSettings(prev => ({ ...prev, is_public: nextPublicState }));
      sendChatSystemMessage(`🔧 Настройки: комната переведена в ${nextPublicState ? "ПУБЛИЧНЫЙ" : "ПРИВАТНЫЙ"} режим!`);
    } catch (err) {
      console.error("Error updating room publicity:", err);
    }
  };

  const handleUpdateRoomName = async (e) => {
    e.preventDefault();
    if (!currentUser || roomSettings.owner_id !== currentUser.id || !newRoomNameInput.trim()) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ room_name: newRoomNameInput.trim() })
        .eq("id", roomCode.toUpperCase());

      if (error) throw error;
      setRoomSettings(prev => ({ ...prev, room_name: newRoomNameInput.trim() }));
      sendChatSystemMessage(`🔧 Настройки: комната переименована в "${newRoomNameInput.trim()}"!`);
    } catch (err) {
      console.error("Error updating room name:", err);
    }
  };

  // useEffect to handle background playlist imports
  useEffect(() => {
    if (!tempIframeUrl || typeof window === "undefined" || !window.SC) return;

    let pingInterval;
    let finished = false;

    const setupTempWidget = () => {
      try {
        const iframe = document.getElementById("soundcloud-temp-player");
        if (!iframe) return false;

        const tempWidget = window.SC.Widget(iframe);

        tempWidget.bind(window.SC.Widget.Events.READY, () => {
          if (finished) return;
          tempWidget.getSounds((sounds) => {
            if (finished) return;
            finished = true;
            clearInterval(pingInterval);

            if (sounds && sounds.length > 0) {
              const importedTracks = sounds.map((sound) => ({
                id: "fav_" + Math.random().toString(36).substring(2, 9),
                track_url: sound.permalink_url,
                title: sound.title,
                thumbnail: sound.artwork_url || "https://w.soundcloud.com/player/assets/images/default-artwork.png",
                addedAt: new Date().toISOString(),
              }));

              setPersonalLibrary((prev) => {
                const updated = [...prev, ...importedTracks];
                localStorage.setItem("xyi_favorites", JSON.stringify(updated));
                return updated;
              });

              sendChatSystemMessage(`📥 ${myUsername} импортировал плейлист: добавлено ${sounds.length} треков в медиатеку!`);
            } else {
              alert("Не удалось загрузить треки из этого плейлиста. Убедитесь, что плейлист публичный.");
            }

            setTempIframeUrl("");
            setImportingPlaylist(false);
          });
        });

        // Fallback ping: in case READY event has fired or got missed
        let pings = 0;
        pingInterval = setInterval(() => {
          if (finished) return;
          pings++;
          if (pings > 30) {
            clearInterval(pingInterval);
            if (!finished) {
              finished = true;
              alert("Импорт превысил лимит времени ожидания. Проверьте правильность ссылки плейлиста.");
              setTempIframeUrl("");
              setImportingPlaylist(false);
            }
            return;
          }

          try {
            tempWidget.getSounds((sounds) => {
              if (finished) return;
              if (sounds && sounds.length > 0) {
                finished = true;
                clearInterval(pingInterval);

                const importedTracks = sounds.map((sound) => ({
                  id: "fav_" + Math.random().toString(36).substring(2, 9),
                  track_url: sound.permalink_url,
                  title: sound.title,
                  thumbnail: sound.artwork_url || "https://w.soundcloud.com/player/assets/images/default-artwork.png",
                  addedAt: new Date().toISOString(),
                }));

                setPersonalLibrary((prev) => {
                  const updated = [...prev, ...importedTracks];
                  localStorage.setItem("xyi_favorites", JSON.stringify(updated));
                  return updated;
                });

                sendChatSystemMessage(`📥 ${myUsername} импортировал плейлист: добавлено ${sounds.length} треков в медиатеку!`);
                setTempIframeUrl("");
                setImportingPlaylist(false);
              }
            });
          } catch (e) {
            // ignore
          }
        }, 500);

        return true;
      } catch (err) {
        console.error("Error setting up temp widget:", err);
        return false;
      }
    };

    const timer = setTimeout(() => {
      setupTempWidget();
    }, 400);

    return () => {
      finished = true;
      clearTimeout(timer);
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [tempIframeUrl, myUsername]);

  // 4. Scroll to bottom of chat without jumping the browser window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 5. Fetch or Auto-Create rooms
  const fetchOrCreateRoom = async (code) => {
    const formattedCode = code.toUpperCase().trim();
    let { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", formattedCode)
      .single();

    if (error && error.code === "PGRST116") {
      // Room does not exist, insert a fresh room record
      const { data: newRoom, error: createError } = await supabase
        .from("rooms")
        .insert([
          {
            id: formattedCode,
            is_playing: false,
            progress_ms: 0,
            state_updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Error creating room:", createError);
        return null;
      }
      return newRoom;
    }
    return room;
  };

  // 6. Fetch Room's Playlist
  const fetchPlaylist = async (code) => {
    const { data, error } = await supabase
      .from("playlist")
      .select("*")
      .eq("room_id", code)
      .order("added_at", { ascending: true });

    if (error) {
      console.error("Error fetching playlist:", error);
      return [];
    } else {
      setPlaylist(data || []);
      return data || [];
    }
  };

  // 7. Handle room joining & Realtime setup (Presence + Broadcast + DB sync)
  useEffect(() => {
    if (!roomCode || !myUsername) return;

    let roomChannel;
    let playlistChannel;

    const initializeRoomSession = async () => {
      setLoading(true);
      const code = roomCode.toUpperCase().trim();

      // Get or create room
      const room = await fetchOrCreateRoom(code);
      if (!room) {
        alert("Ошибка при входе в комнату. Попробуйте еще раз.");
        router.push("/");
        setLoading(false);
        return;
      }

      // Populate room settings for owner checking and metadata display
      setRoomSettings({
        owner_id: room.owner_id || null,
        is_public: room.is_public || false,
        room_name: room.room_name || `Комната ${code}`
      });
      setNewRoomNameInput(room.room_name || `Комната ${code}`);

      // Fetch playlist
      await fetchPlaylist(code);

      // Establish initial state
      if (room.current_track_id) {
        currentTrackIdRef.current = room.current_track_id;
        setIsPlaying(room.is_playing);
        setProgressMs(room.progress_ms);
      }

      setLoading(false);

      const cid = sessionStorage.getItem("xyi_client_id") || "client_anon";
      const name = sessionStorage.getItem("xyi_username") || "Guest";
      const color = sessionStorage.getItem("xyi_avatar_color") || "#007aff";

      // Setup Supabase Channel with Presence support
      roomChannel = supabase.channel(`room-state-${code}`, {
        config: {
          presence: {
            key: cid,
          }
        }
      });
      channelRef.current = roomChannel;

      // A. Listen to DB changes (fallback)
      roomChannel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${code}`,
        },
        (payload) => {
          const updatedRoom = payload.new;
          if (updatedRoom.sender_id !== cid) {
            handleIncomingRoomState(updatedRoom);
          }
        }
      );

      // B. Listen to BROADCAST messages (instant control)
      roomChannel.on(
        "broadcast",
        { event: "player_control" },
        ({ payload }) => {
          if (payload.senderId !== cid) {
            handleIncomingBroadcastControl(payload);
          }
        }
      );

      // C. Listen to BROADCAST messages (instant chat)
      roomChannel.on(
        "broadcast",
        { event: "chat_message" },
        ({ payload }) => {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      );

      // D. Listen to Presence Sync events
      roomChannel.on("presence", { event: "sync" }, () => {
        const presenceState = roomChannel.presenceState();
        const activeUsers = [];
        for (const key in presenceState) {
          activeUsers.push(...presenceState[key]);
        }
        setParticipants(activeUsers);
      });

      // E. Subscribe and Track
      roomChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const user = (await supabase.auth.getUser()).data?.user;
          let currentAvatarUrl = "🎧";
          let currentBannerUrl = "sunset";
          let currentBio = "";
          let currentCustomBadge = "";

          if (user) {
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

              if (profile) {
                currentAvatarUrl = profile.avatar_url || "🎧";
                currentBannerUrl = profile.banner_url || "sunset";
                currentBio = profile.bio || "";
                currentCustomBadge = profile.custom_badge || "";
              }
            } catch (e) {}
          } else {
            currentAvatarUrl = localStorage.getItem("xyi_guest_avatar_url") || "🎧";
            currentBannerUrl = localStorage.getItem("xyi_guest_banner_url") || "sunset";
            currentBio = localStorage.getItem("xyi_guest_bio") || "";
            currentCustomBadge = localStorage.getItem("xyi_guest_custom_badge") || "";
          }

          await roomChannel.track({
            id: cid,
            username: name,
            avatarColor: color,
            avatarUrl: currentAvatarUrl,
            bannerUrl: currentBannerUrl,
            bio: currentBio,
            customBadge: currentCustomBadge,
            joinedAt: new Date().toISOString(),
            latency: Math.floor(15 + Math.random() * 30) + "ms"
          });
        }
      });

      // F. Subscribe to Playlist edits
      playlistChannel = supabase.channel(`playlist-state-${code}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "playlist",
            filter: `room_id=eq.${code}`,
          },
          () => {
            fetchPlaylist(code);
          }
        )
        .subscribe();
    };

    initializeRoomSession();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
      if (playlistChannel) supabase.removeChannel(playlistChannel);
    };
  }, [roomCode, myUsername]);

  // 8. Update currently active playlist track reference when list loads
  useEffect(() => {
    if (playlist.length > 0 && currentTrackIdRef.current) {
      const activeTrack = playlist.find(t => t.id === currentTrackIdRef.current);
      if (activeTrack) {
        setCurrentTrack(activeTrack);
      }
    } else if (playlist.length === 0) {
      setCurrentTrack(null);
    }
  }, [playlist]);

  // Load track initially when widget is ready and current track is determined (Multiplayer late-join fix)
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (widgetReady && currentTrack && !initialLoadRef.current) {
      initialLoadRef.current = true;
      
      const getInitialPositionAndLoad = async () => {
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomCode.toUpperCase())
          .single();
          
        if (room) {
          let startProgress = room.progress_ms;
          if (room.is_playing) {
            // Apply drift compensation
            const delta = Date.now() - new Date(room.state_updated_at).getTime();
            startProgress += delta;
          }
          loadSoundCloudTrack(currentTrack.track_url, room.is_playing, startProgress);
          setIsPlaying(room.is_playing);
          setProgressMs(startProgress);
          
          if (room.is_playing) {
            setNeedInteractionSync(true);
          }
        } else {
          loadSoundCloudTrack(currentTrack.track_url, isPlaying, progressMs);
        }
      };

      getInitialPositionAndLoad();
    }
  }, [widgetReady, currentTrack]);

  // Audio interaction trigger (to resolve strict browser autoplay policy)
  useEffect(() => {
    const handleInteraction = () => {
      setNeedInteractionSync(false);
      if (widgetRef.current && widgetReady && isPlaying) {
        widgetRef.current.play();
        widgetRef.current.seekTo(progressMs);
      }
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };

    if (needInteractionSync) {
      window.addEventListener("click", handleInteraction);
      window.addEventListener("touchstart", handleInteraction);
    }

  }, [needInteractionSync, isPlaying, widgetReady, progressMs]);

  // Automatic background synchronization to keep users in sync seamlessly
  useEffect(() => {
    if (!widgetRef.current || !currentTrack || !isPlaying) return;

    // Buffer stabilization delay (1.5 seconds) to let player settle before calibrating
    const timer = setTimeout(async () => {
      try {
        const code = roomCode.toUpperCase().trim();
        const { data: room } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", code)
          .single();
          
        if (room) {
          let expectedProgress = room.progress_ms;
          if (room.is_playing) {
            const delta = Date.now() - new Date(room.state_updated_at).getTime();
            expectedProgress += delta;
          }
          
          widgetRef.current.getPosition((actualPos) => {
            const diff = Math.abs(actualPos - expectedProgress);
            // If out of sync by more than 1.5 seconds, align silently
            if (diff > 1500) {
              widgetRef.current.seekTo(expectedProgress);
              setProgressMs(expectedProgress);
              console.log(`[Auto-Sync] Calibrated player position by ${((actualPos - expectedProgress)/1000).toFixed(2)}s`);
            }
          });
        }
      } catch (err) {
        console.error("Error running auto-sync calibration:", err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentTrack, isPlaying, roomCode]);

  // 9. Send real-time broadcast controls
  const broadcastPlayerAction = (action, playing, progress, trackId) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_control",
        payload: {
          action,
          isPlaying: playing,
          progressMs: progress,
          trackId: trackId || (currentTrack ? currentTrack.id : null),
          senderId: clientId,
          timestamp: Date.now()
        }
      });
    }
  };

  // 10. Apply Remote Supabase changes with Drift Correction (DB Fallback)
  const handleIncomingRoomState = async (updatedRoom) => {
    setIsPlaying(updatedRoom.is_playing);

    // Track skips or initial track load
    if (updatedRoom.current_track_id !== currentTrackIdRef.current) {
      currentTrackIdRef.current = updatedRoom.current_track_id;
      // Find matching track using reactive ref to prevent stale closure bugs
      const matchingTrack = playlistRef.current.find((t) => t.id === updatedRoom.current_track_id);
      if (matchingTrack) {
        setCurrentTrack(matchingTrack);
        loadSoundCloudTrack(matchingTrack.track_url, updatedRoom.is_playing, updatedRoom.progress_ms);
      } else {
        // Fallback: fetch playlist then find
        const { data } = await supabase
          .from("playlist")
          .select("*")
          .eq("room_id", roomCode.toUpperCase())
          .order("added_at", { ascending: true });
        
        if (data) {
          setPlaylist(data);
          const t = data.find((x) => x.id === updatedRoom.current_track_id);
          if (t) {
            setCurrentTrack(t);
            loadSoundCloudTrack(t.track_url, updatedRoom.is_playing, updatedRoom.progress_ms);
          }
        }
      }
    } else {
      // Normal Play/Pause or Seek on same track
      if (widgetRef.current) {
        isSyncingRef.current = true;
        if (updatedRoom.is_playing) {
          widgetRef.current.play();
        } else {
          widgetRef.current.pause();
        }

        // Apply Drift Sync Formula
        let expectedProgress = updatedRoom.progress_ms;
        if (updatedRoom.is_playing) {
          const delta = Date.now() - new Date(updatedRoom.state_updated_at).getTime();
          expectedProgress += delta;
        }

        widgetRef.current.getPosition((actualPos) => {
          if (Math.abs(actualPos - expectedProgress) > 2500) {
            widgetRef.current.seekTo(expectedProgress);
            setProgressMs(expectedProgress);
          }
          isSyncingRef.current = false;
        });
      }
    }
  };

  // 11. Handle instant play/pause/seek from Broadcast
  const handleIncomingBroadcastControl = (payload) => {
    const { action, isPlaying: remotePlaying, progressMs: remoteProgress, trackId, timestamp, senderName } = payload;
    
    if (action === "force_sync") {
      isSyncingRef.current = true;
      setIsPlaying(remotePlaying);
      
      let expectedProgress = remoteProgress;
      if (remotePlaying) {
        const latency = Date.now() - timestamp;
        expectedProgress += Math.max(0, latency);
      }
      
      const executeForceSnap = () => {
        if (widgetRef.current) {
          if (remotePlaying) {
            widgetRef.current.play();
          } else {
            widgetRef.current.pause();
          }
          widgetRef.current.seekTo(expectedProgress);
          setProgressMs(expectedProgress);
          isSyncingRef.current = false;
        }
      };

      if (trackId && currentTrackIdRef.current !== trackId) {
        currentTrackIdRef.current = trackId;
        const matchingTrack = playlistRef.current.find(t => t.id === trackId);
        if (matchingTrack) {
          setCurrentTrack(matchingTrack);
          loadSoundCloudTrack(matchingTrack.track_url, remotePlaying, expectedProgress);
          isSyncingRef.current = false;
        } else {
          fetchPlaylist(roomCode.toUpperCase()).then((latestList) => {
            const t = latestList.find(x => x.id === trackId);
            if (t) {
              setCurrentTrack(t);
              loadSoundCloudTrack(t.track_url, remotePlaying, expectedProgress);
            }
            isSyncingRef.current = false;
          });
        }
      } else {
        executeForceSnap();
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: "sys_sync_" + Math.random().toString(36).substring(2, 9),
          username: "⚡ Синхронизация",
          avatarColor: "#007aff",
          text: `${senderName || "Друг"} притянул ваш плеер к своей позиции!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true
        }
      ]);
      return;
    }

    setIsPlaying(remotePlaying);

    if (trackId && currentTrackIdRef.current !== trackId) {
      currentTrackIdRef.current = trackId;
      const matchingTrack = playlistRef.current.find(t => t.id === trackId);
      if (matchingTrack) {
        setCurrentTrack(matchingTrack);
        loadSoundCloudTrack(matchingTrack.track_url, remotePlaying, remoteProgress);
      } else {
        // Safe database search on new tracks to guarantee synchronization
        fetchPlaylist(roomCode.toUpperCase()).then((latestList) => {
          const t = latestList.find(x => x.id === trackId);
          if (t) {
            setCurrentTrack(t);
            loadSoundCloudTrack(t.track_url, remotePlaying, remoteProgress);
          }
        });
      }
      return;
    }

    if (widgetRef.current) {
      isSyncingRef.current = true;
      if (remotePlaying) {
        widgetRef.current.play();
      } else {
        widgetRef.current.pause();
      }

      let expectedProgress = remoteProgress;
      if (remotePlaying) {
        const latency = Date.now() - timestamp;
        expectedProgress += Math.max(0, latency);
      }

      widgetRef.current.getPosition((actualPos) => {
        if (Math.abs(actualPos - expectedProgress) > 1000) {
          widgetRef.current.seekTo(expectedProgress);
          setProgressMs(expectedProgress);
        }
        isSyncingRef.current = false;
      });
    }
  };

  // 12. Fetch SoundCloud oEmbed metadata
  const getTrackDetails = async (url) => {
    try {
      const res = await fetch(
        `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || "SoundCloud Track",
          thumbnail: data.thumbnail_url || "https://w.soundcloud.com/player/assets/images/default-artwork.png",
        };
      }
    } catch (e) {
      console.error("Failed fetching metadata from oEmbed:", e);
    }
    return {
      title: "Неизвестный трек SoundCloud",
      thumbnail: "https://w.soundcloud.com/player/assets/images/default-artwork.png",
    };
  };

  // 13. Load a track into the SoundCloud Widget element
  const loadSoundCloudTrack = (url, autoPlay, startProgressMs = 0) => {
    if (!widgetRef.current) return;

    isSyncingRef.current = true;
    widgetRef.current.load(url, {
      auto_play: autoPlay,
      show_artwork: true,
      visual: true,
      callback: () => {
        if (startProgressMs > 0) {
          widgetRef.current.seekTo(startProgressMs);
          setProgressMs(startProgressMs);
        }
        if (autoPlay) {
          widgetRef.current.play();
        }
        // Set local volume setting
        widgetRef.current.setVolume(isMuted ? 0 : volume);
        isSyncingRef.current = false;
      },
    });
  };

  // 14. Initialise SoundCloud Widget Ref using robust reactive useEffect (Race condition & re-mount proof)
  useEffect(() => {
    if (typeof window === "undefined" || !window.SC || !iframeRef.current || widgetReady) return;

    let pingInterval;
    try {
      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        setWidgetReady(true);
        widget.setVolume(isMuted ? 0 : volume);
        
        // Sync initial metadata duration
        widget.getDuration((d) => setDurationMs(d));
      });

      // Trigger automatic track end skipping
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        handleTrackFinished();
      });

      // Synchronize play state when iframe executes audio play
      widget.bind(window.SC.Widget.Events.PLAY, () => {
        setIsPlaying(true);
        widget.setVolume(isMuted ? 0 : volume);
        widget.getDuration((d) => setDurationMs(d));
      });

      // Synchronize pause state when iframe executes pause
      widget.bind(window.SC.Widget.Events.PAUSE, () => {
        setIsPlaying(false);
      });

      // Native progress updates for pixel-perfect smooth timeline synchronization
      widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        setProgressMs(data.currentPosition);
      });

      // PING CHECK: Repeatedly ping the widget every 250ms until it responds (resolves late iframe binding race condition)
      let pings = 0;
      pingInterval = setInterval(() => {
        if (widgetRef.current) {
          widgetRef.current.getVolume(() => {
            setWidgetReady(true);
            widgetRef.current.getDuration((d) => {
              if (d > 0) setDurationMs(d);
            });
            widgetRef.current.setVolume(isMuted ? 0 : volume);
            clearInterval(pingInterval);
          });
        }
        pings++;
        if (pings > 15) {
          clearInterval(pingInterval);
        }
      }, 250);

    } catch (err) {
      console.error("Error setting up SoundCloud widget reactive:", err);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [scriptLoaded, widgetReady, iframeRef.current]);

  // 15. Audio playback polling for responsive progress bar and volume enforcement
  useEffect(() => {
    let timer;
    if (widgetRef.current) {
      // Force volume state directly onto widget
      widgetRef.current.setVolume(isMuted ? 0 : volume);

      if (isPlaying) {
        timer = setInterval(() => {
          widgetRef.current.getPosition((pos) => {
            setProgressMs(pos);
          });
          // Regularly lock volume level to prevent default SoundCloud overrides
          widgetRef.current.setVolume(isMuted ? 0 : volume);
        }, 250);
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, volume, isMuted, widgetReady]);

  // 16. Synchronize player actions to Supabase Database
  const pushRoomState = async (playing, currentProgress) => {
    const code = roomCode.toUpperCase().trim();
    const cid = sessionStorage.getItem("xyi_client_id") || "client_anon";

    const { error } = await supabase
      .from("rooms")
      .update({
        is_playing: playing,
        progress_ms: currentProgress,
        state_updated_at: new Date().toISOString(),
        sender_id: cid,
      })
      .eq("id", code);

    if (error) console.error("Error writing room state:", error);
  };

  // 17. Playback Controls click handlers
  const handlePlayPauseToggle = async () => {
    if (!currentTrack) {
      if (playlist.length > 0) {
        await playTrack(playlist[0]);
      }
      return;
    }

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (widgetRef.current) {
      if (nextPlaying) {
        widgetRef.current.play();
      } else {
        widgetRef.current.pause();
      }

      widgetRef.current.getPosition(async (pos) => {
        setProgressMs(pos);
        broadcastPlayerAction(nextPlaying ? "play" : "pause", nextPlaying, pos);
        await pushRoomState(nextPlaying, pos);
      });
    } else {
      broadcastPlayerAction(nextPlaying ? "play" : "pause", nextPlaying, progressMs);
      await pushRoomState(nextPlaying, progressMs);
    }
  };

  const handleSeek = async (e) => {
    const seekMs = parseInt(e.target.value);
    setProgressMs(seekMs);

    if (widgetRef.current) {
      widgetRef.current.seekTo(seekMs);
      broadcastPlayerAction("seek", isPlaying, seekMs);
      await pushRoomState(isPlaying, seekMs);
    }
  };

  const playTrack = async (track) => {
    currentTrackIdRef.current = track.id;
    setCurrentTrack(track);
    setProgressMs(0);
    setIsPlaying(true);
    setIsHearted(false);

    if (widgetRef.current) {
      loadSoundCloudTrack(track.track_url, true, 0);
    }

    broadcastPlayerAction("track_change", true, 0, track.id);

    const code = roomCode.toUpperCase().trim();
    const cid = sessionStorage.getItem("xyi_client_id") || "client_anon";

    const { error } = await supabase
      .from("rooms")
      .update({
        current_track_id: track.id,
        is_playing: true,
        progress_ms: 0,
        state_updated_at: new Date().toISOString(),
        sender_id: cid,
      })
      .eq("id", code);

    if (error) console.error("Error setting current track:", error);
  };

  const handleSkipNext = async () => {
    if (playlist.length === 0) return;
    if (playlist.length === 1) {
      await playTrack(playlist[0]);
      return;
    }
    
    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrackIdRef.current);
      if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
        nextIndex = currentIndex + 1;
      }
    }
    await playTrack(playlist[nextIndex]);
  };

  const handleSkipPrev = async () => {
    if (playlist.length === 0) return;
    if (playlist.length === 1) {
      await playTrack(playlist[0]);
      return;
    }

    let prevIndex = playlist.length - 1;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrackIdRef.current);
      if (currentIndex > 0) {
        prevIndex = currentIndex - 1;
      }
    }
    await playTrack(playlist[prevIndex]);
  };

  const handleTrackFinished = () => {
    if (isRepeat) {
      if (currentTrack) playTrack(currentTrack);
    } else {
      handleSkipNext();
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem("xyi_volume", val.toString());
    if (widgetRef.current) {
      widgetRef.current.setVolume(val);
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (widgetRef.current) {
      widgetRef.current.setVolume(nextMute ? 0 : volume);
    }
  };

  // 18. Queue Modifiers
  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!newTrackUrl || addingTrack) return;

    if (!newTrackUrl.includes("soundcloud.com")) {
      alert("Вставьте верную ссылку на SoundCloud трек.");
      return;
    }

    setAddingTrack(true);
    const code = roomCode.toUpperCase().trim();

    try {
      const details = await getTrackDetails(newTrackUrl);
      
      const { data: newDbTrack, error } = await supabase
        .from("playlist")
        .insert([
          {
            room_id: code,
            track_url: newTrackUrl,
            title: details.title,
            thumbnail: details.thumbnail,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send chat log about added track
      sendChatSystemMessage(`${myUsername} добавил трек: "${details.title}"`);

      // If no track is playing, auto-play this track
      const { data: roomData } = await supabase
        .from("rooms")
        .select("current_track_id")
        .eq("id", code)
        .single();

      if (roomData && !roomData.current_track_id) {
        await playTrack(newDbTrack);
      }

      setNewTrackUrl("");
    } catch (err) {
      console.error(err);
      alert("Не удалось добавить трек. Попробуйте еще раз.");
    } finally {
      setAddingTrack(false);
    }
  };

  const handleDeleteTrack = async (trackId, e) => {
    e.stopPropagation();
    
    const trackToDelete = playlist.find(t => t.id === trackId);
    
    const { error } = await supabase
      .from("playlist")
      .delete()
      .eq("id", trackId);

    if (error) {
      console.error(error);
    } else {
      if (trackToDelete) {
        sendChatSystemMessage(`${myUsername} удалил трек: "${trackToDelete.title}"`);
      }
      if (trackId === currentTrackIdRef.current) {
        handleSkipNext();
      }
    }
  };

  // 19. Send chat messages (Local + Broadcast)
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;

    const newMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      username: myUsername,
      avatarColor: myAvatarColor,
      avatarUrl: myAvatarUrl,
      bannerUrl: myBannerUrl,
      bio: myBio,
      customBadge: myCustomBadge,
      joinedAt: new Date().toISOString(),
      text: newChatMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    setChatMessages((prev) => [...prev, newMsg]);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "chat_message",
        payload: newMsg
      });
    }

    setNewChatMessage("");
  };

  const sendChatSystemMessage = (text) => {
    const sysMsg = {
      id: "sys_" + Math.random().toString(36).substring(2, 9),
      username: "📢 Системное инфо",
      avatarColor: "#8e8e93",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };

    setChatMessages((prev) => [...prev, sysMsg]);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "chat_message",
        payload: sysMsg
      });
    }
  };

  // 20. Room Navigation & Share Actions
  const handleJoinOrCreateRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    router.push(`/?room=${roomCodeInput.toUpperCase().trim()}`);
  };

  const handleCreateRoomAction = async () => {
    if (!currentUser) {
      setAuthTab("login");
      setAuthError("Войдите или зарегистрируйтесь, чтобы создать собственную сессию!");
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already owns a room
      const { data: existingRoom, error: fetchError } = await supabase
        .from("rooms")
        .select("id")
        .eq("owner_id", currentUser.id)
        .maybeSingle();

      if (existingRoom) {
        // Redirect to their existing permanent room
        router.push(`/?room=${existingRoom.id}`);
        return;
      }

      // 2. If no room exists, create their one permanent room!
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      const newRoomId = `XYI-${code}`;
      const emailNick = currentUser.email.split("@")[0];

      const { error: createError } = await supabase
        .from("rooms")
        .insert([
          {
            id: newRoomId,
            is_playing: false,
            progress_ms: 0,
            state_updated_at: new Date().toISOString(),
            owner_id: currentUser.id,
            room_name: `Комната ${emailNick}`,
            is_public: false // Starts as private
          }
        ]);

      if (createError) throw createError;

      router.push(`/?room=${newRoomId}`);
    } catch (err) {
      console.error("Error creating personal room:", err);
      alert("Не удалось создать комнату. Убедитесь, что миграция базы данных выполнена.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Add track to personal favorites (localStorage)
  const handleAddPersonalTrack = async (e) => {
    e.preventDefault();
    if (!newPersonalUrl || addingPersonal) return;
    if (!newPersonalUrl.includes("soundcloud.com")) {
      alert("Вставьте верную ссылку на SoundCloud трек.");
      return;
    }
    setAddingPersonal(true);
    try {
      const details = await getTrackDetails(newPersonalUrl);
      const newTrack = {
        id: "fav_" + Math.random().toString(36).substring(2, 9),
        track_url: newPersonalUrl,
        title: details.title,
        thumbnail: details.thumbnail,
        addedAt: new Date().toISOString()
      };
      const updated = [...personalLibrary, newTrack];
      setPersonalLibrary(updated);
      localStorage.setItem("xyi_favorites", JSON.stringify(updated));
      setNewPersonalUrl("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPersonal(false);
    }
  };

  // Delete track from personal favorites
  const handleDeletePersonalTrack = (id, e) => {
    e.stopPropagation();
    const updated = personalLibrary.filter(t => t.id !== id);
    setPersonalLibrary(updated);
    localStorage.setItem("xyi_favorites", JSON.stringify(updated));
  };

  // Queue personal track in shared playlist
  const handleQueuePersonalTrack = async (track, e) => {
    e.stopPropagation();
    const code = roomCode.toUpperCase().trim();
    try {
      const { data: newDbTrack, error } = await supabase
        .from("playlist")
        .insert([
          {
            room_id: code,
            track_url: track.track_url,
            title: track.title,
            thumbnail: track.thumbnail,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      sendChatSystemMessage(`${myUsername} добавил трек из медиатеки: "${track.title}"`);
      
      const { data: roomData } = await supabase
        .from("rooms")
        .select("current_track_id")
        .eq("id", code)
        .single();

      if (roomData && !roomData.current_track_id) {
        await playTrack(newDbTrack);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Play personal track now for everyone in the room
  const handlePlayPersonalTrackNow = async (track, e) => {
    e.stopPropagation();
    const code = roomCode.toUpperCase().trim();
    try {
      const { data: newDbTrack, error } = await supabase
        .from("playlist")
        .insert([
          {
            room_id: code,
            track_url: track.track_url,
            title: track.title,
            thumbnail: track.thumbnail,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      sendChatSystemMessage(`${myUsername} запустил трек из медиатеки: "${track.title}"`);
      await playTrack(newDbTrack);
    } catch (err) {
      console.error(err);
    }
  };

  // Manual player synchronization calibration
  const handleManualSync = async () => {
    if (!widgetRef.current || !currentTrack) return;
    setCalibrating(true);
    
    try {
      const code = roomCode.toUpperCase().trim();
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", code)
        .single();
        
      if (room) {
        let expectedProgress = room.progress_ms;
        if (room.is_playing) {
          const delta = Date.now() - new Date(room.state_updated_at).getTime();
          expectedProgress += delta;
        }
        
        widgetRef.current.seekTo(expectedProgress);
        setProgressMs(expectedProgress);
        setIsPlaying(room.is_playing);
        
        widgetRef.current.getPosition((actualPos) => {
          const diff = ((actualPos - expectedProgress) / 1000).toFixed(2);
          sendChatSystemMessage(`⚙️ Ручная синхронизация звука завершена. Отклонение: ${diff} сек.`);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setCalibrating(false);
      }, 1000);
    }
  };

  // Force sync everyone in the room to current playback progress
  const handleForceSyncEveryone = async () => {
    if (!widgetRef.current || !currentTrack) return;
    setCalibrating(true);
    
    widgetRef.current.getPosition(async (pos) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "player_control",
          payload: {
            action: "force_sync",
            isPlaying: isPlaying,
            progressMs: pos,
            trackId: currentTrack.id,
            senderId: clientId,
            senderName: myUsername,
            timestamp: Date.now()
          }
        });
      }

      await pushRoomState(isPlaying, pos);
      sendChatSystemMessage(`⚡ ${myUsername} принудительно синхронизировал всех слушателей (позиция: ${formatTime(pos)})`);

      setTimeout(() => {
        setCalibrating(false);
      }, 1000);
    });
  };

  // Import a public SoundCloud playlist into personal library
  const handleImportPlaylistSubmit = (e) => {
    e.preventDefault();
    if (!importUrl.trim() || importingPlaylist) return;

    if (!importUrl.includes("soundcloud.com")) {
      alert("Вставьте верную ссылку на плейлист SoundCloud.");
      return;
    }

    setImportingPlaylist(true);
    setTempIframeUrl(importUrl.trim());
    setImportUrl("");
  };

  // Bulk import multiple SoundCloud tracks in parallel
  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim() || importingBulk) return;

    setImportingBulk(true);

    const urls = bulkText
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter((url) => url.includes("soundcloud.com"));

    if (urls.length === 0) {
      alert("Ссылки SoundCloud не найдены. Каждая ссылка должна быть с новой строки или разделена запятой.");
      setImportingBulk(false);
      return;
    }

    sendChatSystemMessage(`⏳ ${myUsername} запускает пакетный импорт ${urls.length} треков...`);

    try {
      const fetchPromises = urls.map(async (url) => {
        try {
          const details = await getTrackDetails(url);
          return {
            id: "fav_" + Math.random().toString(36).substring(2, 9),
            track_url: url,
            title: details.title,
            thumbnail: details.thumbnail,
            addedAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`Failed parsing bulk track: ${url}`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const validResults = results.filter((r) => r !== null);

      if (validResults.length > 0) {
        setPersonalLibrary((prev) => {
          const updated = [...prev, ...validResults];
          localStorage.setItem("xyi_favorites", JSON.stringify(updated));
          return updated;
        });
        sendChatSystemMessage(`✅ Пакетный импорт завершен: успешно добавлено ${validResults.length} из ${urls.length} треков!`);
      } else {
        alert("Не удалось импортировать треки. Проверьте ссылки на SoundCloud.");
      }
    } catch (err) {
      console.error("Error bulk importing:", err);
    } finally {
      setBulkText("");
      setImportingBulk(false);
    }
  };

  const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return "0:00";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 21. Unified Render: Landing or Room + Sticky Bottom Player
  if (loading) {
    return <PageLoading />;
  }

  return (
    <main className="premium-silk-bg min-h-[100dvh] text-white flex flex-col relative select-none pb-36 overflow-x-hidden">
      <div className="tech-grid-overlay" />

      {/* Ambient background glows */}
      <div className="absolute top-0 left-[15%] w-[35%] h-[50%] bg-[#007aff]/3 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[45%] bg-[#007aff]/3 blur-[160px] pointer-events-none z-0"></div>

      {!roomCode ? (
        /* ==================== REDESIGNED LANDING PAGE CONTENT ==================== */
        <div className="flex flex-col flex-1 relative z-10 w-full min-h-[100dvh] max-w-7xl mx-auto px-4 md:px-6">

          {/* Nav header */}
          <nav className="w-full py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2.5 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-all" onClick={() => router.push("/")}>
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 10v4M8 6v12M12 4v16M16 8v8M20 11v2" strokeLinecap="round" />
              </svg>
              <span className="font-extrabold tracking-tighter text-white text-sm">SoundWave</span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
              <span className="hover:text-white transition-colors cursor-pointer">Комнаты</span>
              <span className="opacity-20">|</span>
              <span className="hover:text-white transition-colors cursor-pointer">Как работает</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="w-8.5 h-8.5 border border-white/5 hover:border-white/15 text-xs flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all text-white cursor-pointer rounded-full"
                title="Переключить тему"
              >
                {isDark ? "☀️" : "🌙"}
              </button>

              {currentUser ? (
                <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-1.5 rounded-full select-none">
                  <button
                    onClick={handleGoToMyRoom}
                    className="text-xs text-zinc-300 hover:text-white transition-colors font-bold uppercase tracking-wider"
                  >
                    Моя комната
                  </button>
                  <span className="opacity-20 text-zinc-650">|</span>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowProfileCustomizer(true)}>
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black uppercase text-black overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: myAvatarColor || "#FF5500" }}
                    >
                      {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                        <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        myAvatarUrl || (myUsername ? myUsername.charAt(0).toUpperCase() : "?")
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-200 truncate max-w-[80px]">{myUsername}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-1.5 text-zinc-500 hover:text-rose-400 transition-colors text-xs cursor-pointer font-bold"
                    title="Выйти"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthTab("login"); setAuthError(""); setShowAuthModal(true); }}
                  className="px-5 py-2.5 bg-white text-black hover:bg-[#007aff] hover:text-white font-extrabold text-[11px] uppercase tracking-wider rounded-full transition-all active:scale-[0.97] cursor-pointer shadow-md"
                >
                  Войти в клуб
                </button>
              )}
            </div>
          </nav>

          {/* Hero header panel */}
          <section className="flex-1 w-full flex flex-col items-center justify-center relative py-20 z-10 text-center">
            <div className="flex-1 flex flex-col items-center justify-center max-w-[800px] z-10 px-6">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight uppercase leading-none mb-4 text-white">
                Listen Together
              </h1>
              <p className="text-zinc-400 text-sm md:text-base mb-12 font-bold tracking-wide uppercase text-center max-w-md">
                Слушайте SoundCloud музыку синхронно вместе с друзьями в реальном времени
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <button
                  onClick={handleCreateRoomAction}
                  className="px-10 py-4 bg-white text-black hover:bg-[#007aff] hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-full transition-all active:scale-[0.98] shadow-lg shadow-white/5 cursor-pointer"
                >
                  Создать Комнату
                </button>
                
                <form onSubmit={handleJoinOrCreateRoomSubmit} className="flex premium-glass-card rounded-full p-1 border border-white/5 backdrop-blur-md overflow-hidden shadow-xl">
                  <input
                    type="text"
                    placeholder="Код комнаты..."
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    className="bg-transparent border-none px-6 py-3.5 text-white font-mono text-xs focus:outline-none w-36 placeholder:text-zinc-500 uppercase font-semibold"
                    maxLength={12}
                  />
                  <button
                    type="submit"
                    disabled={!roomCodeInput.trim()}
                    className="px-6 py-3.5 bg-white/10 hover:bg-[#007aff] text-white disabled:hover:bg-white/10 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-full transition-all active:scale-[0.98] disabled:opacity-30 border border-white/5 shadow-md cursor-pointer"
                  >
                    Войти
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Active Public Rooms list */}
          <section className="w-full pb-24 z-10 flex flex-col gap-8 text-center mt-12">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2.5 text-[#007aff] bg-[#007aff]/5 px-4 py-1.5 border border-[#007aff]/20 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#10b981] live-pulse-dot"></span>
                <h2 className="text-[10px] font-black uppercase tracking-wider text-white">Активные Комнаты</h2>
              </div>
              <button 
                onClick={fetchPublicRooms} 
                className="text-[10px] text-zinc-550 hover:text-white transition-colors cursor-pointer font-mono uppercase tracking-widest"
              >
                [ обновить список ]
              </button>
            </div>

            {loadingPublicRooms ? (
              <div className="w-full py-16 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto py-16 premium-glass-card rounded-3xl flex flex-col items-center justify-center gap-3 px-6 text-center border border-white/5">
                <Radio className="w-8 h-8 text-zinc-700 animate-pulse" />
                <p className="text-sm font-extrabold text-zinc-200 uppercase tracking-wide">
                  Нет активных публичных комнат
                </p>
                <p className="text-xs text-zinc-500 max-w-[340px] leading-relaxed">
                  Создайте свою комнату и переключите её в публичный режим в настройках, чтобы начать совместный чилл!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publicRooms.map((room) => (
                  <div key={room.id} className="premium-glass-card p-6 rounded-3xl flex flex-col justify-between gap-5 transition-all group cursor-default text-left border border-white/5 relative overflow-hidden">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between z-10">
                        <span className="text-[8px] font-black text-[#10b981] uppercase tracking-wider flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <span className="w-1 h-1 rounded-full bg-[#10b981] live-pulse-dot"></span>
                          В СЕТИ
                        </span>
                        <span className="text-[9px] font-mono text-zinc-550 tracking-widest uppercase">{room.id}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-white truncate leading-snug mt-2 z-10">{room.room_name || `Комната ${room.id}`}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-2 z-10">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>чилл</span>
                      </div>
                      <button 
                        onClick={() => router.push(`/?room=${room.id}`)}
                        className="px-3.5 py-1.5 bg-white text-black hover:bg-[#007aff] hover:text-white font-extrabold text-[10px] tracking-wide transition-all rounded-full cursor-pointer border border-transparent active:scale-95 shadow-md"
                      >
                        Войти
                      </button>
                    </div>
                    
                    {/* Background wave decoration */}
                    <div className="silk-wave-graphic" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <>
          {/* ==================== REDESIGNED ROOM PAGE CONTENT ==================== */}
          <div className="flex flex-col flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 gap-6">

          {/* Autoplay Unlock banner */}
          {needInteractionSync && (
            <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-bounce">
              <div className="w-full bg-[#007aff]/20 backdrop-blur-xl border border-[#007aff]/40 rounded-full py-3 px-4 text-center text-xs font-bold text-white shadow-xl shadow-black/40 flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#007aff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#007aff]"></span>
                </span>
                <span>🔊 Кликните в любом месте для синхронизации звука!</span>
              </div>
            </div>
          )}

          {/* SoundCloud hidden player iframe */}
          {tempIframeUrl ? (
            <iframe
              id="soundcloud-temp-player"
              className="sc-hidden"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(tempIframeUrl)}&auto_play=false`}
              sandbox="allow-scripts allow-same-origin"
            />
          ) : null}

          <iframe
            ref={iframeRef}
            id="soundcloud-player"
            className="sc-hidden"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(currentTrack?.track_url || "https://soundcloud.com/colddev/xyi-placeholder")}&auto_play=false&visual=false&show_artwork=false`}
            sandbox="allow-scripts allow-same-origin"
          />

          <Script
            src="https://w.soundcloud.com/player/api.js"
            strategy="afterInteractive"
            onLoad={() => setScriptLoaded(true)}
          />

          {/* 1. INTERACTIVE HEADER BAR */}
          <header className="w-full premium-glass-card rounded-full px-6 py-3 flex items-center justify-between border border-white/5 backdrop-blur-md sticky top-6 z-20">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/5 transition-all" onClick={() => router.push("/")}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 10v4M8 6v12M12 4v16M16 8v8M20 11v2" strokeLinecap="round" />
              </svg>
              <span className="font-black tracking-tighter text-white text-sm">SoundWave</span>
            </div>

            {/* Session Indicator Tag */}
            <div className="hidden md:flex items-center gap-2">
              <span className="bg-[#007aff]/10 border border-[#007aff]/20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#007aff] live-pulse-dot"></span>
                <span>СЕССИЯ: {roomSettings.room_name ? roomSettings.room_name.toUpperCase() : `ROOM_${roomCode.toUpperCase()}`}</span>
              </span>
              <span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-550" />
                <span>{participants.length + 1}</span>
              </span>
            </div>

            {/* Right Nav Options */}
            <div className="flex items-center gap-2">
              {/* Theme Switcher */}
              <button 
                onClick={toggleTheme} 
                className="w-8 h-8 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs transition-all cursor-pointer"
                title="Переключить тему"
              >
                {isDark ? "☀️" : "🌙"}
              </button>

              {/* Room Code Copy Pill */}
              <button 
                onClick={handleCopyLink}
                className="px-4 py-2 border border-white/8 bg-white/5 hover:bg-white/10 hover:border-[#007aff]/30 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{roomCode.toUpperCase()}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5 text-[#007aff]" />}
              </button>

              {/* User Dropdown */}
              {currentUser ? (
                <div 
                  onClick={() => setShowProfileCustomizer(true)}
                  className="bg-black/40 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-black/60 transition-all select-none cursor-pointer"
                >
                  <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black uppercase text-black overflow-hidden flex-shrink-0" style={{ backgroundColor: myAvatarColor }}>
                    {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                      <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      myAvatarUrl || (myUsername ? myUsername.slice(0, 1).toUpperCase() : "?")
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-200 hidden sm:inline">{myUsername ? myUsername.toLowerCase() : "colddev"}</span>
                  <svg className="w-2.5 h-2.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <button 
                  onClick={() => { setAuthTab("login"); setAuthError(""); setShowAuthModal(true); }}
                  className="px-4 py-2 bg-[#007aff] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  Вход
                </button>
              )}

              {/* Exit button */}
              <button 
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-transparent border border-white/10 hover:border-white/20 hover:text-white rounded-full text-xs font-semibold flex items-center transition-all cursor-pointer"
              >
                Выйти
              </button>
            </div>
          </header>

          {/* 2. THREE-COLUMN CORE LAYOUT GRID */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2">
            
            {/* Column 1: Stream Info Panel (4/12 cols) */}
            <div className="lg:col-span-4 premium-glass-card rounded-3xl p-6 flex flex-col justify-between border border-white/5 min-h-[480px]">
              
              {/* Top Text Details */}
              <div className="flex flex-col text-left">
                {/* Playing Tag */}
                <span className="bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block w-fit text-zinc-350 shadow-[inset_0_1.5px_0_0_rgba(255,255,255,0.08)]">
                  Сейчаc играет
                </span>

                {/* Track Title */}
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-6 mb-1 text-white leading-tight break-words select-text">
                  {currentTrack ? currentTrack.title : "Очередь пуста"}
                </h2>
                
                <p className="text-zinc-550 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                  <span>из SoundCloud</span>
                </p>

                {/* Overlapping User Avatars stacked */}
                <div className="flex items-center gap-1.5 mt-8">
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {/* Render client avatar */}
                    <div 
                      onClick={() => setSelectedUserProfile({
                        username: myUsername,
                        avatarColor: myAvatarColor,
                        avatarUrl: myAvatarUrl,
                        bannerUrl: myBannerUrl,
                        bio: myBio,
                        customBadge: myCustomBadge,
                        latency: "0ms",
                        joinedAt: new Date().toISOString()
                      })}
                      className="w-7 h-7 rounded-full bg-[#007aff] text-black text-[9px] font-black flex items-center justify-center border-2 border-zinc-950 overflow-hidden select-none cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: myAvatarColor }}
                    >
                      {myAvatarUrl && myAvatarUrl.startsWith("data:image") ? (
                        <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        myAvatarUrl || (myUsername ? myUsername.slice(0, 1).toUpperCase() : "?")
                      )}
                    </div>

                    {/* Stack actual active room participants */}
                    {participants.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedUserProfile(p)}
                        className="w-7 h-7 rounded-full bg-zinc-700 text-black text-[9px] font-black flex items-center justify-center border-2 border-zinc-950 overflow-hidden select-none cursor-pointer flex-shrink-0"
                        style={{ backgroundColor: p.avatarColor }}
                        title={p.username}
                      >
                        {p.avatarUrl && p.avatarUrl.startsWith("data:image") ? (
                          <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.avatarUrl || (p.username ? p.username.slice(0, 1).toUpperCase() : "?")
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Overlapping Counter badge */}
                  {participants.length > 4 && (
                    <span className="text-[9px] font-black text-zinc-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full select-none">
                      +{participants.length - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Stream & Control box */}
              <div className="flex flex-col gap-5 text-left mt-8">
                {/* Streaming status details badge */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
                  <div className="w-8.5 h-8.5 rounded-xl bg-[#007aff]/15 border border-[#007aff]/20 flex items-center justify-center text-[#007aff] flex-shrink-0 animate-pulse">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-zinc-150 uppercase tracking-widest block">Поток из SoundCloud</span>
                    <span className="text-[9px] text-zinc-550 block font-semibold uppercase tracking-wider mt-0.5">Высокое качество · 256 kbps</span>
                  </div>
                </div>

                {/* Shortcut Actions */}
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => setIsHearted(!isHearted)}
                    className={`w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center transition-all cursor-pointer ${isHearted ? "text-rose-500 bg-rose-500/10 border-rose-500/25" : "text-zinc-400 hover:text-white hover:bg-white/10"}`}
                  >
                    <Heart className={`w-4.5 h-4.5 ${isHearted ? "fill-current" : ""}`} />
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => setActiveLibraryTab(activeLibraryTab === "queue" ? "favorites" : "queue")}
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer relative"
                    title="Показать очередь"
                  >
                    <List className="w-4.5 h-4.5" />
                    {playlist.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#007aff] text-black font-black text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center select-none shadow">
                        {playlist.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Center Track Artwork Cover (4/12 cols) */}
            <div className="lg:col-span-4 flex items-center justify-center relative min-h-[360px]">
              
              {/* Soft ambient cover glow behind the image */}
              {currentTrack && currentTrack.thumbnail && (
                <div 
                  className="absolute inset-0 z-0 opacity-40 blur-[90px] scale-90 pointer-events-none transform-gpu animate-pulse-slow"
                  style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
              )}

              {/* Oversized rounded artwork card */}
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden border border-white/5 relative z-10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center bg-black/60 backdrop-blur-md">
                {currentTrack && currentTrack.thumbnail ? (
                  <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-1000 hover:scale-103" />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Music className="w-14 h-14 text-zinc-800 animate-pulse" />
                    <span className="text-[10px] text-zinc-650 font-black uppercase tracking-widest font-mono">ожидание трека</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Live Chat Stream (4/12 cols) */}
            <div className="lg:col-span-4 premium-glass-card rounded-3xl flex flex-col h-full border border-white/5 overflow-hidden min-h-[480px]">
              {/* Chat Header */}
              <div className="p-5 border-b border-white/5 flex flex-col text-left">
                <span className="text-[9px] font-black tracking-widest text-[#007aff] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007aff] live-pulse-dot"></span>
                  <span>• Live Chat</span>
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-white uppercase mt-1">
                  {roomSettings.room_name || `ROOM_${roomCode.toUpperCase()}`}
                </h3>
              </div>

              {/* Messages feed */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 max-h-[310px] scroll-smooth select-text custom-slim-scrollbar"
              >
                {chatMessages.map((msg) => {
                  const isMe = msg.clientId === clientId;
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id || Math.random()} className="w-full py-1 text-center select-none animate-fadeIn">
                        <span className="px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/5 text-[9px] font-medium text-zinc-500 inline-block max-w-[90%] leading-relaxed">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id || Math.random()}
                      className={`flex gap-3 items-start animate-fadeIn max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                      {/* Avatar */}
                      <div 
                        onClick={() => setSelectedUserProfile({
                          username: msg.username,
                          avatarColor: msg.avatarColor,
                          avatarUrl: msg.avatarUrl,
                          bannerUrl: msg.bannerUrl,
                          bio: msg.bio,
                          customBadge: msg.customBadge,
                          latency: msg.latency || "25ms",
                          joinedAt: msg.joinedAt || new Date().toISOString()
                        })}
                        className="w-7 h-7 rounded-full text-black text-[9px] font-black flex items-center justify-center flex-shrink-0 overflow-hidden select-none cursor-pointer border border-white/5"
                        style={{ backgroundColor: msg.avatarColor }}
                      >
                        {msg.avatarUrl && msg.avatarUrl.startsWith("data:image") ? (
                          <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          msg.avatarUrl || msg.username.slice(0, 1).toUpperCase()
                        )}
                      </div>

                      {/* Text wrapper */}
                      <div className="flex flex-col text-left">
                        <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-wider mb-0.5 pl-1 flex items-center gap-1.5">
                          <span>{msg.username}</span>
                          {msg.customBadge && (
                            <span className="bg-white/5 text-zinc-400 text-[6.5px] px-1 py-0.2 rounded border border-white/5">{msg.customBadge}</span>
                          )}
                        </span>
                        
                        <div 
                          className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${isMe ? "bg-white text-black rounded-tr-sm font-medium shadow" : "bg-white/[0.04] text-zinc-200 border border-white/5 rounded-tl-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"}`}
                        >
                          {msg.text}
                        </div>
                        <span className={`text-[7px] text-zinc-650 font-mono mt-0.5 px-1 ${isMe ? "text-right" : "text-left"}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message inputs */}
              <form onSubmit={handleSendChatMessage} className="p-4 border-t border-white/5 flex gap-2 z-10 bg-black/20 backdrop-blur-md">
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/5 rounded-full px-5 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#007aff]/40 transition-colors font-medium"
                />
                <button
                  type="submit"
                  disabled={!newChatMessage.trim()}
                  className="w-9 h-9 bg-white text-black hover:bg-[#007aff] hover:text-white disabled:hover:bg-white disabled:opacity-20 rounded-full transition-all flex items-center justify-center cursor-pointer flex-shrink-0 active:scale-90"
                >
                  <Send className="w-3.5 h-3.5 text-current fill-current ml-0.5" />
                </button>
              </form>
            </div>

          </div>

          {/* Mediatheque, Importer & Queue Tab Drawer Overlay */}
          <div className="premium-glass-card rounded-3xl p-6 flex flex-col gap-5 border border-white/5 shadow-2xl mt-4">
            
            {/* Segmented Tab Options */}
            <div className="grid grid-cols-4 bg-black/40 p-1 rounded-full border border-white/5 backdrop-blur-md">
              <button
                onClick={() => setActiveLibraryTab("favorites")}
                className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeLibraryTab === "favorites"
                    ? "bg-white/10 text-white shadow-md border border-white/10"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Медиатека
              </button>
              <button
                onClick={() => setActiveLibraryTab("playlist")}
                className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeLibraryTab === "playlist"
                    ? "bg-white/10 text-white shadow-md border border-white/10"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Импорт
              </button>
              <button
                onClick={() => setActiveLibraryTab("bulk")}
                className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeLibraryTab === "bulk"
                    ? "bg-white/10 text-white shadow-md border border-white/10"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Списком
              </button>
              <button
                onClick={() => setActiveLibraryTab("queue")}
                className={`py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeLibraryTab === "queue" || activeLibraryTab === undefined
                    ? "bg-white/10 text-[#007aff] shadow-md border border-[#007aff]/20"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Очередь ({playlist.length})
              </button>
            </div>

            {/* Content Switcher */}
            {activeLibraryTab === "favorites" && (
              <div className="flex flex-col gap-3 animate-fadeIn">
                <form onSubmit={handleAddPersonalTrack} className="w-full flex gap-2">
                  <input
                    type="text"
                    placeholder="Вставьте ссылку на SoundCloud..."
                    value={newPersonalUrl}
                    onChange={(e) => setNewPersonalUrl(e.target.value)}
                    disabled={addingPersonal}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#007aff]/40 transition-colors font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!newPersonalUrl.trim() || addingPersonal}
                    className="px-4 py-2.5 bg-white text-black hover:bg-[#007aff] hover:text-white active:scale-95 disabled:opacity-30 rounded-xl transition-all flex items-center justify-center cursor-pointer flex-shrink-0 border border-transparent font-extrabold text-[10px] uppercase tracking-wider"
                  >
                    {addingPersonal ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
                    ) : (
                      "Добавить"
                    )}
                  </button>
                </form>

                {personalLibrary.length === 0 ? (
                  <div className="w-full py-8 bg-black/10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-zinc-600 text-[10px] leading-normal font-bold uppercase tracking-wider">Медиатека пуста. Добавьте SoundCloud треки!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1.5 custom-slim-scrollbar">
                    {personalLibrary.map((track, idx) => (
                      <div
                        key={track.id}
                        className="w-full p-2 bg-white/[0.01] border border-white/5 hover:border-[#007aff]/25 rounded-2xl flex items-center justify-between gap-3 transition-all duration-300 hover:bg-white/[0.03] group/track"
                      >
                        <span className="text-[9px] font-mono font-black text-zinc-700 group-hover/track:text-[#007aff] transition-colors pl-1">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          
                          <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {track.thumbnail ? (
                              <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-3.5 h-3.5 text-zinc-700" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col text-left">
                            <p className="text-[10px] font-black text-zinc-300 truncate group-hover/track:text-white transition-colors uppercase tracking-wide font-sans" title={track.title}>
                              {track.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={(e) => handlePlayPersonalTrackNow(track, e)}
                              className="w-7 h-7 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90"
                              title="Запустить сейчас для всех"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                            </button>
                            <button
                              onClick={(e) => handleQueuePersonalTrack(track, e)}
                              className="w-7 h-7 rounded-xl bg-white/5 hover:bg-[#007aff] hover:text-white text-zinc-400 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90"
                              title="Добавить в очередь"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <button
                              onClick={(e) => handleDeletePersonalTrack(track.id, e)}
                              className="w-7 h-7 rounded-xl bg-red-500/5 hover:bg-red-550 hover:text-white text-zinc-550 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90"
                              title="Удалить из медиатеки"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}`
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: PLAYLIST IMPORT */}
              {activeLibraryTab === "playlist" && (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  <p className="text-[10px] text-zinc-500 leading-normal font-medium pl-1">
                    Укажите адрес публичного плейлиста SoundCloud для пакетного импорта треков в медиатеку сессии:
                  </p>
                  <form onSubmit={handleImportPlaylistSubmit} className="w-full flex gap-2">
                    <input
                      type="text"
                      placeholder="Вставьте ссылку на плейлист SoundCloud..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      disabled={importingPlaylist}
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-650 focus:outline-none focus:border-[#007aff]/40 transition-colors font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!importUrl.trim() || importingPlaylist}
                      className="px-4 py-2.5 bg-white text-black hover:bg-[#007aff] hover:text-white active:scale-95 disabled:opacity-30 rounded-xl transition-all flex items-center justify-center cursor-pointer flex-shrink-0 border border-transparent font-extrabold text-[10px] uppercase tracking-wider"
                    >
                      {importingPlaylist ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
                      ) : (
                        "Импорт"
                      )}
                    </button>
                  </form>
                  {importingPlaylist && (
                    <div className="w-full p-3 bg-[#007aff]/5 border border-[#007aff]/10 rounded-xl flex items-center justify-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-[#007aff] border-r-transparent animate-spin"></div>
                      <span className="text-[10px] font-bold text-[#007aff] tracking-wide animate-pulse uppercase">Идет разбор плейлиста...</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: BULK IMPORT */}
              {activeLibraryTab === "bulk" && (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  <p className="text-[10px] text-zinc-550 leading-normal pl-1">
                    Вставьте список ссылок SoundCloud (каждая ссылка на новой строке) для импорта:
                  </p>
                  <form onSubmit={handleBulkImportSubmit} className="w-full flex flex-col gap-3">
                    <textarea
                      rows={3}
                      placeholder="https://soundcloud.com/artist/track-1&#10;https://soundcloud.com/artist/track-2"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      disabled={importingBulk}
                      className="w-full bg-black/40 border border-white/5 rounded-none p-3 text-[10px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#007aff] transition-colors resize-none leading-normal font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!bulkText.trim() || importingBulk}
                      className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer"
                    >
                      {importingBulk ? (
                        <div className="w-3.5 h-3.5 rounded-none border-2 border-black border-r-transparent animate-spin"></div>
                      ) : (
                        "Импортировать список"
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB CONTENT: PLAYLIST QUEUE */}
              {(activeLibraryTab === "queue" || activeLibraryTab === undefined) && (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  <form onSubmit={handleAddTrack} className="w-full flex gap-2">
                    <input
                      type="text"
                      placeholder="Добавить новый SoundCloud трек..."
                      value={newTrackUrl}
                      onChange={(e) => setNewTrackUrl(e.target.value)}
                      disabled={addingTrack}
                      className="flex-1 bg-black/40 border border-white/5 rounded-none px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-655 focus:outline-none focus:border-[#007aff] transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!newTrackUrl.trim() || addingTrack}
                      className="p-2 bg-[#FF5500] hover:bg-[#e04b00] text-white active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none rounded-none transition-all flex items-center justify-center cursor-pointer"
                    >
                      {addingTrack ? (
                        <div className="w-3.5 h-3.5 rounded-none border-2 border-white border-r-transparent animate-spin"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </form>

                  {playlist.length === 0 ? (
                    <div className="w-full py-8 bg-black/10 border border-dashed border-white/5 rounded-none flex flex-col items-center justify-center gap-2 text-center">
                      <p className="text-zinc-600 text-[10px] leading-normal font-medium">Очередь воспроизведения пуста.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1.5 custom-slim-scrollbar">
                      {playlist.map((track, idx) => {
                        const isCurrent = currentTrack && currentTrack.id === track.id;
                        return (
                          <div
                            key={track.id}
                            onClick={() => playTrack(track)}
                            className={`w-full p-2 bg-black/20 hover:bg-[#007aff]/5 border rounded-none flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                              isCurrent
                                ? "border-[#007aff]/30 bg-black/45 shadow-[0_4px_12px_rgba(0,122,255,0.05)]"
                                : "border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="relative w-8 h-8 rounded-none bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {track.thumbnail ? (
                                <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-3.5 h-3.5 text-zinc-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col text-left">
                              <p className={`text-[10px] font-bold truncate font-sans uppercase tracking-tight ${isCurrent ? "text-[#007aff]" : "text-zinc-300"}`}>
                                {track.title}
                              </p>
                              <span className="text-[7.5px] text-zinc-550 font-bold tracking-widest mt-0.5 uppercase">Трек #${idx + 1}</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isCurrent ? (
                                <span className="text-[7px] uppercase font-black tracking-widest text-[#007aff] bg-[#007aff]/10 px-1.5 py-0.5 rounded border border-[#007aff]/20 font-sans">
                                  Эфир
                                </span>
                              ) : (
                                <Play className="w-2.5 h-2.5 text-zinc-550 hover:text-white transition-colors" />
                              )}
                              <button
                                onClick={(e) => handleDeleteTrack(track.id, e)}
                                className="p-1 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5 text-zinc-600 hover:text-red-550" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
{/* Hidden original layout to preserve React bindings */}
        <div className="hidden">
          {/* ==================== LEFT COLUMN (3/12 cols) ==================== */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">

          {/* Owner Room Settings Control Panel */}
          {currentUser && roomSettings.owner_id === currentUser.id && (
            <div className="glass-panel p-6 rounded-none text-left flex flex-col gap-4 border-[#007aff]/20 shadow-[0_8px_30px_rgba(255,85,0,0.04)]">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#007aff]">Настройки комнаты</h3>
                <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 live-pulse-dot"></span>
              </div>
              
              {/* Room name form */}
              <form onSubmit={handleUpdateRoomName} className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-bold text-zinc-500 pl-0.5">Название комнаты</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomNameInput}
                    onChange={(e) => setNewRoomNameInput(e.target.value)}
                    placeholder="Название сессии..."
                    className="flex-1 bg-black/60 border border-white/8 rounded-none px-3 py-2 text-xs text-white focus:outline-none focus:border-[#007aff] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-white text-black hover:bg-zinc-200 font-extrabold text-[10px] uppercase tracking-wider rounded-none transition-all cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </form>

              {/* Publicity Toggle switch */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Публичный доступ</span>
                  <span className="text-[8px] text-zinc-600 mt-0.5 font-bold">Отображать в списке комнат</span>
                </div>
                <button
                  onClick={handleToggleRoomPublicity}
                  className={`w-12 h-6 rounded-none p-1 transition-colors duration-300 cursor-pointer ${
                    roomSettings.is_public ? "bg-[#007aff]" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-none shadow-md transform transition-transform duration-300 ${
                      roomSettings.is_public ? "translate-x-6" : "translate-x-0"
                    }`}
                  ></div>
                </button>
              </div>
            </div>
          )}
          
          {/* Slogan details - Hidden when inside active room */}
          {!roomCode && (
            <div className="glass-panel p-6 rounded-none text-left flex flex-col items-start gap-4 animate-fadeIn">
              <span className="text-[10px] font-bold text-[#007aff] uppercase tracking-widest pl-1">
                Na leg. All vibe.
              </span>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                XYI: Listen Together, Live
              </h2>
              <button
                onClick={handleCreateRoomAction}
                className="w-full py-3.5 bg-[#007aff] hover:bg-[#0056b3] text-black font-extrabold text-xs uppercase tracking-widest rounded-none transition-all active:scale-[0.98] shadow-lg hover:shadow-[#007aff]/15 cursor-pointer"
              >
                Create a Session
              </button>
            </div>
          )}

          {/* Real-time Sync Status & SVG Waves - Strict radiuses */}
          <div className="glass-panel p-6 rounded-none text-left flex flex-col gap-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-400">Sync Status</span>
                <span className="text-[10px] text-zinc-600 font-medium tracking-wide">
                  {participants.length} listeners online
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-none bg-emerald-500 live-pulse-dot flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none"></span>
              </div>
            </div>

            {/* Glowing animated colorful sine-wave nodes */}
            <div className="relative h-28 w-full bg-black/40 rounded-none border border-white/5 flex flex-col items-center justify-center p-4">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#007aff" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#00c6ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00b4d8" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#007aff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Wave lines */}
                <path d="M 10,50 Q 60,10 120,50 T 230,50" stroke="url(#waveGrad1)" strokeWidth="3" fill="none" className="animate-wave-1" />
                <path d="M 10,50 Q 60,80 120,50 T 230,50" stroke="url(#waveGrad2)" strokeWidth="2" fill="none" className="animate-wave-2" />
                
                {/* Dots on wave peaks */}
                <circle cx="65" cy="30" r="4" fill="#007aff" className="animate-pulse" />
                <circle cx="120" cy="50" r="4" fill="#00c6ff" className="animate-pulse" />
                <circle cx="175" cy="70" r="4" fill="#00b4d8" className="animate-pulse" />
              </svg>
              
              {/* Dynamic user avatars along the bottom of the card */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10 px-2 overflow-x-auto">
                {participants.slice(0, 4).map((p, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => window.open(`/${p.username}`, "_blank")}
                    className="flex flex-col items-center gap-0.5 group cursor-pointer hover:scale-105 active:scale-95 transition-all outline-none"
                  >
                    <div
                      className="w-7 h-7 rounded-none border border-white/20 flex items-center justify-center text-[10px] font-black text-black shadow-md shadow-black/50 overflow-hidden"
                      style={{ backgroundColor: p.avatarColor || "#007aff" }}
                      title={p.username}
                    >
                      {p.avatarUrl && p.avatarUrl.startsWith("data:image") ? (
                        <img src={p.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-none" />
                      ) : p.avatarUrl ? (
                        <span className="text-sm">{p.avatarUrl}</span>
                      ) : (
                        p.username ? p.username.charAt(0).toUpperCase() : "?"
                      )}
                    </div>
                    <span className="text-[8px] text-zinc-500 font-bold truncate max-w-[40px] group-hover:text-white transition-colors">{p.username}</span>
                  </button>
                ))}
                {participants.length > 4 && (
                  <div className="w-7 h-7 rounded-none bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                    +{participants.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Library Card (Saved Favorite tracks / SoundCloud accounts) */}
          <div className="glass-panel p-6 rounded-none text-left flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#007aff] animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Моя Медиатека</h3>
              </div>
              <span className="text-[8px] uppercase font-black tracking-widest text-[#007aff] bg-[#007aff]/10 px-2.5 py-1 rounded-none border border-[#007aff]/25 shadow-sm">
                SoundCloud
              </span>
            </div>

            {/* Gorgeous Segmented Tab Bar */}
            <div className="grid grid-cols-3 bg-[#0e0e12] p-1 rounded-none border border-white/5">
              <button
                onClick={() => setActiveLibraryTab("favorites")}
                className={`py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all duration-350 cursor-pointer ${
                  activeLibraryTab === "favorites"
                    ? "bg-white/10 text-white shadow-md border border-white/5"
                    : "text-zinc-550 hover:text-zinc-300"
                }`}
              >
                Мои Треки
              </button>
              <button
                onClick={() => setActiveLibraryTab("playlist")}
                className={`py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all duration-350 cursor-pointer ${
                  activeLibraryTab === "playlist"
                    ? "bg-white/10 text-white shadow-md border border-white/5"
                    : "text-zinc-550 hover:text-zinc-300"
                }`}
              >
                Импорт
              </button>
              <button
                onClick={() => setActiveLibraryTab("bulk")}
                className={`py-2 rounded-none text-[9px] font-black uppercase tracking-widest transition-all duration-350 cursor-pointer ${
                  activeLibraryTab === "bulk"
                    ? "bg-white/10 text-white shadow-md border border-white/5"
                    : "text-zinc-550 hover:text-zinc-300"
                }`}
              >
                Списком
              </button>
            </div>

            {/* TAB CONTENT: FAVORITES */}
            {activeLibraryTab === "favorites" && (
              <>
                <p className="text-[9.5px] text-zinc-500 font-medium leading-relaxed">
                  Ваша личная медиатека в клубе. Добавляйте треки поштучно или импортируйте плейлисты. Запускайте треки синхронно для всех!
                </p>
                
                {/* Input to add personal tracks */}
                <form onSubmit={handleAddPersonalTrack} className="w-full flex gap-2">
                  <input
                    type="text"
                    placeholder="Вставьте ссылку на SoundCloud..."
                    value={newPersonalUrl}
                    onChange={(e) => setNewPersonalUrl(e.target.value)}
                    disabled={addingPersonal}
                    className="flex-1 bg-black/60 border border-white/8 rounded-none px-3.5 py-3 text-xs text-zinc-250 placeholder:text-zinc-650 focus:outline-none focus:border-[#007aff] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newPersonalUrl.trim() || addingPersonal}
                    className="p-3 bg-white hover:bg-[#007aff] text-black hover:text-white active:scale-[0.98] disabled:opacity-30 rounded-none transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    {addingPersonal ? (
                      <div className="w-3.5 h-3.5 rounded-none border-2 border-black border-r-transparent animate-spin"></div>
                    ) : (
                      <Plus className="w-4 h-4 stroke-[3]" />
                    )}
                  </button>
                </form>

                {/* Scrollable Favorites list */}
                {personalLibrary.length === 0 ? (
                  <div className="w-full py-8 bg-black/20 border border-dashed border-white/5 rounded-none flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-zinc-600 text-[10px] leading-normal font-medium">Медиатека пуста. Добавьте трек выше или импортируйте плейлист!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1.5 custom-slim-scrollbar">
                    {personalLibrary.map((track, idx) => (
                      <div
                        key={track.id}
                        className="w-full p-2.5 bg-black/30 border border-white/5 hover:border-[#007aff]/25 rounded-none flex items-center gap-3 transition-all duration-300 hover:bg-black/55 group/track"
                      >
                        {/* Index Number */}
                        <span className="text-[9px] font-mono font-bold text-zinc-650 group-hover/track:text-[#007aff] transition-colors pl-1">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        
                        {/* Thumbnail with slight zoom effect */}
                        <div className="w-9 h-9 rounded-none bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                          {track.thumbnail ? (
                            <img src={track.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover/track:scale-110" />
                          ) : (
                            <Music className="w-4 h-4 text-zinc-600" />
                          )}
                          <div className="absolute inset-0 bg-black/15 group-hover/track:bg-transparent transition-colors"></div>
                        </div>

                        {/* Title & SoundCloud Tag */}
                        <div className="flex-1 min-w-0 flex flex-col text-left">
                          <p className="text-[11px] font-black text-zinc-350 uppercase tracking-tight truncate group-hover/track:text-white transition-colors" title={track.title}>
                            {track.title}
                          </p>
                          <span className="text-[7.5px] text-[#007aff]/65 font-bold uppercase tracking-widest mt-0.5">SoundCloud</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={(e) => handlePlayPersonalTrackNow(track, e)}
                            className="w-7 h-7 rounded-none bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.05)] active:scale-90"
                            title="Запустить сейчас для всех"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            onClick={(e) => handleQueuePersonalTrack(track, e)}
                            className="w-7 h-7 rounded-none bg-white/5 hover:bg-white hover:text-black text-zinc-400 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90"
                            title="Добавить в очередь"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePersonalTrack(track.id, e)}
                            className="w-7 h-7 rounded-none bg-red-500/5 hover:bg-red-500/90 text-zinc-600 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-90"
                            title="Удалить из медиатеки"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {personalLibrary.length > 0 && (
                  <div className="flex justify-between items-center text-[8.5px] text-zinc-600 font-mono uppercase tracking-widest pt-1 px-1">
                    <span>Всего резидентом сохранено</span>
                    <span className="font-extrabold text-[#007aff]">{personalLibrary.length} треков</span>
                  </div>
                )}
              </>
            )}

            {/* TAB CONTENT: PLAYLIST IMPORT */}
            {activeLibraryTab === "playlist" && (
              <>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                  Создайте в SoundCloud публичный плейлист со своими любимыми треками (лайками) и вставьте ссылку ниже. Мы автоматически вытащим все треки!
                </p>

                <form onSubmit={handleImportPlaylistSubmit} className="w-full flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Вставьте ссылку на плейлист SoundCloud..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      disabled={importingPlaylist}
                      className="flex-1 bg-black/60 border border-white/8 rounded-none px-3 py-2.5 text-[10px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#007aff] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!importUrl.trim() || importingPlaylist}
                      className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                    >
                      {importingPlaylist ? (
                        <div className="w-3.5 h-3.5 rounded-none border-2 border-black border-r-transparent animate-spin"></div>
                      ) : (
                        "Импорт"
                      )}
                    </button>
                  </div>
                </form>

                {importingPlaylist && (
                  <div className="w-full p-4 bg-[#007aff]/5 border border-[#007aff]/10 rounded-none flex items-center justify-center gap-3">
                    <div className="w-4 h-4 rounded-none border-2 border-[#007aff] border-r-transparent animate-spin"></div>
                    <span className="text-[10px] font-bold text-[#007aff] tracking-wide animate-pulse uppercase">
                      Разбираем плейлист, пожалуйста подождите...
                    </span>
                  </div>
                )}

                <div className="p-3 bg-black/20 rounded-none border border-white/5 flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Как импортировать Лайки?</span>
                  <p className="text-[9px] text-zinc-500 leading-normal">
                    1. Перейдите в SoundCloud, зайдите во вкладку <span className="text-zinc-300">Likes</span>.<br />
                    2. Создайте новый публичный плейлист и добавьте туда треки.<br />
                    3. Скопируйте ссылку на этот плейлист и вставьте выше.
                  </p>
                </div>
              </>
            )}

            {/* TAB CONTENT: BULK IMPORT */}
            {activeLibraryTab === "bulk" && (
              <>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                  Скопируйте ссылки на любые треки SoundCloud из адресной строки и вставьте их ниже. Каждая ссылка должна быть на новой строчке или разделена запятой.
                </p>

                <form onSubmit={handleBulkImportSubmit} className="w-full flex flex-col gap-3">
                  <textarea
                    rows={4}
                    placeholder="https://soundcloud.com/artist/track-1&#10;https://soundcloud.com/artist/track-2"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    disabled={importingBulk}
                    className="w-full bg-black/60 border border-white/8 rounded-none p-3 text-[10px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#007aff] transition-colors resize-none leading-normal"
                  />
                  <button
                    type="submit"
                    disabled={!bulkText.trim() || importingBulk}
                    className="w-full py-3 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-none font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer"
                  >
                    {importingBulk ? (
                      <div className="w-3.5 h-3.5 rounded-none border-2 border-black border-r-transparent animate-spin"></div>
                    ) : (
                      "Импортировать список"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

        </div>

        {/* ==================== CENTER COLUMN (5/12 cols) ==================== */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Visual Artwork Card (Static) */}
          <div className="glass-panel p-6 rounded-none flex flex-col shadow-2xl relative">
            
            {/* Album Cover Container (Static) */}
            <div 
              className={`relative w-full aspect-square bg-zinc-950/60 rounded-none border border-white/5 overflow-hidden flex items-center justify-center group mb-6 transition-all duration-500 animate-beat`}
            >
              {currentTrack && currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail.replace("-large", "-t500x500")}
                  alt="Track Cover Art"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102 z-10"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-600 animate-pulse">
                  <div className="w-16 h-16 rounded-none border border-dashed border-zinc-700 flex items-center justify-center">
                    <Music className="w-8 h-8 text-zinc-500" />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-semibold">Очередь пуста</span>
                </div>
              )}

              {/* Heart/Like status on cover art */}
              {currentTrack && (
                <button
                  onClick={() => setIsHearted(!isHearted)}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/60 backdrop-blur-md rounded-none flex items-center justify-center border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-500 active:scale-90 transition-all cursor-pointer z-20"
                >
                  <Heart className={`w-4.5 h-4.5 ${isHearted ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              )}
            </div>

            {/* Track metadata details */}
            <div className="flex items-center justify-between text-left px-1">
              <div className="flex flex-col min-w-0 flex-1 pr-4 leading-normal">
                <h3 className="text-xl font-bold text-white truncate">
                  {currentTrack ? currentTrack.title : "Ничего не проигрывается"}
                </h3>
                <span className="text-xs text-zinc-500 font-medium uppercase mt-0.5 tracking-wider">
                  {currentTrack ? "SoundCloud Realtime" : "Ожидание трека..."}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#007aff] bg-[#007aff]/10 px-2.5 py-1.5 rounded-none border border-[#007aff]/15">
                  {isPlaying ? "Live" : "Pause"}
                </span>
              </div>
            </div>

          </div>

          {/* Add Track Input glass-form */}
          <div className="glass-panel p-5 rounded-none flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 text-left pl-1">Добавить новый трек</h3>
            <form onSubmit={handleAddTrack} className="w-full flex gap-2">
              <input
                type="text"
                placeholder="Вставьте SoundCloud ссылку на трек..."
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                disabled={addingTrack}
                className="flex-1 bg-black/60 border border-white/8 rounded-none px-4 py-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#007aff] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newTrackUrl.trim() || addingTrack}
                className="p-3.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none rounded-none transition-all flex items-center justify-center cursor-pointer"
              >
                {addingTrack ? (
                  <div className="w-4 h-4 rounded-none border-2 border-black border-r-transparent animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* Playlist Queue Section (Under Player) */}
          <div className="glass-panel p-6 rounded-none flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-[#007aff]" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400">
                Очередь воспроизведения ({playlist.length})
              </h3>
            </div>

            {playlist.length === 0 ? (
              <div className="w-full py-10 bg-black/20 border border-dashed border-white/5 rounded-none flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Music className="w-6 h-6 text-zinc-700 animate-bounce" />
                <p className="text-zinc-500 text-xs font-semibold">Очередь пуста</p>
                <p className="text-zinc-600 text-[10px] max-w-[200px]">
                  Вставьте ссылку на трек SoundCloud выше, чтобы начать синхронное прослушивание
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {playlist.map((track, idx) => {
                  const isCurrent = currentTrack && currentTrack.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track)}
                      className={`w-full p-2.5 bg-black/30 hover:bg-zinc-900/50 border rounded-none flex items-center gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? "border-[#007aff]/40 bg-black/60 shadow-md shadow-[#007aff]/5"
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* Track Thumbnail */}
                      <div className="relative w-9 h-9 rounded-none bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-3.5 h-3.5 text-zinc-600" />
                        )}
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="flex gap-0.5 items-end h-2.5 w-3.5">
                              <span className="w-0.5 bg-[#007aff] rounded-none animate-bounce h-2" style={{ animationDelay: '0.1s' }}></span>
                              <span className="w-0.5 bg-[#007aff] rounded-none animate-bounce h-3" style={{ animationDelay: '0.3s' }}></span>
                              <span className="w-0.5 bg-[#007aff] rounded-none animate-bounce h-1" style={{ animationDelay: '0.5s' }}></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0 flex flex-col text-left">
                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-white" : "text-zinc-300"}`}>
                          {track.title}
                        </p>
                        <p className="text-[9px] text-[#007aff] font-semibold mt-0.5 uppercase tracking-wider">
                          Трек #{idx + 1}
                        </p>
                      </div>

                      {/* Play Action / Delete */}
                      <div className="flex items-center gap-1.5">
                        {isCurrent ? (
                          <span className="text-[8px] uppercase font-extrabold tracking-widest text-[#007aff] bg-[#007aff]/10 px-2 py-1 rounded-none border border-[#007aff]/20">
                            Эфир
                          </span>
                        ) : (
                          <button className="p-1.5 hover:bg-white/5 rounded-none transition-colors">
                            <Play className="w-3 h-3 text-zinc-500 hover:text-white" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteTrack(track.id, e)}
                          className="p-1.5 hover:bg-red-500/10 rounded-none transition-colors group"
                          title="Удалить из очереди"
                        >
                          <Trash2 className="w-3 h-3 text-zinc-600 group-hover:text-red-500 transition-colors" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ==================== RIGHT COLUMN (4/12 cols) ==================== */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6 h-full lg:sticky lg:top-[90px]">
          
          {/* Real-time Session Chat Card */}
          <div className="glass-panel p-6 rounded-none flex flex-col min-h-[360px] h-[400px] shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#007aff]" />
                <h3 className="text-sm font-bold">Session Chat</h3>
              </div>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none"></span>
            </div>

            {/* Messages body scrolling */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1.5 select-text mb-4 text-left">
               {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-2.5 items-start ${!msg.isSystem ? "cursor-pointer group" : ""}`}
                  onClick={() => {
                    if (!msg.isSystem) {
                      setSelectedUserProfile({
                        username: msg.username,
                        avatarColor: msg.avatarColor,
                        avatarUrl: msg.avatarUrl,
                        bannerUrl: msg.bannerUrl,
                        bio: msg.bio,
                        customBadge: msg.customBadge,
                        joinedAt: msg.joinedAt || new Date().toISOString(),
                        latency: "Chat"
                      });
                    }
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-none flex items-center justify-center text-[10px] font-black text-black flex-shrink-0 mt-0.5 overflow-hidden transition-transform group-hover:scale-105 border border-white/5"
                    style={{ backgroundColor: msg.avatarColor || "#007aff" }}
                  >
                    {msg.avatarUrl && msg.avatarUrl.startsWith("data:image") ? (
                      <img src={msg.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-none" />
                    ) : msg.avatarUrl ? (
                      <span className="text-sm">{msg.avatarUrl}</span>
                    ) : (
                      msg.username ? msg.username.charAt(0).toUpperCase() : "?"
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-300 group-hover:text-[#FF5500] transition-colors">{msg.username}</span>
                      {msg.customBadge && (
                        <span className="px-1.5 py-0.5 rounded-[3px] bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 text-[6px] font-black uppercase tracking-wider scale-90 origin-left">
                          {msg.customBadge}
                        </span>
                      )}
                      <span className="text-[8px] text-zinc-600 font-medium">{msg.timestamp}</span>
                    </div>
                    <div className={`mt-1.5 px-3.5 py-2.5 rounded-none text-[11px] leading-relaxed break-words ${msg.isSystem ? "bg-white/5 border border-white/5 text-zinc-400 italic" : "bg-black/40 border border-white/5 text-white"}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message input bar */}
            <form onSubmit={handleSendChatMessage} className="w-full flex gap-2">
              <input
                type="text"
                placeholder="Напишите сообщение..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="flex-1 bg-black/60 border border-white/8 rounded-none px-4 py-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#007aff] transition-colors"
              />
              <button
                type="submit"
                disabled={!newChatMessage.trim()}
                className="p-3 bg-white text-black hover:bg-[#007aff] hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-none transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

{/* Active Participants List */}
          <div className="glass-panel p-6 rounded-none flex flex-col gap-4 text-left shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#007aff]" />
                <h3 className="text-sm font-bold">Participants</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold">{participants.length}</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {participants.map((p, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedUserProfile(p)}
                  className="w-full p-2.5 bg-black/30 border border-[#007aff]/10 rounded-none flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-none flex items-center justify-center text-xs font-black text-black flex-shrink-0 overflow-hidden border border-white/5"
                      style={{ backgroundColor: p.avatarColor || "#007aff" }}
                    >
                      {p.avatarUrl && p.avatarUrl.startsWith("data:image") ? (
                        <img src={p.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-none" />
                      ) : p.avatarUrl ? (
                        <span className="text-base">{p.avatarUrl}</span>
                      ) : (
                        p.username ? p.username.charAt(0).toUpperCase() : "?"
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-white truncate max-w-[80px]">{p.username}</span>
                        {p.customBadge && (
                          <span className="px-1 py-0.5 rounded-[3px] bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/25 text-[6.5px] font-black uppercase tracking-wider scale-90 origin-left flex-shrink-0">
                            {p.customBadge}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 font-medium">@{p.username ? p.username.toLowerCase() : "guest"}</span>
                    </div>
                  </div>

                  {/* Latency badge */}
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{p.latency || "25ms"}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
    </>
  )}      {/* ==================== PANEL 4: FLOATING BOTTOM DOCK ==================== */}
      {roomCode && (
        <div className="fixed bottom-6 left-6 right-6 z-50 rounded-[32px] premium-glass-card p-4 flex items-center justify-between select-none shadow-[0_24px_60px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-2xl">
          <div className="w-full grid grid-cols-12 items-center gap-4 px-2">
            {/* LEFT SECTION (3/12 cols): Track details & Like */}
            <div className="col-span-4 lg:col-span-3 flex items-center gap-3 min-w-0 text-left">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                {currentTrack && currentTrack.thumbnail ? (
                  <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-4 h-4 text-zinc-700" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1 leading-normal">
                <span className="text-xs font-black text-white truncate max-w-full font-sans" title={currentTrack ? currentTrack.title : "Ничего не воспроизводится"}>
                  {currentTrack ? currentTrack.title : "Ничего не воспроизводится"}
                </span>
                <span className="text-[8px] text-[#007aff] font-black uppercase tracking-widest mt-0.5 truncate font-sans">
                  {currentTrack ? "SoundCloud Live" : "Ожидание трека"}
                </span>
              </div>
              {currentTrack && (
                <button
                  onClick={() => setIsHearted(!isHearted)}
                  className="p-1 hover:bg-white/5 rounded transition-colors cursor-pointer flex-shrink-0"
                >
                  <Heart className={`w-3.5 h-3.5 ${isHearted ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              )}
            </div>

            {/* CENTER SECTION (6/12 cols): Playback Controls & Seekbar */}
            <div className="col-span-5 lg:col-span-6 flex flex-col items-center gap-2">
              {/* Playback Button Panel */}
              <div className="flex items-center gap-4 animate-fadeIn">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1 rounded transition-colors cursor-pointer ${isShuffle ? "text-[#007aff]" : "text-zinc-500 hover:text-white"}`}
                  title="Случайный порядок"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleSkipPrev}
                  disabled={playlist.length <= 1}
                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded transition-colors active:scale-95 cursor-pointer"
                  title="Предыдущий трек"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                {/* Massive vibrant Play Button in the center */}
                <button
                  onClick={handlePlayPauseToggle}
                  disabled={!currentTrack}
                  className="w-10 h-10 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-black rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer flex-shrink-0"
                  title={isPlaying ? "Пауза" : "Воспроизвести"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-black text-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={handleSkipNext}
                  disabled={playlist.length <= 1}
                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded transition-colors active:scale-95 cursor-pointer"
                  title="Следующий трек"
                >
                  <SkipForward className="w-4.5 h-4.5 fill-current" />
                </button>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-1 rounded transition-colors cursor-pointer ${isRepeat ? "text-[#007aff]" : "text-zinc-500 hover:text-white"}`}
                  title="Повторять трек"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Seekbar Timeline */}
              <div className="w-full flex items-center gap-3">
                <span className="text-[9px] font-mono text-zinc-500 min-w-[28px] text-right">
                  {formatTime(progressMs)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={durationMs || 100}
                  value={progressMs}
                  onChange={handleSeek}
                  disabled={!currentTrack}
                  className="flex-1 cursor-pointer accent-[#007aff] h-1 bg-white/10 rounded-none"
                />
                <span className="text-[9px] font-mono text-zinc-500 min-w-[28px] text-left">
                  {formatTime(durationMs)}
                </span>
              </div>
            </div>

            {/* RIGHT SECTION (3/12 cols): Volume & Latency/Presence status */}
            <div className="col-span-3 lg:col-span-3 flex items-center justify-end gap-4">
              {/* Volume block */}
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-none border border-white/5 max-w-[140px] w-full">
                <button
                  onClick={toggleMute}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full cursor-pointer accent-white h-0.5 bg-white/10"
                />
              </div>

              {/* Room indicator status */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-none text-emerald-400">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Sync</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen SoundCloud engine (Required for audio playback but visually hidden) */}
      <div 
        className="fixed bottom-0 left-0 w-[300px] h-[166px] pointer-events-none opacity-0 overflow-hidden"
        style={{ zIndex: -100 }}
      >
        <iframe
          ref={iframeRef}
          id="soundcloud-player"
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/184131013&auto_play=false&visual=true&show_artwork=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false"
        ></iframe>
      </div>

      {/* Background SoundCloud playlist importer (hidden) */}
      {tempIframeUrl && (
        <div 
          className="fixed bottom-0 left-0 w-[1px] h-[1px] pointer-events-none opacity-0 overflow-hidden"
          style={{ zIndex: -999 }}
        >
          <iframe
            id="soundcloud-temp-player"
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(tempIframeUrl)}&auto_play=false&visual=false&show_artwork=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false`}
          ></iframe>
        </div>
      )}

      {/* ==================== SUPABASE AUTH MODAL ==================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 select-text">
          {/* Decorative background waveform approximation */}
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-30 overflow-hidden">
             <div className="w-full h-48 bg-[url('https://w.soundcloud.com/player/assets/images/waveform-13b30bd.svg')] bg-repeat-x opacity-50 filter sepia saturate-200 hue-rotate-340 brightness-150"></div>
          </div>
          
          <div className="w-full max-w-[420px] bg-[#161616] p-10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative flex flex-col gap-8 z-10">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex flex-col gap-2 text-center mt-2">
              <h2 className="text-3xl font-black tracking-tight text-white">
                SoundWave
              </h2>
              <p className="text-sm text-zinc-400 font-medium">
                {authTab === "login"
                  ? "Music Co-listening App"
                  : "Create your account to sync"}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-[#242424] border border-transparent rounded-xl px-4 py-4 text-white text-[15px] focus:outline-none focus:border-[#FF5500]/50 transition-all placeholder:text-zinc-500"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-[#242424] border border-transparent rounded-xl px-4 py-4 text-white text-[15px] focus:outline-none focus:border-[#FF5500]/50 transition-all placeholder:text-zinc-500"
                required
              />

              {authError && (
                <div className="text-red-500 text-[13px] font-medium text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 bg-[#FF5500] text-white font-semibold text-[15px] rounded-xl transition-all hover:bg-[#e04b00] active:scale-[0.98] shadow-[0_4px_14px_rgba(255,85,0,0.3)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
              >
                {authLoading ? "Please wait..." : authTab === "login" ? "Continue with Email" : "Sign Up"}
              </button>
            </form>

            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setAuthTab(authTab === "login" ? "register" : "login");
                  setAuthError("");
                }}
                className="text-[13px] text-zinc-400 hover:text-white transition-colors"
              >
                {authTab === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== USER PROFILE CUSTOMIZER MODAL ==================== */}
      {showProfileCustomizer && (
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
          onClose={() => setShowProfileCustomizer(false)}
          isDbTableMissing={isDbTableMissing}
        />
      )}



      {/* ==================== SINGLE-TAB USER PROFILE FULL-SCREEN OVERLAY ==================== */}
      {selectedUserProfile && (
        <div className="fixed inset-0 z-55 bg-[#020204] text-white flex flex-col overflow-y-auto select-text animate-fadeIn pb-16">
          
          {/* Dynamic Background Glowing elements */}
          <div className="absolute top-[20%] left-[-10%] w-[50%] h-[50%] bg-[#007aff]/5 rounded-none blur-[160px] pointer-events-none z-0"></div>
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-[#00b4d8]/4 rounded-none blur-[160px] pointer-events-none z-0"></div>

          {/* 1. Page-Wide Hero Banner (Stretches 100% Edge-to-Edge) */}
          <div 
            className="w-full h-[280px] md:h-[380px] relative transition-all duration-500 border-b border-[#007aff]/25 shadow-2xl flex-shrink-0"
            style={getBannerStyle(selectedUserProfile.bannerUrl)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#020204] via-[#020204]/30 to-transparent"></div>
            
            {/* Embedded Floating Transparent Navbar */}
            <div className="absolute top-0 left-0 right-0 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-20">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3.5 py-2 border border-white/5 rounded-none">
                <span className="text-xl font-black tracking-tighter text-white">xyi</span>
                <span className="w-4 h-4 rounded bg-[#007aff] flex items-center justify-center text-[8px] font-black text-black select-none">▶</span>
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest pl-2 border-l border-white/10">Профиль резидента</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(`${window.location.origin}/${selectedUserProfile.username}`);
                      alert("Ссылка на профиль резидента скопирована!");
                    }
                  }}
                  className="px-4 py-2.5 bg-black/50 backdrop-blur-md border border-white/5 hover:border-[#007aff]/25 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white rounded-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Ссылка
                </button>
                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="px-5 py-2.5 bg-white text-black hover:bg-[#007aff] hover:text-white text-[10px] font-black uppercase tracking-wider rounded-none transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Вернуться в плеер ✕
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
                className="w-32 h-32 md:w-40 md:h-40 rounded-none border-4 border-[#020204] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden bg-zinc-950 flex-shrink-0"
                style={{ backgroundColor: selectedUserProfile.avatarColor || "#007aff" }}
              >
                {selectedUserProfile.avatarUrl && selectedUserProfile.avatarUrl.startsWith("data:image") ? (
                  <img src={selectedUserProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl filter drop-shadow-md">{selectedUserProfile.avatarUrl || "🎧"}</span>
                )}
                
                {/* Active Tech Indicator */}
                <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-none bg-emerald-500 border-2 border-[#020204] live-pulse-dot shadow-md"></div>
              </div>

              {/* Text Meta Info */}
              <div className="flex-1 flex flex-col gap-1 items-center md:items-start pb-2">
                <div className="flex items-center gap-2.5 justify-center md:justify-start min-w-0">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase truncate max-w-[320px] md:max-w-[450px]">
                    {selectedUserProfile.username || "Guest"}
                  </h1>
                  {selectedUserProfile.customBadge && (
                    <span className="px-3 py-1 bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/25 text-[9px] font-black uppercase tracking-widest rounded-none shadow-sm">
                      {selectedUserProfile.customBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-extrabold tracking-widest uppercase mt-0.5">
                  ID: @{selectedUserProfile.username ? selectedUserProfile.username.toLowerCase() : "hustler"} // ЧЛЕН КЛУБА XYI
                </span>
              </div>
            </div>

            {/* 3. Strict Glassmorphic Body Grid Layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-10">
              
              {/* Left Bio and Status Column (8/12 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6 w-full">
                <div className="glass-panel p-8 rounded-none text-left flex flex-col gap-4 border-[#007aff]/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#007aff]/2 rounded-none blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#007aff]">Манифест / Статус</span>
                    <span className="text-[9px] text-zinc-500 font-mono font-bold">STRICT CHILL VIBE</span>
                  </div>
                  
                  <p className="text-sm text-zinc-300 font-medium break-words leading-relaxed italic min-h-[52px]">
                    {selectedUserProfile.bio ? `"${selectedUserProfile.bio}"` : "Этот хастлер пока не оставил свое описание. Он зашел в клуб просто расслабиться и послушать SoundCloud."}
                  </p>
                </div>

                {/* Additional Tech Stats panel for club vibe */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-black/40 border border-white/5 rounded-none text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Пинг / Сеть</span>
                    <p className="text-xs font-mono font-bold text-emerald-450 mt-1 uppercase">{selectedUserProfile.latency || "25ms"}</p>
                  </div>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-none text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Статус сессии</span>
                    <p className="text-xs font-bold text-zinc-200 mt-1 uppercase">Подключен</p>
                  </div>
                  <div className="p-4 bg-black/40 border border-white/5 rounded-none text-left">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">В сети с</span>
                    <p className="text-xs font-bold text-[#007aff] mt-1 uppercase truncate">
                      {selectedUserProfile.joinedAt ? new Date(selectedUserProfile.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Только что"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Action Column (4/12 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4 w-full">
                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="w-full py-4.5 bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-widest rounded-none transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  Вернуться в плеер
                </button>

                <div className="flex flex-col gap-2.5 w-full bg-black/30 border border-white/5 p-4 rounded-none">
                  <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest text-center block mb-1">
                    Клубные Действия
                  </span>
                  
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}/${selectedUserProfile.username}`);
                        alert("Ссылка на профиль резидента скопирована!");
                      }
                    }}
                    className="w-full py-3.5 bg-[#0d0d12] hover:bg-white/5 border border-white/5 rounded-none text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Копировать ссылку
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUserProfile(null);
                      // Already in player
                    }}
                    className="w-full py-3.5 bg-[#0d0d12] hover:bg-white/5 border border-white/5 rounded-none text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-[#007aff]" /> Чат комнаты
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

// 23. Wrap in Suspense boundary to prevent build-time deoptimization for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SyncPlayerApp />
    </Suspense>
  );
}
