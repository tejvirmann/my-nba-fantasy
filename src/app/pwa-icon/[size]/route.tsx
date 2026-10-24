import { ImageResponse } from "next/og";

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Math.min(Math.max(parseInt((await params).size, 10) || 192, 64), 1024);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c8312" }}>
        <div
          style={{
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0c8312",
            fontSize: size * 0.3,
            fontWeight: 800,
          }}
        >
          DS
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
