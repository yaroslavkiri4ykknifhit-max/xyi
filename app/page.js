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
  ExternalLink
} from "lucide-react";

// 1. Loading UI inside the Suspense Boundary
function PageLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-t-2 border-[#ff5500] border-r-2 border-r-transparent animate-spin"></div>
        <p className="text-zinc-400 text-sm tracking-widest font-light animate-pulse">
          ЗАГРУЗКА XYI...
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

  // Component States
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Refs to handle realtime synchronization and prevent circular feedback loops
  const widgetRef = useRef(null);
  const currentTrackIdRef = useRef(null);
  const isSyncingRef = useRef(false);

  // 3. Initialize unique client session ID
  useEffect(() => {
    let cid = sessionStorage.getItem("xyi_client_id");
    if (!cid) {
      cid = "client_" + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem("xyi_client_id", cid);
    }
    setClientId(cid);
  }, []);

  // 4. Fetch or Auto-Create rooms
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

  // 5. Fetch Room's Playlist
  const fetchPlaylist = async (code) => {
    const { data, error } = await supabase
      .from("playlist")
      .select("*")
      .eq("room_id", code)
      .order("added_at", { ascending: true });

    if (error) {
      console.error("Error fetching playlist:", error);
    } else {
      setPlaylist(data || []);
    }
  };

  // 6. Handle room joining & Realtime setup
  useEffect(() => {
    if (!roomCode) return;

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

      // Fetch playlist
      await fetchPlaylist(code);

      // Establish initial state
      if (room.current_track_id) {
        currentTrackIdRef.current = room.current_track_id;
        setIsPlaying(room.is_playing);
        setProgressMs(room.progress_ms);
      }

      setLoading(false);

      // Setup Supabase Realtime Channels
      const cid = sessionStorage.getItem("xyi_client_id") || "client_anon";

      roomChannel = supabase.channel(`room-state-${code}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${code}`,
          },
          (payload) => {
            const updatedRoom = payload.new;
            // Ignore updates that we pushed myself to prevent double-skips / feedback seek loops
            if (updatedRoom.sender_id !== cid) {
              handleIncomingRoomState(updatedRoom);
            }
          }
        )
        .subscribe();

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
            // Re-fetch playlist whenever it alters
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
  }, [roomCode]);

  // 7. Update currently active playlist track reference when list loads
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

  // 8. Apply Remote Supabase changes with Drift Correction
  const handleIncomingRoomState = async (updatedRoom) => {
    setIsPlaying(updatedRoom.is_playing);

    // Track skips or initial track load
    if (updatedRoom.current_track_id !== currentTrackIdRef.current) {
      currentTrackIdRef.current = updatedRoom.current_track_id;
      // Find matching track
      const matchingTrack = playlist.find((t) => t.id === updatedRoom.current_track_id);
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
      if (widgetRef.current && widgetReady) {
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

  // 9. Fetch SoundCloud oEmbed metadata
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

  // 10. Load a track into the SoundCloud Widget element
  const loadSoundCloudTrack = (url, autoPlay, startProgressMs = 0) => {
    if (!widgetRef.current || !widgetReady) return;

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
        isSyncingRef.current = false;
      },
    });
  };

  // 11. Initialise SoundCloud Widget Ref
  const handleWidgetLoaded = () => {
    if (typeof window === "undefined" || !window.SC) return;
    const iframe = document.getElementById("soundcloud-player");
    if (!iframe) return;

    const widget = window.SC.Widget(iframe);
    widgetRef.current = widget;

    widget.bind(window.SC.Widget.Events.READY, () => {
      setWidgetReady(true);
      
      // Sync initial metadata duration
      widget.getDuration((d) => setDurationMs(d));

      // Trigger automatic track end skipping
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        handleTrackFinished();
      });

      // Update duration on play events
      widget.bind(window.SC.Widget.Events.PLAY, () => {
        widget.getDuration((d) => setDurationMs(d));
      });
    });
  };

  // Trigger loading when iframe renders if window.SC already exists
  useEffect(() => {
    if (roomCode && typeof window !== "undefined" && window.SC && !widgetReady) {
      handleWidgetLoaded();
    }
  }, [roomCode, widgetReady]);

  // 12. Audio playback polling for responsive scroll progress bar
  useEffect(() => {
    let timer;
    if (isPlaying && widgetRef.current && widgetReady) {
      timer = setInterval(() => {
        widgetRef.current.getPosition((pos) => {
          setProgressMs(pos);
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, widgetReady]);

  // 13. Synchronize player actions to Supabase
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

  // 14. Controls Click Handlers
  const handlePlayPauseToggle = async () => {
    if (!currentTrack) {
      // Play first track in playlist if idle
      if (playlist.length > 0) {
        await playTrack(playlist[0]);
      }
      return;
    }

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (widgetRef.current && widgetReady) {
      if (nextPlaying) {
        widgetRef.current.play();
      } else {
        widgetRef.current.pause();
      }

      widgetRef.current.getPosition(async (pos) => {
        setProgressMs(pos);
        await pushRoomState(nextPlaying, pos);
      });
    } else {
      await pushRoomState(nextPlaying, progressMs);
    }
  };

  const handleSeek = async (e) => {
    const seekMs = parseInt(e.target.value);
    setProgressMs(seekMs);

    if (widgetRef.current && widgetReady) {
      widgetRef.current.seekTo(seekMs);
      await pushRoomState(isPlaying, seekMs);
    }
  };

  const playTrack = async (track) => {
    currentTrackIdRef.current = track.id;
    setCurrentTrack(track);
    setProgressMs(0);
    setIsPlaying(true);

    if (widgetRef.current && widgetReady) {
      loadSoundCloudTrack(track.track_url, true, 0);
    }

    // Update in Supabase Database
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
    if (playlist.length <= 1) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrackIdRef.current);
    let nextIndex = 0;
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      nextIndex = currentIndex + 1;
    }
    await playTrack(playlist[nextIndex]);
  };

  const handleSkipPrev = async () => {
    if (playlist.length <= 1) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrackIdRef.current);
    let prevIndex = playlist.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    await playTrack(playlist[prevIndex]);
  };

  const handleTrackFinished = () => {
    // Automatically skip to the next track on finish
    handleSkipNext();
  };

  // 15. Queue modifiers
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
    
    const { error } = await supabase
      .from("playlist")
      .delete()
      .eq("id", trackId);

    if (error) {
      console.error(error);
    } else {
      if (trackId === currentTrackIdRef.current) {
        handleSkipNext();
      }
    }
  };

  // 16. Utility navigation & share handlers
  const handleJoinOrCreateRoomSubmit = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    router.push(`/?room=${roomCodeInput.toUpperCase().trim()}`);
  };

  const handleCreateRoomAction = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    router.push(`/?room=XYI-${code}`);
  };

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatTime = (ms) => {
    if (isNaN(ms) || ms < 0) return "0:00";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 17. Landing Screen UI
  if (!roomCode) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 select-none">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          {/* Logo Heading */}
          <h1 className="text-8xl font-black tracking-tighter text-[#ff5500] mb-2 cursor-default select-none animate-pulse">
            xyi
          </h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest font-light mb-12">
            Синхронное прослушивание музыки
          </p>

          {/* Central Glassmorphic Action Card */}
          <div className="w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
            <form onSubmit={handleJoinOrCreateRoomSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col text-left gap-1.5">
                <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider pl-1">
                  Код комнаты
                </label>
                <input
                  type="text"
                  placeholder="НАПРИМЕР: XYI-7382"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-4 text-white text-center text-lg font-bold tracking-widest focus:outline-none focus:border-[#ff5500] transition-colors uppercase placeholder:text-zinc-600"
                  maxLength={12}
                />
              </div>
              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="w-full py-4 bg-white text-black font-bold text-sm uppercase tracking-widest rounded-2xl transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                Войти в комнату
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-zinc-600 text-xs uppercase tracking-widest">или</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <button
              onClick={handleCreateRoomAction}
              className="w-full py-4 bg-zinc-950 border border-white/10 hover:border-[#ff5500]/50 hover:bg-[#ff5500]/5 text-white font-bold text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-shadow"
            >
              Создать комнату
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 18. Loading Screen inside Room
  if (loading) {
    return <PageLoading />;
  }

  // 19. Room Dashboard UI
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 pb-36 relative select-none w-full max-w-md mx-auto">
      {/* Script for SoundCloud Widget iframe API */}
      <Script
        src="https://w.soundcloud.com/player/api.js"
        strategy="afterInteractive"
        onLoad={handleWidgetLoaded}
      />

      {/* 20. Room Top Header */}
      <header className="w-full flex items-center justify-between mb-8 px-2">
        <div className="flex flex-col">
          <h2
            onClick={() => router.push("/")}
            className="text-4xl font-black tracking-tighter text-[#ff5500] cursor-pointer hover:opacity-85 select-none"
          >
            xyi
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
              Синхронизация
            </span>
          </div>
        </div>

        {/* Room Code Display with Quick Copy */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-[#ff5500]/40 rounded-full transition-colors cursor-pointer"
        >
          <span className="text-xs font-bold text-zinc-300 tracking-wider">
            {roomCode.toUpperCase()}
          </span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#ff5500]" />
          )}
        </button>
      </header>

      {/* 21. SoundCloud Player Container */}
      <section className="w-full mb-6">
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 room-active-glow transition-all">
          <iframe
            id="soundcloud-player"
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(
              currentTrack ? currentTrack.track_url : "https://api.soundcloud.com/tracks/184131013"
            )}&auto_play=false&visual=true&show_artwork=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false`}
            className="rounded-2xl border border-white/5 bg-zinc-950 overflow-hidden shadow-2xl h-[166px]"
          ></iframe>
        </div>
      </section>

      {/* 22. Add Track Input Form */}
      <section className="w-full mb-6">
        <form onSubmit={handleAddTrack} className="w-full flex gap-2">
          <input
            type="text"
            placeholder="Вставьте SoundCloud ссылку на трек..."
            value={newTrackUrl}
            onChange={(e) => setNewTrackUrl(e.target.value)}
            disabled={addingTrack}
            className="flex-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#ff5500] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newTrackUrl.trim() || addingTrack}
            className="p-3.5 bg-white text-black hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-2xl transition-all flex items-center justify-center cursor-pointer"
          >
            {addingTrack ? (
              <div className="w-4 h-4 rounded-full border-2 border-black border-r-transparent animate-spin"></div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </form>
      </section>

      {/* 23. Playlist Queue Section */}
      <section className="w-full flex-1 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 px-1">
          <List className="w-4 h-4 text-[#ff5500]" />
          <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400">
            Очередь воспроизведения ({playlist.length})
          </h3>
        </div>

        {playlist.length === 0 ? (
          <div className="w-full py-16 bg-zinc-900/20 backdrop-blur-md border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Music className="w-8 h-8 text-zinc-700 animate-bounce" />
            <p className="text-zinc-500 text-sm font-medium">Очередь пуста</p>
            <p className="text-zinc-600 text-xs max-w-[240px]">
              Вставьте ссылку на трек SoundCloud выше, чтобы начать синхронное прослушивание
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {playlist.map((track, idx) => {
              const isCurrent = currentTrack && currentTrack.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`w-full p-3 bg-zinc-900/30 hover:bg-zinc-900/70 border rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all ${
                    isCurrent
                      ? "border-[#ff5500]/40 bg-zinc-900/50 shadow-md shadow-[#ff5500]/5"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  {/* Track Thumbnail */}
                  <div className="relative w-11 h-11 rounded-xl bg-zinc-950 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-4 h-4 text-zinc-500" />
                    )}
                    {isCurrent && isPlaying && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-3 w-4">
                          <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }}></span>
                          <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }}></span>
                          <span className="w-0.5 bg-[#ff5500] rounded-full animate-bounce h-1" style={{ animationDelay: '0.5s' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0 flex flex-col text-left">
                    <p
                      className={`text-xs font-bold truncate ${
                        isCurrent ? "text-white" : "text-zinc-300"
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wide truncate">
                      Трек #{idx + 1}
                    </p>
                  </div>

                  {/* Play Action / Delete */}
                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#ff5500] bg-[#ff5500]/10 px-2 py-1 rounded-md border border-[#ff5500]/20 animate-pulse">
                        В эфире
                      </span>
                    ) : (
                      <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <Play className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      className="p-2 hover:bg-red-500/10 rounded-xl transition-colors group"
                      title="Удалить из очереди"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-600 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 24. BOTTOM FLOATING CONTROL DOCK (iOS Style) */}
      <footer className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 w-full">
        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 flex flex-col gap-3 shadow-2xl relative select-none">
          {/* Progress Slider (Seek bar) */}
          <div className="w-full flex items-center gap-2.5">
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
              className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff5500] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-[9px] font-mono text-zinc-500 min-w-[28px]">
              {formatTime(durationMs)}
            </span>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between w-full">
            {/* Playing Metadata (Left) */}
            <div className="flex items-center gap-3 w-1/3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                {currentTrack && currentTrack.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt=""
                    className={`w-full h-full object-cover ${
                      isPlaying ? "animate-spin [animation-duration:10s]" : ""
                    }`}
                  />
                ) : (
                  <Music className="w-4 h-4 text-zinc-600" />
                )}
              </div>
              <div className="flex flex-col text-left min-w-0 leading-tight">
                <span className="text-[10px] font-bold text-white truncate max-w-[110px]">
                  {currentTrack ? currentTrack.title : "Ничего не играет"}
                </span>
                <span className="text-[9px] text-[#ff5500] font-bold tracking-widest uppercase mt-0.5">
                  {isPlaying ? "Радиовещание" : "Пауза"}
                </span>
              </div>
            </div>

            {/* Skip / Play Center Buttons */}
            <div className="flex items-center gap-4 justify-center w-1/3">
              <button
                onClick={handleSkipPrev}
                disabled={playlist.length <= 1}
                className="p-2.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              >
                <SkipBack className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={handlePlayPauseToggle}
                className="w-11 h-11 bg-[#ff5500] hover:bg-[#ff661a] hover:shadow-lg hover:shadow-[#ff5500]/20 active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                )}
              </button>

              <button
                onClick={handleSkipNext}
                disabled={playlist.length <= 1}
                className="p-2.5 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              >
                <SkipForward className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Room Copy / Invite Action (Right) */}
            <div className="flex justify-end w-1/3">
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white/5 hover:bg-[#ff5500]/10 border border-white/5 hover:border-[#ff5500]/30 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-[#ff5500] rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Ссылка</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// 22. Wrap in Suspense boundary to prevent build-time deoptimization for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SyncPlayerApp />
    </Suspense>
  );
}
