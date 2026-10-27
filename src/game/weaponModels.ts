import * as THREE from 'three';

export interface WeaponModelRig {
  root: THREE.Group;
  magazine: THREE.Object3D | null;
  bolt: THREE.Object3D | null;
  muzzlePoint: THREE.Vector3;
  ejectionPoint: THREE.Vector3;
  sightPoint: THREE.Vector3; // for ADS alignment
}

/**
 * Creates a high-detail composite 3D M4A1 SOPMOD Assault Rifle
 */
export function createM4A1Model(): WeaponModelRig {
  const root = new THREE.Group();

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    metalness: 0.85,
    roughness: 0.28,
  });
  const mattePolymer = new THREE.MeshStandardMaterial({
    color: 0x242728,
    metalness: 0.1,
    roughness: 0.82,
  });
  const tanAccent = new THREE.MeshStandardMaterial({
    color: 0x5a503e, // Flat Dark Earth (FDE)
    metalness: 0.15,
    roughness: 0.75,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x334455,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
  });
  const reticleMat = new THREE.MeshBasicMaterial({
    color: 0xff1122,
  });

  // 1. Receiver (Upper + Lower)
  const receiverGeo = new THREE.BoxGeometry(0.046, 0.075, 0.26);
  const receiver = new THREE.Mesh(receiverGeo, darkSteel);
  receiver.position.set(0, 0, 0);
  root.add(receiver);

  // 2. Quad-rail Handguard
  const handguardGeo = new THREE.BoxGeometry(0.048, 0.06, 0.28);
  const handguard = new THREE.Mesh(handguardGeo, tanAccent);
  handguard.position.set(0, 0.005, -0.27);
  root.add(handguard);

  // Rail ribs
  for (let r = 0; r < 5; r++) {
    const ribGeo = new THREE.BoxGeometry(0.052, 0.012, 0.015);
    const rib = new THREE.Mesh(ribGeo, darkSteel);
    rib.position.set(0, 0.034, -0.17 - r * 0.045);
    root.add(rib);
  }

  // 3. Barrel & Flash Hider
  const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 12);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, darkSteel);
  barrel.position.set(0, 0.012, -0.47);
  root.add(barrel);

  const muzzleBrakeGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.05, 10);
  muzzleBrakeGeo.rotateX(Math.PI / 2);
  const muzzleBrake = new THREE.Mesh(muzzleBrakeGeo, darkSteel);
  muzzleBrake.position.set(0, 0.012, -0.61);
  root.add(muzzleBrake);

  // 4. Magpul Stock & Buffer Tube
  const bufferTubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 12);
  bufferTubeGeo.rotateX(Math.PI / 2);
  const bufferTube = new THREE.Mesh(bufferTubeGeo, darkSteel);
  bufferTube.position.set(0, 0.02, 0.2);
  root.add(bufferTube);

  const stockGeo = new THREE.BoxGeometry(0.042, 0.12, 0.18);
  const stock = new THREE.Mesh(stockGeo, tanAccent);
  stock.position.set(0, -0.01, 0.26);
  root.add(stock);

  // 5. Pistol Grip
  const gripGeo = new THREE.BoxGeometry(0.038, 0.12, 0.055);
  const grip = new THREE.Mesh(gripGeo, mattePolymer);
  grip.position.set(0, -0.085, 0.07);
  grip.rotation.x = 0.32;
  root.add(grip);

  // 6. Magazine (STANAG 30-rd)
  const magGeo = new THREE.BoxGeometry(0.034, 0.18, 0.07);
  const mag = new THREE.Mesh(magGeo, tanAccent);
  mag.position.set(0, -0.11, -0.07);
  mag.rotation.x = -0.18;
  root.add(mag);

  // 7. Holographic Reflex Sight
  const sightBaseGeo = new THREE.BoxGeometry(0.042, 0.02, 0.08);
  const sightBase = new THREE.Mesh(sightBaseGeo, darkSteel);
  sightBase.position.set(0, 0.048, -0.05);
  root.add(sightBase);

  const sightHoodGeo = new THREE.BoxGeometry(0.044, 0.05, 0.06);
  const sightHood = new THREE.Mesh(sightHoodGeo, darkSteel);
  sightHood.position.set(0, 0.075, -0.05);
  root.add(sightHood);

  const lensGeo = new THREE.PlaneGeometry(0.032, 0.032);
  const lens = new THREE.Mesh(lensGeo, glassMat);
  lens.position.set(0, 0.075, -0.07);
  root.add(lens);

  // Glowing holographic dot
  const dotGeo = new THREE.SphereGeometry(0.002, 8, 8);
  const dot = new THREE.Mesh(dotGeo, reticleMat);
  dot.position.set(0, 0.075, -0.071);
  root.add(dot);

  // 8. Bolt / Charging handle
  const boltGeo = new THREE.BoxGeometry(0.02, 0.015, 0.04);
  const bolt = new THREE.Mesh(boltGeo, darkSteel);
  bolt.position.set(0.024, 0.015, -0.01);
  root.add(bolt);

  return {
    root,
    magazine: mag,
    bolt: bolt,
    muzzlePoint: new THREE.Vector3(0, 0.012, -0.64),
    ejectionPoint: new THREE.Vector3(0.035, 0.02, -0.01),
    sightPoint: new THREE.Vector3(0, 0.075, -0.2),
  };
}

/**
 * Creates heavy M82A1 Barrett .50 BMG Anti-Materiel Precision Rifle
 */
export function createM82SniperModel(): WeaponModelRig {
  const root = new THREE.Group();

  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    metalness: 0.9,
    roughness: 0.22,
  });
  const carbonBlack = new THREE.MeshStandardMaterial({
    color: 0x101113,
    metalness: 0.3,
    roughness: 0.7,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb8860b,
    metalness: 0.95,
    roughness: 0.15,
  });

  // 1. Massive Upper/Lower Receiver
  const receiverGeo = new THREE.BoxGeometry(0.065, 0.1, 0.45);
  const receiver = new THREE.Mesh(receiverGeo, gunmetal);
  receiver.position.set(0, 0, 0);
  root.add(receiver);

  // 2. Heavy Fluted Bull Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 14);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, gunmetal);
  barrel.position.set(0, 0.015, -0.5);
  root.add(barrel);

  // Dual-baffle arrow muzzle brake
  const brakeGeo = new THREE.BoxGeometry(0.065, 0.045, 0.12);
  const brake = new THREE.Mesh(brakeGeo, gunmetal);
  brake.position.set(0, 0.015, -0.83);
  root.add(brake);

  // 3. High Magnification Tactical Scope
  const scopeTubeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.32, 16);
  scopeTubeGeo.rotateX(Math.PI / 2);
  const scopeTube = new THREE.Mesh(scopeTubeGeo, carbonBlack);
  scopeTube.position.set(0, 0.09, -0.02);
  root.add(scopeTube);

  // Front Objective Bell
  const bellGeo = new THREE.CylinderGeometry(0.026, 0.02, 0.08, 16);
  bellGeo.rotateX(Math.PI / 2);
  const bell = new THREE.Mesh(bellGeo, carbonBlack);
  bell.position.set(0, 0.09, -0.21);
  root.add(bell);

  // Turrets (windage & elevation knobs)
  const turretElevGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12);
  const turretElev = new THREE.Mesh(turretElevGeo, brassMat);
  turretElev.position.set(0, 0.115, -0.02);
  root.add(turretElev);

  const turretWindGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.02, 12);
  turretWindGeo.rotateZ(Math.PI / 2);
  const turretWind = new THREE.Mesh(turretWindGeo, brassMat);
  turretWind.position.set(0.026, 0.09, -0.02);
  root.add(turretWind);

  // Scope rings
  const ring1Geo = new THREE.BoxGeometry(0.046, 0.045, 0.025);
  const ring1 = new THREE.Mesh(ring1Geo, gunmetal);
  ring1.position.set(0, 0.075, 0.06);
  root.add(ring1);
  const ring2 = ring1.clone();
  ring2.position.set(0, 0.075, -0.1);
  root.add(ring2);

  // 4. Heavy .50 BMG Magazine
  const magGeo = new THREE.BoxGeometry(0.05, 0.22, 0.11);
  const mag = new THREE.Mesh(magGeo, gunmetal);
  mag.position.set(0, -0.14, -0.06);
  root.add(mag);

  // 5. Heavy Stock & Buttpad
  const stockGeo = new THREE.BoxGeometry(0.055, 0.13, 0.26);
  const stock = new THREE.Mesh(stockGeo, carbonBlack);
  stock.position.set(0, -0.015, 0.32);
  root.add(stock);

  // 6. Grip
  const gripGeo = new THREE.BoxGeometry(0.04, 0.14, 0.06);
  const grip = new THREE.Mesh(gripGeo, carbonBlack);
  grip.position.set(0, -0.1, 0.12);
  grip.rotation.x = 0.3;
  root.add(grip);

  // 7. Folding Bipod
  const bipodMountGeo = new THREE.BoxGeometry(0.05, 0.03, 0.04);
  const bipodMount = new THREE.Mesh(bipodMountGeo, gunmetal);
  bipodMount.position.set(0, -0.035, -0.35);
  root.add(bipodMount);

  const legGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.22, 8);
  const legLeft = new THREE.Mesh(legGeo, gunmetal);
  legLeft.position.set(-0.06, -0.13, -0.35);
  legLeft.rotation.z = 0.3;
  root.add(legLeft);

  const legRight = new THREE.Mesh(legGeo, gunmetal);
  legRight.position.set(0.06, -0.13, -0.35);
  legRight.rotation.z = -0.3;
  root.add(legRight);

  return {
    root,
    magazine: mag,
    bolt: null,
    muzzlePoint: new THREE.Vector3(0, 0.015, -0.9),
    ejectionPoint: new THREE.Vector3(0.045, 0.03, -0.04),
    sightPoint: new THREE.Vector3(0, 0.09, -0.1),
  };
}

/**
 * Creates Benelli M4 Tactical Shotgun
 */
export function createShotgunModel(): WeaponModelRig {
  const root = new THREE.Group();

  const steel = new THREE.MeshStandardMaterial({
    color: 0x222428,
    metalness: 0.8,
    roughness: 0.3,
  });
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x181a1d,
    metalness: 0.1,
    roughness: 0.8,
  });

  // Receiver
  const recGeo = new THREE.BoxGeometry(0.044, 0.075, 0.28);
  const rec = new THREE.Mesh(recGeo, steel);
  root.add(rec);

  // Barrel
  const barGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.44, 12);
  barGeo.rotateX(Math.PI / 2);
  const bar = new THREE.Mesh(barGeo, steel);
  bar.position.set(0, 0.02, -0.34);
  root.add(bar);

  // Tube Magazine
  const tubeGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.42, 12);
  tubeGeo.rotateX(Math.PI / 2);
  const tube = new THREE.Mesh(tubeGeo, steel);
  tube.position.set(0, -0.01, -0.33);
  root.add(tube);

  // Ribbed Forend
  const forendGeo = new THREE.BoxGeometry(0.048, 0.055, 0.22);
  const forend = new THREE.Mesh(forendGeo, polymer);
  forend.position.set(0, 0, -0.28);
  root.add(forend);

  // Stock & Grip
  const stockGeo = new THREE.BoxGeometry(0.04, 0.11, 0.24);
  const stock = new THREE.Mesh(stockGeo, polymer);
  stock.position.set(0, -0.02, 0.24);
  root.add(stock);

  return {
    root,
    magazine: null,
    bolt: null,
    muzzlePoint: new THREE.Vector3(0, 0.02, -0.57),
    ejectionPoint: new THREE.Vector3(0.03, 0.015, -0.05),
    sightPoint: new THREE.Vector3(0, 0.045, -0.2),
  };
}

/**
 * Creates Glock 19 Tactical Sidearm
 */
export function createPistolModel(): WeaponModelRig {
  const root = new THREE.Group();

  const slideMat = new THREE.MeshStandardMaterial({
    color: 0x1f2226,
    metalness: 0.9,
    roughness: 0.25,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x151618,
    metalness: 0.05,
    roughness: 0.85,
  });
  const sightWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Slide
  const slideGeo = new THREE.BoxGeometry(0.032, 0.038, 0.19);
  const slide = new THREE.Mesh(slideGeo, slideMat);
  slide.position.set(0, 0.035, -0.02);
  root.add(slide);

  // Sights
  const frontSightGeo = new THREE.BoxGeometry(0.005, 0.008, 0.01);
  const frontSight = new THREE.Mesh(frontSightGeo, sightWhite);
  frontSight.position.set(0, 0.058, -0.1);
  root.add(frontSight);

  // Polymer Frame & Grip
  const gripGeo = new THREE.BoxGeometry(0.03, 0.11, 0.05);
  const grip = new THREE.Mesh(gripGeo, frameMat);
  grip.position.set(0, -0.04, 0.03);
  grip.rotation.x = 0.22;
  root.add(grip);

  // Trigger guard
  const guardGeo = new THREE.BoxGeometry(0.015, 0.03, 0.045);
  const guard = new THREE.Mesh(guardGeo, frameMat);
  guard.position.set(0, -0.005, -0.03);
  root.add(guard);

  return {
    root,
    magazine: null,
    bolt: slide,
    muzzlePoint: new THREE.Vector3(0, 0.035, -0.12),
    ejectionPoint: new THREE.Vector3(0.02, 0.04, -0.01),
    sightPoint: new THREE.Vector3(0, 0.058, -0.15),
  };
}
