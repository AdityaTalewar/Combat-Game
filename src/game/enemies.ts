import * as THREE from 'three';
import { audio } from './audio';
import { BallisticsEngine } from './ballistics';

export interface EnemyHitbox {
  type: 'head' | 'body' | 'legs';
  box: THREE.Box3;
  meshRef: THREE.Object3D;
}

export interface EnemySoldier {
  id: number;
  root: THREE.Group;
  headMesh: THREE.Mesh;
  torsoMesh: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  rifleMesh: THREE.Group;
  muzzleFlash: THREE.Mesh;

  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPos: THREE.Vector3;
  health: number;
  maxHealth: number;
  isDead: boolean;
  deathTimer: number;
  deathDirection: THREE.Vector3;

  state: 'patrol' | 'cover' | 'aim' | 'flinch' | 'dead';
  stateTimer: number;
  shotTimer: number;
  burstCount: number;
  animTime: number;

  hitboxes: EnemyHitbox[];
}

export class EnemyManager {
  public enemies: EnemySoldier[] = [];
  private scene: THREE.Scene;
  private ballistics: BallisticsEngine;
  private idCounter = 0;

  // Materials for 3-12 part soldier
  private uniformMat: THREE.MeshStandardMaterial;
  private vestMat: THREE.MeshStandardMaterial;
  private helmetMat: THREE.MeshStandardMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private bootMat: THREE.MeshStandardMaterial;
  private rifleMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, ballistics: BallisticsEngine) {
    this.scene = scene;
    this.ballistics = ballistics;

    this.uniformMat = new THREE.MeshStandardMaterial({
      color: 0x3d4334, // Camo olive / drab
      roughness: 0.85,
      metalness: 0.1,
    });
    this.vestMat = new THREE.MeshStandardMaterial({
      color: 0x272b22, // Heavy tactical plate carrier
      roughness: 0.9,
      metalness: 0.2,
    });
    this.helmetMat = new THREE.MeshStandardMaterial({
      color: 0x22261e, // Kevlar helmet
      roughness: 0.6,
      metalness: 0.3,
    });
    this.skinMat = new THREE.MeshStandardMaterial({
      color: 0xb5896a,
      roughness: 0.7,
      metalness: 0.0,
    });
    this.bootMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.rifleMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.35,
      metalness: 0.85,
    });
  }

  /**
   * Spawn a detailed multi-part 3D soldier
   */
  public spawnSoldier(x: number, z: number): EnemySoldier {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    // 1. Torso & Tactical Vest
    const torsoGeo = new THREE.BoxGeometry(0.44, 0.6, 0.26);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.uniformMat);
    torsoMesh.position.set(0, 1.15, 0);
    torsoMesh.castShadow = true;
    root.add(torsoMesh);

    // Tactical Vest & Pouches (Front plate)
    const vestGeo = new THREE.BoxGeometry(0.46, 0.44, 0.28);
    const vest = new THREE.Mesh(vestGeo, this.vestMat);
    vest.position.set(0, 0.02, 0);
    torsoMesh.add(vest);

    // Ammo Mag Pouches
    for (let p = -1; p <= 1; p++) {
      const pouchGeo = new THREE.BoxGeometry(0.09, 0.14, 0.06);
      const pouch = new THREE.Mesh(pouchGeo, this.vestMat);
      pouch.position.set(p * 0.12, -0.08, 0.16);
      vest.add(pouch);
    }

    // 2. Head & Kevlar Helmet
    const headGeo = new THREE.BoxGeometry(0.22, 0.24, 0.22);
    const headMesh = new THREE.Mesh(headGeo, this.skinMat);
    headMesh.position.set(0, 1.62, 0);
    headMesh.castShadow = true;
    root.add(headMesh);

    // Kevlar Helmet
    const helmetGeo = new THREE.BoxGeometry(0.26, 0.16, 0.26);
    const helmet = new THREE.Mesh(helmetGeo, this.helmetMat);
    helmet.position.set(0, 0.08, 0);
    headMesh.add(helmet);

    // Tactical Goggles
    const goggleGeo = new THREE.BoxGeometry(0.2, 0.06, 0.05);
    const goggleMat = new THREE.MeshStandardMaterial({ color: 0x111, metalness: 0.9, roughness: 0.1 });
    const goggles = new THREE.Mesh(goggleGeo, goggleMat);
    goggles.position.set(0, 0.04, 0.12);
    headMesh.add(goggles);

    // 3. Arms & Rifle
    const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.28, 1.35, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, this.uniformMat);
    leftArmMesh.position.set(0, -0.2, 0);
    leftArmMesh.castShadow = true;
    leftArm.add(leftArmMesh);
    root.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.28, 1.35, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, this.uniformMat);
    rightArmMesh.position.set(0, -0.2, 0);
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);
    root.add(rightArm);

    // Opposing Force AK Rifle
    const rifle = new THREE.Group();
    rifle.position.set(0, -0.32, 0.22);
    rifle.rotation.x = -Math.PI / 2.3;

    const rReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.35), this.rifleMat);
    rifle.add(rReceiver);

    const rBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8),
      this.rifleMat
    );
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.01, -0.3);
    rifle.add(rBarrel);

    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.08), this.vestMat);
    rMag.position.set(0, -0.09, -0.06);
    rMag.rotation.x = -0.3;
    rifle.add(rMag);

    // Muzzle Flash
    const flashGeo = new THREE.OctahedronGeometry(0.05, 0);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 });
    const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0, 0.01, -0.48);
    muzzleFlash.visible = false;
    rifle.add(muzzleFlash);

    rightArm.add(rifle);

    // 4. Legs & Boots
    const legGeo = new THREE.BoxGeometry(0.14, 0.65, 0.15);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.13, 0.75, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, this.uniformMat);
    leftLegMesh.position.set(0, -0.25, 0);
    leftLegMesh.castShadow = true;
    leftLeg.add(leftLegMesh);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.22), this.bootMat);
    leftBoot.position.set(0, -0.52, 0.03);
    leftLeg.add(leftBoot);
    root.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.13, 0.75, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, this.uniformMat);
    rightLegMesh.position.set(0, -0.25, 0);
    rightLegMesh.castShadow = true;
    rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.22), this.bootMat);
    rightBoot.position.set(0, -0.52, 0.03);
    rightLeg.add(rightBoot);
    root.add(rightLeg);

    this.scene.add(root);

    // Build hitboxes
    const hitboxes: EnemyHitbox[] = [
      { type: 'head', box: new THREE.Box3(), meshRef: headMesh },
      { type: 'body', box: new THREE.Box3(), meshRef: torsoMesh },
      { type: 'legs', box: new THREE.Box3(), meshRef: leftLegMesh },
    ];

    const soldier: EnemySoldier = {
      id: ++this.idCounter,
      root,
      headMesh,
      torsoMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      rifleMesh: rifle,
      muzzleFlash,
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      targetPos: new THREE.Vector3(x, 0, z),
      health: 100,
      maxHealth: 100,
      isDead: false,
      deathTimer: 0,
      deathDirection: new THREE.Vector3(0, 0, -1),
      state: 'patrol',
      stateTimer: 2 + Math.random() * 2,
      shotTimer: 1 + Math.random() * 1.5,
      burstCount: 0,
      animTime: Math.random() * 10,
      hitboxes,
    };

    this.enemies.push(soldier);
    return soldier;
  }

  /**
   * Apply realistic bullet damage & directional flinch / death collapse
   */
  public hitSoldier(
    soldier: EnemySoldier,
    damage: number,
    hitType: 'head' | 'body' | 'legs',
    bulletDir: THREE.Vector3
  ): { isFatal: boolean; isHeadshot: boolean } {
    if (soldier.isDead) return { isFatal: false, isHeadshot: false };

    const multiplier = hitType === 'head' ? 2.5 : hitType === 'legs' ? 0.65 : 1.0;
    const finalDamage = damage * multiplier;
    soldier.health -= finalDamage;

    const isHeadshot = hitType === 'head';
    const isFatal = soldier.health <= 0;

    if (isFatal) {
      soldier.isDead = true;
      soldier.state = 'dead';
      soldier.deathTimer = 0;
      soldier.deathDirection.copy(bulletDir).normalize();
      audio.playRadioChatter('contact');
    } else {
      // Directional Flinch animation
      soldier.state = 'flinch';
      soldier.stateTimer = 0.28;
      soldier.torsoMesh.rotation.x = -bulletDir.z * 0.4;
      soldier.torsoMesh.rotation.z = bulletDir.x * 0.4;
    }

    return { isFatal, isHeadshot };
  }

  /**
   * Update enemy AI behaviors and detailed combat animations
   */
  public update(dt: number, playerPos: THREE.Vector3, isPlayerDead: boolean) {
    const clampedDt = Math.min(dt, 0.05);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.animTime += clampedDt;

      // Update Hitbox bounding boxes for precise hitscan/ballistic interception
      e.headMesh.updateMatrixWorld(true);
      e.torsoMesh.updateMatrixWorld(true);
      e.leftLeg.updateMatrixWorld(true);

      for (const hb of e.hitboxes) {
        hb.box.setFromObject(hb.meshRef);
      }

      // 1. Dead State: Realistic Directional Fall & Collapse
      if (e.isDead) {
        e.deathTimer += clampedDt;
        const progress = Math.min(1.0, e.deathTimer / 0.65);

        // Fall in direction of bullet impact
        const fallAngle = Math.PI / 2 * progress;
        e.root.rotation.x = THREE.MathUtils.damp(
          e.root.rotation.x,
          e.deathDirection.z * fallAngle,
          10,
          clampedDt
        );
        e.root.rotation.z = THREE.MathUtils.damp(
          e.root.rotation.z,
          -e.deathDirection.x * fallAngle,
          10,
          clampedDt
        );
        e.root.position.y = Math.max(0.15, (1 - progress) * 0.2);

        // Arms drop limp
        e.leftArm.rotation.x = Math.PI * 0.4 * progress;
        e.rightArm.rotation.x = Math.PI * 0.4 * progress;

        // Disappear after extended time on battlefield
        if (e.deathTimer > 30) {
          this.scene.remove(e.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // 2. Flinch Recovery
      if (e.state === 'flinch') {
        e.stateTimer -= clampedDt;
        e.torsoMesh.rotation.x = THREE.MathUtils.damp(e.torsoMesh.rotation.x, 0, 12, clampedDt);
        e.torsoMesh.rotation.z = THREE.MathUtils.damp(e.torsoMesh.rotation.z, 0, 12, clampedDt);
        if (e.stateTimer <= 0) {
          e.state = 'aim';
        }
      }

      // 3. AI Combat Logic: Line-of-sight & Aiming at Player
      const distToPlayer = e.position.distanceTo(playerPos);
      const dirToPlayer = new THREE.Vector3().subVectors(playerPos, e.position).normalize();

      // Smoothly rotate body toward player
      const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      e.root.rotation.y = THREE.MathUtils.damp(e.root.rotation.y, targetAngle, 8, clampedDt);

      // AI States: Patrol, Cover, Aim
      if (distToPlayer < 75 && !isPlayerDead) {
        if (e.state !== 'flinch') e.state = 'aim';
      }

      if (e.state === 'aim' && !isPlayerDead) {
        // Raise rifle & aim
        e.rightArm.rotation.x = THREE.MathUtils.damp(e.rightArm.rotation.x, -Math.PI / 2.2, 10, clampedDt);
        e.leftArm.rotation.x = THREE.MathUtils.damp(e.leftArm.rotation.x, -Math.PI / 2.4, 10, clampedDt);

        // Firing Bursts at Player
        e.shotTimer -= clampedDt;
        if (e.shotTimer <= 0) {
          // Fire burst of 3 rounds
          e.burstCount = 3;
          e.shotTimer = 1.4 + Math.random() * 1.8; // cooldown between bursts
        }

        if (e.burstCount > 0 && e.animTime % 0.12 < clampedDt) {
          e.burstCount--;
          this.soldierFire(e, dirToPlayer);
        }
      } else if (e.state === 'patrol') {
        // Patrol walk cycle animation
        e.position.z += Math.sin(e.animTime * 0.8) * 0.02;
        e.root.position.copy(e.position);

        const legSwing = Math.sin(e.animTime * 4) * 0.45;
        e.leftLeg.rotation.x = legSwing;
        e.rightLeg.rotation.x = -legSwing;
        e.leftArm.rotation.x = -legSwing * 0.6;
        e.rightArm.rotation.x = legSwing * 0.6;
      }
    }
  }

  /**
   * Enemy Soldier fires weapon with muzzle flash, audio, and realistic enemy ballistics
   */
  private soldierFire(e: EnemySoldier, dirToPlayer: THREE.Vector3) {
    audio.playGunshot('enemy');

    // Muzzle Flash
    e.muzzleFlash.visible = true;
    (e.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1.0;
    setTimeout(() => {
      e.muzzleFlash.visible = false;
    }, 45);

    // Spawn enemy bullet towards player (with combat spread)
    const muzzlePos = new THREE.Vector3();
    e.rifleMesh.getWorldPosition(muzzlePos);
    muzzlePos.addScaledVector(dirToPlayer, 0.4);

    this.ballistics.fireBullet(
      muzzlePos,
      dirToPlayer,
      'ENEMY_AK',
      false,
      1.8 // AI dispersion spread
    );
  }

  public clearAll() {
    for (const e of this.enemies) {
      this.scene.remove(e.root);
    }
    this.enemies = [];
  }
}
