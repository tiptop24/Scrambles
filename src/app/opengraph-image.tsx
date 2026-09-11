import { ImageResponse } from "next/og";

export const alt = "Scrambles — Premier League Pick 'Em";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#37003c",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 88, fontWeight: 800 }}>
          Scrambles
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "rgba(255,255,255,0.75)", marginTop: 20 }}>
          Premier League Pick &apos;Em
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(255,255,255,0.55)",
            marginTop: 36,
          }}
        >
          Pick a winner. Stay alive. Last one standing wins.
        </div>
      </div>
    ),
    { ...size }
  );
}
