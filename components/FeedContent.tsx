"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Images, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";

const iconStroke = "var(--icon-stroke)";
const iconSize = 20.508;
const iconStrokeWidth = 2.93;

function IconDislike({ active = true }: { active?: boolean }) {
  return (
    <img
      src="/img/cross.svg"
      alt="Dislike"
      className={active ? "opacity-100" : "opacity-30"}
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        display: "block",
      }}
    />
  );
}

function IconLike({ active = true }: { active?: boolean }) {
  return (
    <img
      src="/img/check.svg"
      alt="Like"
      className={active ? "opacity-100" : "opacity-30"}
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        display: "block",
      }}
    />
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
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Свечение сзади — размытая фотография */}
      {imgSize && (
        <div
          className="absolute"
          style={{
            width: `${imgSize.w}px`,
            height: `${imgSize.h}px`,
            maxWidth: "calc(100% - 64px)",
            maxHeight: "calc(100% - 64px)",
            borderRadius: `${radius}px`,
            overflow: "hidden",
            clipPath: `inset(0 round ${radius}px)`,
            WebkitClipPath: `inset(0 round ${radius}px)`,
            filter: "blur(40px)",
            opacity: 0.3,
            transform: "scale(1.1)",
            zIndex: 0,
          }}
          aria-hidden
        >
          <img
            src={refItem.url}
            alt=""
            className="block"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}
      {/* Фото в оригинальном размере */}
      <div
        className="relative z-10"
        style={{
          width: imgSize ? `${imgSize.w}px` : "auto",
          height: imgSize ? `${imgSize.h}px` : "auto",
          maxWidth: "calc(100% - 64px)",
          maxHeight: "calc(100% - 64px)",
          borderRadius: `${radius}px`,
          overflow: "hidden",
          clipPath: `inset(0 round ${radius}px)`,
          WebkitClipPath: `inset(0 round ${radius}px)`,
        }}
      >
        <img
          src={refItem.url}
          alt={refItem.title}
          className="block"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            borderRadius: `${radius}px`,
            clipPath: `inset(0 round ${radius}px)`,
            WebkitClipPath: `inset(0 round ${radius}px)`,
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
        />
      </div>
    </div>
  );
}

interface CircleActionProps {
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  /** При нажатии: убрать обводку, залить фон (green/red), иконка белая */
  pressed?: boolean;
  variant?: "like" | "dislike";
}

function CircleAction({ icon, onClick, disabled, pressed, variant }: CircleActionProps) {
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
        pointerEvents: "none",
      }}
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
          pointerEvents: "none",
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
  const [nameInputValue, setNameInputValue] = useState("");
  const [nameInputFocused, setNameInputFocused] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setHasCheckedNameStorage(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const startTime = Date.now();
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
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, 1000 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
        setRefs(initialRefs);
        setLoading(false);
        return;
      }

      try {
        // Запускаем загрузку и таймер параллельно
        const fetchPromise = fetch(`/api/r/${token}`);
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1000));
        
        // Ждем минимум 1 секунду
        await Promise.all([fetchPromise, timeoutPromise]);
        
        const res = await fetchPromise;

        if (!res.ok) {
          if (res.status === 404) throw new Error("Project not found");
          if (res.status === 410) throw new Error("Link expired");
          throw new Error("Failed to load project");
        }

        const data = await res.json();
        const list = Array.isArray(data.images) ? data.images : [];
        if (list.length > 0) {
          setRefs(
            list.map((img: any, i: number) => ({
              id: img.id,
              title: img.title || `Reference #${i + 1}`,
              subtitle: "Swipe to rate",
              url: img.filePath || img.url || "",
            }))
          );
          setLoading(false);
          return;
        }
        // В проекте нет фото — подставляем тестовые из imgs
        try {
          const testRes = await fetch("/api/test-images");
          const testData = testRes.ok ? await testRes.json() : null;
          const testList = Array.isArray(testData?.images) ? testData.images : [];
          if (testList.length > 0) {
            setRefs(
              testList.map((img: any) => ({
                id: img.id,
                title: img.title || "Reference",
                subtitle: "Swipe to rate",
                url: img.url || "",
              }))
            );
          } else {
            setRefs([]);
          }
        } catch {
          setRefs([]);
        }
        setLoading(false);
      } catch (err) {
        setRefs([]);
        setLoadError(err instanceof Error ? err.message : "Load error");
        setLoading(false);
      }
    };

    loadData();
  }, [token, initialRefs]);

  const remaining = Math.max(0, refs.length - index);
  const progress = Math.min(refs.length, index);

  const current = refs[index] ?? null;

  const likedList = useMemo(() => {
    const s = likedIds;
    return refs.filter((r) => s.has(r.id));
  }, [likedIds, refs]);

  const [lastAction, setLastAction] = useState<"like" | "dislike" | null>(null);
  const [pressedButton, setPressedButton] = useState<"like" | "dislike" | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const pressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitActionRef = useRef<Map<string, "like" | "dislike">>(new Map());

  function commit(action: "like" | "dislike") {
    if (!current) return;
    // Сохраняем действие для этой карточки перед изменением индекса
    exitActionRef.current.set(current.id, action);
    setLastAction(action);
    setPressedButton(action);
    if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
    pressTimeoutRef.current = setTimeout(() => setPressedButton(null), 900);
    setHistory((h) => [...h, { id: current.id, action }]);

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
          userName: userName || null,
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
    const SWIPE_THRESHOLD = 60;
    const handleWheel = (e: WheelEvent) => {
      if (!current) return;
      const { deltaX, deltaY } = e;
      // Для trackpad учитываем и горизонтальный, и вертикальный скролл
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      if (!isHorizontal && Math.abs(deltaX) < 5) return;
      e.preventDefault();
      if (wheelResetRef.current) {
        clearTimeout(wheelResetRef.current);
        wheelResetRef.current = null;
      }
      wheelAccumRef.current += deltaX;
      // Визуальная обратная связь во время свайпа
      const progress = Math.min(1, Math.abs(wheelAccumRef.current) / SWIPE_THRESHOLD);
      setDragOffset(wheelAccumRef.current * 0.5);
      if (wheelAccumRef.current > SWIPE_THRESHOLD) {
        wheelAccumRef.current = 0;
        setDragOffset(0);
        commit("like");
      } else if (wheelAccumRef.current < -SWIPE_THRESHOLD) {
        wheelAccumRef.current = 0;
        setDragOffset(0);
        commit("dislike");
      }
      wheelResetRef.current = setTimeout(() => {
        wheelAccumRef.current = 0;
        setDragOffset(0);
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
    setIsDragging(true);
    setDragOffset(0);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!current || !isDragging || dragStartXRef.current == null || e.pointerType === "touch") return;
    const delta = e.clientX - dragStartXRef.current;
    setDragOffset(delta);
    // Визуальная обратная связь - наклон фото во время drag
    if (Math.abs(delta) > 10) {
      setHoveredAction(delta > 0 ? "like" : "dislike");
    } else {
      setHoveredAction(null);
    }
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!current || dragStartXRef.current == null || e.button !== 0 || e.pointerType === "touch") return;
    const delta = e.clientX - dragStartXRef.current;
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setHoveredAction(null);
    if (delta > SWIPE_THRESHOLD) commit("like");
    else if (delta < -SWIPE_THRESHOLD) commit("dislike");
  };
  const handlePointerCancel = () => {
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setHoveredAction(null);
  };

  if (loading) {
    return <Loader />;
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
    return <Loader />;
  }

  const showNameScreen = !userName.trim();

  if (showNameScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(64px)",
          WebkitBackdropFilter: "blur(64px)",
        }}
      >
        <motion.div
          className="flex flex-col"
          style={{ gap: 24 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div
            className="text-white"
            style={{
              fontSize: "28px",
              fontWeight: 400,
              lineHeight: "34px",
              height: "34px",
            }}
          >
            Type your name:
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = nameInputValue.trim();
              if (!trimmed) return;
              localStorage.setItem(`userName_${token}`, trimmed);
              setUserName(trimmed);
            }}
            className="flex items-center"
            style={{
              width: "430px",
              height: "70px",
              border: `1px solid rgba(255, 255, 255, ${nameInputValue.trim() || nameInputFocused ? 1 : 0.3})`,
              borderRadius: "16px",
              gap: 10,
              padding: "8px",
              transition: "border-color 0.3s ease",
            }}
          >
            <input
              type="text"
              autoFocus
              value={nameInputValue}
              onChange={(e) => setNameInputValue(e.target.value)}
              onFocus={() => setNameInputFocused(true)}
              onBlur={() => setNameInputFocused(false)}
              placeholder="Sean"
              maxLength={100}
              className="flex-1 bg-transparent placeholder:text-white/30 focus:outline-none"
              style={{
                paddingLeft: "16px",
                fontSize: "19px",
                lineHeight: "23px",
                height: "23px",
                color: nameInputValue.trim() ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.3)",
                transition: "color 0.3s ease",
              }}
            />
            <button
              type="submit"
              disabled={!nameInputValue.trim()}
              className="flex items-center justify-center disabled:cursor-not-allowed"
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "12px",
                flexShrink: 0,
                background: nameInputValue.trim() ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.1)",
                transition: "background-color 0.3s ease",
              }}
            >
              <ArrowRight
                size={16}
                strokeWidth={2}
                style={{
                  color: nameInputValue.trim() ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 0.2)",
                  transition: "color 0.3s ease",
                }}
              />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Размытые белые фигуры на фоне */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>
      <AnimatePresence mode="wait">
        {mode === "gallery" ? (
          <motion.div
            key="gallery"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div className="flex-1 overflow-auto px-4 py-4 min-h-0">
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
            {/* Меню скрыто
            <footer className="flex shrink-0 items-center justify-center pt-1 pb-8 px-[var(--photo-inset)]" style={{ height: "var(--footer-height)", minHeight: "var(--footer-height)", display: "flex", paddingBottom: 32 }}>
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
            </footer>
            */}
          </motion.div>
        ) : (
          <motion.div
            key="feed"
            className="relative flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div
              className="relative flex-1 min-h-0"
              style={{ marginBottom: 0 }}
            >
              <div
                ref={photoAreaRef}
                className="absolute inset-0 z-10 box-border"
                style={{
                  padding: "32px",
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                {/* <span className="absolute left-0 right-0 top-2 z-20 text-center text-xl font-medium text-white/70" aria-hidden>
                  {progress} / {refs.length}
                </span> */}
                <div
                  className="h-full w-full relative"
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      transformOrigin: "center center",
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      willChange: "transform",
                    }}
                    animate={{
                      x: isDragging ? dragOffset : hoveredAction === "dislike" ? -56 : hoveredAction === "like" ? 56 : 0,
                      rotate: isDragging
                        ? dragOffset * 0.03
                        : hoveredAction === "dislike"
                          ? -1.5
                          : hoveredAction === "like"
                            ? 1.5
                            : 0,
                    }}
                    transition={{
                      duration: isDragging ? 0 : 0.75,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div
                      className="relative h-full w-full"
                      style={{ transformOrigin: "center center" }}
                    >
                      <AnimatePresence mode="wait">
                    {current ? (
                      <motion.div
                        key={current.id}
                        className="absolute inset-0 z-10 flex items-center justify-center"
                        style={{
                          transformStyle: "preserve-3d",
                          backfaceVisibility: "hidden",
                          willChange: "transform",
                        }}
                        initial={{ opacity: 0.65, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={() => {
                          const action = exitActionRef.current.get(current.id) || null;
                          return {
                            x: action === "like" ? 800 : action === "dislike" ? -800 : 0,
                            y: -200,
                            rotate: action === "like" ? 25 : action === "dislike" ? -25 : 0,
                            opacity: 0,
                            scale: 0.8,
                            transition: { duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] },
                          };
                        }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onAnimationComplete={() => {
                          // Очищаем действие после завершения анимации
                          if (current) {
                            exitActionRef.current.delete(current.id);
                          }
                        }}
                      >
                        <PhotoCard refItem={current} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="done"
                        className="flex h-full w-full flex-col items-center justify-center p-8"
                        style={{ textAlign: "center" }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                          <Heart className="h-7 w-7 text-white/80" />
                        </div>
                        <div className="text-lg font-semibold text-white" style={{ textAlign: "center", width: "100%" }}>
                          All done
                        </div>
                        <div className="mt-2 text-sm text-white/60" style={{ textAlign: "center", width: "100%" }}>
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
                    onClick={() => commit("dislike")}
                    onMouseEnter={() => setHoveredAction("dislike")}
                    onMouseLeave={() => setHoveredAction(null)}
                    aria-label="Dislike"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 z-10 h-full cursor-pointer"
                    style={{ touchAction: "manipulation", width: "var(--zone-width)" }}
                    onClick={() => commit("like")}
                    onMouseEnter={() => setHoveredAction("like")}
                    onMouseLeave={() => setHoveredAction(null)}
                    aria-label="Like"
                  />
                </>
              )}

              <div
                className="absolute left-0 right-0 z-0 flex items-center justify-between px-4 pointer-events-none"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                <CircleAction
                  icon={<IconDislike active={!!current || pressedButton === "dislike" || hoveredAction === "dislike"} />}
                  onClick={() => commit("dislike")}
                  disabled={!current}
                  pressed={pressedButton === "dislike" || hoveredAction === "dislike"}
                  variant="dislike"
                />
                <CircleAction
                  icon={
                    <IconLike active={!!current || pressedButton === "like" || hoveredAction === "like"} />
                  }
                  onClick={() => commit("like")}
                  disabled={!current}
                  pressed={pressedButton === "like" || hoveredAction === "like"}
                  variant="like"
                />
              </div>
            </div>
            {/* Свечение снизу — мягкий градиент */}
            <div
              className="pointer-events-none fixed left-0 right-0 bottom-0 z-0"
              style={{
                height: "120px",
                background: "linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.3) 40%, transparent)",
              }}
              aria-hidden
            />
            {/* Меню скрыто
            <footer className="flex shrink-0 items-center justify-center pt-1 pb-8 px-[var(--photo-inset)]" style={{ height: "var(--footer-height)", minHeight: "var(--footer-height)", paddingBottom: 32 }}>
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
            </footer>
            */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}