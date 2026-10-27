import * as THREE from 'three';

export interface WorldCollisionBox {
  box: THREE.Box3;
  type: 'concrete' | 'wood' | 'metal' | 'sandbag' | 'explosive_barrel';
  objectRef?: THREE.Object3D;
  health?: number;
}

export interface SteelTarget {
  mesh: THREE.Group;
  plate: THREE.Mesh;
  distance: number;
  isHit: boolean;
  hitTimer: number;
  box: THREE.Box3;
}

export interface ExplosiveBarrel {
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  exploded: boolean;
  box: THREE.Box3;
}

/**
 * Creates procedural terrain texture with military earth/dirt/gravel noise
 */
function createProceduralGroundTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base earth tone
  ctx.fillStyle = '#4a4436';
  ctx.fillRect(0, 0, 512, 512);

  // Gravel and dirt speckles
  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2.2 + 0.5;
    const shade = Math.floor(45 + Math.random() * 50);
    ctx.fillStyle = `rgb(${shade + 20}, ${shade + 12}, ${shade})`;
    ctx.fillRect(x, y, size, size);
  }

  // Tactical vehicle tire track stripes
  ctx.strokeStyle = 'rgba(30, 26, 20, 0.35)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(120, 512);
  ctx.moveTo(220, 0);
  ctx.lineTo(220, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export class WorldManager {
  public scene: THREE.Scene;
  public collisionBoxes: WorldCollisionBox[] = [];
  public steelTargets: SteelTarget[] = [];
  public explosiveBarrels: ExplosiveBarrel[] = [];
  public groundMesh!: THREE.Mesh;

  private concreteMat: THREE.MeshStandardMaterial;
  private woodMat: THREE.MeshStandardMaterial;
  private metalMat: THREE.MeshStandardMaterial;
  private sandbagMat: THREE.MeshStandardMaterial;
  private barrelMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    // Materials
    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x828485,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e5238,
      roughness: 0.85,
      metalness: 0.02,
    });
    this.metalMat = new THREE.MeshStandardMaterial({
      color: 0x2c3035,
      roughness: 0.35,
      metalness: 0.85,
    });
    this.sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x9e8867,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.barrelMat = new THREE.MeshStandardMaterial({
      color: 0xa82015,
      roughness: 0.4,
      metalness: 0.6,
    });

    this.buildTerrain(renderer);
    this.buildTacticalCompound();
    this.buildFiringRange();
    this.buildPerimeterHills();
  }

  private buildTerrain(renderer: THREE.WebGLRenderer) {
    const groundGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);

    const groundTex = createProceduralGroundTexture(renderer);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.92,
      metalness: 0.08,
    });

    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  /**
   * Multi-part Sandbag Wall
   */
  public createSandbagWall(x: number, z: number, rotY: number = 0): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const bagGeo = new THREE.BoxGeometry(0.55, 0.22, 0.3);
    const rows = 4;
    const cols = 5;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 1) ? 0.25 : 0;
      for (let c = 0; c < cols; c++) {
        const bag = new THREE.Mesh(bagGeo, this.sandbagMat);
        bag.position.set(
          -1.2 + c * 0.55 + offsetX,
          0.11 + r * 0.21,
          (Math.random() - 0.5) * 0.03
        );
        bag.rotation.y = (Math.random() - 0.5) * 0.08;
        bag.castShadow = true;
        bag.receiveShadow = true;
        group.add(bag);
      }
    }

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    this.collisionBoxes.push({ box, type: 'sandbag', objectRef: group });
    return group;
  }

  /**
   * Guard Watchtower with 4 pillars, roof, and platform
   */
  public createWatchtower(x: number, z: number): THREE.Group {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);

    const steelMat = this.metalMat;
    const woodFloorMat = this.woodMat;

    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 5.5, 8);
    const positions = [
      [-1.8, -1.8], [1.8, -1.8],
      [-1.8, 1.8], [1.8, 1.8]
    ];
    positions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(lx, 2.75, lz);
      leg.castShadow = true;
      tower.add(leg);
    });

    // Cross braces
    const crossGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 6);
    crossGeo.rotateZ(Math.PI / 4);
    const cross1 = new THREE.Mesh(crossGeo, steelMat);
    cross1.position.set(0, 2.5, -1.8);
    tower.add(cross1);

    // Platform
    const platGeo = new THREE.BoxGeometry(4.2, 0.2, 4.2);
    const plat = new THREE.Mesh(platGeo, woodFloorMat);
    plat.position.set(0, 5.5, 0);
    plat.castShadow = true;
    plat.receiveShadow = true;
    tower.add(plat);

    // Platform Railing / Sandbags
    const railGeo = new THREE.BoxGeometry(4.2, 0.9, 0.15);
    const railFront = new THREE.Mesh(railGeo, steelMat);
    railFront.position.set(0, 6.0, -2.0);
    tower.add(railFront);

    // Roof pillars & Corrugated Roof
    const roofPillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6);
    positions.forEach(([lx, lz]) => {
      const p = new THREE.Mesh(roofPillarGeo, steelMat);
      p.position.set(lx * 0.95, 6.6, lz * 0.95);
      tower.add(p);
    });

    const roofGeo = new THREE.BoxGeometry(4.8, 0.15, 4.8);
    const roof = new THREE.Mesh(roofGeo, steelMat);
    roof.position.set(0, 7.7, 0);
    roof.rotation.x = 0.08;
    roof.castShadow = true;
    tower.add(roof);

    this.scene.add(tower);

    const box = new THREE.Box3().setFromObject(plat);
    this.collisionBoxes.push({ box, type: 'metal', objectRef: tower });
    return tower;
  }

  /**
   * Military Tactical Vehicle (Humvee / APC)
   */
  public createTacticalVehicle(x: number, z: number, rotY: number = 0): THREE.Group {
    const vehicle = new THREE.Group();
    vehicle.position.set(x, 0, z);
    vehicle.rotation.y = rotY;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x47493a, // Olive Drab NATO
      roughness: 0.65,
      metalness: 0.35,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.9,
      metalness: 0.05,
    });

    // Hull Lower
    const hullGeo = new THREE.BoxGeometry(2.3, 0.9, 4.8);
    const hull = new THREE.Mesh(hullGeo, bodyMat);
    hull.position.set(0, 0.85, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    vehicle.add(hull);

    // Cabin Upper
    const cabinGeo = new THREE.BoxGeometry(2.1, 0.85, 2.6);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 1.6, -0.3);
    cabin.castShadow = true;
    vehicle.add(cabin);

    // 4 Wheels
    const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.36, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const wheelPositions = [
      [-1.25, 0.48, 1.4], [1.25, 0.48, 1.4],
      [-1.25, 0.48, -1.4], [1.25, 0.48, -1.4]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.position.set(wx, wy, wz);
      tire.castShadow = true;
      vehicle.add(tire);
    });

    // Front Bullbar / Grille
    const barGeo = new THREE.BoxGeometry(2.2, 0.6, 0.1);
    const bullbar = new THREE.Mesh(barGeo, this.metalMat);
    bullbar.position.set(0, 0.7, -2.45);
    vehicle.add(bullbar);

    this.scene.add(vehicle);

    const box = new THREE.Box3().setFromObject(vehicle);
    this.collisionBoxes.push({ box, type: 'metal', objectRef: vehicle });
    return vehicle;
  }

  /**
   * Explosive Fuel Barrel
   */
  public createExplosiveBarrel(x: number, z: number): ExplosiveBarrel {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const barrelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.95, 14);
    const barrel = new THREE.Mesh(barrelGeo, this.barrelMat);
    barrel.position.set(0, 0.475, 0);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    group.add(barrel);

    // Yellow warning stripe
    const stripeGeo = new THREE.CylinderGeometry(0.325, 0.325, 0.16, 14);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.475, 0);
    group.add(stripe);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const expBarrel: ExplosiveBarrel = {
      mesh: group,
      position: new THREE.Vector3(x, 0.475, z),
      health: 20,
      exploded: false,
      box,
    };

    this.explosiveBarrels.push(expBarrel);
    this.collisionBoxes.push({ box, type: 'explosive_barrel', objectRef: group });
    return expBarrel;
  }

  /**
   * Wooden Ammo Crate (Penetrable / Destructible)
   */
  public createWoodenCrate(x: number, y: number, z: number): THREE.Group {
    const crate = new THREE.Group();
    crate.position.set(x, y, z);

    const boxGeo = new THREE.BoxGeometry(1.1, 0.9, 1.1);
    const mesh = new THREE.Mesh(boxGeo, this.woodMat);
    mesh.position.set(0, 0.45, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    crate.add(mesh);

    // Metal corner brackets
    const bracketGeo = new THREE.BoxGeometry(1.12, 0.08, 1.12);
    const bracket = new THREE.Mesh(bracketGeo, this.metalMat);
    bracket.position.set(0, 0.45, 0);
    crate.add(bracket);

    this.scene.add(crate);

    const box = new THREE.Box3().setFromObject(crate);
    this.collisionBoxes.push({ box, type: 'wood', objectRef: crate, health: 60 });
    return crate;
  }

  /**
   * Concrete Jersey Barrier
   */
  public createConcreteBarrier(x: number, z: number, rotY: number = 0): THREE.Group {
    const barrier = new THREE.Group();
    barrier.position.set(x, 0, z);
    barrier.rotation.y = rotY;

    const baseGeo = new THREE.BoxGeometry(0.7, 0.35, 3.2);
    const base = new THREE.Mesh(baseGeo, this.concreteMat);
    base.position.set(0, 0.175, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    barrier.add(base);

    const topGeo = new THREE.BoxGeometry(0.35, 0.65, 3.2);
    const top = new THREE.Mesh(topGeo, this.concreteMat);
    top.position.set(0, 0.675, 0);
    top.castShadow = true;
    barrier.add(top);

    this.scene.add(barrier);

    const box = new THREE.Box3().setFromObject(barrier);
    this.collisionBoxes.push({ box, type: 'concrete', objectRef: barrier });
    return barrier;
  }

  /**
   * Steel Silhouette Target at explicit calibrated distance for Ballistics Testing
   */
  public createSteelSilhouette(x: number, z: number, distanceMeters: number): SteelTarget {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Steel stand legs
    const standGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
    const stand = new THREE.Mesh(standGeo, this.metalMat);
    stand.position.set(0, 0.7, 0);
    group.add(stand);

    // Silhouette Torso (White painted steel)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.04);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.3,
      metalness: 0.9,
    });
    const torso = new THREE.Mesh(torsoGeo, steelMat);
    torso.position.set(0, 1.35, 0);
    torso.castShadow = true;
    group.add(torso);

    // Silhouette Head
    const headGeo = new THREE.BoxGeometry(0.24, 0.24, 0.04);
    const head = new THREE.Mesh(headGeo, steelMat);
    head.position.set(0, 1.78, 0);
    head.castShadow = true;
    group.add(head);

    // Distance Signboard at base
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 64;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#222';
    sCtx.fillRect(0, 0, 128, 64);
    sCtx.fillStyle = '#ffcc00';
    sCtx.font = 'bold 24px monospace';
    sCtx.fillText(`${distanceMeters}m`, 30, 42);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.PlaneGeometry(0.7, 0.35);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 0.3, 0.1);
    group.add(sign);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const steelTarget: SteelTarget = {
      mesh: group,
      plate: torso,
      distance: distanceMeters,
      isHit: false,
      hitTimer: 0,
      box,
    };

    this.steelTargets.push(steelTarget);
    return steelTarget;
  }

  /**
   * Build the complete Tactical Compound / Forward Operating Base
   */
  private buildTacticalCompound() {
    // Perimeter sandbag lines & bunkers
    this.createSandbagWall(-8, -6, 0);
    this.createSandbagWall(8, -6, 0);
    this.createSandbagWall(-12, 4, Math.PI / 2);
    this.createSandbagWall(12, 4, Math.PI / 2);

    // Central bunker revetment
    this.createSandbagWall(0, -14, 0);
    this.createSandbagWall(-4, -16, Math.PI / 4);
    this.createSandbagWall(4, -16, -Math.PI / 4);

    // Watchtowers
    this.createWatchtower(-18, -18);
    this.createWatchtower(18, -18);

    // Tactical Vehicles
    this.createTacticalVehicle(-10, -10, 0.4);
    this.createTacticalVehicle(11, -12, -0.3);

    // Concrete Barriers
    this.createConcreteBarrier(-5, -2, 0);
    this.createConcreteBarrier(5, -2, 0);
    this.createConcreteBarrier(-15, 2, 0.8);
    this.createConcreteBarrier(15, 2, -0.8);

    // Wooden ammo crate stacks
    this.createWoodenCrate(-4, 0, -5);
    this.createWoodenCrate(-4, 0.9, -5);
    this.createWoodenCrate(6, 0, -4);
    this.createWoodenCrate(7, 0, -4.2);
    this.createWoodenCrate(6.5, 0.9, -4.1);

    // Explosive Barrels placed tactically near enemy pathways
    this.createExplosiveBarrel(-14, -8);
    this.createExplosiveBarrel(14, -8);
    this.createExplosiveBarrel(-2, -22);
    this.createExplosiveBarrel(8, -25);
    this.createExplosiveBarrel(0, -32);
  }

  /**
   * Build Calibrated Long-Range Ballistics Range (50m, 100m, 150m, 200m, 300m, 400m)
   */
  private buildFiringRange() {
    const distances = [50, 100, 150, 200, 300, 400];
    distances.forEach((d) => {
      // Targets spaced down the negative Z axis
      this.createSteelSilhouette(-8, -d, d);
      this.createSteelSilhouette(0, -d, d);
      this.createSteelSilhouette(8, -d, d);
    });

    // Range markers along the right lane
    for (let m = 25; m <= 400; m += 25) {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8);
      const pole = new THREE.Mesh(poleGeo, this.metalMat);
      pole.position.set(16, 1.0, -m);
      this.scene.add(pole);

      const flagGeo = new THREE.PlaneGeometry(0.8, 0.4);
      const flagMat = new THREE.MeshBasicMaterial({ color: 0xee2211, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(16.4, 1.8, -m);
      this.scene.add(flag);
    }
  }

  /**
   * Natural Perimeter Hills & Cliffs bounding the arena
   */
  private buildPerimeterHills() {
    const hillGeo = new THREE.ConeGeometry(24, 22, 7);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x3d372c,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Perimeter boundary mountains
    const angles = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0, 4.4, 4.8, 5.2, 5.6, 6.0];
    angles.forEach((a) => {
      const rad = 240 + Math.random() * 40;
      const hx = Math.cos(a) * rad;
      const hz = Math.sin(a) * rad;
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(hx, 11, hz);
      hill.scale.set(1 + Math.random() * 0.8, 0.8 + Math.random() * 0.6, 1 + Math.random() * 0.8);
      this.scene.add(hill);
    });
  }

  /**
   * Update dynamic targets (e.g. steel plate swing when dinged)
   */
  public update(dt: number) {
    for (const t of this.steelTargets) {
      if (t.isHit) {
        t.hitTimer -= dt;
        t.plate.rotation.x = Math.sin(t.hitTimer * 20) * (t.hitTimer * 0.4);
        if (t.hitTimer <= 0) {
          t.isHit = false;
          t.plate.rotation.x = 0;
        }
      }
    }
  }
}
