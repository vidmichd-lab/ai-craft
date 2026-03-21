import { ImageResponse } from 'next/og';

export const size = {
  width: 64,
  height: 64
};

export const contentType = 'image/png';

const ICON_BACKGROUND = '#1e1e1e';
const ICON_FOREGROUND = '#f5f5f5';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ICON_BACKGROUND,
          color: ICON_FOREGROUND,
          borderRadius: 18,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: '-0.08em',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        }}
      >
        AC
      </div>
    ),
    size
  );
}
