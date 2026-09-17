import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const scene = new THREE.Scene();
const headset = new THREE.Group();
scene.add(headset);

const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xdce7ef, roughness: .3, metalness: .08 });
const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x8fa8ba, roughness: .38, metalness: .12 });
const visorMaterial = new THREE.MeshStandardMaterial({ color: 0xe8f0f5, roughness: .24, metalness: .04 });
const gasketMaterial = new THREE.MeshStandardMaterial({ color: 0x111923, roughness: .55, metalness: .08 });
const lensMaterial = new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: .12, metalness: .4, emissive: 0x092d48, emissiveIntensity: .45 });
const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x66c0f4, roughness: .2, metalness: .22, emissive: 0x17618d, emissiveIntensity: .5 });

function addRounded(size, position, material, radius = .1) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 8, radius), material);
  mesh.position.set(...position);
  headset.add(mesh);
  return mesh;
}

const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), shellMaterial);
shell.scale.set(1.28, .6, .38);
shell.position.set(0, -.02, -.04);
headset.add(shell);
const visor = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), visorMaterial);
visor.scale.set(1.42, .61, .18);
visor.position.set(0, 0, .42);
headset.add(visor);
addRounded([1.95, .18, .14], [0, -.5, .5], gasketMaterial, .08);
addRounded([1.1, .035, .035], [0, .4, .56], accentMaterial, .02);

for (const x of [-.68, .68]) {
  const camera = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .09, 4, 12), lensMaterial);
  camera.position.set(x, .19, .53);
  camera.rotation.z = Math.PI / 2;
  headset.add(camera);
}

for (const side of [-1, 1]) {
  const sideButton = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .045, 24), gasketMaterial);
  sideButton.position.set(side * 1.42, .05, -.18);
  sideButton.rotation.z = Math.PI / 2;
  headset.add(sideButton);
}

const strapCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.38, .34, -.12),
  new THREE.Vector3(-1.2, .7, -.4),
  new THREE.Vector3(-.62, .96, -.72),
  new THREE.Vector3(0, 1.03, -.86),
  new THREE.Vector3(.62, .96, -.72),
  new THREE.Vector3(1.2, .7, -.4),
  new THREE.Vector3(1.38, .34, -.12)
]);
headset.add(new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 48, .1, 12, false), sideMaterial));

const rearStrapCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.12, .2, -.25),
  new THREE.Vector3(-.7, .05, -1.0),
  new THREE.Vector3(0, -.02, -1.2),
  new THREE.Vector3(.7, .05, -1.0),
  new THREE.Vector3(1.12, .2, -.25)
]);
headset.add(new THREE.Mesh(new THREE.TubeGeometry(rearStrapCurve, 36, .13, 12, false), gasketMaterial));

const sideLight = new THREE.Mesh(new THREE.CapsuleGeometry(.025, .14, 4, 8), accentMaterial);
sideLight.position.set(1.43, .1, .08);
sideLight.rotation.z = Math.PI / 2;
headset.add(sideLight);

headset.rotation.set(-.08, -.48, -.03);
headset.updateMatrixWorld(true);

const exporter = new GLTFExporter();
const output = await new Promise((resolve, reject) => {
  exporter.parse(scene, resolve, reject, { binary: true, onlyVisible: true });
});

await mkdir(new URL('../public/models/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/models/headset-miniverso.glb', import.meta.url), Buffer.from(output));
console.log('Created public/models/headset-miniverso.glb');
