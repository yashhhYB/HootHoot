"use client";

/**
 * ProctorEngine
 * Handles: fullscreen enforcement, tab-switch detection, minimize detection.
 * Camera/face detection intentionally deferred (requires Rekognition backend).
 * Emits onWarning callback with reason and count.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import type { WarningReason } from "@/types/arena";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  sessionId: string;
  sessionType: "practice" | "test";
  maxWarnings: number;
  requireFullscreen?: boolean;
  enabled?: boolean;
  onWarning: (reason: WarningReason, count: number) => void;
  onTerminate: (reason: string) => void;
  children: React.ReactNode;
}

interface WarningToast {
  id: number;
  reason: WarningReason;
  count: number;
  message: string;
}

const REASON_MESSAGES: Record<WarningReason, string> = {
  tab_switch: "Tab switch detected",
  no_face: "No face detected in camera",
  multiple_faces: "Multiple faces detected",
  minimize: "Window minimized",
  fullscreen_exit: "Fullscreen mode exited",
};

export default function ProctorEngine({
  sessionId,
  sessionType,
  maxWarnings,
  requireFullscreen = true,
  enabled = true,
  onWarning,
  onTerminate,
  children,
}: Props) {
  const warningCount = useRef(0);
  const [toasts, setToasts] = useState<WarningToast[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((reason: WarningReason, count: number) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [
      ...prev.slice(-2), // keep last 3 max
      { id, reason, count, message: REASON_MESSAGES[reason] },
    ]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const triggerWarning = useCallback(
    (reason: WarningReason) => {
      if (!enabled) return;
      warningCount.current++;
      const count = warningCount.current;

      // Log to Aurora (fire-and-forget)
      fetch("/api/arena/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          sessionType,
          reason,
          warningNumber: count,
        }),
      }).catch(() => {});

      addToast(reason, count);
      onWarning(reason, count);

      if (count >= maxWarnings) {
        onTerminate(`Exceeded ${maxWarnings} warnings. Last violation: ${REASON_MESSAGES[reason]}`);
      }
    },
    [enabled, sessionId, sessionType, maxWarnings, onWarning, onTerminate, addToast]
  );

  // Tab switch / minimize detection via Page Visibility API
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning("tab_switch");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, triggerWarning]);

  // Fullscreen exit detection
  useEffect(() => {
    if (!enabled || !requireFullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerWarning("fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enabled, requireFullscreen, triggerWarning]);

  // Request fullscreen on mount
  useEffect(() => {
    if (!enabled || !requireFullscreen) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen request may fail silently in some browsers/environments
      });
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled, requireFullscreen]);

  return (
    <div className="relative">
      {children}

      {/* Warning toasts */}
      <div className="fixed top-20 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-lg border border-orange-500/40 bg-orange-950/90 backdrop-blur-sm px-4 py-3 shadow-xl animate-in slide-in-from-right duration-300"
          >
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-orange-300">
                Warning {toast.count}/{maxWarnings}
              </p>
              <p className="text-xs text-orange-200/80">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
