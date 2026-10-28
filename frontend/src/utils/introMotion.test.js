import { test } from 'node:test';
import assert from 'node:assert/strict';
import { introFrame } from './introMotion.js';

test('opening has separate names, visible headset and a dark world', () => {
  const frame = introFrame(0);
  assert.equal(frame['--name-gap'], 1);
  assert.equal(frame['--headset-opacity'], 1);
  assert.equal(frame['--world-opacity'], 0);
  assert.equal(frame['--reveal-opacity'], 0);
});
test('end hides the headset and exposes content inside the VR world', () => {
  const frame = introFrame(1);
  assert.equal(frame['--name-gap'], 0);
  assert.equal(frame['--headset-opacity'], 0);
  assert.equal(frame['--world-opacity'], 1);
  assert.equal(frame['--reveal-opacity'], 1);
  assert.equal(frame['--fragment-opacity'], 1);
  assert.equal(frame['--brand-opacity'], 1);
  assert.equal(frame['--brand-lift'], '28vh');
});
test('timeline is deterministic, reversible and clamps out-of-range values', () => {
  assert.deepEqual(introFrame(-10), introFrame(0));
  assert.deepEqual(introFrame(10), introFrame(1));
  assert.deepEqual(introFrame(NaN), introFrame(0));
  const middle = introFrame(.5);
  introFrame(.9);
  assert.deepEqual(introFrame(.5), middle);
  for (let p = 0; p <= 1; p += .01) {
    const frame = introFrame(p);
    for (const key of Object.keys(frame).filter(key => key.endsWith('opacity'))) assert.ok(frame[key] >= 0 && frame[key] <= 1, key);
  }
});
test('reduced motion exposes static content without immersive scroll layers', () => {
  for (const p of [0, .4, 1]) {
    const frame = introFrame(p, true);
    assert.equal(frame['--headset-opacity'], 0);
    assert.equal(frame['--name-opacity'], 0);
    assert.equal(frame['--world-opacity'], 1);
    assert.equal(frame['--reveal-opacity'], 1);
    assert.equal(frame['--fragment-opacity'], 0);
  }
});

test('names join at the central anchor before the logo lifts and content appears', () => {
  assert.equal(introFrame(.64)['--name-gap'],0);
  assert.equal(introFrame(.64)['--name-opacity'],1);
  assert.equal(introFrame(.79)['--brand-opacity'],1);
  assert.equal(introFrame(.79)['--brand-lift'],'0vh');
  assert.equal(introFrame(.79)['--reveal-opacity'],0);
  for (const p of [0,.5,.68,.72,.78,1]) {
    const frame = introFrame(p);
    assert.equal(frame['--name-y'], '0px');
    assert.equal(frame['--reveal-y'], '0px');
  }
  for (let p = .6; p <= .85; p += .01) {
    const frame = introFrame(p);
    assert.equal(frame['--name-opacity'] * frame['--reveal-opacity'],0);
  }
});
test('portal burst is scroll-bound and never flashes in reduced motion', () => {
  assert.equal(introFrame(0)['--burst-opacity'],0);
  assert.equal(introFrame(1)['--burst-opacity'],0);
  assert.ok(introFrame(.52)['--burst-opacity'] > 0);
  assert.equal(introFrame(.52,true)['--burst-opacity'],0);
});

test('headset dips, returns to its axis and crosses an eye-alignment flash', () => {
  assert.equal(introFrame(0)['--headset-y'],'0vh');
  assert.ok(Number.parseFloat(introFrame(.32)['--headset-y']) > 0);
  assert.ok(Math.abs(Number.parseFloat(introFrame(1)['--headset-y'])) < 1e-12);
  assert.ok(introFrame(.52)['--eye-opacity'] > 0);
  assert.ok(introFrame(.65)['--flash-opacity'] > 0);
  assert.equal(introFrame(0)['--flash-opacity'],0);
  assert.equal(introFrame(1)['--flash-opacity'],0);
});

test('reduced motion also disables the eye portal and transition flash', () => {
  for (const p of [0,.52,.65,1]) {
    const frame = introFrame(p,true);
    assert.equal(frame['--eye-opacity'],0);
    assert.equal(frame['--flash-opacity'],0);
    assert.equal(frame['--threshold-copy-opacity'],0);
  }
});
