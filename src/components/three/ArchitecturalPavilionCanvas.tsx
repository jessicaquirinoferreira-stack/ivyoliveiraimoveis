import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Compass, RotateCcw, Sun, Sunset, Moon } from 'lucide-react';

type CameraPresetId = 'facade' | 'terrace' | 'aerial' | 'brise';
type LightingMoodId = 'morning' | 'golden' | 'twilight';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  caption: string;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'facade',
    label: 'Fachada Sul',
    position: [11.2, 4.4, 11.8],
    target: [0, 1.85, 0],
    caption: 'Balanço estrutural em concreto travertino, panos de vidro e brises de bronze.',
  },
  {
    id: 'terrace',
    label: 'Terraço & Espelho',
    position: [7.4, 2.35, 9.6],
    target: [-0.8, 1.35, 1.4],
    caption: 'Integração fluida entre living interno, varanda gourmet e lâmina d’água.',
  },
  {
    id: 'aerial',
    label: 'Vista Aérea',
    position: [12.5, 11.8, 11.4],
    target: [0, 0.9, 0],
    caption: 'Implantação solar em dois pavimentos com cobertura ajardinada e ventilação cruzada.',
  },
  {
    id: 'brise',
    label: 'Detalhes Brise',
    position: [-8.2, 3.6, 8.9],
    target: [0.4, 2.3, -0.4],
    caption: 'Proteção térmica com ritmo vertical metálico e iluminação indireta de galeria.',
  },
];

interface LightingMood {
  id: LightingMoodId;
  label: string;
  sunPos: [number, number, number];
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  bgColor: number;
  interiorGlow: number;
  exposure: number;
}

const LIGHTING_MOODS: Record<LightingMoodId, LightingMood> = {
  morning: {
    id: 'morning',
    label: 'Manhã Carioca',
    sunPos: [14, 16, 10],
    sunColor: 0xfff5e4,
    sunIntensity: 2.35,
    hemiSky: 0xdbeafe,
    hemiGround: 0xc2b29c,
    hemiIntensity: 0.95,
    bgColor: 0xedeae3,
    interiorGlow: 0.35,
    exposure: 1.05,
  },
  golden: {
    id: 'golden',
    label: 'Hora Dourada',
    sunPos: [-15, 7.5, 11],
    sunColor: 0xffc68a,
    sunIntensity: 2.55,
    hemiSky: 0xfde2c4,
    hemiGround: 0x6b5848,
    hemiIntensity: 0.72,
    bgColor: 0xe6ddd0,
    interiorGlow: 1.15,
    exposure: 1.02,
  },
  twilight: {
    id: 'twilight',
    label: 'Crepúsculo',
    sunPos: [-12, 5.2, -11],
    sunColor: 0x8ea7d8,
    sunIntensity: 0.95,
    hemiSky: 0x3b4d71,
    hemiGround: 0x1f242e,
    hemiIntensity: 0.58,
    bgColor: 0x161a22,
    interiorGlow: 2.45,
    exposure: 1.1,
  },
};

function createTravertineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e8e2d6';
    ctx.fillRect(0, 0, 512, 512);
    // Subtle architectural stone strata
    for (let y = 0; y < 512; y += 3) {
      const shade = 224 + Math.sin(y * 0.09) * 7 + (Math.random() - 0.5) * 6;
      ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 13})`;
      ctx.fillRect(0, y, 512, 2);
    }
    // Fine ashlar joint lines
    ctx.strokeStyle = 'rgba(110, 99, 86, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createWaterRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#25606e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 42; i++) {
      const y = (i / 42) * 256;
      const grad = ctx.createLinearGradient(0, y, 256, y + 6);
      grad.addColorStop(0, 'rgba(165, 224, 232, 0.04)');
      grad.addColorStop(0.5, 'rgba(215, 245, 248, 0.14)');
      grad.addColorStop(1, 'rgba(165, 224, 232, 0.04)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 256, 3);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createPlinthGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#dcd7ce';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(72, 67, 60, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function ArchitecturalPavilionCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('facade');
  const [lightingMood, setLightingMood] = useState<LightingMoodId>('golden');
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Refs shared with Three.js animation loop without re-creating the WebGL context
  const presetRef = useRef<CameraPresetId>(activePreset);
  const moodRef = useRef<LightingMoodId>(lightingMood);
  const dragDeltaRef = useRef({ yaw: 0, pitch: 0 });
  const pointerTiltRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    presetRef.current = activePreset;
    // Gently recenter manual drag offset when picking a curated architectural preset
    dragDeltaRef.current = { yaw: 0, pitch: 0 };
  }, [activePreset]);

  useEffect(() => {
    moodRef.current = lightingMood;
  }, [lightingMood]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      const probeCanvas = document.createElement('canvas');
      const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!probeGl) {
        setWebglUnavailable(true);
        return;
      }

      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      const gpuStr = dbg ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(gpuStr);

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const width = container.clientWidth || 720;
      const height = container.clientHeight || 480;

      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = LIGHTING_MOODS[moodRef.current].exposure;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const initialMood = LIGHTING_MOODS[moodRef.current];
      const bgColor = new THREE.Color(initialMood.bgColor);
      scene.background = bgColor;
      scene.fog = new THREE.Fog(initialMood.bgColor, 24, 54);

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.55;

      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
      const firstPreset = CAMERA_PRESETS[0];
      camera.position.set(...firstPreset.position);
      camera.lookAt(...firstPreset.target);

      // Lighting rig
      const hemiLight = new THREE.HemisphereLight(
        initialMood.hemiSky,
        initialMood.hemiGround,
        initialMood.hemiIntensity
      );
      scene.add(hemiLight);

      const sunLight = new THREE.DirectionalLight(initialMood.sunColor, initialMood.sunIntensity);
      sunLight.position.set(...initialMood.sunPos);
      if (!isSoftwareGl) {
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        sunLight.shadow.camera.near = 2;
        sunLight.shadow.camera.far = 48;
        sunLight.shadow.camera.left = -12;
        sunLight.shadow.camera.right = 12;
        sunLight.shadow.camera.top = 12;
        sunLight.shadow.camera.bottom = -12;
        sunLight.shadow.bias = -0.0004;
        sunLight.shadow.normalBias = 0.025;
      }
      scene.add(sunLight);

      // Warm interior architectural glow lights
      const interiorLightMain = new THREE.PointLight(0xffd29d, initialMood.interiorGlow, 14, 1.8);
      interiorLightMain.position.set(-0.6, 1.65, -0.3);
      scene.add(interiorLightMain);

      const interiorLightUpper = new THREE.PointLight(0xffcb8c, initialMood.interiorGlow * 0.85, 13, 1.8);
      interiorLightUpper.position.set(0.8, 3.65, -0.5);
      scene.add(interiorLightUpper);

      // Procedural textures (zero external URLs)
      const travertineTex = createTravertineTexture();
      const waterTex = createWaterRippleTexture();
      const plinthTex = createPlinthGridTexture();

      // Shared PBR materials
      const travertineMat = new THREE.MeshStandardMaterial({
        map: travertineTex,
        color: 0xf4efe6,
        roughness: 0.72,
        metalness: 0.04,
      });

      const darkBasaltMat = new THREE.MeshStandardMaterial({
        color: 0x262523,
        roughness: 0.78,
        metalness: 0.08,
      });

      const timberMat = new THREE.MeshStandardMaterial({
        color: 0x6f4d34,
        roughness: 0.62,
        metalness: 0.05,
      });

      const bronzeMat = new THREE.MeshPhysicalMaterial({
        color: 0x9b7449,
        metalness: 0.88,
        roughness: 0.28,
        anisotropy: 0.55,
        clearcoat: 0.25,
      });

      const glassMat = isSoftwareGl
        ? new THREE.MeshStandardMaterial({
            color: 0x9ec0cc,
            metalness: 0.15,
            roughness: 0.08,
            transparent: true,
            opacity: 0.34,
          })
        : new THREE.MeshPhysicalMaterial({
            color: 0xcbe3ea,
            metalness: 0,
            roughness: 0.06,
            transmission: 0.72,
            thickness: 0.25,
            ior: 1.48,
            transparent: true,
            opacity: 0.92,
          });

      const waterMat = new THREE.MeshPhysicalMaterial({
        map: waterTex,
        color: 0x3b8ea1,
        metalness: 0.08,
        roughness: 0.12,
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
      });

      const warmHearthMat = new THREE.MeshStandardMaterial({
        color: 0xfff0d4,
        emissive: 0xffb866,
        emissiveIntensity: 0.9,
        roughness: 0.4,
      });

      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x3f5841,
        roughness: 0.82,
        metalness: 0.02,
      });

      const groundMat = new THREE.MeshStandardMaterial({
        map: plinthTex,
        color: 0xe6e1d7,
        roughness: 0.9,
        metalness: 0.02,
      });

      // Architectural Pavilion Composite Group
      const pavilion = new THREE.Group();
      scene.add(pavilion);

      const addMesh = (
        geo: THREE.BufferGeometry,
        mat: THREE.Material,
        pos: [number, number, number],
        parent: THREE.Object3D = pavilion,
        cast = true,
        receive = true
      ) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = cast && !isSoftwareGl;
        mesh.receiveShadow = receive && !isSoftwareGl;
        parent.add(mesh);
        return mesh;
      };

      // 1. Ground architectural plinth & terrace deck
      const groundPlane = addMesh(
        new THREE.CylinderGeometry(18, 18, 0.2, 64),
        groundMat,
        [0, -0.35, 0],
        scene,
        false,
        true
      );
      void groundPlane;

      addMesh(new THREE.BoxGeometry(11.6, 0.42, 8.6), travertineMat, [0, 0.0, 0.4], pavilion, false, true);
      addMesh(new THREE.BoxGeometry(10.8, 0.08, 7.9), darkBasaltMat, [0, 0.25, 0.4], pavilion, false, true);

      // 2. Infinity water terrace (front-right cantilevered pool)
      addMesh(new THREE.BoxGeometry(4.9, 0.34, 3.1), darkBasaltMat, [2.75, 0.15, 2.75], pavilion, true, true);
      const waterSurface = addMesh(
        new THREE.BoxGeometry(4.65, 0.06, 2.86),
        waterMat,
        [2.75, 0.31, 2.75],
        pavilion,
        false,
        true
      );

      // Teak timber sun deck beside the pool
      addMesh(new THREE.BoxGeometry(4.8, 0.08, 3.1), timberMat, [-2.35, 0.28, 2.6], pavilion, false, true);

      // 3. Ground floor structural walls & sunlit glass pavilion
      addMesh(new THREE.BoxGeometry(8.6, 2.35, 0.32), travertineMat, [-0.4, 1.44, -2.55]);
      addMesh(new THREE.BoxGeometry(0.34, 2.35, 4.4), travertineMat, [-4.55, 1.44, -0.5]);
      // Interior sculptural dividing core & glowing art wall
      addMesh(new THREE.BoxGeometry(2.2, 2.2, 0.28), darkBasaltMat, [-1.4, 1.38, -0.6]);
      const artBacklight = addMesh(
        new THREE.BoxGeometry(1.75, 1.25, 0.04),
        warmHearthMat,
        [-1.4, 1.5, -0.44],
        pavilion,
        false,
        false
      );

      // Ground-floor recessed glass planes
      addMesh(new THREE.BoxGeometry(7.2, 2.18, 0.06), glassMat, [0.4, 1.38, 1.15], pavilion, false, false);
      addMesh(new THREE.BoxGeometry(0.06, 2.18, 3.65), glassMat, [3.95, 1.38, -0.7], pavilion, false, false);

      // Bronze window mullions
      for (const mx of [-3.1, -1.3, 0.5, 2.3, 3.95]) {
        addMesh(new THREE.BoxGeometry(0.06, 2.22, 0.09), bronzeMat, [mx, 1.38, 1.16]);
      }

      // 4. Cantilevered mezzanine slab (signature Rio modernist horizontal plane)
      addMesh(new THREE.BoxGeometry(10.8, 0.34, 5.9), travertineMat, [0.55, 2.68, -0.35]);
      // Warm timber soffit underneath overhang
      addMesh(new THREE.BoxGeometry(10.4, 0.06, 5.5), timberMat, [0.55, 2.49, -0.35], pavilion, false, true);

      // 5. Upper floor residence volume (offset asymmetric cantilever)
      addMesh(new THREE.BoxGeometry(8.4, 2.28, 0.32), travertineMat, [0.8, 3.98, -2.55]);
      addMesh(new THREE.BoxGeometry(0.32, 2.28, 4.2), travertineMat, [4.85, 3.98, -0.55]);
      // Upper interior architectural divider
      addMesh(new THREE.BoxGeometry(0.24, 2.18, 3.4), darkBasaltMat, [0.9, 3.95, -0.9]);
      const upperGlowPanel = addMesh(
        new THREE.BoxGeometry(2.6, 0.14, 0.14),
        warmHearthMat,
        [2.4, 4.92, -1.2],
        pavilion,
        false,
        false
      );

      // Upper panoramic glass facade
      addMesh(new THREE.BoxGeometry(7.9, 2.14, 0.06), glassMat, [0.85, 3.95, 1.48], pavilion, false, false);
      addMesh(new THREE.BoxGeometry(0.06, 2.14, 3.95), glassMat, [-3.1, 3.95, -0.5], pavilion, false, false);

      // Glass balcony balustrade
      addMesh(new THREE.BoxGeometry(9.6, 0.72, 0.04), glassMat, [0.65, 3.22, 2.48], pavilion, false, false);
      addMesh(new THREE.BoxGeometry(9.6, 0.04, 0.06), bronzeMat, [0.65, 3.59, 2.48]);

      // 6. Signature brushed-bronze architectural brise-soleil louvers (west wing)
      const louverGeo = new THREE.BoxGeometry(0.055, 2.22, 0.22);
      for (let i = 0; i < 11; i++) {
        const louver = new THREE.Mesh(louverGeo, bronzeMat);
        louver.position.set(-4.35 + i * 0.24, 3.96, 1.98);
        louver.rotation.y = 0.35;
        louver.castShadow = !isSoftwareGl;
        louver.receiveShadow = !isSoftwareGl;
        pavilion.add(louver);
      }

      // 7. Crown cantilevered roof slab with skylight void framing
      addMesh(new THREE.BoxGeometry(11.4, 0.32, 6.2), travertineMat, [0.35, 5.22, -0.35]);
      addMesh(new THREE.BoxGeometry(11.46, 0.07, 6.26), bronzeMat, [0.35, 5.38, -0.35], pavilion, false, true);
      // Slim bronze pilotis columns
      for (const [cx, cz] of [
        [-4.2, 2.1],
        [4.55, 2.1],
        [4.55, -2.5],
      ] as [number, number][]) {
        addMesh(new THREE.CylinderGeometry(0.085, 0.085, 2.38, 16), bronzeMat, [cx, 1.45, cz]);
      }

      // 8. Architectural landscape planter boxes & coastal sculptural trees
      addMesh(new THREE.BoxGeometry(1.9, 0.45, 0.85), travertineMat, [-4.3, 0.48, 3.45]);
      for (const [fx, fy, fz, r] of [
        [-4.7, 0.92, 3.45, 0.38],
        [-4.1, 1.05, 3.42, 0.44],
        [-3.65, 0.88, 3.48, 0.32],
        [-5.35, 1.25, -2.2, 0.62],
        [-5.7, 1.75, -2.0, 0.48],
      ] as [number, number, number, number][]) {
        addMesh(new THREE.DodecahedronGeometry(r, 1), foliageMat, [fx, fy, fz]);
      }
      addMesh(new THREE.CylinderGeometry(0.06, 0.09, 1.2, 10), timberMat, [-5.45, 0.6, -2.15]);

      // Pre-allocated vectors & colors for zero-GC animation loop
      const desiredCamPos = new THREE.Vector3(...firstPreset.position);
      const currentTarget = new THREE.Vector3(...firstPreset.target);
      const desiredTarget = new THREE.Vector3(...firstPreset.target);
      const offsetVec = new THREE.Vector3();
      const spherical = new THREE.Spherical();
      const targetBgColor = new THREE.Color(initialMood.bgColor);
      const targetSunColor = new THREE.Color(initialMood.sunColor);
      const targetHemiSky = new THREE.Color(initialMood.hemiSky);
      const targetHemiGround = new THREE.Color(initialMood.hemiGround);
      const targetSunPos = new THREE.Vector3(...initialMood.sunPos);

      // IntersectionObserver to pause rendering when scrolled out of viewport
      let isVisible = true;
      const observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.05 }
      );
      observer.observe(container);

      const resizeObserver = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect || rect.width < 10 || rect.height < 10) return;
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height, false);
      });
      resizeObserver.observe(container);

      let frameHandle: number | null = null;
      let timeoutHandle: number | null = null;
      let disposed = false;
      const clock = new THREE.Clock();

      const scheduleNext = (fn: () => void) => {
        if (disposed) return;
        if (isSoftwareGl) {
          timeoutHandle = window.setTimeout(fn, 24);
        } else {
          frameHandle = window.requestAnimationFrame(fn);
        }
      };

      const animate = () => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.getElapsedTime();

        if (isVisible) {
          const preset =
            CAMERA_PRESETS.find((p) => p.id === presetRef.current) || CAMERA_PRESETS[0];
          const mood = LIGHTING_MOODS[moodRef.current];

          // Smooth camera orbit from curated preset + user drag + subtle pointer parallax
          desiredTarget.set(...preset.target);
          currentTarget.lerp(desiredTarget, 1 - Math.exp(-delta * 4.5));

          offsetVec.set(
            preset.position[0] - preset.target[0],
            preset.position[1] - preset.target[1],
            preset.position[2] - preset.target[2]
          );
          spherical.setFromVector3(offsetVec);

          const ambientDrift = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.22) * 0.06;
          spherical.theta +=
            dragDeltaRef.current.yaw + pointerTiltRef.current.x * 0.14 + ambientDrift;
          spherical.phi = THREE.MathUtils.clamp(
            spherical.phi + dragDeltaRef.current.pitch + pointerTiltRef.current.y * 0.07,
            0.38,
            1.42
          );

          desiredCamPos.setFromSpherical(spherical).add(currentTarget);
          camera.position.lerp(desiredCamPos, 1 - Math.exp(-delta * 4.2));
          camera.lookAt(currentTarget);

          // Smooth solar lighting transitions
          const lightLerp = 1 - Math.exp(-delta * 3.5);
          targetSunPos.set(...mood.sunPos);
          sunLight.position.lerp(targetSunPos, lightLerp);
          targetSunColor.setHex(mood.sunColor);
          sunLight.color.lerp(targetSunColor, lightLerp);
          sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, mood.sunIntensity, lightLerp);

          targetHemiSky.setHex(mood.hemiSky);
          targetHemiGround.setHex(mood.hemiGround);
          hemiLight.color.lerp(targetHemiSky, lightLerp);
          hemiLight.groundColor.lerp(targetHemiGround, lightLerp);
          hemiLight.intensity = THREE.MathUtils.lerp(
            hemiLight.intensity,
            mood.hemiIntensity,
            lightLerp
          );

          targetBgColor.setHex(mood.bgColor);
          bgColor.lerp(targetBgColor, lightLerp);
          if (scene.fog instanceof THREE.Fog) {
            scene.fog.color.copy(bgColor);
          }

          interiorLightMain.intensity = THREE.MathUtils.lerp(
            interiorLightMain.intensity,
            mood.interiorGlow,
            lightLerp
          );
          interiorLightUpper.intensity = THREE.MathUtils.lerp(
            interiorLightUpper.intensity,
            mood.interiorGlow * 0.85,
            lightLerp
          );
          warmHearthMat.emissiveIntensity = THREE.MathUtils.lerp(
            warmHearthMat.emissiveIntensity,
            0.4 + mood.interiorGlow * 0.65,
            lightLerp
          );
          renderer.toneMappingExposure = THREE.MathUtils.lerp(
            renderer.toneMappingExposure,
            mood.exposure,
            lightLerp
          );

          // Gentle infinity water ripple scroll
          if (!prefersReducedMotion) {
            waterTex.offset.x = (elapsed * 0.015) % 1;
            waterTex.offset.y = Math.sin(elapsed * 0.35) * 0.025;
            waterSurface.position.y = 0.31 + Math.sin(elapsed * 1.1) * 0.004;
          }
          void artBacklight;
          void upperGlowPanel;

          renderer.render(scene, camera);
        }

        scheduleNext(animate);
      };

      scheduleNext(animate);

      return () => {
        disposed = true;
        if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
        if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
        observer.disconnect();
        resizeObserver.disconnect();

        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
        travertineTex.dispose();
        waterTex.dispose();
        plinthTex.dispose();
        envRT.dispose();
        pmremGenerator.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch {
      setWebglUnavailable(true);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerTiltRef.current = { x: normX, y: normY };

    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    dragDeltaRef.current = {
      yaw: THREE.MathUtils.clamp(dragDeltaRef.current.yaw - dx * 0.006, -1.5, 1.5),
      pitch: THREE.MathUtils.clamp(dragDeltaRef.current.pitch - dy * 0.004, -0.45, 0.45),
    };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
    pointerTiltRef.current = { x: 0, y: 0 };
  };

  const currentPresetMeta =
    CAMERA_PRESETS.find((p) => p.id === activePreset) || CAMERA_PRESETS[0];

  if (webglUnavailable) {
    return (
      <div className="border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden bg-[var(--site-surface)]">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <img
            src="/src/assets/images/hero_penthouse_living_1795532252931.jpg"
            alt="Estudo arquitetônico contemporâneo no Rio de Janeiro"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-5 text-xs text-[var(--site-text-muted)]">
          Visualização arquitetônica interativa · Estudo de insolação e volumetria contemporânea.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--site-border)] rounded-[var(--site-radius)] overflow-hidden bg-[var(--site-surface)] shadow-[0_24px_60px_-28px_rgba(20,20,19,0.22)]">
      {/* Isolated WebGL Viewport (zero backdrop-filter overlays over canvas) */}
      <div className="relative h-[380px] sm:h-[460px] lg:h-[500px] w-full bg-[#e6ddd0]">
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          role="application"
          aria-label="Maquete arquitetônica 3D interativa — arraste para rotacionar a câmera"
          className="h-full w-full cursor-grab active:cursor-grabbing touch-pan-y select-none"
        />

        {/* Minimal corner coordinate hint — solid opaque chip, zero backdrop-blur */}
        <div className="pointer-events-none absolute top-4 left-4 px-3 py-1.5 bg-[var(--site-surface)]/95 border border-[var(--site-border)] rounded-[var(--site-radius)] text-[11px] font-mono tracking-wide text-[var(--site-text)] flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[var(--site-accent)]" />
          <span>Arraste para orbitar · 3D em tempo real</span>
        </div>

        <button
          type="button"
          onClick={() => {
            dragDeltaRef.current = { yaw: 0, pitch: 0 };
            setActivePreset('facade');
          }}
          aria-label="Recentralizar câmera 3D"
          className="absolute top-4 right-4 p-2 bg-[var(--site-surface)]/95 border border-[var(--site-border)] rounded-[var(--site-radius)] text-[var(--site-text)] hover:border-[var(--site-accent)] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Architectural Control Console — strictly beneath canvas */}
      <div className="p-5 sm:p-6 border-t border-[var(--site-border)] bg-[var(--site-surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {CAMERA_PRESETS.map((preset) => {
              const active = preset.id === activePreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setActivePreset(preset.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[var(--site-radius)] border transition-colors ${
                    active
                      ? 'bg-[var(--site-text)] text-[var(--site-surface)] border-[var(--site-text)]'
                      : 'bg-[var(--site-bg)] text-[var(--site-text-muted)] border-[var(--site-border)] hover:text-[var(--site-text)] hover:border-[var(--site-accent)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 border border-[var(--site-border)] rounded-[var(--site-radius)] p-1 bg-[var(--site-bg)] self-start sm:self-auto">
            {(
              [
                { id: 'morning', label: 'Manhã', icon: Sun },
                { id: 'golden', label: 'Tarde', icon: Sunset },
                { id: 'twilight', label: 'Noite', icon: Moon },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = lightingMood === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLightingMood(id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[calc(var(--site-radius)-2px)] transition-colors ${
                    active
                      ? 'bg-[var(--site-surface)] text-[var(--site-text)] shadow-xs'
                      : 'text-[var(--site-text-muted)] hover:text-[var(--site-text)]'
                  }`}
                >
                  <Icon className="w-3 h-3 text-[var(--site-accent)]" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[var(--site-text-muted)] leading-relaxed flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--site-border)]">
          <span>{currentPresetMeta.caption}</span>
          <span className="font-mono text-[11px] text-[var(--site-accent)]">
            Insolação: {LIGHTING_MOODS[lightingMood].label}
          </span>
        </p>
      </div>
    </div>
  );
}
