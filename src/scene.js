import * as THREE from 'three';

export class BattleArena {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.width = container.clientWidth || 1280;
    this.height = container.clientHeight || 480;

    this.initScene();
    this.buildTacticalGrid();
    this.buildSoldierRigs();
    this.buildParticleSystems();
    this.setupLighting();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);
    this.scene.fog = new THREE.FogExp2(0x0d1117, 0.015);

    // Isometric Orthographic Camera for perfect technical framing
    const aspect = this.width / this.height;
    const d = 18;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

    // Classic true isometric orientation (35.264 deg pitch, 45 deg yaw)
    this.camera.position.set(28, 26, 28);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    // Ambient tactical fill
    const ambient = new THREE.AmbientLight(0x1e293b, 1.8);
    this.scene.add(ambient);

    // Moonlight / Sky directional Key Light
    const sunLight = new THREE.DirectionalLight(0x94a3b8, 2.5);
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 100;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);

    // Cyan Tactical Rim Light
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    rimLight.position.set(-30, 15, -20);
    this.scene.add(rimLight);

    // Dynamic Muzzle Flash PointLights
    this.muzzleA = new THREE.PointLight(0x38bdf8, 0, 10);
    this.scene.add(this.muzzleA);

    this.muzzleB = new THREE.PointLight(0xf59e0b, 0, 10);
    this.scene.add(this.muzzleB);
  }

  buildTacticalGrid() {
    // Dark Asphalt / Concrete Floor with subtle tactical markings
    const groundGeo = new THREE.PlaneGeometry(65, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Subtle tactical grid border line
    const gridHelper = new THREE.GridHelper(56, 56, 0x1e293b, 0x111827);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Contribution Blocks
    const weeks = this.data.weeks || [];
    this.blocks = [];
    const blockGeo = new THREE.BoxGeometry(0.72, 1, 0.72);

    // Pre-allocated materials for performance
    const matEmpty = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.9, metalness: 0.1 });
    const matL1 = new THREE.MeshStandardMaterial({ color: 0x0e4429, roughness: 0.7, metalness: 0.3 });
    const matL2 = new THREE.MeshStandardMaterial({ color: 0x006d32, roughness: 0.5, metalness: 0.4 });
    const matL3 = new THREE.MeshStandardMaterial({ color: 0x26a641, roughness: 0.3, metalness: 0.6, emissive: 0x003810, emissiveIntensity: 0.4 });
    const matL4 = new THREE.MeshStandardMaterial({ color: 0x39d353, roughness: 0.2, metalness: 0.7, emissive: 0x00f0ff, emissiveIntensity: 0.8 });

    const totalWeeks = Math.min(weeks.length, 53);
    const originX = -(totalWeeks * 0.95) / 2;
    const originZ = -(7 * 0.95) / 2;

    this.highPoints = [];

    for (let w = 0; w < totalWeeks; w++) {
      const days = weeks[w].contributionDays || [];
      for (let d = 0; d < days.length; d++) {
        const day = days[d];
        const count = day.contributionCount || 0;

        let mat = matEmpty;
        let baseHeight = 0.18;

        if (count > 0) {
          baseHeight = 0.4 + Math.log2(count + 1) * 0.65;
          if (day.contributionLevel === 'FOURTH_QUARTILE' || count >= 5) mat = matL4;
          else if (day.contributionLevel === 'THIRD_QUARTILE' || count >= 3) mat = matL3;
          else if (day.contributionLevel === 'SECOND_QUARTILE' || count >= 2) mat = matL2;
          else mat = matL1;
        }

        const mesh = new THREE.Mesh(blockGeo, mat);
        const posX = originX + w * 0.95;
        const posZ = originZ + d * 0.95;

        mesh.scale.set(1, baseHeight, 1);
        mesh.position.set(posX, baseHeight / 2, posZ);
        mesh.castShadow = count > 0;
        mesh.receiveShadow = true;

        this.scene.add(mesh);
        this.blocks.push({ mesh, posX, posZ, baseHeight, count });

        if (count >= 2) {
          this.highPoints.push(new THREE.Vector3(posX, baseHeight, posZ));
        }
      }
    }
  }

  createProceduralSoldier(squadColor, isLeader = true) {
    const soldier = new THREE.Group();

    // Palette
    const armorColor = squadColor === 'blue' ? 0x1e293b : 0x27272a;
    const accentColor = squadColor === 'blue' ? 0x00f0ff : 0xf59e0b;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.7, metalness: 0.3 });
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
    const visorMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.2, metalness: 0.9, emissive: accentColor, emissiveIntensity: 0.6 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.8 });

    // 1. Torso & Tactical Vest
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    soldier.add(torso);

    const vestGeo = new THREE.BoxGeometry(0.76, 0.7, 0.52);
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 1.35;
    vest.castShadow = true;
    soldier.add(vest);

    // Ammo Pouches on Plate Carrier
    for (let p = -1; p <= 1; p++) {
      const pouchGeo = new THREE.BoxGeometry(0.18, 0.25, 0.12);
      const pouch = new THREE.Mesh(pouchGeo, vestMat);
      pouch.position.set(p * 0.22, 1.25, 0.3);
      soldier.add(pouch);
    }

    // 2. Level-3 Tactical Helmet & Visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.05, 0);

    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Spetsnaz/Altyn Helmet shell
    const helmetGeo = new THREE.SphereGeometry(0.33, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const helmet = new THREE.Mesh(helmetGeo, vestMat);
    helmet.rotation.x = -0.15;
    headGroup.add(helmet);

    // Glowing Tactical Visor / NVG slit
    const visorGeo = new THREE.BoxGeometry(0.38, 0.1, 0.18);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0, 0.25);
    headGroup.add(visor);

    soldier.add(headGroup);
    soldier.headGroup = headGroup;

    // 3. Right Arm + Assault Rifle
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.45, 1.65, 0);

    const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.7);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.y = -0.3;
    armR.rotation.x = Math.PI / 4;
    rightArmGroup.add(armR);

    // Assault Rifle (M416 / Beryl style)
    const rifle = new THREE.Group();
    rifle.position.set(0, -0.45, 0.45);

    const receiverGeo = new THREE.BoxGeometry(0.12, 0.18, 0.95);
    const receiver = new THREE.Mesh(receiverGeo, gunMat);
    rifle.add(receiver);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.65);
    rifle.add(barrel);

    // Suppressor
    const supGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.28);
    const suppressor = new THREE.Mesh(supGeo, gunMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.02, 1.05);
    rifle.add(suppressor);

    // Holographic Sight
    const sightGeo = new THREE.BoxGeometry(0.08, 0.1, 0.16);
    const sight = new THREE.Mesh(sightGeo, visorMat);
    sight.position.set(0, 0.14, 0.1);
    rifle.add(sight);

    rightArmGroup.add(rifle);
    soldier.add(rightArmGroup);
    soldier.rightArm = rightArmGroup;
    soldier.muzzlePoint = new THREE.Vector3(0, 0.02, 1.25);

    // 4. Left Arm (Supporting Rifle)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.45, 1.65, 0);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(0.15, -0.28, 0.3);
    armL.rotation.x = Math.PI / 3;
    armL.rotation.z = -Math.PI / 6;
    leftArmGroup.add(armL);
    soldier.add(leftArmGroup);
    soldier.leftArm = leftArmGroup;

    // 5. Lower Body (Tactical Combat Crouch)
    const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.85);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.24, 0.5, 0.1);
    legR.rotation.x = -Math.PI / 6;
    soldier.add(legR);

    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.24, 0.45, -0.15);
    legL.rotation.x = Math.PI / 4;
    soldier.add(legL);

    soldier.scale.set(0.9, 0.9, 0.9);
    return soldier;
  }

  buildSoldierRigs() {
    // Soldier A (Blue Squad - Left side high-cluster cover)
    this.soldierA = this.createProceduralSoldier('blue');
    this.soldierA.position.set(-14, 0, 1.5);
    this.soldierA.rotation.y = Math.PI / 3; // Facing toward right
    this.scene.add(this.soldierA);

    // Soldier B (Amber Squad - Right side tactical cover)
    this.soldierB = this.createProceduralSoldier('amber');
    this.soldierB.position.set(13, 0, -2.5);
    this.soldierB.rotation.y = -Math.PI * 0.7; // Facing toward left
    this.scene.add(this.soldierB);
  }

  buildParticleSystems() {
    // 1. Tracers Pool
    this.tracers = [];
    const tracerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4);
    tracerGeo.rotateX(Math.PI / 2);
    const matTracerA = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const matTracerB = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(tracerGeo, i % 2 === 0 ? matTracerA : matTracerB);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers.push(mesh);
    }

    // 2. Spark Debris Particles
    this.sparkCount = 80;
    const sparkGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.sparkCount * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 0.18,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.sparks = new THREE.Points(sparkGeo, sparkMat);
    this.scene.add(this.sparks);
    this.sparkPositions = positions;
  }

  seek(timeInSeconds) {
    const loopDuration = 6.0;
    const t = (timeInSeconds % loopDuration);

    // Phase 1: Soldier A bursts fire (0.5s - 2.2s)
    const isFireA = (t >= 0.6 && t <= 1.8) && (Math.sin(t * 36) > 0.2);
    // Phase 2: Soldier B returns fire (3.2s - 4.6s)
    const isFireB = (t >= 3.2 && t <= 4.5) && (Math.sin(t * 34) > 0.2);

    // Soldier A Animation Pose
    if (t < 0.4 || t > 5.2) {
      // Duck behind cover
      this.soldierA.position.y = -0.35;
      this.soldierA.rightArm.rotation.x = -Math.PI / 6;
      this.soldierA.headGroup.rotation.x = 0.2;
    } else {
      // Peek & Aim
      this.soldierA.position.y = 0;
      this.soldierA.rightArm.rotation.x = Math.sin(t * 8) * 0.04;
      this.soldierA.headGroup.rotation.x = 0;
    }

    // Soldier B Animation Pose
    if (t >= 1.0 && t <= 2.8) {
      // Under incoming fire - take cover
      this.soldierB.position.y = -0.4;
      this.soldierB.rightArm.rotation.x = -Math.PI / 5;
    } else {
      // Peek & Return Fire
      this.soldierB.position.y = 0;
      this.soldierB.rightArm.rotation.x = Math.sin(t * 7) * 0.04;
    }

    // Muzzle Lights
    if (isFireA) {
      this.muzzleA.intensity = 15;
      this.muzzleA.position.copy(this.soldierA.position).add(new THREE.Vector3(1, 1.4, 0.8));
    } else {
      this.muzzleA.intensity = 0;
    }

    if (isFireB) {
      this.muzzleB.intensity = 15;
      this.muzzleB.position.copy(this.soldierB.position).add(new THREE.Vector3(-1, 1.4, -0.6));
    } else {
      this.muzzleB.intensity = 0;
    }

    // Tracer Bullet Choreography
    const startA = this.soldierA.position.clone().add(new THREE.Vector3(0.5, 1.4, 0.5));
    const targetB = this.soldierB.position.clone().add(new THREE.Vector3(0, 1.2, 0));

    const startB = this.soldierB.position.clone().add(new THREE.Vector3(-0.5, 1.4, -0.5));
    const targetA = this.soldierA.position.clone().add(new THREE.Vector3(0, 1.2, 0));

    // Update active tracers
    this.tracers.forEach((tracer, idx) => {
      let active = false;
      if (idx < 8) {
        // Soldier A Tracers
        const cycle = ((t * 4 + idx * 0.3) % 2.5);
        if (cycle < 1.0 && t >= 0.5 && t <= 2.0) {
          active = true;
          tracer.position.lerpVectors(startA, targetB, cycle);
          tracer.lookAt(targetB);
        }
      } else {
        // Soldier B Tracers
        const cycle = (((t - 2.8) * 4 + idx * 0.25) % 2.5);
        if (cycle < 1.0 && t >= 3.0 && t <= 4.8) {
          active = true;
          tracer.position.lerpVectors(startB, targetA, cycle);
          tracer.lookAt(targetA);
        }
      }
      tracer.visible = active;
    });

    // Particle Impact Sparks
    const pos = this.sparkPositions;
    for (let i = 0; i < this.sparkCount; i++) {
      const idx = i * 3;
      if (isFireA || isFireB) {
        const baseTarget = isFireA ? targetB : targetA;
        pos[idx] = baseTarget.x + (Math.random() - 0.5) * 1.5;
        pos[idx + 1] = Math.max(0.1, baseTarget.y + (Math.random() - 0.5) * 1.2);
        pos[idx + 2] = baseTarget.z + (Math.random() - 0.5) * 1.5;
      } else {
        pos[idx + 1] = -100; // hide below ground
      }
    }
    this.sparks.geometry.attributes.position.needsUpdate = true;

    // Subtle breathing camera micro-panning
    const camAngle = 0.785 + Math.sin(t * (Math.PI * 2 / loopDuration)) * 0.02;
    const camDist = 38;
    this.camera.position.x = Math.sin(camAngle) * camDist;
    this.camera.position.z = Math.cos(camAngle) * camDist;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }
}
