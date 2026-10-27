import * as THREE from 'three';
import { audio } from './audio';
import { WeaponManager, Stance } from './weapons';
import { WorldManager } from './world';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  isDead: boolean;
  score: number;
  kills: number;
  headshots: number;
  accuracy: { shotsFired: number; shotsHit: number };
}

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.75, 5);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public pitch: number = 0; // vertical camera angle
  public yaw: number = 0;   // horizontal camera angle

  public stance: Stance = 'stand';
  public targetEyeHeight: number = 1.75;
  public currentEyeHeight: number = 1.75;

  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isMoving: boolean = false;

  public stats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    isDead: false,
    score: 0,
    kills: 0,
    headshots: 0,
    accuracy: { shotsFired: 0, shotsHit: 0 },
  };

  // Screen shake
  public cameraShake: number = 0;
  public damageFlashAlpha: number = 0;

  // Collision radius
  private playerRadius = 0.45;
  private footstepTimer = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.copy(this.position);
  }

  public handleMouseMove(movementX: number, movementY: number, sensitivity: number = 0.0022) {
    if (this.stats.isDead) return;

    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // Clamp vertical look to -89° to +89°
    this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));

    this.camera.rotation.x = this.pitch;
    this.camera.rotation.y = this.yaw;
  }

  public setStance(newStance: Stance) {
    this.stance = newStance;
    if (newStance === 'stand') this.targetEyeHeight = 1.75;
    else if (newStance === 'crouch') this.targetEyeHeight = 1.15;
    else if (newStance === 'prone') this.targetEyeHeight = 0.45;
  }

  public toggleCrouch() {
    if (this.stance === 'crouch') this.setStance('stand');
    else this.setStance('crouch');
  }

  public toggleProne() {
    if (this.stance === 'prone') this.setStance('stand');
    else this.setStance('prone');
  }

  public jump() {
    if (this.isGrounded && this.stance === 'stand' && !this.stats.isDead) {
      this.velocity.y = 5.2;
      this.isGrounded = false;
      audio.playFootstep(false);
    } else if (this.stance !== 'stand') {
      this.setStance('stand');
    }
  }

  public applyDamage(amount: number, dir?: THREE.Vector3) {
    if (this.stats.isDead) return;

    // Plate carrier armor absorption
    if (this.stats.armor > 0) {
      const armorAbsorb = amount * 0.65;
      const directHealth = amount * 0.35;

      this.stats.armor = Math.max(0, this.stats.armor - armorAbsorb);
      this.stats.health = Math.max(0, this.stats.health - directHealth);
    } else {
      this.stats.health = Math.max(0, this.stats.health - amount);
    }

    this.damageFlashAlpha = 0.85;
    this.cameraShake = Math.min(0.08, this.cameraShake + 0.04);
    audio.playHitMarker(false, false);

    if (this.stats.health <= 0) {
      this.stats.isDead = true;
      audio.playRadioChatter('contact');
    }
  }

  public addCameraShake(amount: number) {
    this.cameraShake = Math.min(0.12, this.cameraShake + amount);
  }

  public update(
    dt: number,
    keys: Record<string, boolean>,
    weapons: WeaponManager,
    world: WorldManager
  ) {
    const clampedDt = Math.min(dt, 0.05);

    if (this.stats.isDead) {
      // Collapse camera to ground
      this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, 0.25, 6, clampedDt);
      this.camera.position.y = this.position.y - (1.75 - this.currentEyeHeight);
      this.camera.rotation.z = THREE.MathUtils.damp(this.camera.rotation.z, 0.5, 4, clampedDt);
      return;
    }

    // Damage flash fade
    if (this.damageFlashAlpha > 0) {
      this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - clampedDt * 2.2);
    }

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - clampedDt * 0.25);
    }

    // Stance eye height smooth damping
    this.currentEyeHeight = THREE.MathUtils.damp(
      this.currentEyeHeight,
      this.targetEyeHeight,
      14,
      clampedDt
    );
    weapons.stance = this.stance;

    // Movement speeds based on stance
    let moveSpeed = 4.8;
    if (this.stance === 'crouch') moveSpeed = 2.6;
    else if (this.stance === 'prone') moveSpeed = 1.3;

    this.isSprinting = !!keys['ShiftLeft'] && this.stance === 'stand' && !weapons.isAiming;
    if (this.isSprinting) moveSpeed = 7.6;

    // Input direction
    const moveX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const moveZ = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);

    const inputDir = new THREE.Vector3(moveX, 0, moveZ);
    this.isMoving = inputDir.lengthSq() > 0.01;

    if (this.isMoving) {
      inputDir.normalize();

      // Footstep cadence
      this.footstepTimer += clampedDt * (this.isSprinting ? 2.8 : 1.8);
      if (this.footstepTimer > 1.0) {
        this.footstepTimer = 0;
        if (this.isGrounded) audio.playFootstep(this.isSprinting);
      }
    } else {
      this.footstepTimer = 0;
    }

    // Transform move direction by camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const wishVel = new THREE.Vector3()
      .addScaledVector(right, inputDir.x * moveSpeed)
      .addScaledVector(forward, -inputDir.z * moveSpeed);

    // Smooth horizontal acceleration/friction
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wishVel.x, 15, clampedDt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wishVel.z, 15, clampedDt);

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y -= 18.0 * clampedDt;
    }

    // Proposed next position
    const nextPos = this.position.clone().addScaledVector(this.velocity, clampedDt);

    // Ground check (floor at y = 0)
    if (nextPos.y <= 0) {
      nextPos.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Obstacle collision resolution
    for (const obs of world.collisionBoxes) {
      const minX = obs.box.min.x - this.playerRadius;
      const maxX = obs.box.max.x + this.playerRadius;
      const minZ = obs.box.min.z - this.playerRadius;
      const maxZ = obs.box.max.z + this.playerRadius;
      const maxY = obs.box.max.y;

      // If within bounding box
      if (
        nextPos.x >= minX && nextPos.x <= maxX &&
        nextPos.z >= minZ && nextPos.z <= maxZ &&
        nextPos.y < maxY
      ) {
        // Resolve horizontal penetration
        const dLeft = Math.abs(nextPos.x - minX);
        const dRight = Math.abs(maxX - nextPos.x);
        const dBack = Math.abs(nextPos.z - minZ);
        const dFront = Math.abs(maxZ - nextPos.z);

        const minDist = Math.min(dLeft, dRight, dBack, dFront);
        if (minDist === dLeft) nextPos.x = minX;
        else if (minDist === dRight) nextPos.x = maxX;
        else if (minDist === dBack) nextPos.z = minZ;
        else nextPos.z = maxZ;
      }
    }

    this.position.copy(nextPos);

    // Update Camera Position & Shake
    const shakeOffsetX = (Math.random() - 0.5) * 2 * this.cameraShake;
    const shakeOffsetY = (Math.random() - 0.5) * 2 * this.cameraShake;

    this.camera.position.set(
      this.position.x + shakeOffsetX,
      this.position.y + this.currentEyeHeight + shakeOffsetY,
      this.position.z
    );

    // FOV adjustment for ADS
    const targetFov = weapons.getAdsFov();
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 16, clampedDt);
    this.camera.updateProjectionMatrix();
  }

  public reset(spawnPos: THREE.Vector3 = new THREE.Vector3(0, 0, 5)) {
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.stance = 'stand';
    this.targetEyeHeight = 1.75;
    this.currentEyeHeight = 1.75;
    this.stats.health = 100;
    this.stats.armor = 100;
    this.stats.isDead = false;
    this.camera.rotation.set(0, 0, 0);
  }
}
