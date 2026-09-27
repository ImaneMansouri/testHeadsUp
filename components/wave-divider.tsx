export function WaveDivider() {
  return (
    <div className="relative h-16 overflow-hidden bg-[#0F1A33] md:h-24" aria-hidden>
      <svg
        className="wave-drift absolute bottom-0 left-0 h-full w-[200%]"
        viewBox="0 0 2880 120"
        preserveAspectRatio="none"
      >
        <path
          fill="#F6F8FC"
          d="M0,70 C120,110 240,110 360,70 C480,30 600,30 720,70 C840,110 960,110 1080,70 C1200,30 1320,30 1440,70 C1560,110 1680,110 1800,70 C1920,30 2040,30 2160,70 C2280,110 2400,110 2520,70 C2640,30 2760,30 2880,70 L2880,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}
