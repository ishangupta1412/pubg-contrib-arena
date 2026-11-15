# Custom 3D Character Models (`.glb`)

The 3D PUBG Battle Arena features a **procedural Level-3 tactical soldier rig** that renders out-of-the-box without requiring any external assets.

### How to use custom Sketchfab / Mixamo 3D models:
1. Download rigged models from Sketchfab or Mixamo in `.glb` / `.gltf` format:
   - **Soldier A**: [Modern Tactical Soldier](https://sketchfab.com/3d-models/modern-tactical-soldier-ab88f581b1ba46f2a0bd33de06040533) -> Save as `soldier_a.glb`
   - **Soldier B**: [Tactical Soldier Military Operator](https://sketchfab.com/3d-models/tactical-soldier-military-operator-093e3de7c1c84131ac156e08aaf86e06) -> Save as `soldier_b.glb`
2. Place `soldier_a.glb` and `soldier_b.glb` directly in this directory:
   ```text
   assets/models/soldier_a.glb
   assets/models/soldier_b.glb
   ```
3. The Three.js loader automatically checks for `.glb` files and blends them with the `THREE.AnimationMixer` combat states. If absent, it seamlessly falls back to the high-detail procedural tactical rig.
