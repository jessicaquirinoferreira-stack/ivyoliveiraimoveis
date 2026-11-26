import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Discreet architectural 2px reading-progress hairline pinned to the header base.
 * Uses direct DOM transform updates inside rAF so scrolling causes zero React re-renders.
 */
export function ScrollProgressLine() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const el = barRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden bg-transparent"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-[var(--site-accent)] will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

interface MagneticActionProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle pointer-proximity magnetic container for primary buttons and CTAs.
 * Automatically disabled on coarse/touch pointers and when prefers-reduced-motion is enabled.
 */
export function MagneticAction({
  children,
  className = '',
  strength = 0.2,
}: MagneticActionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !isFinePointer || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    const maxShift = 8;
    setOffset({
      x: Math.max(-maxShift, Math.min(maxShift, relX * strength)),
      y: Math.max(-maxShift, Math.min(maxShift, relY * strength)),
    });
  };

  const handleMouseLeave = () => {
    if (offset.x !== 0 || offset.y !== 0) {
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.45 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface EditorialRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

/**
 * Refined editorial entrance animation for inner public pages and modular blocks.
 * Strictly animates compositor properties (transform, opacity) and honors prefers-reduced-motion.
 */
export function EditorialReveal({
  children,
  className = '',
  delay = 0,
  y = 22,
}: EditorialRevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{
        duration: 0.72,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface EditorialImageCurtainProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Architectural clip-path curtain reveal for editorial photographs and architectural frames.
 */
export function EditorialImageCurtain({
  children,
  className = '',
  delay = 0,
}: EditorialImageCurtainProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ clipPath: 'inset(10% 0% 0% 0%)', opacity: 0.35 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
