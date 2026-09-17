export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

// Pure scroll timeline: all layers reverse naturally when the visitor scrolls up.
export function introFrame(value, reduced = false) {
  const p = clamp(Number.isFinite(value) ? value : 0);
  const approach = ease(0.07, 0.58, p);
  const merge = ease(0.32, 0.63, p);
  return {
    '--field-opacity': reduced ? 0.32 : 1 - ease(0.55, 0.85, p) * 0.66,
    '--field-scale': reduced ? 1 : 1 + approach * 0.35,
    '--world-opacity': reduced ? 1 : ease(0.58, 0.84, p),
    '--name-gap': 1 - merge,
    '--name-opacity': reduced ? 0 : 1 - ease(0.65, 0.73, p),
    '--name-y': '0px',
    '--name-scale': 1 - merge * .16,
    '--headset-scale': 1 + approach * 4.5,
    '--headset-opacity': reduced ? 0 : 1 - ease(0.67, 0.81, p),
    '--headset-stage-scale': 1 + ease(0.32,0.7,p) * .8,
    '--headset-y': `${-approach * 2}vh`,
    '--headset-rotation': `${-3 + approach * 3}deg`,
    '--opening-opacity': reduced ? 0 : 1 - ease(0.18, 0.46, p),
    '--brand-opacity': reduced ? 1 : ease(0.7,0.79,p),
    '--brand-lift': `${(reduced ? 1 : ease(.8,.95,p))*28}vh`,
    '--brand-scale': reduced ? .7 : 1-ease(.8,.95,p)*.3,
    '--reveal-opacity': reduced ? 1 : ease(0.85, 0.98, p),
    '--reveal-y': '0px',
    '--burst-opacity': reduced ? 0 : ease(0.38,0.5,p) * (1 - ease(0.55,0.73,p)) * .45,
    '--burst-scale': 0.55 + ease(0.38,0.73,p) * 3,
    '--fragment-opacity': reduced ? 0 : ease(0.77, 0.94, p),
    '--fragment-y': `${(1 - ease(0.74, 0.98, p)) * 100}px`,
  };
}
