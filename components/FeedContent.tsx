"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Images, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const iconStroke = "var(--icon-stroke)";
const iconSize = 20.508;
const iconStrokeWidth = 2.93;

function IconDislike({ active = true }: { active?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-white" : "text-white opacity-30"}
    >
      <path
        d="M1.46484 21.9727L21.9727 1.46485M1.46484 1.46484L21.9727 21.9727"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface RefItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}


function PhotoCard({ refItem }: { refItem: RefItem }) {
  const radius = 16;
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl" style={{ borderRadius: radius }}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <img
          src={refItem.url}
          alt=""
          className="h-full w-full object-contain opacity-30 rounded-2xl"
          style={{
            borderRadius: radius,
            filter: "blur(50px)",
            transform: "scale(1.08)",
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl" style={{ borderRadius: radius }}>
        <img
          src={refItem.url}
          alt={refItem.title}
          className="h-full w-full object-contain rounded-2xl"
          style={{ borderRadius: radius }}
        />
      </div>
    </div>
  );
}

interface CircleActionProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** При нажатии: убрать обводку, залить фон (green/red), иконка белая */
  pressed?: boolean;
  variant?: "like" | "dislike";
}

function CircleAction({ icon, onClick, disabled, onMouseEnter, onMouseLeave, pressed, variant }: CircleActionProps) {
  const isFilled = pressed && variant;
  const bgColor = variant === "like" ? "rgb(34, 197, 94)" : variant === "dislike" ? "rgb(239, 68, 68)" : "var(--circle-fill)";

  return (
    <motion.div
      className="shrink-0 rounded-full backdrop-blur-[var(--menu-blur)]"
      style={{
        width: "var(--circle-size)",
        height: "var(--circle-size)",
        padding: isFilled ? 0 : "var(--menu-stroke-width)",
        background: isFilled ? "transparent" : "var(--circle-stroke-gradient)",
        borderRadius: "var(--circle-radius)",
        boxShadow: "var(--circle-shadow)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="ghost"
        className="h-full w-full rounded-full p-0"
        style={{
          background: isFilled ? bgColor : "var(--circle-fill)",
          borderRadius: isFilled ? "var(--circle-radius)" : "calc(var(--circle-radius) - 1px)",
        }}
      >
        {icon}
      </Button>
    </motion.div>
  );
}

export function FeedContent({
  token,
  initialRefs,
}: {
  token: string;
  initialRefs?: RefItem[];
}) {
  const [mode, setMode] = useState<"feed" | "gallery">("feed");
  const [index, setIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<{ id: string; action: string }[]>([]);
  const [refs, setRefs] = useState<RefItem[]>(initialRefs ?? []);
  const [loading, setLoading] = useState(!initialRefs || initialRefs.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [hasCheckedNameStorage, setHasCheckedNameStorage] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setHasCheckedNameStorage(true);
  }, []);

  useEffect(() => {
    setLoadError(null);
    let storedClientId = localStorage.getItem(`clientId_${token}`);
    let storedSessionId = localStorage.getItem(`sessionId_${token}`);

    if (!storedClientId) {
      storedClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`clientId_${token}`, storedClientId);
    }
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      localStorage.setItem(`sessionId_${token}`, storedSessionId);
    }
    setClientId(storedClientId);

    if (initialRefs != null && initialRefs.length > 0) {
      setRefs(initialRefs);
      setLoading(false);
      return;
    }

    fetch(`/api/r/${token}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Project not found");
          if (res.status === 410) throw new Error("Link expired");
          throw new Error("Failed to load project");
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data.images) ? data.images : [];
        setRefs(
          list.map((img: any, i: number) => ({
            id: img.id,
            title: img.title || `Reference #${i + 1}`,
            subtitle: "Swipe to rate",
            url: img.filePath || img.url || "",
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        setRefs([]);
        setLoadError(err instanceof Error ? err.message : "Load error");
        setLoading(false);
      });
  }, [token, initialRefs]);

  const remaining = Math.max(0, refs.length - index);
  const progress = Math.min(refs.length, index);

  const current = refs[index] ?? null;
  const next = refs[index + 1] ?? null;

  const likedList = useMemo(() => {
    const s = likedIds;
    return refs.filter((r) => s.has(r.id));
  }, [likedIds, refs]);

  const [lastAction, setLastAction] = useState<"like" | "dislike" | null>(null);
  const [pressedButton, setPressedButton] = useState<"like" | "dislike" | null>(null);
  const [showNextPreview, setShowNextPreview] = useState(false);
  const pressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(action: "like" | "dislike") {
    if (!current) return;
    setLastAction(action);
    setPressedButton(action);
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = setTimeout(() => setPressedButton(null), 900);
    setHistory((h) => [...h, { id: current.id, action }]);
    if (action === "like") setShowNextPreview(true);

    if (action === "like") {
      setLikedIds((prev) => {
        const n = new Set(prev);
        n.add(current.id);
        return n;
      });
    } else {
      setLikedIds((prev) => {
        const n = new Set(prev);
        n.delete(current.id);
        return n;
      });
    }

    // Send event to API
    if (clientId) {
      const sessionId = localStorage.getItem(`sessionId_${token}`) || `session_${Date.now()}`;
      fetch(`/api/r/${token}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: current.id,
          decision: action,
          orderIndex: index,
          clientId: clientId,
          sessionId: sessionId,
        }),
      }).catch(console.error);
    }

    setIndex((v) => Math.min(refs.length, v + 1));
  }

  function undo() {
    setLastAction(null);
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      const rest = h.slice(0, -1);

      setIndex((v) => Math.max(0, v - 1));

      setLikedIds((prev) => {
        const n = new Set(prev);
        if (last.action === "like") n.delete(last.id);
        return n;
      });

      return rest;
    });
  }

  const canUndo = history.length > 0 && index > 0;
  const [hoveredAction, setHoveredAction] = useState<"dislike" | "like" | "undo" | null>(null);

  const photoAreaRef = useRef<HTMLDivElement>(null);
  const wheelAccumRef = useRef(0);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const el = photoAreaRef.current;
    if (!el) return;
    const SWIPE_THRESHOLD = 80;
    const handleWheel = (e: WheelEvent) => {
      if (!current) return;
      const { deltaX, deltaY } = e;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      e.preventDefault();
      if (wheelResetRef.current) {
        clearTimeout(wheelResetRef.current);
        wheelResetRef.current = null;
      }
      wheelAccumRef.current += deltaX;
      if (wheelAccumRef.current > SWIPE_THRESHOLD) {
        wheelAccumRef.current = 0;
        commit("like");
      } else if (wheelAccumRef.current < -SWIPE_THRESHOLD) {
        wheelAccumRef.current = 0;
        commit("dislike");
      }
      wheelResetRef.current = setTimeout(() => {
        wheelAccumRef.current = 0;
        wheelResetRef.current = null;
      }, 200);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
    };
  }, [current, index, refs.length, clientId, token]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!current || touchStartXRef.current == null || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (delta > 80) commit("like");
    else if (delta < -80) commit("dislike");
  };

  const SWIPE_THRESHOLD = 80;
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!current || e.button !== 0 || e.pointerType === "touch") return;
    dragStartXRef.current = e.clientX;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!current || dragStartXRef.current == null || e.button !== 0 || e.pointerType === "touch") return;
    const delta = e.clientX - dragStartXRef.current;
    dragStartXRef.current = null;
    if (delta > SWIPE_THRESHOLD) commit("like");
    else if (delta < -SWIPE_THRESHOLD) commit("dislike");
  };
  const handlePointerCancel = () => {
    dragStartXRef.current = null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (loadError || refs.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center max-w-sm">
          {loadError ? (
            <>
              <div className="mb-2 text-lg font-semibold text-white">Failed to load project</div>
              <div className="text-sm text-white/70">{loadError}</div>
            </>
          ) : (
            <>
              <div className="mb-2 text-lg font-semibold text-white">No images</div>
              <div className="text-sm text-white/70">This project has no images to rate yet.</div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Не показывать ленту до проверки имени (клиент смонтирован) — иначе первый рендер покажет ленту вместо формы
  if (!hasCheckedNameStorage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-white/60">Загрузка…</div>
      </div>
    );
  }

  const showNameScreen = !userName.trim();

  if (showNameScreen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
        <motion.div
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="mb-2 text-xl font-semibold text-white">Enter your name</h2>
          <p className="mb-6 text-sm text-white/60">Before you start rating</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input") as HTMLInputElement;
              const trimmed = (input?.value ?? "").trim();
              if (!trimmed) return;
              localStorage.setItem(`userName_${token}`, trimmed);
              setUserName(trimmed);
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              autoFocus
              placeholder="Your name"
              maxLength={100}
              className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <Button
              type="submit"
              className="w-full rounded-xl bg-white text-black hover:bg-white/90"
            >
              Start
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <AnimatePresence mode="wait">
        {mode === "gallery" ? (
          <motion.div
            key="gallery"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <header className="flex shrink-0 items-center justify-center pt-1 pb-2 px-[var(--photo-inset)]" style={{ height: "var(--footer-height)", minHeight: "var(--footer-height)", display: "flex" }}>
              <div
                className="flex w-full max-w-[var(--menu-width)] items-center justify-between rounded-[123px]"
                style={{
                  width: "var(--menu-width)",
                  height: "var(--menu-height)",
                  padding: "var(--menu-stroke-width)",
                  background: "var(--menu-stroke-gradient)",
                  borderRadius: "var(--menu-radius)",
                  boxShadow: "var(--menu-shadow)",
                  gap: "var(--menu-gap)",
                }}
              >
                <div
                  className="flex h-full flex-1 items-center justify-between rounded-[123px] backdrop-blur-[var(--menu-blur)]"
                  style={{
                    background: "var(--menu-fill)",
                    borderRadius: "calc(var(--menu-radius) - var(--menu-stroke-width))",
                    padding: "var(--menu-padding)",
                    gap: "var(--menu-gap)",
                  }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <Button
                      variant="ghost"
                      className="h-full w-full shrink-0 rounded-full bg-[var(--menu-btn-fill)] transition-colors duration-300 hover:bg-white/15"
                      style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", minWidth: "var(--menu-btn-size)", minHeight: "var(--menu-btn-size)", borderRadius: "var(--menu-btn-radius)" }}
                      onClick={() => setMode("feed")}
                      title="Back"
                    >
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <div className="flex items-center justify-center rounded-full" style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", background: "var(--menu-btn-fill)", borderRadius: "var(--menu-btn-radius)" }}>
                      <Heart className="h-5 w-5 text-white" fill="currentColor" />
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <Button
                      variant="ghost"
                      className="h-full w-full shrink-0 rounded-full cursor-default bg-[var(--menu-btn-fill)]"
                      style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", minWidth: "var(--menu-btn-size)", minHeight: "var(--menu-btn-size)", borderRadius: "var(--menu-btn-radius)" }}
                      disabled
                      title="Gallery (you are here)"
                    >
                      <Images className="h-5 w-5 text-white opacity-30" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-auto px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    Liked gallery
                  </div>
                  <div className="text-xs text-white/60">
                    {likedList.length} saved
                  </div>
                </div>
              </div>

              <Card className="border-white/10 bg-white/5">
                <CardContent className="p-3">
                  {likedList.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-center">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                        <Heart className="h-5 w-5 text-white/70" />
                      </div>
                      <div className="text-sm font-semibold text-white">
                        No likes yet
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        Tap ❤️ to save references here.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {likedList
                        .slice()
                        .reverse()
                        .map((r) => (
                          <div
                            key={r.id}
                            className="group overflow-hidden rounded-xl border border-white/10 bg-black/20"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                              <img
                                src={r.url}
                                alt={r.title}
                                className="h-full w-full object-cover rounded-xl"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                              <div className="absolute bottom-2 left-2 right-2">
                                <div className="text-xs font-semibold text-white/95">
                                  {r.title}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            className="relative flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <header className="flex shrink-0 flex-col items-center justify-center pt-1 pb-2 px-[var(--photo-inset)]" style={{ height: "var(--footer-height)", minHeight: "var(--footer-height)" }}>
              <div
                className="flex w-full max-w-[var(--menu-width)] items-center justify-between rounded-[123px]"
                style={{
                  width: "var(--menu-width)",
                  height: "var(--menu-height)",
                  padding: "var(--menu-stroke-width)",
                  background: "var(--menu-stroke-gradient)",
                  borderRadius: "var(--menu-radius)",
                  boxShadow: "var(--menu-shadow)",
                  gap: "var(--menu-gap)",
                }}
              >
                <div
                  className="flex h-full flex-1 items-center justify-between rounded-[123px] backdrop-blur-[var(--menu-blur)]"
                  style={{
                    background: "var(--menu-fill)",
                    borderRadius: "calc(var(--menu-radius) - var(--menu-stroke-width))",
                    padding: "var(--menu-padding)",
                    gap: "var(--menu-gap)",
                  }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <Button
                      variant="ghost"
                      className="h-full w-full shrink-0 rounded-full bg-[var(--menu-btn-fill)] transition-colors duration-300 hover:bg-white/15 disabled:hover:bg-[var(--menu-btn-fill)]"
                      style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", minWidth: "var(--menu-btn-size)", minHeight: "var(--menu-btn-size)", borderRadius: "var(--menu-btn-radius)" }}
                      onClick={undo}
                      disabled={!canUndo}
                      title="Back (Undo)"
                    >
                      <ArrowLeft className={`h-5 w-5 ${canUndo ? "text-white" : "text-white opacity-30"}`} />
                    </Button>
                  </div>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", background: "var(--menu-btn-fill)", borderRadius: "var(--menu-btn-radius)" }}
                      title={`${progress} / ${refs.length}`}
                    >
                      <Heart className="h-5 w-5 text-white" fill="currentColor" />
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full"
                    style={{
                      padding: "var(--menu-stroke-width)",
                      background: "var(--menu-btn-stroke-gradient)",
                      borderRadius: "var(--menu-btn-radius)",
                    }}
                  >
                    <Button
                      variant="ghost"
                      className="h-full w-full shrink-0 rounded-full bg-[var(--menu-btn-fill)] transition-colors duration-300 hover:bg-white/15"
                      style={{ width: "var(--menu-btn-size)", height: "var(--menu-btn-size)", minWidth: "var(--menu-btn-size)", minHeight: "var(--menu-btn-size)", borderRadius: "var(--menu-btn-radius)" }}
                      onClick={() => setMode("gallery")}
                      title="Gallery"
                    >
                      <Images className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>
            <div
              className="relative flex-1 min-h-0"
              style={{ marginBottom: 0 }}
            >
              <div
                ref={photoAreaRef}
                className="absolute inset-0 z-10 box-border"
                style={{
                  padding: 32,
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                <span className="absolute left-0 right-0 top-2 z-20 text-center text-xl font-medium text-white/70" aria-hidden>
                  {progress} / {refs.length}
                </span>
                <div
                  className="h-full w-full overflow-hidden rounded-2xl bg-black/30"
                  style={{ borderRadius: 16 }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{ transformOrigin: "center center" }}
                    animate={{
                      x: hoveredAction === "dislike" ? -56 : hoveredAction === "like" ? 56 : 0,
                      rotate: hoveredAction === "dislike" ? -1.5 : hoveredAction === "like" ? 1.5 : 0,
                    }}
                    transition={{
                      duration: 0.75,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div
                      className="relative h-full w-full"
                      style={{ transformOrigin: "center center" }}
                    >
                      {/* Следующее фото сзади — появляется плавно из прозрачности после первого лайка */}
                      {next && (
                        <div
                          className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden rounded-2xl"
                          style={{ borderRadius: 16 }}
                          aria-hidden
                        >
                          <motion.div
                            className="h-full w-full rounded-2xl"
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 0.94, opacity: showNextPreview ? 0.6 : 0 }}
                            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ borderRadius: 16 }}
                          >
                            <PhotoCard refItem={next} />
                          </motion.div>
                        </div>
                      )}
                      <AnimatePresence mode="wait" custom={lastAction}>
                    {current ? (
                      <motion.div
                        key={current.id}
                        custom={lastAction}
                        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl"
                        style={{ borderRadius: 16 }}
                        initial={{ opacity: 0.65, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={((dir: "like" | "dislike" | null) => ({
                          x: dir === "like" ? 520 : dir === "dislike" ? -520 : 0,
                          y: -140,
                          rotate: dir === "like" ? 18 : -18,
                          opacity: 0,
                          transition: { duration: 0.75, ease: [0.32, 0.72, 0, 1] },
                        })) as any}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <PhotoCard refItem={current} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="done"
                        className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                          <Heart className="h-7 w-7 text-white/80" />
                        </div>
                        <div className="text-lg font-semibold text-white">
                          All done
                        </div>
                        <div className="mt-2 text-sm text-white/60">
                          You liked {likedList.length} out of {refs.length}{" "}
                          references.
                        </div>
                      </motion.div>
                    )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Красный градиент слева при наведении на Dislike — за фото */}
              <motion.div
                className="pointer-events-none fixed left-0 top-0 bottom-0 z-0 w-[280px]"
                style={{
                  background: "linear-gradient(to right, rgba(239, 68, 68, 0.35), transparent)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredAction === "dislike" ? 1 : 0 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Зелёный градиент справа при наведении на Like — за фото */}
              <motion.div
                className="pointer-events-none fixed right-0 top-0 bottom-0 z-0 w-[280px]"
                style={{
                  background: "linear-gradient(to left, rgba(34, 197, 94, 0.35), transparent)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredAction === "like" ? 1 : 0 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />

              {current && (
                <>
                  <button
                    type="button"
                    className="absolute left-0 top-0 z-10 h-full cursor-pointer"
                    style={{ touchAction: "manipulation", width: "var(--zone-width)" }}
                    onClick={() => commit("like")}
                    aria-label="Like"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 z-10 h-full cursor-pointer"
                    style={{ touchAction: "manipulation", width: "var(--zone-width)" }}
                    onClick={() => commit("dislike")}
                    aria-label="Dislike"
                  />
                </>
              )}

              <div
                className="absolute left-0 right-0 z-20 flex items-center justify-between px-4"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                <CircleAction
                  icon={<IconDislike active={!!current || pressedButton === "dislike"} />}
                  onClick={() => commit("dislike")}
                  disabled={!current}
                  onMouseEnter={() => setHoveredAction("dislike")}
                  onMouseLeave={() => setHoveredAction(null)}
                  pressed={pressedButton === "dislike"}
                  variant="dislike"
                />
                <CircleAction
                  icon={
                    <Heart
                      size={iconSize}
                      strokeWidth={iconStrokeWidth}
                      className={`shrink-0 ${current || pressedButton === "like" ? "text-white" : "text-white opacity-30"}`}
                    />
                  }
                  onClick={() => commit("like")}
                  disabled={!current}
                  onMouseEnter={() => setHoveredAction("like")}
                  onMouseLeave={() => setHoveredAction(null)}
                  pressed={pressedButton === "like"}
                  variant="like"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
