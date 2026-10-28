import * as THREE from 'three';

// ───────────── Cena 2: o pequeno mundo da Miniverso ─────────────
const worldScene = new THREE.Scene();
const worldCamera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
worldScene.add(new THREE.HemisphereLight('#cfeaff', '#1a2238', 1.1));
const sun = new THREE.DirectionalLight('#fff1dd', 2.6); sun.position.set(4, 3, 5); worldScene.add(sun);
const rim2 = new THREE.DirectionalLight('#00b7e3', 1.4); rim2.position.set(-5, 1.5, -3); worldScene.add(rim2);

const skyUniforms = { uTime: { value: 0 }, uAspect: { value: 1 } };
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: skyUniforms, depthWrite: false, depthTest: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    uniform float uTime, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }
    void main(){
      vec2 asp = vec2(uAspect, 1.), p = (vUv - .5) * asp;
      float n = fbm(p * 2.4 + vec2(uTime * .01, 0.));
      vec3 col = mix(vec3(.01, .03, .07), vec3(.03, .07, .15), smoothstep(.9, 0., length(p)));
      col += vec3(.1, .07, .25) * smoothstep(.9, .1, length(p - vec2(.55, .3))) * n * .9;
      col += vec3(.03, .18, .26) * smoothstep(.9, .1, length(p + vec2(.6, .25))) * n * .9;
      float s = step(.9975, hash(floor(vUv * vec2(900., 600.) * vec2(uAspect, 1.) / uAspect))) * (.5 + .5 * sin(uTime * 2. + hash(floor(vUv * 300.)) * 40.));
      col += vec3(.8, .9, 1.) * s * .8;
      gl_FragColor = vec4(col, 1.);
    }`
}));
sky.frustumCulled = false; sky.renderOrder = -10;
worldScene.add(sky);

export { skyUniforms, worldCamera, worldScene };
