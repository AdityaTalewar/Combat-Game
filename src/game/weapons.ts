import * as THREE from 'three';
import { audio } from './audio';
import { BallisticsEngine } from './ballistics';
import {
  createM4A1Model,
  createM82SniperModel,
  createShotgunModel,
  createPistolModel,
  WeaponModelRig,
} from './weaponModels';

export type FireMode = 'auto' | 'burst' | 'semi';
export type Stance = 'stand' | 'crouch' | 'prone';

export interface WeaponConfig {
  id: string;
  name: string;
  caliber: string;
  fireModes: FireMode[];
  magCapacity: number;
  fireRateRpm: number;
  reloadTime: number;
  adsFov: number;
  recoilPitch: number;
  recoilKickZ: number;
  ballisticKey: string;
  soundType: 'assault' | 'sniper' | 'shotgun' | 'pistol';
}

export const WEAPON_CONFIGS: Record<string, WeaponConfig> = {
  M4A1: {
    id: 'M4A1',
    name: 'M4A1 SOPMOD Block II',
    caliber: '5.56x45mm NATO',
    fireModes: ['auto', 'burst', 'semi'],
    magCapacity: 30,
    fireRateRpm: 800,
    reloadTime: 2.2,
    adsFov: 52,
    recoilPitch: 0.038,
    recoilKickZ: 0.035,
    ballisticKey: 'M4A1',
    soundType: 'assault',
  },
  M82_SNIPER: {
    id: 'M82_SNIPER',
    name: 'Barrett M82A1 Anti-Materiel',
    caliber: '12.7x99mm .50 BMG',
    fireModes: ['semi'],
    magCapacity: 10,
    fireRateRpm: 120,
    reloadTime: 3.4,
    adsFov: 14, // extreme sniper magnification
    recoilPitch: 0.12,
    recoilKickZ: 0.08,
    ballisticKey: 'M82_SNIPER',
    soundType: 'sniper',
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'Benelli M4 Super 90',
    caliber: '12-Gauge 00 Buck',
    fireModes: ['semi'],
    magCapacity: 7,
    fireRateRpm: 240,
    reloadTime: 2.8,
    adsFov: 62,
    recoilPitch: 0.075,
    recoilKickZ: 0.065,
    ballisticKey: 'SHOTGUN',
    soundType: 'shotgun',
  },
  PISTOL: {
    id: 'PISTOL',
    name: 'Glock 19 Gen5 Tactical',
    caliber: '9x19mm Parabellum',
    fireModes: ['semi'],
    magCapacity: 15,
    fireRateRpm: 450,
    reloadTime: 1.6,
    adsFov: 60,
    recoilPitch: 0.042,
    recoilKickZ: 0.025,
    ballisticKey: 'PISTOL',
    soundType: 'pistol',
  },
};

export class WeaponManager {
  public currentWeaponId: string = 'M4A1';
  public currentAmmo: Record<string, number> = {
    M4A1: 30,
    M82_SNIPER: 10,
    SHOTGUN: 7,
    PISTOL: 15,
  };
  public reserveAmmo: Record<string, number> = {
    M4A1: 180,
    M82_SNIPER: 40,
    SHOTGUN: 42,
    PISTOL: 90,
  };
  public currentFireMode: FireMode = 'auto';

  public isAiming: boolean = false;
  public isReloading: boolean = false;
  public reloadProgress: number = 0;
  public isInspecting: boolean = false;
  public stance: Stance = 'stand';

  // Weapon Container attached to camera
  public weaponHolder: THREE.Group;
  public currentRig: WeaponModelRig | null = null;
  private weaponRigs: Record<string, WeaponModelRig> = {};

  // Procedural Animation Offsets
  private hipPosition = new THREE.Vector3(0.18, -0.16, -0.36);
  private currentOffsetPos = new THREE.Vector3();
  private currentOffsetRot = new THREE.Euler();

  // Recoil physics (spring-damper)
  private recoilPos = new THREE.Vector3();
  private recoilRot = new THREE.Vector3();
  private recoilVel = new THREE.Vector3();
  private recoilRotVel = new THREE.Vector3();

  // Procedural Sway & Bob
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private walkTime = 0;
  private breathTime = 0;

  // Timers
  private lastShotTime = 0;
  private burstCountRemaining = 0;
  private burstInterval = 0.08;
  private lastBurstShotTime = 0;
  private inspectTime = 0;

  // Muzzle flash
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleFlashLight: THREE.PointLight;
  private flashLife = 0;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private ballistics: BallisticsEngine;

  constructor(scene: THREE.Scene, camera: THREE.Camera, ballistics: BallisticsEngine) {
    this.scene = scene;
    this.camera = camera;
    this.ballistics = ballistics;

    this.weaponHolder = new THREE.Group();
    this.weaponHolder.position.copy(this.hipPosition);
    this.currentOffsetPos.copy(this.hipPosition);

    // Muzzle flash star
    const flashGeo = new THREE.OctahedronGeometry(0.06, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0,
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.visible = false;
    this.weaponHolder.add(this.muzzleFlashMesh);

    this.muzzleFlashLight = new THREE.PointLight(0xff9900, 0, 8);
    this.weaponHolder.add(this.muzzleFlashLight);

    // Build all rigs
    this.weaponRigs['M4A1'] = createM4A1Model();
    this.weaponRigs['M82_SNIPER'] = createM82SniperModel();
    this.weaponRigs['SHOTGUN'] = createShotgunModel();
    this.weaponRigs['PISTOL'] = createPistolModel();

    this.switchWeapon('M4A1');
  }

  public switchWeapon(newId: string) {
    if (!WEAPON_CONFIGS[newId]) return;
    if (this.currentRig) {
      this.weaponHolder.remove(this.currentRig.root);
    }

    this.currentWeaponId = newId;
    this.currentRig = this.weaponRigs[newId];
    this.weaponHolder.add(this.currentRig.root);

    const config = WEAPON_CONFIGS[newId];
    if (!config.fireModes.includes(this.currentFireMode)) {
      this.currentFireMode = config.fireModes[0];
    }

    this.isReloading = false;
    this.reloadProgress = 0;
    this.isInspecting = false;
    audio.playSelectorClick();
  }

  public cycleFireMode() {
    const config = WEAPON_CONFIGS[this.currentWeaponId];
    if (config.fireModes.length <= 1) return;
    const idx = config.fireModes.indexOf(this.currentFireMode);
    const nextIdx = (idx + 1) % config.fireModes.length;
    this.currentFireMode = config.fireModes[nextIdx];
    audio.playSelectorClick();
  }

  public addMouseDelta(dx: number, dy: number) {
    this.mouseDeltaX += dx * 0.001;
    this.mouseDeltaY += dy * 0.001;
  }

  public startReload() {
    const config = WEAPON_CONFIGS[this.currentWeaponId];
    if (this.isReloading) return;
    if (this.currentAmmo[this.currentWeaponId] >= config.magCapacity) return;
    if (this.reserveAmmo[this.currentWeaponId] <= 0) return;

    this.isReloading = true;
    this.reloadProgress = 0;
    this.isAiming = false;
    this.isInspecting = false;
    audio.playReloadStep('out');
  }

  public inspectWeapon() {
    if (this.isReloading || this.isAiming) return;
    this.isInspecting = !this.isInspecting;
    this.inspectTime = 0;
  }

  public tryShoot(now: number, playerSpreadFactor: number = 1.0): boolean {
    if (this.isReloading) return false;

    const config = WEAPON_CONFIGS[this.currentWeaponId];
    const shotInterval = 60 / config.fireRateRpm;

    if (now - this.lastShotTime < shotInterval) return false;

    if (this.currentAmmo[this.currentWeaponId] <= 0) {
      audio.playDryFire();
      this.lastShotTime = now;
      return false;
    }

    // Deduct ammo
    this.currentAmmo[this.currentWeaponId]--;
    this.lastShotTime = now;

    if (this.currentFireMode === 'burst') {
      this.burstCountRemaining = 2; // fired 1, 2 remaining
      this.lastBurstShotTime = now;
    }

    this.executeShot(playerSpreadFactor);
    return true;
  }

  private executeShot(spreadMultiplier: number = 1.0) {
    const config = WEAPON_CONFIGS[this.currentWeaponId];

    // Play gunshot audio
    audio.playGunshot(config.soundType);

    // Muzzle Flash
    this.flashLife = 0.05;
    this.muzzleFlashMesh.visible = true;
    (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
    this.muzzleFlashMesh.scale.setScalar(config.id === 'M82_SNIPER' ? 2.2 : 1.2);
    this.muzzleFlashLight.intensity = config.id === 'M82_SNIPER' ? 6.0 : 3.5;

    // Recoil impulse
    const stanceRecoilFactor = this.stance === 'prone' ? 0.3 : this.stance === 'crouch' ? 0.6 : 1.0;
    const aimRecoilFactor = this.isAiming ? 0.65 : 1.0;
    const totalRecoilMult = stanceRecoilFactor * aimRecoilFactor;

    this.recoilVel.z += config.recoilKickZ * totalRecoilMult;
    this.recoilVel.y += 0.015 * totalRecoilMult;
    this.recoilRotVel.x += config.recoilPitch * totalRecoilMult;
    this.recoilRotVel.y += (Math.random() - 0.5) * 0.02 * totalRecoilMult;
    this.recoilRotVel.z += (Math.random() - 0.5) * 0.015 * totalRecoilMult;

    // Fire ballistic projectile from camera eye/muzzle
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const muzzleWorld = new THREE.Vector3();
    if (this.currentRig) {
      this.currentRig.root.localToWorld(muzzleWorld.copy(this.currentRig.muzzlePoint));
    } else {
      muzzleWorld.copy(this.camera.position);
    }

    const effSpread = (this.isAiming ? 0.35 : 1.0) * spreadMultiplier;
    this.ballistics.fireBullet(
      muzzleWorld,
      camDir,
      config.ballisticKey,
      true,
      effSpread
    );

    // Eject spent casing
    if (this.currentRig) {
      const chamberWorld = new THREE.Vector3();
      this.currentRig.root.localToWorld(chamberWorld.copy(this.currentRig.ejectionPoint));
      const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      this.ballistics.ejectCasing(chamberWorld, rightDir, upDir);
    }
  }

  /**
   * Update weapon kinematics, procedural sway, breathing, ADS, and recoil decay
   */
  public update(dt: number, isMoving: boolean, isSprinting: boolean, now: number) {
    const clampedDt = Math.min(dt, 0.05);
    const config = WEAPON_CONFIGS[this.currentWeaponId];

    // Handle burst fire queue
    if (this.burstCountRemaining > 0 && now - this.lastBurstShotTime >= this.burstInterval) {
      if (this.currentAmmo[this.currentWeaponId] > 0) {
        this.currentAmmo[this.currentWeaponId]--;
        this.executeShot(1.2);
        this.lastBurstShotTime = now;
        this.burstCountRemaining--;
      } else {
        this.burstCountRemaining = 0;
      }
    }

    // Handle Muzzle Flash Fade
    if (this.flashLife > 0) {
      this.flashLife -= clampedDt;
      if (this.flashLife <= 0) {
        this.muzzleFlashMesh.visible = false;
        this.muzzleFlashLight.intensity = 0;
      }
    }

    // Handle Reload Progress
    if (this.isReloading) {
      this.reloadProgress += clampedDt / config.reloadTime;

      // Audio cues during reload phases
      if (this.reloadProgress > 0.45 && this.reloadProgress - clampedDt / config.reloadTime <= 0.45) {
        audio.playReloadStep('in');
      }
      if (this.reloadProgress > 0.85 && this.reloadProgress - clampedDt / config.reloadTime <= 0.85) {
        audio.playReloadStep('bolt');
      }

      if (this.reloadProgress >= 1.0) {
        this.isReloading = false;
        this.reloadProgress = 0;

        const needed = config.magCapacity - this.currentAmmo[this.currentWeaponId];
        const available = Math.min(needed, this.reserveAmmo[this.currentWeaponId]);
        this.currentAmmo[this.currentWeaponId] += available;
        this.reserveAmmo[this.currentWeaponId] -= available;
      }
    }

    // Recoil spring-damper physics
    const springStiffness = 180;
    const damping = 18;

    this.recoilVel.x += (-this.recoilPos.x * springStiffness - this.recoilVel.x * damping) * clampedDt;
    this.recoilVel.y += (-this.recoilPos.y * springStiffness - this.recoilVel.y * damping) * clampedDt;
    this.recoilVel.z += (-this.recoilPos.z * springStiffness - this.recoilVel.z * damping) * clampedDt;
    this.recoilPos.addScaledVector(this.recoilVel, clampedDt);

    this.recoilRotVel.x += (-this.recoilRot.x * springStiffness - this.recoilRotVel.x * damping) * clampedDt;
    this.recoilRotVel.y += (-this.recoilRot.y * springStiffness - this.recoilRotVel.y * damping) * clampedDt;
    this.recoilRotVel.z += (-this.recoilRot.z * springStiffness - this.recoilRotVel.z * damping) * clampedDt;
    this.recoilRot.addScaledVector(this.recoilRotVel, clampedDt);

    // Breathing & Walking Cadence
    this.breathTime += clampedDt * (isMoving ? 2.8 : 1.4);
    if (isMoving) {
      this.walkTime += clampedDt * (isSprinting ? 12 : 7.5);
    }

    // Harmonic weapon sway & bob
    let bobX = 0;
    let bobY = 0;
    if (isMoving && !this.isAiming) {
      const bobAmp = isSprinting ? 0.045 : 0.018;
      bobX = Math.cos(this.walkTime) * bobAmp;
      bobY = Math.sin(this.walkTime * 2) * bobAmp * 0.7;
    } else {
      // Idle figure-8 breathing
      const breathAmp = this.stance === 'prone' ? 0.001 : this.stance === 'crouch' ? 0.003 : 0.006;
      bobX = Math.cos(this.breathTime * 0.5) * breathAmp;
      bobY = Math.sin(this.breathTime) * breathAmp * 0.5;
    }

    // Mouse inertia weapon lag
    const lagX = -this.mouseDeltaX * 0.04;
    const lagY = this.mouseDeltaY * 0.04;
    this.mouseDeltaX *= Math.max(0, 1 - 10 * clampedDt);
    this.mouseDeltaY *= Math.max(0, 1 - 10 * clampedDt);

    // Target position calculation:
    // ADS Target aligns gun sight directly with camera center
    const targetPos = new THREE.Vector3();
    const targetRot = new THREE.Euler();

    if (this.isAiming && this.currentRig) {
      // Align sight point with (0, 0, -0.25)
      targetPos.set(
        -this.currentRig.sightPoint.x,
        -this.currentRig.sightPoint.y,
        -this.currentRig.sightPoint.z - 0.15
      );
      // Minimal breathing bob during ADS
      targetPos.x += bobX * 0.15;
      targetPos.y += bobY * 0.15;
    } else if (this.isReloading) {
      // Lower gun down and roll slightly left
      const reloadDip = Math.sin(this.reloadProgress * Math.PI) * 0.14;
      targetPos.copy(this.hipPosition).add(new THREE.Vector3(-0.04, -reloadDip, 0.04));
      targetRot.set(0.2, -0.3, 0.15);
    } else if (this.isInspecting) {
      this.inspectTime += clampedDt;
      targetPos.copy(this.hipPosition).add(new THREE.Vector3(-0.08, 0.05, 0.06));
      targetRot.set(-0.35, 0.65, -0.4);
      if (this.inspectTime > 2.8) {
        this.isInspecting = false;
      }
    } else if (isSprinting) {
      // Weapon tucked down while sprinting
      targetPos.copy(this.hipPosition).add(new THREE.Vector3(0.04, -0.12, 0.08));
      targetRot.set(0.35, -0.4, 0.1);
    } else {
      // Hip fire position + bob + lag
      targetPos.copy(this.hipPosition);
      targetPos.x += bobX + lagX;
      targetPos.y += bobY + lagY;
      targetRot.set(lagY * 0.8, lagX * 0.8, -lagX * 1.2);
    }

    // Add Recoil to Target
    targetPos.add(this.recoilPos);
    targetRot.x += this.recoilRot.x;
    targetRot.y += this.recoilRot.y;
    targetRot.z += this.recoilRot.z;

    // Smooth Lerp weapon transform
    const lerpSpeed = this.isAiming ? 18 : 12;
    this.currentOffsetPos.lerp(targetPos, Math.min(1.0, clampedDt * lerpSpeed));
    this.weaponHolder.position.copy(this.currentOffsetPos);

    this.weaponHolder.rotation.x = THREE.MathUtils.damp(this.weaponHolder.rotation.x, targetRot.x, 15, clampedDt);
    this.weaponHolder.rotation.y = THREE.MathUtils.damp(this.weaponHolder.rotation.y, targetRot.y, 15, clampedDt);
    this.weaponHolder.rotation.z = THREE.MathUtils.damp(this.weaponHolder.rotation.z, targetRot.z, 15, clampedDt);

    // Keep muzzle flash at muzzle position
    if (this.currentRig) {
      this.muzzleFlashMesh.position.copy(this.currentRig.muzzlePoint);
      this.muzzleFlashLight.position.copy(this.currentRig.muzzlePoint);
    }
  }

  public getAdsFov(): number {
    const config = WEAPON_CONFIGS[this.currentWeaponId];
    return this.isAiming ? config.adsFov : 75;
  }
}
