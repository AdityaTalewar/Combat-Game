import * as THREE from 'three';
import { audio } from './audio';

export interface BallisticProfile {
  caliberName: string;
  muzzleVelocity: number;      // m/s in simulation units (scaled for game feel, e.g. 140 for 5.56mm)
  massGrains: number;          // grain weight (e.g. 62 gr for SS109)
  bulletDropCoeff: number;     // gravity acceleration scalar
  dragCoeff: number;           // air resistance deceleration
  damage: number;              // base hit damage
  penetration: number;         // 1.0 = can punch through thin wood/sheet metal
  tracerColor: number;         // hex color
  spreadAngle: number;         // base cone dispersion (rad)
}

export const BALLISTIC_PROFILES: Record<string, BallisticProfile> = {
  'M4A1': {
    caliberName: '5.56x45mm NATO M855',
    muzzleVelocity: 160,
    massGrains: 62,
    bulletDropCoeff: 9.81,
    dragCoeff: 0.08,
    damage: 38,
    penetration: 1.2,
    tracerColor: 0xffe680, // High-visibility military yellow-amber
    spreadAngle: 0.0035,
  },
  'M82_SNIPER': {
    caliberName: '12.7x99mm .50 BMG M33',
    muzzleVelocity: 230,
    massGrains: 660,
    bulletDropCoeff: 9.81,
    dragCoeff: 0.035,
    damage: 175,
    penetration: 3.5,
    tracerColor: 0xff6622, // Fiery orange heavy tracer
    spreadAngle: 0.0006, // Extreme sub-MOA precision
  },
  'SHOTGUN': {
    caliberName: '12-Gauge 00 Buckshot (8 Pellets)',
    muzzleVelocity: 95,
    massGrains: 54,
    bulletDropCoeff: 11.5,
    dragCoeff: 0.28,
    damage: 22, // per pellet x8 = 176 potential point-blank
    penetration: 0.4,
    tracerColor: 0xff8833,
    spreadAngle: 0.038,
  },
  'PISTOL': {
    caliberName: '9x19mm Parabellum FMJ',
    muzzleVelocity: 110,
    massGrains: 124,
    bulletDropCoeff: 9.81,
    dragCoeff: 0.16,
    damage: 26,
    penetration: 0.6,
    tracerColor: 0xffffaa,
    spreadAngle: 0.008,
  },
  'ENEMY_AK': {
    caliberName: '7.62x39mm M43 Soviet',
    muzzleVelocity: 130,
    massGrains: 123,
    bulletDropCoeff: 9.81,
    dragCoeff: 0.1,
    damage: 18,
    penetration: 1.0,
    tracerColor: 0x55ff66, // Green tracer typical of opposing forces
    spreadAngle: 0.016,
  }
};

export interface ActiveBullet {
  id: number;
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  profile: BallisticProfile;
  remainingPenetrations: number;
  isPlayer: boolean;
  timeAlive: number;
  maxLife: number;
  tracerMesh: THREE.Mesh;
  flightPath: THREE.Vector3[];
}

export interface SpentCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  bounces: number;
  life: number;
}

export interface ImpactParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  colorType: 'spark' | 'dust' | 'flesh';
}

export class BallisticsEngine {
  private bullets: ActiveBullet[] = [];
  private casings: SpentCasing[] = [];
  private particles: ImpactParticle[] = [];
  private bulletIdCounter = 0;

  // Environmental conditions
  public wind: THREE.Vector3 = new THREE.Vector3(1.8, 0, 0.4); // Crosswind (m/s)
  public showTrajectoryDebug: boolean = false;

  // Shared geometries and materials for zero GC
  private tracerGeo: THREE.CylinderGeometry;
  private casingGeo: THREE.CylinderGeometry;
  private particleGeo: THREE.BoxGeometry;
  private casingMat: THREE.MeshStandardMaterial;

  private scene: THREE.Scene;

  // Reusable vectors for zero GC per frame
  private _step = new THREE.Vector3();
  private _ray = new THREE.Ray();
  private _disp = new THREE.Vector3();
  private _tempPos = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.tracerGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6);
    this.tracerGeo.rotateX(Math.PI / 2); // align with flight forward

    this.casingGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.045, 6);
    this.casingMat = new THREE.MeshStandardMaterial({
      color: 0xcd7f32,
      roughness: 0.25,
      metalness: 0.9,
    });

    this.particleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  }

  /**
   * Spawn a realistic projectile with muzzle velocity, spread deviation, and camera forward vector
   */
  public fireBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    profileKey: string,
    isPlayer: boolean = true,
    spreadMultiplier: number = 1.0
  ): ActiveBullet[] {
    const profile = BALLISTIC_PROFILES[profileKey] || BALLISTIC_PROFILES['M4A1'];
    const pelletCount = profileKey === 'SHOTGUN' ? 8 : 1;
    const spawned: ActiveBullet[] = [];

    for (let i = 0; i < pelletCount; i++) {
      // Calculate spread angle deviation
      const effSpread = profile.spreadAngle * spreadMultiplier;
      const spreadX = (Math.random() - 0.5) * 2 * effSpread;
      const spreadY = (Math.random() - 0.5) * 2 * effSpread;

      const finalDir = direction.clone();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction)
      );
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction)
      );
      finalDir.addScaledVector(right, spreadX);
      finalDir.addScaledVector(up, spreadY);
      finalDir.normalize();

      // Velocity = Direction * Muzzle Velocity
      const velocity = finalDir.multiplyScalar(profile.muzzleVelocity);

      // Create glowing tracer mesh
      const tracerMat = new THREE.MeshBasicMaterial({
        color: profile.tracerColor,
        transparent: true,
        opacity: 0.95,
      });
      const tracerMesh = new THREE.Mesh(this.tracerGeo, tracerMat);
      tracerMesh.position.copy(origin);
      tracerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), finalDir);
      this.scene.add(tracerMesh);

      const bullet: ActiveBullet = {
        id: ++this.bulletIdCounter,
        position: origin.clone(),
        prevPosition: origin.clone(),
        velocity: velocity,
        profile: profile,
        remainingPenetrations: profile.penetration > 1 ? 1 : 0,
        isPlayer: isPlayer,
        timeAlive: 0,
        maxLife: 4.0, // seconds
        tracerMesh: tracerMesh,
        flightPath: [origin.clone()],
      };

      this.bullets.push(bullet);
      spawned.push(bullet);
    }

    return spawned;
  }

  /**
   * Eject physical spent brass casing with realistic spin & arc
   */
  public ejectCasing(chamberPos: THREE.Vector3, rightDir: THREE.Vector3, upDir: THREE.Vector3) {
    const mesh = new THREE.Mesh(this.casingGeo, this.casingMat);
    mesh.position.copy(chamberPos);
    this.scene.add(mesh);

    // Lateral impulse + upward pop + forward drift
    const velocity = rightDir.clone().multiplyScalar(2.2 + Math.random() * 0.8)
      .addScaledVector(upDir, 1.8 + Math.random() * 0.6)
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4));

    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40
    );

    this.casings.push({
      mesh,
      velocity,
      angularVelocity,
      bounces: 0,
      life: 0,
    });
  }

  /**
   * Spawn impact sparks, dust, or flesh hits
   */
  public spawnImpactEffect(point: THREE.Vector3, normal: THREE.Vector3, type: 'spark' | 'dust' | 'flesh') {
    const count = type === 'spark' ? 7 : type === 'flesh' ? 6 : 8;
    const baseColor = type === 'spark' ? 0xffcc33 : type === 'flesh' ? 0x880000 : 0xb59b77;

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.9,
      });
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.copy(point);
      p.scale.setScalar(type === 'flesh' ? 0.8 : 0.6 + Math.random() * 0.5);
      this.scene.add(p);

      const vel = normal.clone().multiplyScalar(2.5 + Math.random() * 2.5)
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ));

      this.particles.push({
        mesh: p,
        velocity: vel,
        life: 0,
        maxLife: type === 'spark' ? 0.35 : 0.55,
        colorType: type,
      });
    }
  }

  /**
   * Update all active ballistics simulation
   */
  public update(
    dt: number,
    onBulletCollisionCheck: (bullet: ActiveBullet, from: THREE.Vector3, to: THREE.Vector3) => boolean
  ) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Update Active Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.timeAlive += clampedDt;

      b.prevPosition.copy(b.position);

      // Aerodynamic Drag: F_drag = 0.5 * rho * v^2 * Cd => dv = -v * dragCoeff * dt
      const speed = b.velocity.length();
      const dragFactor = Math.max(0, 1 - (b.profile.dragCoeff * 0.015 * speed * clampedDt));
      b.velocity.multiplyScalar(dragFactor);

      // Gravity Drop: dy = -g * dt
      b.velocity.y -= b.profile.bulletDropCoeff * clampedDt;

      // Crosswind Drift: dv_wind = wind * (time / mass)
      const windInfluence = clampedDt * 0.85;
      b.velocity.x += this.wind.x * windInfluence;
      b.velocity.z += this.wind.z * windInfluence;

      // Integrate Position
      this._step.copy(b.velocity).multiplyScalar(clampedDt);
      b.position.add(this._step);

      // Orient tracer along velocity vector
      b.tracerMesh.position.copy(b.position);
      if (b.velocity.lengthSq() > 0.01) {
        b.tracerMesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          b.velocity.clone().normalize()
        );
      }

      // Record trajectory history for debug/sniper ballistics trail
      if (b.flightPath.length < 120 && b.timeAlive % 0.02 < clampedDt) {
        b.flightPath.push(b.position.clone());
      }

      // Raycast collision check between prevPosition and position to eliminate tunneling
      const collided = onBulletCollisionCheck(b, b.prevPosition, b.position);

      // Expiry or ground check
      const hitGround = b.position.y <= 0;
      if (hitGround) {
        this.spawnImpactEffect(b.position, new THREE.Vector3(0, 1, 0), 'dust');
        audio.playCasingDrop();
      }

      if (collided || hitGround || b.timeAlive >= b.maxLife) {
        this.scene.remove(b.tracerMesh);
        (b.tracerMesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update Spent Casings
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.life += clampedDt;

      c.velocity.y -= 9.81 * clampedDt;
      c.mesh.position.addScaledVector(c.velocity, clampedDt);

      c.mesh.rotation.x += c.angularVelocity.x * clampedDt;
      c.mesh.rotation.y += c.angularVelocity.y * clampedDt;
      c.mesh.rotation.z += c.angularVelocity.z * clampedDt;

      // Ground bounce
      if (c.mesh.position.y <= 0.02) {
        c.mesh.position.y = 0.02;
        if (c.velocity.y < -0.4 && c.bounces < 2) {
          c.velocity.y = -c.velocity.y * 0.45;
          c.velocity.x *= 0.65;
          c.velocity.z *= 0.65;
          c.angularVelocity.multiplyScalar(0.5);
          c.bounces++;
          if (c.bounces === 1) audio.playCasingDrop();
        } else {
          c.velocity.set(0, 0, 0);
          c.angularVelocity.set(0, 0, 0);
        }
      }

      if (c.life > 4.0) {
        this.scene.remove(c.mesh);
        this.casings.splice(i, 1);
      }
    }

    // 3. Update Impact Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += clampedDt;

      p.velocity.y -= 7.5 * clampedDt;
      p.mesh.position.addScaledVector(p.velocity, clampedDt);

      const alpha = 1 - (p.life / p.maxLife);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, alpha);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        mat.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  public getBulletCount(): number {
    return this.bullets.length;
  }

  public clearAll() {
    for (const b of this.bullets) {
      this.scene.remove(b.tracerMesh);
      (b.tracerMesh.material as THREE.Material).dispose();
    }
    this.bullets = [];

    for (const c of this.casings) {
      this.scene.remove(c.mesh);
    }
    this.casings = [];

    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
