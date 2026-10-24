import React from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { FailureReveal } from './FailureReveal';
import { WorkflowSection } from './WorkflowSection';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  const handleScrollToReveal = () => {
    const el = document.getElementById('failure-reveal');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full bg-[#080B12] text-text-primary overflow-x-hidden selection:bg-accent-chaos/30 selection:text-white">
      {/* Top Floating Engineering Navigation */}
      <LandingNavbar onEnterDashboard={onEnterDashboard} />

      {/* 1. Full-Viewport Cinematic Opening Hero */}
      <HeroSection
        onScrollToReveal={handleScrollToReveal}
        onEnterDashboard={onEnterDashboard}
      />

      {/* 2. Pinned GSAP ScrollTrigger Tear Reveal (Failure -> Machine -> Recovery) */}
      <FailureReveal />

      {/* 3. Detailed 5-Stage Reliability Lifecycle Engine */}
      <WorkflowSection onEnterDashboard={onEnterDashboard} />
    </div>
  );
};
