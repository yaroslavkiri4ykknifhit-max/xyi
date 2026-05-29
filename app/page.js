"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
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
  Heart
} from "lucide-react";

// List of cool music-related nicknames for random generation
const NICKNAMES = [
  "SynthWave", "BassDrop", "BeatMaker", "LofiVibe", "VocalChords",
  "EchoDelay", "ReverbKing", "TrebleClef", "RhythmSoul", "SonicBoom",
  "PitchPerfect", "MelodyDream", "TempoHustle", "SubWoofer", "VinylSpin"
];

// Harmonious custom colors for avatars
const AVATAR_COLORS = [
  "#FF5500", "#00B4D8", "#8A2BE2", "#10B981", "#EC4899",
  "#F59E0B", "#3B82F6", "#EF4444", "#6366F1", "#14B8A6"
];

// 1. Loading UI inside the Suspense Boundary
function PageLoading() {
  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center text-white px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-t-2 border-[#ff5500] border-r-2 border-r-transparent animate-spin"></div>
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

  // Refs to handle realtime synchronization and prevent circular feedback loops
  const widgetRef = useRef(null);
  const currentTrackIdRef = useRef(null);
  const isSyncingRef = useRef(false);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const iframeRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const playlistRef = useRef([]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // 3. Initialize unique client session ID, username, and avatar color
  useEffect(() => {
    let cid = sessionStorage.getItem("xyi_client_id");
    if (!cid) {
      cid = "client_" + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("xyi_client_id", cid);
    }
    setClientId(cid);

    let storedName = sessionStorage.getItem("xyi_username");
    let storedColor = sessionStorage.getItem("xyi_avatar_color");
    
    if (!storedName) {
      storedName = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + "_" + Math.floor(100 + Math.random() * 900);
      sessionStorage.setItem("xyi_username", storedName);
    }
    if (!storedColor) {
      storedColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      sessionStorage.setItem("xyi_avatar_color", storedColor);
    }
    
    setMyUsername(storedName);
    setMyAvatarColor(storedColor);

    // Initial Chat messages
    setChatMessages([
      {
        id: "sys_1",
        username: "🎧 XYI BOT",
        avatarColor: "#ff5500",
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
  }, []);

  // ==================== SUPABASE AUTH & ROOMS ACTIONS ====================
  useEffect(() => {
    // Check initial user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        const emailNick = user.email.split("@")[0];
        if (!sessionStorage.getItem("xyi_username")) {
          setMyUsername(emailNick);
          sessionStorage.setItem("xyi_username", emailNick);
        }
      }
    });

    // Listen for real-time authentication events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        const emailNick = user.email.split("@")[0];
        setMyUsername(emailNick);
        sessionStorage.setItem("xyi_username", emailNick);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
    
    // Fallback to random nickname
    const guestNick = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] + "_" + Math.floor(100 + Math.random() * 900);
    setMyUsername(guestNick);
    sessionStorage.setItem("xyi_username", guestNick);
    
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

  // 4. Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
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
      const color = sessionStorage.getItem("xyi_avatar_color") || "#FF5500";

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
          await roomChannel.track({
            id: cid,
            username: name,
            avatarColor: color,
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
          avatarColor: "#ff5500",
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
    <main className="min-h-screen bg-[#050508] text-white flex flex-col relative select-none pb-28 overflow-x-hidden">
      {/* Background glowing soft elements */}
      <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-[#ff5500]/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-[#00b4d8]/5 rounded-full blur-[140px] pointer-events-none"></div>

      {!roomCode ? (
        /* ==================== LANDING PAGE CONTENT ==================== */
        <div className="flex flex-col flex-1 relative z-10 w-full min-h-screen">
          {/* Glow Auras */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff5500]/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00b4d8]/10 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Global Nav */}
          <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => router.push("/")}>
              <span className="text-3xl font-black tracking-tighter text-white">xyi</span>
              <span className="w-5 h-5 rounded-md bg-[#ff5500] flex items-center justify-center text-[10px] font-black text-black select-none">▶</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
              <span className="hover:text-white transition-colors cursor-pointer">Home</span>
              <span className="hover:text-white transition-colors cursor-pointer">Rooms</span>
              <span className="hover:text-white transition-colors cursor-pointer">Features</span>
              <span className="hover:text-white transition-colors cursor-pointer">Support</span>
            </div>
            {currentUser ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoToMyRoom}
                  className="px-4 py-2 rounded-full bg-zinc-900 border border-white/10 hover:border-[#ff5500]/50 text-xs font-bold tracking-wider hover:bg-[#ff5500]/5 text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                  Моя комната
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-[#ff5500] text-black text-[10px] font-black flex items-center justify-center">
                    {myUsername ? myUsername.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span className="text-xs font-bold text-zinc-300 max-w-[100px] truncate">{myUsername}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full border border-red-500/10 hover:border-red-500/30 text-[10px] font-bold text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthTab("login"); setAuthError(""); setShowAuthModal(true); }}
                className="px-5 py-2.5 rounded-full border border-white/10 hover:border-white/20 text-xs font-semibold tracking-wider hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Hero & Join Card Panel */}
          <section className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center justify-center gap-16 py-12 z-10">
            <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start max-w-xl">
              <span className="px-3.5 py-1.5 rounded-full bg-[#ff5500]/10 text-[#ff5500] text-xs font-bold uppercase tracking-widest mb-6 border border-[#ff5500]/15">
                Na leg. All vibe.
              </span>
              <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
                XYI: Listen <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-[#ff5500] via-[#ff7733] to-[#8A2BE2] bg-clip-text text-transparent">Together, Live</span>
              </h1>
              <p className="text-zinc-400 text-base md:text-lg mb-8 font-light leading-relaxed max-w-md">
                Синхронизируйте музыку в реальном времени с друзьями. Нажмите кнопку, чтобы мгновенно создать приватную аудиосессию без задержек.
              </p>
              <button
                onClick={handleCreateRoomAction}
                className="px-8 py-4 bg-[#ff5500] hover:bg-[#ff661a] text-black font-extrabold text-sm uppercase tracking-widest rounded-full transition-all active:scale-[0.97] hover:shadow-[0_8px_30px_rgba(255,85,0,0.3)]"
              >
                Create a Session
              </button>
            </div>

            {/* Glass Card Input Box */}
            <div className="w-full max-w-md glass-panel p-8 rounded-[36px] border-white/10 shadow-2xl flex flex-col gap-6 relative">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[9px] font-bold text-emerald-400 tracking-widest uppercase">Online</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">Войти в комнату</h2>
                <p className="text-xs text-zinc-500">Введите уникальный код сессии вашего друга</p>
              </div>

              <form onSubmit={handleJoinOrCreateRoomSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="НАПРИМЕР: XYI-8LP2"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-black/60 border border-white/8 rounded-2xl px-4 py-4 text-white text-center text-lg font-bold tracking-widest focus:outline-none focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500]/30 transition-all uppercase placeholder:text-zinc-700"
                  maxLength={12}
                />
                <button
                  type="submit"
                  disabled={!roomCodeInput.trim()}
                  className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-2xl transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Подключиться
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-zinc-600 text-[10px] uppercase tracking-widest">или</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <button
                onClick={handleCreateRoomAction}
                className="w-full py-4 bg-zinc-950 border border-white/10 hover:border-[#ff5500]/50 hover:bg-[#ff5500]/5 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
              >
                Создать новую сессию
              </button>
            </div>
          </section>

          {/* Public Rooms Section */}
          <section className="w-full max-w-7xl mx-auto px-6 py-12 z-10 flex flex-col gap-6 text-left pb-24">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse-dot"></span>
                <h2 className="text-xl font-black tracking-tight">Публичные комнаты</h2>
              </div>
              <button 
                onClick={fetchPublicRooms} 
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Обновить список
              </button>
            </div>

            {loadingPublicRooms ? (
              <div className="w-full py-16 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-[#ff5500] border-r-transparent animate-spin"></div>
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="w-full py-16 bg-zinc-950/40 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 px-6 text-center shadow-inner">
                <Radio className="w-8 h-8 text-zinc-700 animate-pulse" />
                <h3 className="text-sm font-bold text-zinc-400">Нет активных публичных комнат</h3>
                <p className="text-zinc-600 text-xs max-w-sm">
                  Сейчас никто не стримит публично. Войдите, создайте свою постоянную комнату и сделайте её публичной в настройках!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicRooms.map((room) => (
                  <div key={room.id} className="glass-panel p-6 rounded-[28px] flex flex-col justify-between gap-4 shadow-xl border-white/8 hover:border-[#ff5500]/30 transition-all hover:shadow-[0_8px_30px_rgba(255,85,0,0.03)] glass-panel-hover">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-[#ff5500] uppercase tracking-widest pl-0.5">Live Broadcast</span>
                        <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">{room.id}</span>
                      </div>
                      <h3 className="text-base font-black text-white truncate">{room.room_name || `Комната ${room.id}`}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Слушать вместе</span>
                      </div>
                      <button 
                        onClick={() => router.push(`/?room=${room.id}`)}
                        className="px-4 py-2 bg-white text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all hover:bg-zinc-200 active:scale-[0.97] cursor-pointer"
                      >
                        Войти
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* ==================== ROOM PAGE CONTENT ==================== */
        <div className="flex flex-col flex-1 relative z-10 w-full">


      {/* Autoplay Unlock banner */}
      {needInteractionSync && (
        <div className="fixed top-[90px] left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-bounce">
          <div className="w-full bg-[#ff5500]/20 backdrop-blur-xl border border-[#ff5500]/40 rounded-2xl py-3 px-4 text-center text-xs font-bold text-white shadow-xl shadow-black/40 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5500] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff5500]"></span>
            </span>
            <span>🔊 Кликните в любом месте для синхронизации звука!</span>
          </div>
        </div>
      )}

      {/* SoundCloud player iframe is now embedded inside the player card below */}

      {/* Script loaded post-render */}
      <Script
        src="https://w.soundcloud.com/player/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-white/5 bg-[#050508]/30 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => router.push("/")}>
          <span className="text-2xl font-black tracking-tighter text-white">xyi</span>
          <span className="w-4 h-4 rounded bg-[#ff5500] flex items-center justify-center text-[9px] font-black text-black select-none">▶</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-zinc-400">
          <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">Сессия:</span>
          <span className="text-white text-sm font-black tracking-tight bg-[#ff5500]/10 border border-[#ff5500]/20 px-3 py-1.5 rounded-xl">
            {roomSettings.room_name || `Комната ${roomCode}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Code Display with Quick Copy */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900/60 border border-white/8 hover:border-[#ff5500]/40 rounded-full transition-colors cursor-pointer glass-panel-hover"
          >
            <span className="text-xs font-bold text-zinc-200 tracking-wider">
              {roomCode.toUpperCase()}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#ff5500]" />
            )}
          </button>

          {/* User profile controls inside Room Header */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-full">
                <div className="w-4.5 h-4.5 rounded-full bg-[#ff5500] text-black text-[9px] font-black flex items-center justify-center">
                  {myUsername ? myUsername.charAt(0).toUpperCase() : "?"}
                </div>
                <span className="text-[10px] font-bold text-zinc-300 max-w-[80px] truncate">{myUsername}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-full border border-red-500/10 hover:border-red-500/30 text-[9px] font-bold text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAuthTab("login"); setAuthError(""); setShowAuthModal(true); }}
              className="px-4 py-2 rounded-full border border-white/10 hover:border-white/20 text-xs font-semibold tracking-wider hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main 3-Column Grid */}
      <div className="w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* ==================== LEFT COLUMN (3/12 cols) ==================== */}
        <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">

          {/* Owner Room Settings Control Panel */}
          {currentUser && roomSettings.owner_id === currentUser.id && (
            <div className="glass-panel p-6 rounded-[28px] text-left flex flex-col gap-4 border-[#ff5500]/20 shadow-[0_8px_30px_rgba(255,85,0,0.04)]">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#ff5500]">Настройки комнаты</h3>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse-dot"></span>
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
                    className="flex-1 bg-black/60 border border-white/8 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-white text-black hover:bg-zinc-200 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
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
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                    roomSettings.is_public ? "bg-[#ff5500]" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      roomSettings.is_public ? "translate-x-6" : "translate-x-0"
                    }`}
                  ></div>
                </button>
              </div>
            </div>
          )}
          
          {/* Slogan details */}
          <div className="glass-panel p-6 rounded-[28px] text-left flex flex-col items-start gap-4">
            <span className="text-[10px] font-bold text-[#ff5500] uppercase tracking-widest pl-1">
              Na leg. All vibe.
            </span>
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              XYI: Listen Together, Live
            </h2>
            <button
              onClick={handleCreateRoomAction}
              className="w-full py-3.5 bg-[#ff5500] hover:bg-[#ff661a] text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-lg hover:shadow-[#ff5500]/15"
            >
              Create a Session
            </button>
          </div>

          {/* Real-time Sync Status & SVG Waves */}
          <div className="glass-panel p-6 rounded-[28px] text-left flex flex-col gap-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-400">Sync Status</span>
                <span className="text-[10px] text-zinc-600 font-medium tracking-wide">
                  {participants.length} listeners online
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse-dot flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              </div>
            </div>

            {/* Glowing animated colorful sine-wave nodes */}
            <div className="relative h-28 w-full bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-4">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff5500" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#8A2BE2" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00b4d8" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#FF5500" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Wave lines */}
                <path d="M 10,50 Q 60,10 120,50 T 230,50" stroke="url(#waveGrad1)" strokeWidth="3" fill="none" className="animate-wave-1" />
                <path d="M 10,50 Q 60,80 120,50 T 230,50" stroke="url(#waveGrad2)" strokeWidth="2" fill="none" className="animate-wave-2" />
                
                {/* Dots on wave peaks */}
                <circle cx="65" cy="30" r="4" fill="#ff5500" className="animate-pulse" />
                <circle cx="120" cy="50" r="4" fill="#8A2BE2" className="animate-pulse" />
                <circle cx="175" cy="70" r="4" fill="#00b4d8" className="animate-pulse" />
              </svg>
              
              {/* Dynamic user avatars along the bottom of the card */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10 px-2 overflow-x-auto">
                {participants.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-0.5 group">
                    <div
                      className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-black text-black shadow-md shadow-black/50"
                      style={{ backgroundColor: p.avatarColor || "#ff5500" }}
                      title={p.username}
                    >
                      {p.username ? p.username.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span className="text-[8px] text-zinc-500 font-bold truncate max-w-[40px]">{p.username}</span>
                  </div>
                ))}
                {participants.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                    +{participants.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Library Card (Saved Favorite tracks / SoundCloud accounts) */}
          <div className="glass-panel p-6 rounded-[28px] text-left flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-sm font-bold">Мой SoundCloud</h3>
              </div>
              <span className="text-[9px] uppercase font-black tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 rounded-full border border-[#ff5500]/20 animate-pulse">
                Свободно
              </span>
            </div>

            {/* Gorgeous Segmented Tab Bar */}
            <div className="grid grid-cols-3 bg-black/40 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => setActiveLibraryTab("favorites")}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeLibraryTab === "favorites"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Мои Треки
              </button>
              <button
                onClick={() => setActiveLibraryTab("playlist")}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeLibraryTab === "playlist"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Импорт
              </button>
              <button
                onClick={() => setActiveLibraryTab("bulk")}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeLibraryTab === "bulk"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Списком
              </button>
            </div>

            {/* TAB CONTENT: FAVORITES */}
            {activeLibraryTab === "favorites" && (
              <>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                  Ваша личная медиатека. Добавьте трек поштучно, либо импортируйте плейлист из других вкладок. Запускайте треки синхронно для всех!
                </p>
                
                {/* Input to add personal tracks */}
                <form onSubmit={handleAddPersonalTrack} className="w-full flex gap-2">
                  <input
                    type="text"
                    placeholder="Вставьте SoundCloud ссылку на трек..."
                    value={newPersonalUrl}
                    onChange={(e) => setNewPersonalUrl(e.target.value)}
                    disabled={addingPersonal}
                    className="flex-1 bg-black/60 border border-white/8 rounded-2xl px-3 py-2.5 text-[10px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newPersonalUrl.trim() || addingPersonal}
                    className="p-2.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-2xl transition-all flex items-center justify-center cursor-pointer"
                  >
                    {addingPersonal ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>

                {/* Scrollable Favorites list */}
                {personalLibrary.length === 0 ? (
                  <div className="w-full py-6 bg-black/20 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <p className="text-zinc-600 text-[10px] leading-normal">Медиатека пуста. Добавьте трек выше или импортируйте плейлист!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {personalLibrary.map((track) => (
                      <div
                        key={track.id}
                        className="w-full p-2 bg-black/30 border border-white/5 hover:border-[#ff5500]/20 rounded-xl flex items-center gap-2.5 transition-all hover:bg-black/50"
                      >
                        {/* Thumbnail */}
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {track.thumbnail ? (
                            <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-3.5 h-3.5 text-zinc-600" />
                          )}
                        </div>
                        {/* Title */}
                        <div className="flex-1 min-w-0 flex flex-col text-left">
                          <p className="text-[10px] font-bold text-zinc-300 truncate" title={track.title}>
                            {track.title}
                          </p>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handlePlayPersonalTrackNow(track, e)}
                            className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-[#ff5500] transition-colors cursor-pointer"
                            title="Запустить сейчас для всех"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          <button
                            onClick={(e) => handleQueuePersonalTrack(track, e)}
                            className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Добавить в очередь"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePersonalTrack(track.id, e)}
                            className="p-1.5 hover:bg-red-500/10 rounded text-zinc-600 hover:text-red-500 transition-colors cursor-pointer"
                            title="Удалить из медиатеки"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
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
                      className="flex-1 bg-black/60 border border-white/8 rounded-2xl px-3 py-2.5 text-[10px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!importUrl.trim() || importingPlaylist}
                      className="px-4 py-2.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                    >
                      {importingPlaylist ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
                      ) : (
                        "Импорт"
                      )}
                    </button>
                  </div>
                </form>

                {importingPlaylist && (
                  <div className="w-full p-4 bg-[#ff5500]/5 border border-[#ff5500]/10 rounded-2xl flex items-center justify-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-[#ff5500] border-r-transparent animate-spin"></div>
                    <span className="text-[10px] font-bold text-[#ff5500] tracking-wide animate-pulse uppercase">
                      Разбираем плейлист, пожалуйста подождите...
                    </span>
                  </div>
                )}

                <div className="p-3 bg-black/20 rounded-2xl border border-white/5 flex flex-col gap-1.5">
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
                    className="w-full bg-black/60 border border-white/8 rounded-2xl p-3 text-[10px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-[#ff5500] transition-colors resize-none leading-normal"
                  />
                  <button
                    type="submit"
                    disabled={!bulkText.trim() || importingBulk}
                    className="w-full py-3 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer"
                  >
                    {importingBulk ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
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
          <div className="glass-panel p-6 rounded-[32px] flex flex-col shadow-2xl relative">
            
            {/* Album Cover Container (Static) */}
            <div 
              className={`relative w-full aspect-square bg-zinc-950/60 rounded-[24px] border border-white/5 overflow-hidden flex items-center justify-center group mb-6 transition-all duration-500 animate-beat`}
            >
              {currentTrack && currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail.replace("-large", "-t500x500")}
                  alt="Track Cover Art"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102 z-10"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-600 animate-pulse">
                  <div className="w-16 h-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                    <Music className="w-8 h-8 text-zinc-500" />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-semibold">Очередь пуста</span>
                </div>
              )}

              {/* Heart/Like status on cover art */}
              {currentTrack && (
                <button
                  onClick={() => setIsHearted(!isHearted)}
                  className="absolute top-4 right-4 w-9 h-9 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-red-500 active:scale-90 transition-all cursor-pointer z-20"
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
                <span className="text-[9px] uppercase font-black tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2.5 py-1.5 rounded-full border border-[#ff5500]/15">
                  {isPlaying ? "Live" : "Pause"}
                </span>
              </div>
            </div>

          </div>

          {/* Add Track Input glass-form */}
          <div className="glass-panel p-5 rounded-[28px] flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400 text-left pl-1">Добавить новый трек</h3>
            <form onSubmit={handleAddTrack} className="w-full flex gap-2">
              <input
                type="text"
                placeholder="Вставьте SoundCloud ссылку на трек..."
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                disabled={addingTrack}
                className="flex-1 bg-black/60 border border-white/8 rounded-2xl px-4 py-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newTrackUrl.trim() || addingTrack}
                className="p-3.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none rounded-2xl transition-all flex items-center justify-center cursor-pointer"
              >
                {addingTrack ? (
                  <div className="w-4 h-4 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* Playlist Queue Section (Under Player) */}
          <div className="glass-panel p-6 rounded-[28px] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-[#ff5500]" />
              <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400">
                Очередь воспроизведения ({playlist.length})
              </h3>
            </div>

            {playlist.length === 0 ? (
              <div className="w-full py-10 bg-black/20 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 px-6 text-center">
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
                      className={`w-full p-2.5 bg-black/30 hover:bg-zinc-900/50 border rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? "border-[#ff5500]/40 bg-black/60 shadow-md shadow-[#ff5500]/5"
                          : "border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* Track Thumbnail */}
                      <div className="relative w-9 h-9 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
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
                              <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }}></span>
                              <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }}></span>
                              <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-1" style={{ animationDelay: '0.5s' }}></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0 flex flex-col text-left">
                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-white" : "text-zinc-300"}`}>
                          {track.title}
                        </p>
                        <p className="text-[9px] text-[#ff5500] font-semibold mt-0.5 uppercase tracking-wider">
                          Трек #{idx + 1}
                        </p>
                      </div>

                      {/* Play Action / Delete */}
                      <div className="flex items-center gap-1.5">
                        {isCurrent ? (
                          <span className="text-[8px] uppercase font-extrabold tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2 py-1 rounded-md border border-[#ff5500]/20">
                            Эфир
                          </span>
                        ) : (
                          <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                            <Play className="w-3 h-3 text-zinc-500 hover:text-white" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteTrack(track.id, e)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
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
          <div className="glass-panel p-6 rounded-[28px] flex flex-col min-h-[360px] h-[400px] shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-sm font-bold">Session Chat</h3>
              </div>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            </div>

            {/* Messages body scrolling */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1.5 select-text mb-4 text-left">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex gap-2.5 items-start">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-black flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: msg.avatarColor || "#ff5500" }}
                  >
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-300">{msg.username}</span>
                      <span className="text-[8px] text-zinc-600 font-medium">{msg.timestamp}</span>
                    </div>
                    <div className={`mt-1.5 px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed break-words ${msg.isSystem ? "bg-white/5 border border-white/5 text-zinc-400 italic" : "bg-black/40 border border-white/5 text-white"}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>

            {/* Message input bar */}
            <form onSubmit={handleSendChatMessage} className="w-full flex gap-2">
              <input
                type="text"
                placeholder="Напишите сообщение..."
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                className="flex-1 bg-black/60 border border-white/8 rounded-2xl px-4 py-3.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500] transition-colors"
              />
              <button
                type="submit"
                disabled={!newChatMessage.trim()}
                className="p-3 bg-white text-black hover:bg-[#ff5500] hover:text-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none rounded-2xl transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Active Participants List */}
          <div className="glass-panel p-6 rounded-[28px] flex flex-col gap-4 text-left shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-sm font-bold">Participants</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold">{participants.length}</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {participants.map((p, idx) => (
                <div key={idx} className="w-full p-2.5 bg-black/30 border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0"
                      style={{ backgroundColor: p.avatarColor || "#ff5500" }}
                    >
                      {p.username ? p.username.charAt(0).toUpperCase() : "?"}
                    </div>
                    {/* Info */}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{p.username}</span>
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
    </div>
  )}      {/* ==================== STICKY BOTTOM PLAYER (SPOTIFY STYLE) ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-24 bg-[#07070a]/95 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex items-center justify-between select-none shadow-2xl">
        {!roomCode ? (
          /* Landing/Idle Inactive State */
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center flex-shrink-0">
                <Radio className="w-6 h-6 text-zinc-600" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-bold text-zinc-400 truncate">Оффлайн сессия</span>
                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">Не в сети</span>
              </div>
            </div>
            <div className="text-zinc-500 text-xs font-semibold max-w-md hidden md:block">
              Создайте сессию или подключитесь, чтобы начать синхронное прослушивание музыки
            </div>
            <button 
              onClick={handleCreateRoomAction}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-[#ff5500] hover:text-black border border-white/10 hover:border-transparent rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
            >
              Создать сессию
            </button>
          </div>
        ) : (
          /* Room Active State */
          <div className="w-full grid grid-cols-12 items-center gap-4">
            {/* LEFT SECTION (3/12 cols): Track details & Like */}
            <div className="col-span-4 lg:col-span-3 flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {currentTrack && currentTrack.thumbnail ? (
                  <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-zinc-600" />
                )}
              </div>
              <div className="flex flex-col min-w-0 text-left flex-1">
                <span className="text-sm font-bold text-white truncate" title={currentTrack ? currentTrack.title : "Ничего не воспроизводится"}>
                  {currentTrack ? currentTrack.title : "Ничего не воспроизводится"}
                </span>
                <span className="text-[10px] text-[#ff5500] font-bold uppercase tracking-widest mt-0.5 truncate">
                  {currentTrack ? "SoundCloud Live" : "Ожидание трека"}
                </span>
              </div>
              {currentTrack && (
                <button
                  onClick={() => setIsHearted(!isHearted)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Heart className={`w-4 h-4 ${isHearted ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              )}
            </div>

            {/* CENTER SECTION (5/12 or 6/12 cols): Playback Controls & Seekbar */}
            <div className="col-span-5 lg:col-span-6 flex flex-col items-center gap-1.5">
              {/* Playback Button Panel */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1 rounded transition-colors cursor-pointer ${isShuffle ? "text-[#ff5500]" : "text-zinc-500 hover:text-white"}`}
                  title="Случайный порядок"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSkipPrev}
                  disabled={playlist.length <= 1}
                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none rounded transition-colors active:scale-95 cursor-pointer"
                  title="Предыдущий трек"
                >
                  <SkipBack className="w-4.5 h-4.5 fill-current" />
                </button>

                <button
                  onClick={handlePlayPauseToggle}
                  disabled={!currentTrack}
                  className="w-9 h-9 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-black rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer flex-shrink-0"
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
                  className={`p-1 rounded transition-colors cursor-pointer ${isRepeat ? "text-[#ff5500]" : "text-zinc-500 hover:text-white"}`}
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
                  className="flex-1 cursor-pointer accent-[#ff5500] h-1 bg-white/10 rounded-full"
                />
                <span className="text-[9px] font-mono text-zinc-500 min-w-[28px] text-left">
                  {formatTime(durationMs)}
                </span>
              </div>
            </div>

            {/* RIGHT SECTION (3/12 cols): Volume & Latency/Presence status */}
            <div className="col-span-3 lg:col-span-3 flex items-center justify-end gap-4">
              {/* Volume block */}
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 max-w-[140px] w-full">
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
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Sync</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-md px-4 select-text">
          <div className="w-full max-w-sm glass-panel p-8 rounded-[36px] border-white/10 shadow-2xl relative flex flex-col gap-6">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm font-bold"
            >
              ✕
            </button>

            <div className="flex flex-col gap-1 text-center">
              <h2 className="text-2xl font-black tracking-tight">
                {authTab === "login" ? "Вход в аккаунт" : "Регистрация"}
              </h2>
              <p className="text-xs text-zinc-500">
                {authTab === "login"
                  ? "Войдите, чтобы управлять своей комнатой"
                  : "Создайте профиль и получите постоянную комнату"}
              </p>
            </div>

            {/* Segmented Modal Tabs */}
            <div className="grid grid-cols-2 bg-black/40 p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => { setAuthTab("login"); setAuthError(""); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  authTab === "login"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Вход
              </button>
              <button
                onClick={() => { setAuthTab("register"); setAuthError(""); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  authTab === "register"
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] uppercase font-bold text-zinc-500 pl-1">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/8 rounded-2xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-[#ff5500] transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] uppercase font-bold text-zinc-500 pl-1">Пароль</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/8 rounded-2xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-[#ff5500] transition-all"
                  required
                />
              </div>

              {authError && (
                <div className="text-red-500 text-xs font-semibold pl-1 text-left">
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer mt-2"
              >
                {authLoading ? "Пожалуйста, подождите..." : authTab === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>
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
