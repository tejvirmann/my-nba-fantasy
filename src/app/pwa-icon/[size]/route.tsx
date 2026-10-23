import { ImageResponse } from "next/og";

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Math.min(Math.max(parseInt((await params).size, 10) || 192, 64), 1024);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#12203f" }}>
        <div
          style={{
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: "50%",
            background: "#ff6a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: size * 0.3,
            fontWeight: 800,
          }}
        >
          HL
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
