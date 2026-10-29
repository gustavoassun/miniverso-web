import * as THREE from 'three';

// Formação do planeta: uma faixa de luz ciano varre o planeta de cima para baixo. Acima dela, tudo já
// aparece com as cores reais; abaixo, o planeta ainda é um holograma azul com linhas de latitude.
// uReveal vai de 0 (só holograma) a 1 (tudo revelado); o motor controla pela rolagem da abertura.
const revealUniforms = {
  uReveal: { value: 1 },
  uRevealAxis: { value: new THREE.Vector3(0.18, 1, 0.12).normalize() }
};

// Altura da faixa de luz para um valor de uReveal (mesma conta do shader), de 1,15 até -1,15.
const revealEdge = reveal => 1.15 - reveal * 2.3;

function applyReveal(materials) {
  for (const m of new Set(materials)) {
    if (!m.isMeshStandardMaterial) continue; // inclui MeshPhysicalMaterial
    m.onBeforeCompile = shader => {
      shader.uniforms.uReveal = revealUniforms.uReveal;
      shader.uniforms.uRevealAxis = revealUniforms.uRevealAxis;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRevealPos;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 rvPos = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            rvPos = instanceMatrix * rvPos;
          #endif
          vRevealPos = (modelMatrix * rvPos).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uReveal; uniform vec3 uRevealAxis; varying vec3 vRevealPos;')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          if (uReveal < 0.999) {
            float lat = dot(normalize(vRevealPos), uRevealAxis);
            float edge = 1.15 - uReveal * 2.3;
            float shown = smoothstep(edge - 0.03, edge + 0.03, lat);
            float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
            float lines = smoothstep(0.86, 1.0, abs(fract(lat * 26.0) - 0.5) * 2.0);
            vec3 holo = vec3(0.02, 0.12, 0.22) + vec3(0.12, 0.55, 0.75) * lum * 0.55 + vec3(0.0, 0.55, 0.75) * lines * 0.35;
            gl_FragColor.rgb = mix(holo, gl_FragColor.rgb, shown);
            float band = exp(-pow((lat - edge) / 0.022, 2.0));
            gl_FragColor.rgb += vec3(0.35, 0.9, 1.0) * band * 1.6;
          }`);
    };
    m.needsUpdate = true;
  }
}

export { applyReveal, revealEdge, revealUniforms };
