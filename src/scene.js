import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class BattleArena {
  constructor(container, data) {
    this.container = container;
    this.data = data || { totalContributions: 17, weeks: [] };
    this.width = container.clientWidth || 1280;
    this.height = container.clientHeight || 480;

    this.soldiers = [];
    this.mixers = [];
    this.tracers = [];
    this.sparks = [];

    this.initScene();
    this.setupLighting();
    this.buildAirfieldGround();
    this.buildContainerGrid();
    this.loadSoldiers();
    this.buildCombatFx();
  }

  initScene() {
    this.scene = new THREE.Scene();
    // High-visibility tactical atmosphere (Erangel Military Field)
    this.scene.background = new THREE.Color(0x0f172a); // Deep slate (not pitch black)

    // True Isometric Camera with wider coverage and closer action
    const aspect = this.width / this.height;
    const d = 11.8;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 600);

    // Isometric orientation: 35.264° pitch, 45° yaw
    this.camera.position.set(24, 21, 24);
    this.camera.lookAt(1.5, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65; // High clarity and brightness

    this.container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    // 1. Direct Sunlight (High intensity, casting crisp shadows)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 4.2);
    sunLight.position.set(28, 48, 22);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 140;
    const d = 32;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // 2. High-clarity Sky Fill Ambient Light
    const ambient = new THREE.AmbientLight(0x94a3b8, 2.2);
    this.scene.add(ambient);

    // 3. Cyan Tactical Edge / Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-30, 22, -22);
    this.scene.add(rimLight);

    // 4. Warm Ground Bounce Fill Light
    const bounceLight = new THREE.DirectionalLight(0xfde68a, 0.8);
    bounceLight.position.set(0, -10, 0);
    this.scene.add(bounceLight);

    // 5. Dynamic Muzzle Flash PointLights
    this.muzzleLightA = new THREE.PointLight(0x38bdf8, 0, 16);
    this.scene.add(this.muzzleLightA);

    this.muzzleLightB = new THREE.PointLight(0xf59e0b, 0, 16);
    this.scene.add(this.muzzleLightB);
  }

  buildAirfieldGround() {
    // Military Concrete Apron (High visibility slate)
    const groundGeo = new THREE.PlaneGeometry(68, 26);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Tactical Yellow Hazard Border Lines
    const lineGeo = new THREE.PlaneGeometry(64, 0.28);
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.5,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.3
    });
    const lineTop = new THREE.Mesh(lineGeo, lineMat);
    lineTop.rotation.x = -Math.PI / 2;
    lineTop.position.set(0, 0.02, 6.2);
    this.scene.add(lineTop);

    const lineBottom = new THREE.Mesh(lineGeo, lineMat);
    lineBottom.rotation.x = -Math.PI / 2;
    lineBottom.position.set(0, 0.02, -6.2);
    this.scene.add(lineBottom);

    // Center Taxiway Runway Dashes
    for (let x = -28; x <= 28; x += 4.0) {
      const dashGeo = new THREE.PlaneGeometry(2.0, 0.22);
      const dashMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, 0);
      this.scene.add(dash);
    }
  }

  buildContainerGrid() {
    const weeks = this.data.weeks || [];
    const numWeeks = weeks.length || 53;
    const daysPerWeek = 7;

    const cellW = 0.84;
    const cellD = 0.84;
    const gap = 0.16;

    const startX = -((numWeeks * (cellW + gap)) / 2) + 1.2;
    const startZ = -((daysPerWeek * (cellD + gap)) / 2);

    // Palette: Crisp, clear, high-contrast like 3D Contrib + PUBG Containers
    const matEmptyPad = new THREE.MeshStandardMaterial({
      color: 0x334155, // Visible slate pad for 0-commit days
      roughness: 0.7,
      metalness: 0.25
    });

    const matGreen = new THREE.MeshStandardMaterial({
      color: 0x16a34a, // Vibrant Emerald Military Container
      roughness: 0.5,
      metalness: 0.4
    });

    const matBlue = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Georgopol Cobalt Blue Container
      roughness: 0.45,
      metalness: 0.45
    });

    const matOrange = new THREE.MeshStandardMaterial({
      color: 0xea580c, // Hazard Amber Container
      roughness: 0.45,
      metalness: 0.45
    });

    const matRed = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Care Package Red Crate
      roughness: 0.5,
      metalness: 0.35
    });

    const matTarpBlue = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Care Package Blue Tarp Top
      roughness: 0.6,
      metalness: 0.2
    });

    this.hotSpots = [];

    for (let w = 0; w < numWeeks; w++) {
      const week = weeks[w];
      const days = week ? week.contributionDays || [] : [];

      for (let d = 0; d < 7; d++) {
        const day = days[d];
        const count = day ? day.contributionCount || 0 : 0;
        const level = day ? day.contributionLevel : 'NONE';

        const posX = startX + w * (cellW + gap);
        const posZ = startZ + d * (cellD + gap);

        if (count === 0 && level === 'NONE') {
          // 0 Commits: Raised, clearly visible concrete base tile with dark border
          const padGeo = new THREE.BoxGeometry(cellW, 0.1, cellD);
          const pad = new THREE.Mesh(padGeo, matEmptyPad);
          pad.position.set(posX, 0.05, posZ);
          pad.receiveShadow = true;
          this.scene.add(pad);
        } else {
          // Active Commits: Extruded PUBG Shipping Containers
          const height = Math.min(4.2, 1.0 + Math.log2(count + 1) * 0.9);

          const group = new THREE.Group();
          group.position.set(posX, 0, posZ);

          let containerMat = matGreen;
          if (count >= 10) containerMat = matRed;
          else if (count >= 5) containerMat = matOrange;
          else if (count >= 2) containerMat = matBlue;

          // Main Container Box
          const boxGeo = new THREE.BoxGeometry(cellW, height, cellD);
          const box = new THREE.Mesh(boxGeo, containerMat);
          box.position.y = height / 2;
          box.castShadow = true;
          box.receiveShadow = true;
          group.add(box);

          // Corrugated Steel Side Ribs
          for (let r = -1; r <= 1; r++) {
            const ribGeo = new THREE.BoxGeometry(0.04, height * 0.94, cellD * 0.88);
            const ribMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
            const rib = new THREE.Mesh(ribGeo, ribMat);
            rib.position.set(r * 0.25, height / 2, 0);
            group.add(rib);
          }

          // Top Surface Corner Locks (8 ISO container casting lugs)
          const cornerGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
          const cornerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
          [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([cx, cz]) => {
            const cMesh = new THREE.Mesh(cornerGeo, cornerMat);
            cMesh.position.set(cx * (cellW/2 - 0.06), height + 0.04, cz * (cellD/2 - 0.06));
            group.add(cMesh);
          });

          // Level 3 Care Package Airdrop (count >= 10)
          if (count >= 10) {
            const tarpGeo = new THREE.BoxGeometry(cellW * 1.04, 0.22, cellD * 1.04);
            const tarp = new THREE.Mesh(tarpGeo, matTarpBlue);
            tarp.position.y = height + 0.11;
            tarp.castShadow = true;
            group.add(tarp);

            // Glowing Red Signal Flare Smoke
            const smokeGeo = new THREE.CylinderGeometry(0.1, 0.4, 2.2, 8);
            const smokeMat = new THREE.MeshStandardMaterial({
              color: 0xef4444,
              transparent: true,
              opacity: 0.55,
              emissive: 0xef4444,
              emissiveIntensity: 1.2
            });
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.set(0, height + 1.2, 0);
            group.add(smoke);
          }

          this.scene.add(group);
          this.hotSpots.push(new THREE.Vector3(posX, height, posZ));
        }
      }
    }

    // Add Tactical Tactical Cover Crates for the Soldiers
    this.buildTacticalCover();
  }

  buildTacticalCover() {
    // Stacked Georgopol Shipping Containers near the frontline
    const createCoverStack = (x, z, colorHex) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.5,
        metalness: 0.4
      });

      // Bottom Container
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.2), mat);
      c1.position.y = 0.7;
      c1.castShadow = true;
      c1.receiveShadow = true;
      g.add(c1);

      // Top Container
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.2), mat);
      c2.position.set(0.1, 2.1, 0.2);
      c2.castShadow = true;
      c2.receiveShadow = true;
      g.add(c2);

      this.scene.add(g);
    };

    // Blue Cover near Soldier A
    createCoverStack(-7.2, 1.2, 0x1d4ed8);
    // Red Cover near Soldier B
    createCoverStack(7.2, -1.0, 0xb91c1c);
  }

  loadSoldiers() {
    const loader = new GLTFLoader();
    this.soldiersReady = false;

    // Position Soldiers at the frontline taking cover
    this.posA = new THREE.Vector3(-6.0, 0, 1.6);
    this.posB = new THREE.Vector3(6.0, 0, -1.2);

    loader.load(
      './assets/models/soldier.glb',
      (gltf) => {
        console.log('Soldier GLB loaded successfully!');
        const modelA = gltf.scene;
        modelA.scale.set(1.5, 1.5, 1.5);
        modelA.position.copy(this.posA);
        modelA.rotation.y = Math.PI / 2.1; // Facing toward Soldier B

        modelA.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.6;
            }
          }
        });

        this.equipTacticalGear(modelA, 'blue');
        this.scene.add(modelA);

        const mixerA = new THREE.AnimationMixer(modelA);
        const animA = gltf.animations.find(a => a.name === 'Run') || gltf.animations[0];
        if (animA) {
          const actionA = mixerA.clipAction(animA);
          actionA.play();
        }
        this.mixers.push(mixerA);
        this.soldierA = modelA;

        // Soldier B (Red Squad Enemy Operator)
        const modelB = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : modelA.clone();
        modelB.scale.set(1.5, 1.5, 1.5);
        modelB.position.copy(this.posB);
        modelB.rotation.y = -Math.PI / 2.1; // Facing toward Soldier A

        modelB.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material = child.material.clone();
              child.material.color.set(0x9333ea);
            }
          }
        });

        this.equipTacticalGear(modelB, 'red');
        this.scene.add(modelB);

        const mixerB = new THREE.AnimationMixer(modelB);
        const animB = gltf.animations.find(a => a.name === 'Walk') || gltf.animations[0];
        if (animB) {
          const actionB = mixerB.clipAction(animB);
          actionB.play();
        }
        this.mixers.push(mixerB);
        this.soldierB = modelB;

        this.soldiersReady = true;
      },
      undefined,
      (err) => {
        console.warn('Fallback to procedural rig:', err);
        this.buildProceduralSoldiers();
      }
    );
  }

  equipTacticalGear(soldierGroup, squad) {
    // Spetsnaz Level 3 Altyn Helmet with Visor
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0, 1.95, 0);

    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.6
    });

    const visorColor = squad === 'blue' ? 0x00f0ff : 0xf59e0b;
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorColor,
      emissiveIntensity: 1.0,
      roughness: 0.2
    });

    const shellGeo = new THREE.SphereGeometry(0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const shell = new THREE.Mesh(shellGeo, helmetMat);
    helmetGroup.add(shell);

    const visorGeo = new THREE.BoxGeometry(0.38, 0.14, 0.24);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, -0.05, 0.27);
    helmetGroup.add(visor);

    soldierGroup.add(helmetGroup);

    // M416 / Assault Rifle with Red Dot Sight & Suppressor
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.38, 1.35, 0.5);

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.85 });
    const bodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.85);
    const body = new THREE.Mesh(bodyGeo, gunMat);
    gunGroup.add(body);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.6);
    gunGroup.add(barrel);

    const supGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.28);
    const suppressor = new THREE.Mesh(supGeo, gunMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.02, 0.95);
    gunGroup.add(suppressor);

    soldierGroup.add(gunGroup);
  }

  buildProceduralSoldiers() {
    const buildRig = (pos, squad, rotY) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      g.rotation.y = rotY;

      const bodyMat = new THREE.MeshStandardMaterial({ color: squad === 'blue' ? 0x1e3a8a : 0x7f1d1d, roughness: 0.6 });
      const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.5 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), bodyMat);
      torso.position.y = 1.2;
      torso.castShadow = true;
      g.add(torso);

      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.52), vestMat);
      vest.position.y = 1.2;
      vest.castShadow = true;
      g.add(vest);

      this.equipTacticalGear(g, squad);
      this.scene.add(g);
      return g;
    };

    this.soldierA = buildRig(this.posA, 'blue', Math.PI / 2.1);
    this.soldierB = buildRig(this.posB, 'red', -Math.PI / 2.1);
    this.soldiersReady = true;
  }

  buildCombatFx() {
    // Tracer Bullet Streaks
    const tracerGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6);
    tracerGeo.rotateX(Math.PI / 2);

    this.tracers = [];
    for (let i = 0; i < 8; i++) {
      const isBlue = i % 2 === 0;
      const color = isBlue ? 0x38bdf8 : 0xf59e0b;
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(tracerGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers.push({ mesh, active: false, t: 0 });
    }
  }

  seek(timeInSeconds) {
    const t = timeInSeconds % 6.0;

    if (this.mixers.length > 0) {
      this.mixers.forEach(mixer => mixer.setTime(t));
    }

    // Firing Windows
    const aFiring = (t >= 0.4 && t <= 1.8) || (t >= 3.2 && t <= 4.6);
    const bFiring = (t >= 1.6 && t <= 3.0) || (t >= 4.4 && t <= 5.8);

    const burstCycleA = Math.floor(t * 12) % 3 === 0;
    const burstCycleB = Math.floor(t * 10) % 3 === 0;

    // Soldier A Muzzle Flash
    if (aFiring && burstCycleA) {
      this.muzzleLightA.intensity = 10.0;
      this.muzzleLightA.position.set(this.posA.x + 1.2, 1.4, this.posA.z + 0.5);
    } else {
      this.muzzleLightA.intensity = 0;
    }

    // Soldier B Muzzle Flash
    if (bFiring && burstCycleB) {
      this.muzzleLightB.intensity = 10.0;
      this.muzzleLightB.position.set(this.posB.x - 1.2, 1.4, this.posB.z - 0.5);
    } else {
      this.muzzleLightB.intensity = 0;
    }

    // Tracers
    this.tracers.forEach((tracer, idx) => {
      const phase = (t + idx * 0.75) % 3.0;
      if (phase < 0.65) {
        tracer.mesh.visible = true;
        const progress = phase / 0.65;
        const isFromA = idx % 2 === 0;
        const start = isFromA ? this.posA : this.posB;
        const target = isFromA ? this.posB : this.posA;

        tracer.mesh.position.lerpVectors(
          new THREE.Vector3(start.x, 1.35, start.z),
          new THREE.Vector3(target.x, 1.3, target.z),
          progress
        );
        tracer.mesh.lookAt(target.x, 1.3, target.z);
      } else {
        tracer.mesh.visible = false;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}
