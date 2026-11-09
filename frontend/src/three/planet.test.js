import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { clamp, mix, smooth } from './core/math.js';
import { nearRail, railDist, railPt, railTan } from './world/rail.js';
import { terrain, radiusAt, PLATEAU, PR } from './world/terrain.js';
import { ZONES } from './world/zones.js';
import { BRAND, C, OCEAN, TERRAIN, VEHICLES } from './world/palette.js';
import { ZONE_NAMES } from './zoneNames.js';

test('funções de suavização ficam entre 0 e 1 e respeitam as pontas', () => {
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(2), 1);
  assert.equal(smooth(0.2, 0.4, 0.1), 0);
  assert.equal(smooth(0.2, 0.4, 0.5), 1);
  assert.equal(mix(2, 4, 0.5), 3);
});

test('rótulos do componente seguem a mesma ordem das áreas do planeta', () => {
  assert.deepEqual(ZONES.map(z => z.name), ZONE_NAMES);
  for (const z of ZONES) {
    assert.ok(z.act, `${z.name} precisa de um botão de interação`);
    assert.ok(z.done || z.act2, `${z.name} precisa de mensagem (ou de um minigame com placar)`);
    assert.ok(Math.abs(z.dir.length() - 1) < 1e-9, `${z.name} precisa de direção unitária`);
  }
});

test('ferrovia é um caminho fechado e contínuo pela superfície', () => {
  assert.ok(railPt(0).distanceTo(railPt(Math.PI * 2)) < 1e-9);
  for (let i = 0; i < 64; i++) {
    const th = i / 64 * Math.PI * 2;
    assert.ok(Math.abs(railPt(th).length() - 1) < 1e-9);
    assert.ok(Math.abs(railTan(th).dot(railPt(th))) < 1e-3, 'tangente deve ficar rente à superfície');
    assert.ok(railDist(railPt(th)) < 1e-6);
  }
  assert.ok(railDist(nearRail(1, 0.3)) > 0.25);
});

test('planeta tem mais terra que mar e as áreas ficam em platôs secos', () => {
  const d = new THREE.Vector3();
  let land = 0, n = 0;
  for (let i = 0; i < 40; i++) for (let j = 0; j < 80; j++) {
    const y = 1 - 2 * (i + 0.5) / 40, r = Math.sqrt(1 - y * y), a = j / 80 * Math.PI * 2;
    d.set(Math.cos(a) * r, y, Math.sin(a) * r);
    if (terrain(d) >= 0) land++; n++;
  }
  const share = land / n;
  assert.ok(share > 0.65 && share < 0.85, `terra em ${(share * 100).toFixed(1)}%`);
  for (const z of ZONES) assert.ok(Math.abs(terrain(z.dir) - PLATEAU) < 1e-6, `${z.name} fora do platô`);
  assert.ok(radiusAt(PLATEAU) > PR);
});

test('paleta só tem cores hexadecimais válidas', () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const all = [BRAND, C, OCEAN, TERRAIN, VEHICLES].flatMap(group => Object.values(group)).flat();
  for (const color of all) assert.match(color, hex);
});
