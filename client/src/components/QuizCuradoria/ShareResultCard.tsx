import { SITE_LOGO_PATH, SITE_NAME } from "@shared/const/site";
import { forwardRef } from "react";

interface ShareResultCardProps {
  profileName: string;
  productName: string;
  productImage: string;
}

/** Layout fixo 1080×1080 para captura com html2canvas (fora da viewport). */
const ShareResultCard = forwardRef<HTMLDivElement, ShareResultCardProps>(
  function ShareResultCard({ profileName, productName, productImage }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: 1080,
          height: 1080,
          overflow: "hidden",
          background: "linear-gradient(165deg, #F5F0E8 0%, #EDE4D8 45%, #F8E8DC 100%)",
          fontFamily: "'Nunito', sans-serif",
          color: "#3D2B1F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "72px 80px 64px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(196,82,42,0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(45,106,79,0.1) 0%, transparent 45%)",
            pointerEvents: "none",
          }}
        />

        <img
          src={SITE_LOGO_PATH}
          alt=""
          width={220}
          height={72}
          style={{ objectFit: "contain", marginBottom: 48, position: "relative", zIndex: 1 }}
          crossOrigin="anonymous"
        />

        <p
          style={{
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8B6F5E",
            marginBottom: 16,
            position: "relative",
            zIndex: 1,
          }}
        >
          Meu estilo
        </p>

        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 72,
            lineHeight: 1.1,
            textAlign: "center",
            margin: "0 0 48px",
            maxWidth: 900,
            position: "relative",
            zIndex: 1,
            color: "#3D2B1F",
          }}
        >
          {profileName}
        </h2>

        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 24px 48px rgba(61,43,31,0.18)",
            background: "#EDE4D8",
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <img
            src={productImage}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
          />
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 26,
            fontWeight: 600,
            textAlign: "center",
            maxWidth: 720,
            position: "relative",
            zIndex: 1,
          }}
        >
          {productName}
        </p>

        <p
          style={{
            marginTop: "auto",
            fontSize: 22,
            color: "#8B6F5E",
            position: "relative",
            zIndex: 1,
          }}
        >
          Descubra o seu em {SITE_NAME}
        </p>
      </div>
    );
  },
);

export default ShareResultCard;
