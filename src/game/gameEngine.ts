import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { audio } from './audio';
import { BallisticsEngine, ActiveBullet } from './ballistics';
import { EnemyManager, EnemySoldier } from './enemies';
import { PlayerController } from './player';
import { WeaponManager, WEAPON_CONFIGS } from './weapons';
import { WorldManager } from './world';

export type GameState = 'title' | 'playing' | 'paused' | 'game_over' | 'victory';
export type MissionType = 'defense' | 'proving_grounds' | 'assault';

export interface GrenadeProjectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  timer: number;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public world: WorldManager;
  public ballistics: BallisticsEngine;
  public weapons: WeaponManager;
  public enemies: EnemyManager;
  public player: PlayerController;

  public state: GameState = 'title';
  public currentMission: MissionType = 'defense';
  public waveNumber: number = 1;
  public maxWaves: number = 3;
  public enemiesRemaining: number = 0;

  // Active thrown grenades
  private grenades: GrenadeProjectile[] = [];
  private grenadeGeo: THREE.SphereGeometry;
  private grenadeMat: THREE.MeshStandardMaterial;

  // Hitstop freeze (milliseconds)
  private hitstopTimer: number = 0;

  // Controls state
  public keys: Record<string, boolean> = {};
  public isMouseDown: boolean = false;
  public isRightMouseDown: boolean = false;

  // Cinematic title camera pan
  private titlePanTime: number = 0;

  // Callbacks for UI updates
  public onStateChange?: (state: GameState) => void;
  public onHitFeedback?: (isFatal: boolean, isHeadshot: boolean) => void;

  private isSoftwareGl: boolean = false;

  constructor(container: HTMLDivElement) {
    // Software WebGL detection per skill guide
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // 2. Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x768894); // Military overcast horizon
    this.scene.fog = new THREE.FogExp2(0x768894, 0.0075); // Distance blend

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3. Camera Setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.05,
      600
    );

    // 4. Studio Military Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(40, 60, 30);
    sunLight.castShadow = !this.isSoftwareGl;
    if (sunLight.shadow) {
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 160;
      sunLight.shadow.camera.left = -40;
      sunLight.shadow.camera.right = 40;
      sunLight.shadow.camera.top = 40;
      sunLight.shadow.camera.bottom = -40;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x94b4c7, 0x4a4438, 1.2);
    this.scene.add(hemiLight);

    // 5. Initialize Subsystems
    this.world = new WorldManager(this.scene, this.renderer);
    this.ballistics = new BallisticsEngine(this.scene);
    this.weapons = new WeaponManager(this.scene, this.camera, this.ballistics);
    this.enemies = new EnemyManager(this.scene, this.ballistics);
    this.player = new PlayerController(this.camera);

    // Add weapon holder as child of camera
    this.camera.add(this.weapons.weaponHolder);
    this.scene.add(this.camera);

    // Grenade assets
    this.grenadeGeo = new THREE.SphereGeometry(0.08, 10, 10);
    this.grenadeMat = new THREE.MeshStandardMaterial({
      color: 0x3e4a32,
      roughness: 0.8,
      metalness: 0.3,
    });

    // Window resize handler
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.renderer.domElement.parentElement) return;
    const parent = this.renderer.domElement.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Start Mission
   */
  public startMission(type: MissionType) {
    this.currentMission = type;
    this.state = 'playing';
    this.waveNumber = 1;
    this.enemies.clearAll();
    this.ballistics.clearAll();
    this.player.reset(new THREE.Vector3(0, 0, 5));

    if (type === 'defense') {
      this.spawnDefenseWave(1);
    } else if (type === 'proving_grounds') {
      // Freeform range practice, wind drift enabled
      this.ballistics.wind.set(3.2, 0, 0.8);
      this.enemiesRemaining = 0;
    } else if (type === 'assault') {
      this.spawnAssaultMission();
    }

    if (this.onStateChange) this.onStateChange('playing');
  }

  private spawnDefenseWave(wave: number) {
    this.waveNumber = wave;
    const count = 4 + wave * 3;
    this.enemiesRemaining = count;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI - Math.PI / 2; // spread in front
      const dist = 35 + Math.random() * 25;
      const x = Math.sin(angle) * dist;
      const z = -Math.cos(angle) * dist - 15;
      this.enemies.spawnSoldier(x, z);
    }
  }

  private spawnAssaultMission() {
    const coords = [
      [-10, -25], [10, -28], [0, -40], [-18, -35], [18, -35],
      [-5, -55], [5, -55], [0, -70]
    ];
    this.enemiesRemaining = coords.length;
    coords.forEach(([x, z]) => {
      this.enemies.spawnSoldier(x, z);
    });
  }

  /**
   * Throw Frag Grenade with physical arc
   */
  public throwGrenade() {
    if (this.state !== 'playing' || this.player.stats.isDead) return;

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const spawnPos = this.camera.position.clone().addScaledVector(camDir, 0.6);
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const throwVel = camDir.clone().multiplyScalar(18).add(new THREE.Vector3(0, 4.5, 0));
    const angularVel = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );

    this.grenades.push({
      mesh,
      position: spawnPos,
      velocity: throwVel,
      angularVelocity: angularVel,
      timer: 2.4, // fuse delay
    });

    audio.playCasingDrop();
  }

  /**
   * Main Simulation Loop
   */
  public update(dt: number, now: number) {
    const clampedDt = Math.min(dt, 0.05);

    // Hitstop micro-freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= clampedDt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === 'title') {
      // Cinematic live-world camera pan over FOB Alpha
      this.titlePanTime += clampedDt * 0.25;
      const camRadius = 24;
      this.camera.position.set(
        Math.sin(this.titlePanTime) * camRadius,
        7.5 + Math.sin(this.titlePanTime * 0.5) * 1.5,
        Math.cos(this.titlePanTime) * camRadius - 10
      );
      this.camera.lookAt(0, 1.2, -15);
      this.world.update(clampedDt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === 'paused') {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Update Player & Controls
    this.player.update(clampedDt, this.keys, this.weapons, this.world);

    // Aim Down Sights (Right Click)
    this.weapons.isAiming = this.isRightMouseDown && !this.player.isSprinting;

    // Fire weapon if mouse held
    if (this.isMouseDown && !this.player.stats.isDead) {
      const spreadFactor = this.player.isMoving ? 1.6 : 1.0;
      const fired = this.weapons.tryShoot(now, spreadFactor);
      if (fired) {
        this.player.stats.accuracy.shotsFired++;
        this.player.addCameraShake(
          this.weapons.currentWeaponId === 'M82_SNIPER' ? 0.035 : 0.012
        );
      }
    }

    // Update Weapons Kinematics
    this.weapons.update(clampedDt, this.player.isMoving, this.player.isSprinting, now);

    // Update Enemies
    this.enemies.update(clampedDt, this.player.position, this.player.stats.isDead);

    // Update World Targets
    this.world.update(clampedDt);

    // Update Grenades
    this.updateGrenades(clampedDt);

    // Update Realistic Ballistics Simulation & Continuous Line-Segment Collisions
    this.ballistics.update(clampedDt, (bullet, from, to) => {
      return this.handleBulletRay(bullet, from, to);
    });

    // Check Victory / Game Over
    if (this.player.stats.isDead && this.state === 'playing') {
      this.state = 'game_over';
      if (this.onStateChange) this.onStateChange('game_over');
    }

    if (this.currentMission === 'defense' && this.enemiesRemaining <= 0 && this.state === 'playing') {
      if (this.waveNumber < this.maxWaves) {
        audio.playRadioChatter('clear');
        this.spawnDefenseWave(this.waveNumber + 1);
      } else {
        this.state = 'victory';
        if (this.onStateChange) this.onStateChange('victory');
      }
    } else if (this.currentMission === 'assault' && this.enemiesRemaining <= 0 && this.state === 'playing') {
      this.state = 'victory';
      if (this.onStateChange) this.onStateChange('victory');
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Continuous Line-Segment Collision Check for Projectiles
   */
  private handleBulletRay(bullet: ActiveBullet, from: THREE.Vector3, to: THREE.Vector3): boolean {
    const ray = new THREE.Ray(from, new THREE.Vector3().subVectors(to, from).normalize());
    const stepDist = from.distanceTo(to);

    // 1. Check against Enemy Hitboxes (Head, Body, Legs)
    if (bullet.isPlayer) {
      for (const e of this.enemies.enemies) {
        if (e.isDead) continue;

        for (const hb of e.hitboxes) {
          const hitPoint = new THREE.Vector3();
          if (ray.intersectBox(hb.box, hitPoint)) {
            if (from.distanceTo(hitPoint) <= stepDist) {
              const res = this.enemies.hitSoldier(e, bullet.profile.damage, hb.type, bullet.velocity);
              this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 1, 0), 'flesh');

              this.player.stats.accuracy.shotsHit++;
              audio.playHitMarker(res.isFatal, res.isHeadshot);

              if (this.onHitFeedback) {
                this.onHitFeedback(res.isFatal, res.isHeadshot);
              }

              if (res.isFatal) {
                this.player.stats.kills++;
                this.player.stats.score += res.isHeadshot ? 250 : 100;
                this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
                // Hitstop micro freeze on kill
                this.hitstopTimer = 0.045;
              } else {
                this.player.stats.score += 25;
              }

              if (res.isHeadshot) {
                this.player.stats.headshots++;
              }

              return true; // bullet consumed
            }
          }
        }
      }
    }

    // 2. Check against Player (if enemy bullet)
    if (!bullet.isPlayer && !this.player.stats.isDead) {
      const playerBox = new THREE.Box3(
        new THREE.Vector3(this.player.position.x - 0.4, this.player.position.y, this.player.position.z - 0.4),
        new THREE.Vector3(this.player.position.x + 0.4, this.player.position.y + this.player.currentEyeHeight, this.player.position.z + 0.4)
      );

      const hitPoint = new THREE.Vector3();
      if (ray.intersectBox(playerBox, hitPoint)) {
        if (from.distanceTo(hitPoint) <= stepDist) {
          this.player.applyDamage(bullet.profile.damage, bullet.velocity);
          this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 1, 0), 'flesh');
          return true;
        }
      }
    }

    // 3. Check against Steel Targets (Firing Range Proving Grounds)
    for (const st of this.world.steelTargets) {
      const hitPoint = new THREE.Vector3();
      if (ray.intersectBox(st.box, hitPoint)) {
        if (from.distanceTo(hitPoint) <= stepDist) {
          st.isHit = true;
          st.hitTimer = 0.8;
          this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 0, 1), 'spark');
          audio.playSteelTargetDing(st.distance);
          if (bullet.isPlayer) {
            this.player.stats.accuracy.shotsHit++;
            this.player.stats.score += Math.round(st.distance * 1.5);
          }
          return true;
        }
      }
    }

    // 4. Check against Explosive Barrels
    for (const barrel of this.world.explosiveBarrels) {
      if (barrel.exploded) continue;
      const hitPoint = new THREE.Vector3();
      if (ray.intersectBox(barrel.box, hitPoint)) {
        if (from.distanceTo(hitPoint) <= stepDist) {
          barrel.health -= bullet.profile.damage;
          this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 1, 0), 'spark');
          if (barrel.health <= 0) {
            this.detonateBarrel(barrel);
          }
          return true;
        }
      }
    }

    // 5. Check against World Obstacles & Penetrable Cover
    for (const obs of this.world.collisionBoxes) {
      const hitPoint = new THREE.Vector3();
      if (ray.intersectBox(obs.box, hitPoint)) {
        if (from.distanceTo(hitPoint) <= stepDist) {
          if (obs.type === 'wood' && bullet.remainingPenetrations > 0) {
            // High caliber penetrates wood crate
            bullet.remainingPenetrations--;
            bullet.velocity.multiplyScalar(0.75); // velocity loss
            this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 1, 0), 'dust');
            return false; // keeps flying through!
          }

          // Concrete / metal / sandbag stops bullet
          const impactType = obs.type === 'metal' ? 'spark' : 'dust';
          this.ballistics.spawnImpactEffect(hitPoint, new THREE.Vector3(0, 1, 0), impactType);
          return true;
        }
      }
    }

    return false;
  }

  private detonateBarrel(barrel: any) {
    barrel.exploded = true;
    barrel.mesh.visible = false;
    audio.playExplosion();
    this.player.addCameraShake(0.09);

    const blastOrigin = barrel.position;
    this.ballistics.spawnImpactEffect(blastOrigin, new THREE.Vector3(0, 1, 0), 'spark');

    // Blast damage to nearby enemies
    for (const e of this.enemies.enemies) {
      if (e.isDead) continue;
      const d = e.position.distanceTo(blastOrigin);
      if (d < 12) {
        const dmg = Math.max(0, (1 - d / 12) * 220);
        const blastDir = new THREE.Vector3().subVectors(e.position, blastOrigin).normalize();
        const res = this.enemies.hitSoldier(e, dmg, 'body', blastDir);
        if (res.isFatal) {
          this.player.stats.kills++;
          this.player.stats.score += 150;
          this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
        }
      }
    }

    // Blast damage to player if close
    const dPlayer = this.player.position.distanceTo(blastOrigin);
    if (dPlayer < 10) {
      const dmg = Math.max(0, (1 - dPlayer / 10) * 80);
      this.player.applyDamage(dmg);
    }
  }

  private updateGrenades(dt: number) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.timer -= dt;

      g.velocity.y -= 15.0 * dt;
      g.position.addScaledVector(g.velocity, dt);

      g.mesh.position.copy(g.position);
      g.mesh.rotation.x += g.angularVelocity.x * dt;
      g.mesh.rotation.y += g.angularVelocity.y * dt;

      // Ground bounce
      if (g.position.y <= 0.08) {
        g.position.y = 0.08;
        if (g.velocity.y < -0.8) {
          g.velocity.y = -g.velocity.y * 0.45;
          g.velocity.x *= 0.7;
          g.velocity.z *= 0.7;
          audio.playCasingDrop();
        } else {
          g.velocity.set(0, 0, 0);
          g.angularVelocity.set(0, 0, 0);
        }
      }

      // Detonate
      if (g.timer <= 0) {
        audio.playExplosion();
        this.player.addCameraShake(0.08);
        this.ballistics.spawnImpactEffect(g.position, new THREE.Vector3(0, 1, 0), 'dust');

        // Blast radius check
        for (const e of this.enemies.enemies) {
          if (e.isDead) continue;
          const dist = e.position.distanceTo(g.position);
          if (dist < 10) {
            const dmg = (1 - dist / 10) * 200;
            const dir = new THREE.Vector3().subVectors(e.position, g.position).normalize();
            const res = this.enemies.hitSoldier(e, dmg, 'body', dir);
            if (res.isFatal) {
              this.player.stats.kills++;
              this.player.stats.score += 150;
              this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
            }
          }
        }

        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
