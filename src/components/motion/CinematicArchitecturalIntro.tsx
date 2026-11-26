import React, { useEffect, useState } from 'react';

interface CinematicArchitecturalIntroProps {
  brandName: string;
  city?: string;
  preloadUrls?: string[];
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 6000;
const EXIT_DURATION_MS = 750;

export function CinematicArchitecturalIntro({
  brandName,
  city,
  preloadUrls = [],
  onComplete,
}: CinematicArchitecturalIntroProps) {
  const [exiting, setExiting] = useState(false);

  // Preload hero & primary site images silently while the 6s cinematic intro plays
  useEffect(() => {
    const urls = Array.from(new Set(preloadUrls.filter(Boolean)));
    const imgs: HTMLImageElement[] = [];
    urls.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      imgs.push(img);
    });
    return () => {
      imgs.length = 0;
    };
  }, [preloadUrls]);

  // Exact 6.0-second cinematic timing (respects prefers-reduced-motion gracefully)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exitAt = prefersReduced ? 1100 : TOTAL_DURATION_MS - EXIT_DURATION_MS;
    const finishAt = prefersReduced ? 1500 : TOTAL_DURATION_MS;

    const exitTimer = window.setTimeout(() => setExiting(true), exitAt);
    const doneTimer = window.setTimeout(() => {
      document.body.style.overflow = prevOverflow;
      onComplete();
    }, finishAt);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      onComplete();
    }, 360);
  };

  const displayName = (brandName || 'Ivy Oliveira Imóveis').trim();
  const displayCity = (city || 'Rio de Janeiro').trim();

  return (
    <div
      role="presentation"
      aria-label={`Abertura cinematográfica — ${displayName}`}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden select-none bg-[#0A0908] transition-all duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        exiting ? 'opacity-0 scale-[1.035] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Seamless atmospheric warm twilight sky illumination (zero frames, boxes or circles) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 78% 58% at 50% 42%, rgba(196, 155, 102, 0.14) 0%, rgba(118, 86, 48, 0.05) 38%, rgba(10, 9, 8, 0) 76%)',
        }}
      />

      {/* Subtle cinematic camera slow push-in wrapper — completely open and free */}
      <div className="intro-camera-stage relative z-10 w-full max-w-[1040px] px-4 sm:px-8 flex flex-col items-center justify-center">
        {/* Free-floating realistic architectural residence drawing (NO box, NO square, NO circle) */}
        <div className="w-full max-w-[920px]">
          <svg
            viewBox="0 0 920 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto overflow-visible"
            aria-hidden="true"
          >
            <defs>
              {/* Fade-out horizon stroke gradients so lines dissolve organically into open space */}
              <linearGradient id="introLineFade" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D6B27E" stopOpacity="0" />
                <stop offset="12%" stopColor="#E9D6B5" stopOpacity="0.88" />
                <stop offset="50%" stopColor="#F6EFE2" stopOpacity="1" />
                <stop offset="88%" stopColor="#E9D6B5" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#D6B27E" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="introGoldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5EAD6" />
                <stop offset="48%" stopColor="#D8B37E" />
                <stop offset="100%" stopColor="#9E7647" />
              </linearGradient>

              <linearGradient id="introSlabLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#26221E" stopOpacity="0.92" />
                <stop offset="45%" stopColor="#3B342D" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1C1916" stopOpacity="0.92" />
              </linearGradient>

              <linearGradient id="introSoffitWood" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3A2818" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#5D3F24" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#2A1D12" stopOpacity="0.85" />
              </linearGradient>

              <linearGradient id="introStoneWall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#332D26" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#1A1714" stopOpacity="0.96" />
              </linearGradient>

              {/* Warm realistic interior architectural lighting (ground living + upper suite) */}
              <radialGradient id="introWarmLiving" cx="46%" cy="38%" r="68%">
                <stop offset="0%" stopColor="#FFE1AA" stopOpacity="0.72" />
                <stop offset="40%" stopColor="#D69A4F" stopOpacity="0.34" />
                <stop offset="82%" stopColor="#6E4922" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#1B1510" stopOpacity="0.03" />
              </radialGradient>

              <radialGradient id="introWarmSuite" cx="55%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#FFE4B4" stopOpacity="0.64" />
                <stop offset="45%" stopColor="#C88E49" stopOpacity="0.28" />
                <stop offset="85%" stopColor="#593B1D" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#181410" stopOpacity="0.02" />
              </radialGradient>

              {/* Realistic water reflection beneath glowing living pavilion */}
              <linearGradient id="introWaterSurface" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1B3037" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#122127" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#0A0908" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="introWaterReflection" cx="50%" cy="15%" r="65%">
                <stop offset="0%" stopColor="#F5C77E" stopOpacity="0.38" />
                <stop offset="48%" stopColor="#B88342" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#0A0908" stopOpacity="0" />
              </radialGradient>

              {/* Soft ambient halo behind villa roofline */}
              <radialGradient id="introSkyAura" cx="52%" cy="48%" r="50%">
                <stop offset="0%" stopColor="#E6BE82" stopOpacity="0.18" />
                <stop offset="55%" stopColor="#9A744B" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#0A0908" stopOpacity="0" />
              </radialGradient>

              {/* Glass sunlight sheen gradient */}
              <linearGradient id="introGlassSheen" x1="0%" y1="0%" x2="100%" y2="40%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="45%" stopColor="#FFF4DC" stopOpacity="0.26" />
                <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              {/* Clip paths for glass panes so interior light & sun glint stay anatomically accurate */}
              <clipPath id="clipGroundGlass">
                <polygon points="246,226 626,226 626,316 246,316" />
              </clipPath>
              <clipPath id="clipUpperGlass">
                <polygon points="366,104 714,104 714,198 366,198" />
              </clipPath>
            </defs>

            {/* 1. Soft Twilight Horizon Glow (emerges gently as lighting blooms) */}
            <ellipse
              cx="470"
              cy="220"
              rx="390"
              ry="145"
              fill="url(#introSkyAura)"
              className="intro-light-bloom"
            />

            {/* 2. Realistic Architectural Massing & Material Fills (fade in right after drafting lines) */}
            <g className="intro-material-reveal">
              {/* Rear architectural travertine core walls */}
              <polygon points="154,218 246,226 246,316 154,316" fill="url(#introStoneWall)" />
              <polygon points="626,226 706,216 706,314 626,316" fill="#191613" opacity="0.92" />

              {/* Ground floor warm lit living room interior */}
              <rect x="246" y="226" width="380" height="90" fill="url(#introWarmLiving)" />

              {/* Interior architectural depth: sculptural cantilevered steps & back wall */}
              <g clipPath="url(#clipGroundGlass)" opacity="0.72">
                <rect x="330" y="232" width="115" height="84" fill="#2A1D12" opacity="0.45" />
                {/* Interior recessed gallery painting glow */}
                <rect x="360" y="246" width="54" height="34" fill="#FFE6B8" opacity="0.26" />
                {/* Floating architectural staircase steps inside living room */}
                <line x1="468" y1="312" x2="500" y2="312" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.7" />
                <line x1="478" y1="300" x2="512" y2="300" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.7" />
                <line x1="488" y1="288" x2="524" y2="288" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.7" />
                <line x1="498" y1="276" x2="536" y2="276" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.7" />
                <line x1="508" y1="264" x2="548" y2="264" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.65" />
                <line x1="518" y1="252" x2="560" y2="252" stroke="#F6DEC0" strokeWidth="1.6" opacity="0.6" />
                {/* Minimalist interior pendant light */}
                <line x1="305" y1="226" x2="305" y2="256" stroke="#F3D8AC" strokeWidth="0.9" opacity="0.65" />
                <ellipse cx="305" cy="258" rx="14" ry="2.2" fill="#FFE7BA" opacity="0.85" />
              </g>

              {/* Recessed timber soffit under upper cantilevered mezzanine slab */}
              <polygon points="122,216 742,216 720,226 154,226" fill="url(#introSoffitWood)" />
              {/* Mezzanine main travertine cantilevered slab fascia */}
              <polygon points="116,198 756,198 742,216 122,216" fill="url(#introSlabLight)" />

              {/* Upper floor warm lit master suite interior */}
              <rect x="366" y="104" width="348" height="94" fill="url(#introWarmSuite)" />

              {/* Upper interior warm ceiling cove glow & architectural columns */}
              <g clipPath="url(#clipUpperGlass)" opacity="0.85">
                <rect x="366" y="104" width="348" height="9" fill="#FFE5B4" opacity="0.32" />
                <rect x="526" y="106" width="12" height="92" fill="#211A14" opacity="0.58" />
                <rect x="652" y="106" width="62" height="92" fill="#1C1713" opacity="0.35" />
              </g>

              {/* Left upper architectural stone wing & recessed brise-soleil backdrop */}
              <polygon points="178,104 366,104 366,198 178,198" fill="#1E1A16" opacity="0.92" />

              {/* Crown cantilevered roof slab with soffit shadow */}
              <polygon points="154,90 778,90 764,104 166,104" fill="url(#introSlabLight)" />
              <polygon points="166,104 764,104 744,111 182,111" fill="url(#introSoffitWood)" opacity="0.88" />

              {/* Ground terrace plinth & infinity pool water plane */}
              <polygon points="104,316 804,316 828,334 86,334" fill="#1F1C18" opacity="0.88" />
              <polygon points="376,320 792,320 822,366 346,366" fill="url(#introWaterSurface)" />
              <polygon points="376,320 792,320 822,366 346,366" fill="url(#introWaterReflection)" />
            </g>

            {/* 3. Cinematic Glint Sweep across Glass Facades */}
            <g clipPath="url(#clipGroundGlass)">
              <rect
                x="140"
                y="220"
                width="140"
                height="110"
                fill="url(#introGlassSheen)"
                className="intro-glass-glint"
              />
            </g>
            <g clipPath="url(#clipUpperGlass)">
              <rect
                x="260"
                y="98"
                width="140"
                height="110"
                fill="url(#introGlassSheen)"
                className="intro-glass-glint-delayed"
              />
            </g>

            {/* 4. Precision Architectural Drafting Linework (Drawn Live Stroke-by-Stroke) */}
            <g strokeLinecap="round" strokeLinejoin="round">
              {/* Horizon ground baseline fading smoothly to infinity */}
              <path
                d="M 28 316 L 892 316"
                stroke="url(#introLineFade)"
                strokeWidth="1.25"
                pathLength="100"
                className="intro-draw intro-draw-1"
              />
              {/* Lower plinth terrace perspective step */}
              <path
                d="M 96 334 L 352 334 M 104 316 L 86 334"
                stroke="#C9A574"
                strokeOpacity="0.65"
                strokeWidth="1"
                pathLength="100"
                className="intro-draw intro-draw-2"
              />

              {/* Infinity Pool Perimeter & Specular Water Ripple Reflections */}
              <path
                d="M 376 320 L 792 320 L 822 362 M 376 320 L 348 362"
                stroke="#D9BC90"
                strokeOpacity="0.72"
                strokeWidth="1.1"
                pathLength="100"
                className="intro-draw intro-draw-2"
              />
              <path
                d="M 426 332 L 548 332 M 586 332 L 728 332 M 392 344 L 494 344 M 538 344 L 682 344 M 456 355 L 614 355"
                stroke="#F3D6A4"
                strokeOpacity="0.34"
                strokeWidth="0.9"
                pathLength="100"
                className="intro-draw intro-draw-6"
              />

              {/* Primary Ground Floor Structure & Cantilevered Mezzanine Slab */}
              <path
                d="M 116 198 L 756 198 L 742 216 L 122 216 Z"
                stroke="url(#introGoldStroke)"
                strokeWidth="1.75"
                pathLength="100"
                className="intro-draw intro-draw-2"
              />
              {/* Ground floor rear walls & slim architectural pilotis */}
              <path
                d="M 154 216 L 154 316 M 246 216 L 246 316 M 626 216 L 626 316 M 706 216 L 706 316 M 154 226 L 720 226"
                stroke="#EFE3CE"
                strokeOpacity="0.9"
                strokeWidth="1.35"
                pathLength="100"
                className="intro-draw intro-draw-3"
              />
              {/* Ground floor panoramic glass door mullions */}
              <path
                d="M 322 226 L 322 316 M 398 226 L 398 316 M 474 226 L 474 316 M 550 226 L 550 316"
                stroke="#CFA977"
                strokeOpacity="0.78"
                strokeWidth="1"
                pathLength="100"
                className="intro-draw intro-draw-4"
              />

              {/* Upper Floor Crown Cantilevered Roof Slab */}
              <path
                d="M 154 90 L 778 90 L 764 104 L 166 104 Z"
                stroke="url(#introGoldStroke)"
                strokeWidth="1.8"
                pathLength="100"
                className="intro-draw intro-draw-3"
              />
              {/* Upper Roof Accent Lip & Skylight Horizon Line */}
              <path
                d="M 224 81 L 712 81 L 726 90 M 224 81 L 210 90"
                stroke="#D8B37E"
                strokeOpacity="0.62"
                strokeWidth="1"
                pathLength="100"
                className="intro-draw intro-draw-4"
              />

              {/* Upper Volume Columns, Glass Walls & Corner Frame */}
              <path
                d="M 178 104 L 178 198 M 366 104 L 366 198 M 714 104 L 714 198 M 748 104 L 748 198"
                stroke="#F5EAD6"
                strokeOpacity="0.92"
                strokeWidth="1.45"
                pathLength="100"
                className="intro-draw intro-draw-4"
              />
              {/* Upper Panoramic Window Mullions */}
              <path
                d="M 452 104 L 452 198 M 538 104 L 538 198 M 626 104 L 626 198"
                stroke="#D6B27E"
                strokeOpacity="0.72"
                strokeWidth="1"
                pathLength="100"
                className="intro-draw intro-draw-5"
              />

              {/* Glass Terrace Balustrade (Front Upper Deck) */}
              <path
                d="M 134 174 L 748 174 M 134 174 L 134 198 M 290 174 L 290 198 M 446 174 L 446 198 M 602 174 L 602 198"
                stroke="#F0E2CB"
                strokeOpacity="0.65"
                strokeWidth="0.95"
                pathLength="100"
                className="intro-draw intro-draw-5"
              />

              {/* Signature Brushed-Bronze Vertical Brise-Soleil Louvers (Left Upper Wing) */}
              <path
                d="M 200 104 L 200 198 M 216 104 L 216 198 M 232 104 L 232 198 M 248 104 L 248 198 M 264 104 L 264 198 M 280 104 L 280 198 M 296 104 L 296 198 M 312 104 L 312 198 M 328 104 L 328 198 M 344 104 L 344 198"
                stroke="#C99E67"
                strokeOpacity="0.88"
                strokeWidth="1.25"
                pathLength="100"
                className="intro-draw intro-draw-5"
              />

              {/* Delicate Coastal Architectural Landscaping (Organic Palm & Foliage Silhouettes) */}
              <path
                d="M 118 316 Q 112 268 104 226 M 104 226 Q 76 210 56 220 M 104 226 Q 82 194 64 194 M 104 226 Q 116 196 136 202 M 104 226 Q 124 214 142 228"
                stroke="#C5A375"
                strokeOpacity="0.52"
                strokeWidth="1.05"
                pathLength="100"
                className="intro-draw intro-draw-6"
              />
              <path
                d="M 792 316 Q 798 274 808 242 M 808 242 Q 832 228 852 238 M 808 242 Q 826 212 846 214 M 808 242 Q 788 218 770 226 M 808 242 Q 786 238 772 252"
                stroke="#C5A375"
                strokeOpacity="0.48"
                strokeWidth="1.05"
                pathLength="100"
                className="intro-draw intro-draw-6"
              />

              {/* Subtle Architectural Drafting Extension Ticks (fade delicately after drawing) */}
              <path
                d="M 116 184 L 116 226 M 756 184 L 756 226 M 154 78 L 154 114 M 778 78 L 778 114"
                stroke="#D8B37E"
                strokeOpacity="0.32"
                strokeWidth="0.7"
                pathLength="100"
                className="intro-draw intro-draw-4"
              />
            </g>
          </svg>
        </div>

        {/* Site Name Written Smoothly Below — Completely Free, Large, Zero Box or Circle */}
        <div className="mt-2 sm:mt-4 w-full flex flex-col items-center text-center">
          <div className="relative inline-block max-w-full px-2">
            <h1 className="intro-brand-write font-editorial text-[clamp(1.85rem,6.1vw,4.85rem)] font-semibold leading-[1.06] tracking-[0.03em] text-[#F7F1E6] whitespace-nowrap">
              {displayName}
            </h1>
            {/* Subtle luminous drafting beam that glides across while writing the name */}
            <span
              aria-hidden="true"
              className="intro-write-cursor pointer-events-none absolute top-1 bottom-1 w-[2px] bg-gradient-to-b from-transparent via-[#F5D6A0] to-transparent shadow-[0_0_16px_2px_rgba(245,214,160,0.75)]"
            />
          </div>

          {/* Hairline golden horizon rule expanding gracefully from center */}
          <div
            aria-hidden="true"
            className="intro-rule-expand mt-3.5 h-[1px] w-44 sm:w-64 bg-gradient-to-r from-transparent via-[#CFA670]/80 to-transparent"
          />

          {/* Quiet Editorial Subtitle */}
          <p className="intro-subtitle-reveal mt-3 text-[11px] sm:text-xs font-mono uppercase tracking-[0.34em] text-[#D8C7AE]/80">
            {displayCity} · Consultoria Imobiliária
          </p>
        </div>
      </div>

      {/* Discreet bottom-right skip action (unboxed clean typography, accessible) */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-6 right-6 sm:bottom-8 sm:right-10 text-[11px] font-mono uppercase tracking-[0.2em] text-white/45 hover:text-[#E7C796] transition-colors cursor-pointer py-2 px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#CFA670]"
      >
        Pular
      </button>
    </div>
  );
}
