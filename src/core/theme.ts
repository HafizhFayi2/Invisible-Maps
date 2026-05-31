// Core Design & Animation Tokens
export const ANIMATION_TOKENS = {
  // Durations
  durationFast: 0.2,
  durationNormal: 0.28,
  durationSlow: 0.38,
  
  // Easings
  easeOut: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth slide in
  easeIn: [0.4, 0, 1, 1],       // Smooth fade/slide out
  easeInOut: [0.4, 0, 0.2, 1],
  
  // Blurs
  blurInitial: 'blur(4px)',
  blurExit: 'blur(6px)',
  blurNone: 'blur(0px)',
};

export const UI_TOKENS = {
  // Tap targets
  minTouchSize: '44px',
  
  // Backdrops
  overlayBg: 'bg-black/50',
};
