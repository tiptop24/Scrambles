import { ImageResponse } from "next/og";

// A dedicated, stable-URL icon route (rather than Next's icon.tsx convention)
// so manifest.ts has a predictable path to point at for Android's "Add to
// Home Screen" / PWA install icon.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#37003c",
          color: "#00ff85",
          fontSize: 120,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        S
      </div>
    ),
    { width: 192, height: 192 }
  );
}
