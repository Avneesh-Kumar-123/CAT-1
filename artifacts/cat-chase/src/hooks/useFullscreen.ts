import { useState, useEffect, useCallback, type RefObject } from "react";

type AnyDoc = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
};

type AnyEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

export function isFullscreenSupported(): boolean {
  const doc = document as AnyDoc;
  return !!(
    document.fullscreenEnabled ??
    doc.webkitFullscreenEnabled ??
    doc.mozFullScreenEnabled
  );
}

export function useFullscreen(ref?: { readonly current: HTMLElement | null }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const doc = document as AnyDoc;
      const el =
        document.fullscreenElement ??
        doc.webkitFullscreenElement ??
        doc.mozFullScreenElement ??
        null;
      setIsFullscreen(!!el);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange", onChange);
    document.addEventListener("MSFullscreenChange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange", onChange);
      document.removeEventListener("MSFullscreenChange", onChange);
    };
  }, []);

  const enter = useCallback(() => {
    const el = (ref?.current ?? document.documentElement) as AnyEl | null;
    if (!el) return;
    const req =
      el.requestFullscreen ??
      el.webkitRequestFullscreen ??
      el.mozRequestFullScreen ??
      el.msRequestFullscreen;
    req?.call(el)?.catch(() => {});
  }, [ref]);

  const exit = useCallback(() => {
    const doc = document as AnyDoc;
    const ex =
      document.exitFullscreen ??
      doc.webkitExitFullscreen ??
      doc.mozCancelFullScreen ??
      doc.msExitFullscreen;
    ex?.call(document)?.catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) exit();
    else enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, toggle, enter, exit };
}
