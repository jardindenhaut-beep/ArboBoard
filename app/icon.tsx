import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#052e16",
          borderRadius: "16px",
          color: "#ffffff",
          display: "flex",
          fontSize: "42px",
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