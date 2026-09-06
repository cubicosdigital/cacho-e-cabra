import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public/LogoCachoEcabra-white.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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
          background: "#0e0c0a",
          backgroundImage: "radial-gradient(circle at 50% 30%, #221d17 0%, #0e0c0a 70%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={440} height={154} alt="" />
        <div
          style={{
            marginTop: 32,
            fontSize: 56,
            color: "#f4ede3",
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          Nuestra Carta
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 26,
            color: "#e8b923",
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Comida · Tragos · Cafetería
        </div>
      </div>
    ),
    { ...size }
  );
}
