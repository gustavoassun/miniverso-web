export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

// Pure scroll timeline: all layers reverse naturally when the visitor scrolls up.
export function introFrame(value, reduced = false) {
  const p = clamp(Number.isFinite(value) ? value : 0);
  const approach = ease(0.08, 0.61, p);
  const merge = ease(0.32, 0.63, p);
  const eyeAlign = ease(0.35, 0.5, p) * (1 - ease(0.57, 0.66, p));
  const flash = ease(0.5, 0.61, p) * (1 - ease(0.7, 0.82, p));
  const dissolve = ease(0.42, 0.64, p);
  const tunnel = ease(0.4, 0.6, p) * (1 - ease(0.74, 0.87, p));
  return {
    '--field-opacity': reduced ? 0.2 : 1 - ease(0.56, 0.82, p) * 0.88,
    '--field-scale': reduced ? 1 : 1 + approach * 0.22,
    '--world-opacity': reduced ? 1 : ease(0.63, 0.82, p),
    '--name-gap': 1 - merge,
    '--name-opacity': reduced ? 0 : 1 - ease(0.65, 0.73, p),
    '--name-y': '0px',
    '--name-scale': 1 - merge * .16,
    '--headset-scale': 1 + approach * .48,
    '--headset-opacity': reduced ? 0 : 1 - dissolve,
    '--headset-stage-scale': 1 + ease(0.25,0.56,p) * .13,
    '--headset-y': `${Math.sin(Math.min(1, ease(.08,.5,p)) * Math.PI) * 6}vh`,
    '--headset-blur': `${dissolve * 16}px`,
    '--headset-saturation': 1 + dissolve * 1.8,
    '--headset-rotation': `${-3 + approach * 3}deg`,
    '--opening-opacity': reduced ? 0 : 1 - ease(0.18, 0.46, p),
    '--brand-opacity': reduced ? 1 : ease(0.7,0.79,p),
    '--brand-lift': `${(reduced ? 1 : ease(.8,.95,p))*28}vh`,
    '--brand-scale': reduced ? .7 : 1-ease(.8,.95,p)*.3,
    '--reveal-opacity': reduced ? 1 : ease(0.84, 0.98, p),
    '--reveal-y': '0px',
    '--burst-opacity': reduced ? 0 : ease(0.4,0.52,p) * (1 - ease(0.69,0.81,p)) * .7,
    '--burst-scale': 0.42 + ease(0.4,0.78,p) * 4.2,
    '--eye-opacity': reduced ? 0 : eyeAlign,
    '--eye-gap': `${10 - ease(.4,.68,p) * 5.2}vw`,
    '--eye-scale': .52 + ease(.4,.69,p) * 1.45,
    '--flash-opacity': reduced ? 0 : flash,
    '--flash-scale': .22 + ease(.48,.79,p) * 3.8,
    '--threshold-copy-opacity': reduced ? 0 : ease(.39,.49,p) * (1 - ease(.55,.64,p)),
    '--tunnel-opacity': reduced ? 0 : tunnel,
    '--tunnel-progress': ease(.4,.76,p),
    '--fragment-opacity': reduced ? 0 : ease(0.77, 0.94, p),
    '--fragment-y': `${(1 - ease(0.74, 0.98, p)) * 100}px`,
  };
}
