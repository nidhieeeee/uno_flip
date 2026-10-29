import { ImageResponse } from 'next/og';

export const alt = 'UNO FLIP! Online - Real-Time Multiplayer Card Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#15191F',
          backgroundImage:
            'radial-gradient(circle at 50% 35%, #2B1647 0%, #15191F 75%)',
          color: 'white',
          padding: '48px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* UF Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 130,
            height: 130,
            borderRadius: 32,
            background: 'linear-gradient(135deg, #FF1744 0%, #ED1C24 60%, #990000 100%)',
            border: '6px solid #FFCC00',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 76,
              fontWeight: 900,
              fontStyle: 'italic',
              color: 'white',
              letterSpacing: '-4px',
              textShadow: '0 4px 8px rgba(0,0,0,0.5)',
            }}
          >
            UF
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 68,
            fontWeight: 900,
            letterSpacing: '-2px',
            margin: 0,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          UNO FLIP! Online
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: '#FFCC00',
            marginTop: 12,
            marginBottom: 32,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Real-Time Multiplayer Card Game
        </p>

        {/* Feature Pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 35, 43, 0.9)',
              border: '1.5px solid #2D333B',
              borderRadius: 9999,
              padding: '10px 24px',
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            🔄 Light &amp; Dark Sides
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 35, 43, 0.9)',
              border: '1.5px solid #2D333B',
              borderRadius: 9999,
              padding: '10px 24px',
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            🔥 Penalty Stacking
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 35, 43, 0.9)',
              border: '1.5px solid #2D333B',
              borderRadius: 9999,
              padding: '10px 24px',
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            👥 2-4 Players Real-Time
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
