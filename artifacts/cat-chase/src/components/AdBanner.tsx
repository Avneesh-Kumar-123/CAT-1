import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// 👉 Replace this later with your real AdSense ID
export const ADSENSE_PUBLISHER_ID = "ca-pub-XXXXXXXXXXXXXXXX";

type Props = {
  slot: string;
  className?: string;
};

const isPlaceholderPublisher =
  ADSENSE_PUBLISHER_ID === "ca-pub-XXXXXXXXXXXXXXXX";

export const AdBanner = ({ slot, className }: Props) => {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (isPlaceholderPublisher) return;
    if (pushedRef.current) return;
    if (!insRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // ignore errors safely
    }
  }, []);

  // 👉 IMPORTANT: No placeholder UI (clean UI)
  if (isPlaceholderPublisher) {
    return null;
  }

  return (
    // ✅ FIXED HEIGHT prevents UI shifting
    <div
      className={"w-full flex justify-center my-4 " + (className ?? "")}
      style={{ minHeight: "120px" }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "728px",
          minHeight: "100px",
        }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};