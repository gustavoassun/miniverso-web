import * as THREE from 'three';
import { clamp } from '../core/math.js';

// Ferrovia: um círculo que dá a volta no planeta, ligando a indústria ao porto.
const RAIL_AXIS = new THREE.Vector3(0.28, 0.93, 0.24).normalize();
const RAIL_U = new THREE.Vector3().crossVectors(RAIL_AXIS, new THREE.Vector3(1, 0, 0)).normalize();
const RAIL_V = new THREE.Vector3().crossVectors(RAIL_AXIS, RAIL_U).normalize();
const NEG_AXIS = RAIL_AXIS.clone().negate();
const onRail = th => RAIL_U.clone().multiplyScalar(Math.cos(th)).addScaledVector(RAIL_V, Math.sin(th));
// A ferrovia serpenteia: sobe e desce em latitude enquanto dá a volta, passando pelo planeta todo.
const railLat = th => 0.3 * Math.sin(2 * th + 0.6);
const nearRail = (th, offset = 0) => { const l = railLat(th) + offset; return onRail(th).multiplyScalar(Math.cos(l)).addScaledVector(RAIL_AXIS, Math.sin(l)).normalize(); };
const railPt = th => nearRail(th, 0);
const railTan = th => railPt(th + 1e-3).sub(railPt(th - 1e-3)).normalize();
// Distância angular (aprox.) de um ponto até a linha do trem.
const railDist = d => Math.abs(Math.asin(clamp(d.dot(RAIL_AXIS), -1, 1)) - railLat(Math.atan2(d.dot(RAIL_V), d.dot(RAIL_U))));
// Base do trem num ponto: x ao longo da linha, y para fora do planeta.
const railBasis = (th, m4 = new THREE.Matrix4()) => { const r = railPt(th), t = railTan(th); return m4.makeBasis(t, r, new THREE.Vector3().crossVectors(t, r)); };

export { nearRail, railBasis, railDist, railPt, railTan };
