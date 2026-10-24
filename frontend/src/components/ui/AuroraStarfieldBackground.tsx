import React, { useEffect, useState, Component, ReactNode, ErrorInfo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { motion, useMotionValue, useMotionTemplate, animate } from 'framer-motion';

// Palette tailored to CHAOSPATCH:
// Deep navy base, electric violet, deep blue, restrained cyan, and subtle amber
const AURORA_COLORS = [
  'rgba(124, 58, 237, 0.45)',  // Electric violet
  'rgba(30, 64, 175, 0.50)',   // Deep royal blue
  'rgba(6, 182, 212, 0.35)',   // Restrained cyan
  'rgba(255, 159, 10, 0.30)',  // Subtle CHAOSPATCH amber
  'rgba(99, 102, 241, 0.45)',  // Indigo
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
    console.warn('WebGL Starfield canvas failed to render; falling back to aurora gradient:', error, errorInfo);
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
  const color = useMotionValue(AURORA_COLORS[0]);

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

    const controls = animate(color, AURORA_COLORS, {
      ease: 'easeInOut',
      duration: 16,
      repeat: Infinity,
      repeatType: 'mirror',
    });

    return () => controls.stop();
  }, [color, reducedMotion]);

  // Dynamic radial gradients using motion template
  // Keeps the center dark (#080B12) while edges feature smooth shifting atmospheric aurora colors
  const auroraGradient = useMotionTemplate`radial-gradient(135% 120% at 50% 0%, #080B12 55%, ${color} 100%)`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ isolation: 'isolate' }}
    >
      {/* 1. Animated Atmospheric Aurora Gradient Layer */}
      <motion.div
        style={{
          backgroundImage: reducedMotion
            ? 'radial-gradient(135% 120% at 50% 0%, #080B12 60%, rgba(124, 58, 237, 0.25) 100%)'
            : auroraGradient,
        }}
        className="absolute inset-0 w-full h-full"
      />

      {/* 2. Secondary Floating Ambient Aurora Glows */}
      <div className="absolute top-[-10%] left-[15%] w-[650px] h-[400px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/15 to-amber-500/10 blur-[130px] rounded-full opacity-60" />
      <div className="absolute bottom-[-15%] right-[10%] w-[550px] h-[350px] bg-gradient-to-br from-cyan-600/10 via-blue-700/15 to-purple-600/10 blur-[140px] rounded-full opacity-50" />

      {/* 3. Interactive 3D Cosmic Starfield via React Three Fiber */}
      {!reducedMotion && (
        <div className="absolute inset-0 w-full h-full opacity-70">
          <WebGLErrorBoundary>
            <Canvas
              gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
              camera={{ position: [0, 0, 1] }}
              style={{ pointerEvents: 'none' }}
            >
              <Stars
                radius={60}
                depth={45}
                count={2200}
                factor={3.5}
                saturation={0}
                fade
                speed={0.8}
              />
            </Canvas>
          </WebGLErrorBoundary>
        </div>
      )}

      {/* 4. Subtle Vignette & Engineering Grid overlay */}
      <div className="absolute inset-0 bg-radial-vignette opacity-40" />
    </div>
  );
};
