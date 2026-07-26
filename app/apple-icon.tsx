import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#052e16",
          borderRadius: "40px",
          color: "#ffffff",
          display: "flex",
          fontSize: "116px",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        🌳
      </div>
    ),
    {
      ...size,
    }
  );
}