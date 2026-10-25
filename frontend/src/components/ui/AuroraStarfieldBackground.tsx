import React, { useEffect, useState, Component, ReactNode, ErrorInfo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { motion, useMotionValue, useMotionTemplate, animate } from 'framer-motion';

// Palette tailored to Obsidian × Acid Lime × Signal Coral:
// Restrained graphite, deep obsidian-olive, and quiet low-luminance ambient tones
const AMBIENT_TONES = [
  'rgba(34, 38, 31, 0.50)',   // Deep obsidian-graphite
  'rgba(32, 42, 22, 0.35)',   // Faint deep olive (recovery undertone)
  'rgba(50, 29, 25, 0.25)',   // Faint deep coral undertone
  'rgba(25, 28, 23, 0.55)',   // Raw surface obsidian
];

// Error Boundary to ensure WebGL failures never blank or crash React
class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('WebGL Starfield canvas failed to render; falling back to ambient gradient:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

export const AuroraStarfieldBackground: React.FC = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const color = useMotionValue(AMBIENT_TONES[0]);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Motion color animation loop
  useEffect(() => {
    if (reducedMotion) return;

    const controls = animate(color, AMBIENT_TONES, {
      ease: 'easeInOut',
      duration: 20,
      repeat: Infinity,
      repeatType: 'mirror',
    });

    return () => controls.stop();
  }, [color, reducedMotion]);

  // Dynamic radial gradients using motion template with obsidian foundation (#111310)
  const ambientGradient = useMotionTemplate`radial-gradient(135% 120% at 50% 0%, #111310 65%, ${color} 100%)`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Restrained Atmospheric Gradient Layer */}
      <motion.div
        style={{
          backgroundImage: reducedMotion
            ? 'radial-gradient(135% 120% at 50% 0%, #111310 70%, rgba(34, 38, 31, 0.4) 100%)'
            : ambientGradient,
        }}
        className="absolute inset-0 w-full h-full"
      />

      {/* 2. Secondary Faint Ambient Glows (Quiet Industrial Tones) */}
      <div className="absolute top-[-10%] left-[20%] w-[650px] h-[350px] bg-gradient-to-tr from-[#202A16]/20 via-[#22261F]/30 to-transparent blur-[140px] rounded-full opacity-50" />
      <div className="absolute bottom-[-15%] right-[15%] w-[550px] h-[350px] bg-gradient-to-br from-[#321D19]/15 via-[#191C17]/40 to-transparent blur-[150px] rounded-full opacity-40" />

      {/* 3. Interactive 3D Cosmic Starfield via React Three Fiber */}
      {!reducedMotion && (
        <div className="absolute inset-0 w-full h-full opacity-45">
          <WebGLErrorBoundary>
            <Canvas
              gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
              camera={{ position: [0, 0, 1] }}
              style={{ pointerEvents: 'none' }}
            >
              <Stars
                radius={60}
                depth={45}
                count={1600}
                factor={2.8}
                saturation={0}
                fade
                speed={0.5}
              />
            </Canvas>
          </WebGLErrorBoundary>
        </div>
      )}

      {/* 4. Subtle Vignette & Engineering Grid overlay */}
      <div className="absolute inset-0 bg-radial-vignette opacity-50" />
    </div>
  );
};
