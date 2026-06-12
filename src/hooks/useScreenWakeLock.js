import { useCallback, useEffect, useRef, useState } from "react";

const isScreenWakeLockSupported = () =>
  typeof navigator !== "undefined" &&
  "wakeLock" in navigator &&
  typeof navigator.wakeLock?.request === "function";

export function useScreenWakeLock({ onError, onUnsupported } = {}) {
  const wakeLockRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isSupported, setIsSupported] = useState(isScreenWakeLockSupported);

  const clearWakeLockState = useCallback((wakeLock) => {
    if (!wakeLock || wakeLockRef.current === wakeLock) {
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const wakeLock = wakeLockRef.current;
    clearWakeLockState(wakeLock);

    if (!wakeLock) return;

    try {
      await wakeLock.release();
    } catch {
      // Browser may already release the sentinel during tab visibility changes.
    }
  }, [clearWakeLockState]);

  const requestWakeLock = useCallback(async () => {
    if (!isScreenWakeLockSupported()) {
      setIsSupported(false);
      onUnsupported?.();
      return;
    }

    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    try {
      setIsPending(true);
      const wakeLock = await navigator.wakeLock.request("screen");

      wakeLockRef.current = wakeLock;
      setIsSupported(true);
      setIsActive(true);

      wakeLock.addEventListener("release", () => {
        clearWakeLockState(wakeLock);
      });
    } catch (error) {
      clearWakeLockState(wakeLockRef.current);
      onError?.(error);
    } finally {
      setIsPending(false);
    }
  }, [clearWakeLockState, onError, onUnsupported]);

  const toggleWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();
  }, [releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearWakeLockState(wakeLockRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearWakeLockState]);

  useEffect(() => {
    return () => {
      const wakeLock = wakeLockRef.current;
      wakeLockRef.current = null;
      wakeLock?.release?.().catch(() => {});
    };
  }, []);

  return {
    isActive,
    isPending,
    isSupported,
    releaseWakeLock,
    requestWakeLock,
    toggleWakeLock,
  };
}
