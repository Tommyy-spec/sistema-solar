// App.js — Sistema Solar 3D + Sección "Capas de la Tierra" (exploded view)
// CRA + three r0.160 + @react-three/drei

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Line,
  Trail,
  AdaptiveDpr,
  Preload,
  Instances,
  Instance,
  Text,
} from "@react-three/drei";
import * as THREE from "three";

/* =================== Fuente tech =================== */
function useInjectFonts() {
  useEffect(() => {
    const id = "tech-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Roboto+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* =================== Helpers de rutas =================== */
const PUB =
  (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL) ||
  "";
const resolveURL = (u) =>
  /^(https?:|data:)/i.test(u) ? u : `${PUB}${u.startsWith("/") ? "" : "/"}${u}`;

/* =================== Rutas de texturas (incluye capas Tierra) =================== */
const TEX = {
  // Sol (si no tenés textura, se verá amarillo por defecto)
  sun: [
    "/textures/sol/sun.jpg",
    "/textures/sol/Sun.jpg",
    "/textures/sun.jpg",
  ],
  // Planetas estándar
  mercury: ["/textures/planetas/mercury.jpg", "/textures/mercury.jpg"],
  venus: ["/textures/planetas/venus.jpg", "/textures/venus.jpg"],
  earth: [
    // Placeholder liviano del ZIP (ya suficiente para ver bien)
    "/textures/earth/earth_day_placeholder_2k.jpg",
    // Si luego bajas 8K, ponelo acá:
    "/textures/earth/earth_day_8k.jpg",
  ],
  mars: ["/textures/planetas/mars.jpg", "/textures/mars.jpg"],
  jupiter: ["/textures/planetas/jupiter.jpg", "/textures/jupiter.jpg"],
  saturn: ["/textures/planetas/saturn.jpg", "/textures/saturn.jpg"],
  uranus: ["/textures/planetas/uranus.jpg", "/textures/uranus.jpg"],
  neptune: ["/textures/planetas/neptune.jpg", "/textures/neptune.jpg"],
  ring: [
    "/textures/planetas/saturn_ring_alpha.png",
    "/textures/planetas/saturn-ring.png",
  ],
  moon: ["/textures/luna/moon.jpg", "/textures/moon.jpg"],

  // Capas Tierra (del ZIP)
  crust_albedo: ["/textures/earth_layers/crust_albedo.jpg"],
  crust_normal: ["/textures/earth_layers/crust_normal.png"],
  mantle_albedo: ["/textures/earth_layers/mantle_albedo.jpg"],
  mantle_normal: ["/textures/earth_layers/mantle_normal.png"],
  outer_core_emissive: ["/textures/earth_layers/outer_core_emissive.jpg"],
  inner_core_metal: ["/textures/earth_layers/inner_core_metal.jpg"],
};

/* =================== Datos =================== */
const AU_KM = 149_597_870;
const EARTH_CIRC_KM = 40_075;
const EARTH_DIAM_KM = 12_742;
const laps = (km) => Math.max(1, Math.round(km / EARTH_CIRC_KM));

const SUN = {
  key: "Sol",
  type: "Enana amarilla (G2V)",
  color: "#ffaa00",
  radius_km: 696340,
  au: 0,
  period_y: 0,
  day_h: 25 * 24,
  tempC: "≈5.500 °C (superficie)",
  life: "No, pero posibilita la vida en la Tierra",
  formed: "Colapso de nube molecular (~4.6 Ga)",
  fact: "Concentra >99,8% de la masa del Sistema Solar.",
};

const PLANETS = [
  { key: "Mercurio", type: "Rocoso", color: "#b5a642", radius_km: 2440, au: 0.39, period_y: 0.241, day_h: 1407.6, tex: "mercury" },
  { key: "Venus", type: "Rocoso", color: "#caa46a", radius_km: 6052, au: 0.72, period_y: 0.615, day_h: -5832.5, tex: "venus" },
  { key: "Tierra", type: "Rocoso", color: "#2e86de", radius_km: 6371, au: 1.0, period_y: 1.0, day_h: 23.93, tex: "earth" },
  { key: "Marte", type: "Rocoso", color: "#b4513c", radius_km: 3389, au: 1.52, period_y: 1.881, day_h: 24.62, tex: "mars" },
  { key: "Júpiter", type: "Gigante gaseoso", color: "#d2b48c", radius_km: 69911, au: 5.2, period_y: 11.86, day_h: 9.93, tex: "jupiter" },
  { key: "Saturno", type: "Gigante gaseoso", color: "#f0e0b6", radius_km: 58232, au: 9.58, period_y: 29.46, day_h: 10.7, tex: "saturn", ring: true },
  { key: "Urano", type: "Gigante helado", color: "#66e0d9", radius_km: 25362, au: 19.2, period_y: 84.01, day_h: -17.24, tex: "uranus" },
  { key: "Neptuno", type: "Gigante helado", color: "#4169e1", radius_km: 24622, au: 30.05, period_y: 164.8, day_h: 16.11, tex: "neptune" },
];

/* =================== Escalas de render =================== */
const RENDER_SCALES_BASE = {
  didactica: { name: "Didáctica (compacta)", sunR: 3.0, auInSunR: 4, planetExaggeration: 1.2, minSize: 0.18 },
  real:      { name: "Real 1:1 distancias", sunR: 3.0, auInSunR: 30, planetExaggeration: 1.0, minSize: 0.2 },
  visual:    { name: "Visual realista", sunR: 3.2, auInSunR: 20, planetExaggeration: 1.4, minSize: 0.16 },
};
function buildScale(key) {
  const cfg = RENDER_SCALES_BASE[key];
  const sizeFactor = cfg.sunR / SUN.radius_km;
  const distFactor = (cfg.sunR * cfg.auInSunR) / AU_KM;
  return { ...cfg, sizeFactor, distFactor, planetExaggeration: cfg.planetExaggeration ?? 1.0 };
}

/* =================== Loader robusto =================== */
function useFirstAvailableTexture(urls) {
  const { gl } = useThree();
  const [tex, setTex] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadImage = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

    const isPOT = (n) => (n & (n - 1)) === 0;

    const makeTexture = (image) => {
      const t = new THREE.Texture(image);
      if ("colorSpace" in t && "SRGBColorSpace" in THREE) t.colorSpace = THREE.SRGBColorSpace;
      else if ("encoding" in t && "sRGBEncoding" in THREE) t.encoding = THREE.sRGBEncoding;

      const pot = isPOT(image.width) && isPOT(image.height);
      t.generateMipmaps = !!pot;
      t.minFilter = pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      const maxAniso = typeof gl.capabilities.getMaxAnisotropy === "function"
        ? gl.capabilities.getMaxAnisotropy() : 8;
      t.anisotropy = Math.min(8, maxAniso || 8);
      t.needsUpdate = true;
      return t;
    };

    (async () => {
      const maxSize = gl.capabilities?.maxTextureSize || 4096;

      for (const raw of urls) {
        const url = resolveURL(raw);
        try {
          let img = await loadImage(url);
          if (cancelled) return;

          if ((img.width || 0) <= 1 && (img.height || 0) <= 1) continue;

          if (img.width > maxSize || img.height > maxSize) {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img = canvas;
          }

          const t = makeTexture(img);
          if (!cancelled) setTex(t);
          return;
        } catch {}
      }
      if (!cancelled) setTex(null);
    })();

    return () => { cancelled = true; };
  }, [JSON.stringify(urls), gl]);

  return tex;
}

function useSolarTextures() {
  return {
    sun: useFirstAvailableTexture(TEX.sun),
    mercury: useFirstAvailableTexture(TEX.mercury),
    venus: useFirstAvailableTexture(TEX.venus),
    earth: useFirstAvailableTexture(TEX.earth),
    mars: useFirstAvailableTexture(TEX.mars),
    jupiter: useFirstAvailableTexture(TEX.jupiter),
    saturn: useFirstAvailableTexture(TEX.saturn),
    uranus: useFirstAvailableTexture(TEX.uranus),
    neptune: useFirstAvailableTexture(TEX.neptune),
    ring: useFirstAvailableTexture(TEX.ring),
    moon: useFirstAvailableTexture(TEX.moon),
    // Earth layers
    crust_albedo: useFirstAvailableTexture(TEX.crust_albedo),
    crust_normal: useFirstAvailableTexture(TEX.crust_normal),
    mantle_albedo: useFirstAvailableTexture(TEX.mantle_albedo),
    mantle_normal: useFirstAvailableTexture(TEX.mantle_normal),
    outer_core_emissive: useFirstAvailableTexture(TEX.outer_core_emissive),
    inner_core_metal: useFirstAvailableTexture(TEX.inner_core_metal),
  };
}

/* =================== Órbitas y conversores =================== */
function OrbitPath({ r }) {
  const points = useMemo(() => {
    const pts = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }, [r]);
  return (
    <Line points={points} color="#4b5563" lineWidth={1} dashed dashSize={0.4} gapSize={0.2} />
  );
}
const kmToSceneRadius = (km, sc) =>
  Math.max(sc.minSize, km * sc.sizeFactor * sc.planetExaggeration);
const auToSceneDistance = (au, sc) => Math.max(5, au * AU_KM * sc.distFactor);
const kmToSceneDistance = (km, sc) => Math.max(0.6, km * sc.distFactor);

/* =================== Objetos 3D del sistema solar =================== */
function Sun({ map, onSelect, radius }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.05; });

  const material = map
    ? <meshBasicMaterial map={map} toneMapped={false} />
    : <meshBasicMaterial color="#ffcc66" toneMapped={false} />;

  return (
    <group>
      <mesh ref={ref} onClick={() => onSelect && onSelect(SUN)} frustumCulled={false}>
        <sphereGeometry args={[radius, 64, 64]} />
        {material}
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={600} decay={2} />
      <Text position={[0, radius + 0.8, 0]} fontSize={0.6} anchorX="center" anchorY="middle">
        Sol
      </Text>
    </group>
  );
}

function Planet({
  p, map, ringMap, speed, scaleCfg, onSelect, showTrails,
  selectedKey, planetsMoving, planetRefCb, children,
}) {
  const group = useRef();
  const mesh = useRef();
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const radius = kmToSceneRadius(p.radius_km, scaleCfg);
  const orbitR = auToSceneDistance(p.au, scaleCfg);

  useEffect(() => { planetRefCb && planetRefCb(p.key, group.current); }, [planetRefCb, p.key]);

  useFrame((_, dt) => {
    if (planetsMoving) {
      angleRef.current += (dt * speed / Math.max(1e-6, p.period_y)) * Math.PI * 2;
    }
    const x = Math.cos(angleRef.current) * orbitR;
    const z = Math.sin(angleRef.current) * orbitR;
    group.current?.position.set(x, 0, z);

    if (mesh.current && planetsMoving) mesh.current.rotation.y += dt * (p.day_h < 0 ? -0.05 : 0.05);
    if (mesh.current) {
      const target = selectedKey === p.key ? 1.18 : 1.0;
      mesh.current.scale.setScalar(THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.15));
    }
  });

  return (
    <group ref={group} frustumCulled={false}>
      {showTrails && planetsMoving && (
        <Trail width={0.08} color={new THREE.Color(p.color)} length={140} decay={1} attenuation={(t) => t} target={group} />
      )}
      <mesh ref={mesh} castShadow receiveShadow onClick={() => onSelect && onSelect(p)} frustumCulled={false}>
        <sphereGeometry args={[radius, 48, 48]} />
        {map ? (
          <meshBasicMaterial map={map} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={p.color} roughness={0.8} metalness={0} />
        )}
      </mesh>
      {p.ring && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]} frustumCulled={false}>
          <ringGeometry args={[radius * 1.7, radius * 3.0, 96]} />
          {ringMap ? (
            <meshBasicMaterial map={ringMap} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
          ) : (
            <meshBasicMaterial color={"#d9c9a5"} transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
          )}
        </mesh>
      )}
      <Text position={[0, radius * 1.6, 0]} fontSize={Math.max(0.3, radius * 0.35)} anchorX="center" anchorY="middle">
        {p.key}
      </Text>
      {children}
    </group>
  );
}

/* =================== Tierra + Luna (para escena solar) =================== */
function EarthWithMoon({
  maps, speed, scaleCfg, onSelect, selectedKey, showTrails,
  useRealMoonDistance, planetsMoving, planetRefCb,
}) {
  const earth = PLANETS.find((p) => p.key === "Tierra");
  const MOON_RADIUS_KM = 1737;
  const earthRadius = kmToSceneRadius(earth.radius_km, scaleCfg);
  const moonRadius = earthRadius * (MOON_RADIUS_KM / earth.radius_km);
  const moon = useRef();
  const moonAngle = useRef(Math.random() * Math.PI * 2);

  useEffect(() => { if (planetRefCb && moon.current) planetRefCb("Luna", moon.current); }, [planetRefCb]);

  const moonDistance = useRealMoonDistance ? kmToSceneDistance(384_400, scaleCfg) : earthRadius * 8;

  useFrame((_, dt) => {
    if (!moon.current) return;
    if (planetsMoving) moonAngle.current += dt * 1.2;
    moon.current.position.set(Math.cos(moonAngle.current) * moonDistance, 0, Math.sin(moonAngle.current) * moonDistance);
    if (planetsMoving) moon.current.rotation.y += 0.01;
  });

  return (
    <Planet
      p={earth} map={maps.earth} ringMap={maps.ring} speed={speed} scaleCfg={scaleCfg}
      onSelect={onSelect} showTrails={showTrails} selectedKey={selectedKey}
      planetsMoving={planetsMoving} planetRefCb={planetRefCb}
    >
      <group ref={moon}>
        <mesh onClick={() => onSelect && onSelect({ key: "Luna", type: "Satélite natural", day_h: 655.7 })}>
          <sphereGeometry args={[moonRadius, 48, 48]} />
          {maps.moon ? <meshBasicMaterial map={maps.moon} toneMapped={false} /> : <meshStandardMaterial color="#aaa" />}
        </mesh>
        <Text position={[0, moonRadius * 1.6, 0]} fontSize={Math.max(0.22, moonRadius * 0.45)} anchorX="center" anchorY="middle">Luna</Text>
      </group>
    </Planet>
  );
}

/* =================== Sistema Solar (grupo) =================== */
const SolarSystem = forwardRef(function SolarSystem(
  {
    maps, speed, scaleCfg, moving, sunSpeed, swayAmp, swayFreq, onSelect, selectedKey,
    controlsRef, useRealMoonDistance, planetsMoving, controlsAutoTarget, showVisualMeasures,
  },
  ref
) {
  const solarRef = useRef();
  const sunRef = useRef();
  const planetRefs = useRef({});
  const registerPlanetRef = (key, r) => { if (r) planetRefs.current[key] = r; };

  useImperativeHandle(
    ref,
    () => ({
      getWorldPositionOf(key) {
        const obj = key === "Sol" ? sunRef.current : planetRefs.current[key];
        if (!obj) return null;
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
      },
      getApproxPlanetRadius(key) {
        if (key === "Sol") return scaleCfg.sunR;
        const p = PLANETS.find((pp) => pp.key === key);
        if (p) return kmToSceneRadius(p.radius_km, scaleCfg);
        if (key === "Luna") {
          const earthR = kmToSceneRadius(6371, scaleCfg);
          return earthR * (1737 / 6371);
        }
        return 2;
      },
    }),
    [scaleCfg]
  );

  useFrame((state) => {
    if (!solarRef.current) return;
    if (moving) {
      const t = state.clock.getElapsedTime();
      solarRef.current.position.set(Math.sin(t * swayFreq) * swayAmp, 0, -sunSpeed * t);
      if (controlsRef?.current && controlsAutoTarget) {
        controlsRef.current.target.lerp(solarRef.current.position, 0.08);
        controlsRef.current.update();
      }
    } else {
      solarRef.current.position.set(0, 0, 0);
      solarRef.current.rotation.set(0, 0, 0);
      if (controlsRef?.current && controlsAutoTarget) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.12);
        controlsRef.current.update();
      }
    }
  });

  return (
    <group ref={solarRef} frustumCulled={false}>
      <group ref={sunRef}>
        <Sun map={maps.sun} onSelect={onSelect} radius={scaleCfg.sunR} />
      </group>

      {PLANETS.map((p) => (
        <group key={p.key}>
          {!moving && <OrbitPath r={auToSceneDistance(p.au, scaleCfg)} />}
          {p.key === "Tierra" ? (
            <EarthWithMoon
              maps={maps} speed={speed} scaleCfg={scaleCfg} onSelect={onSelect}
              selectedKey={selectedKey} showTrails={moving && planetsMoving}
              useRealMoonDistance={useRealMoonDistance} planetsMoving={planetsMoving}
              planetRefCb={registerPlanetRef}
            />
          ) : (
            <Planet
              p={p} map={maps[p.tex]} ringMap={maps.ring} speed={speed} scaleCfg={scaleCfg}
              onSelect={onSelect} showTrails={moving && planetsMoving}
              selectedKey={selectedKey} planetsMoving={planetsMoving} planetRefCb={registerPlanetRef}
            />
          )}
        </group>
      ))}
    </group>
  );
});

/* =================== CAPAS DE LA TIERRA (escena nueva) =================== */
/** No hay cortes con thetaLength ni clipping => ¡sin huecos transparentes!
 *  Mostramos 4 esferas concéntricas separadas a la derecha (exploded view).
 */
function LabelWithLine({ text, from, to }) {
  return (
    <group>
      <Line points={[from, to]} color="#93c5fd" lineWidth={1.2} />
      <Text position={to} fontSize={0.6} color="#e5f2ff" anchorX="left" anchorY="middle">
        {text}
      </Text>
    </group>
  );
}

function EarthLayers({ maps, explode = 1 }) {
  // Radios relativos (no km) sólo para relación visual
  const R = 4.0; // radio "Tierra"
  const radii = {
    crust: R,
    mantle: R * 0.78,
    outer: R * 0.55,
    inner: R * 0.34,
  };

  // Desplazamiento de cada capa a la derecha (exploded)
  const offsets = {
    crust: 0 * explode,
    mantle: 1.4 * explode,
    outer: 2.6 * explode,
    inner: 3.6 * explode,
  };

  // Materiales con mapas; todo OPAQUE (sin transparent) -> no hay agujeros
  const matCrust = maps.crust_albedo
    ? new THREE.MeshStandardMaterial({
        map: maps.crust_albedo,
        normalMap: maps.crust_normal || null,
        roughness: 0.9,
        metalness: 0.0,
      })
    : new THREE.MeshStandardMaterial({ color: "#9fb7d1", roughness: 0.9 });

  const matMantle = maps.mantle_albedo
    ? new THREE.MeshStandardMaterial({
        map: maps.mantle_albedo,
        normalMap: maps.mantle_normal || null,
        roughness: 0.85,
        metalness: 0.05,
      })
    : new THREE.MeshStandardMaterial({ color: "#d07a3c", roughness: 0.85 });

  const matOuter = maps.outer_core_emissive
    ? new THREE.MeshStandardMaterial({
        color: "#ffb347",
        emissive: new THREE.Color("#ff7a00"),
        emissiveIntensity: 0.35,
        emissiveMap: maps.outer_core_emissive,
        roughness: 0.6,
        metalness: 0.25,
      })
    : new THREE.MeshStandardMaterial({ color: "#ffb347", roughness: 0.6 });

  const matInner = maps.inner_core_metal
    ? new THREE.MeshStandardMaterial({
        map: maps.inner_core_metal,
        roughness: 0.25,
        metalness: 0.9,
        envMapIntensity: 1.0,
      })
    : new THREE.MeshStandardMaterial({ color: "#f5f5dc", roughness: 0.25, metalness: 0.9 });

  // Tierra completa (esfera) a la izquierda para referencia
  return (
    <group>
      {/* Tierra completa */}
      <group position={[-5.5, 0, 0]}>
        <mesh>
          <sphereGeometry args={[R, 96, 96]} />
          {maps.earth ? <meshStandardMaterial map={maps.earth} roughness={0.8} metalness={0.05} /> : <meshStandardMaterial color="#2e86de" />}
        </mesh>
        <Text position={[0, R + 0.8, 0]} fontSize={0.6} anchorX="center" anchorY="middle">Tierra</Text>
      </group>

      {/* Capas separadas a la derecha (sin cortes => no hay huecos) */}
      <group position={[0.8, 0, 0]}>
        {/* Corteza */}
        <mesh position={[offsets.crust, 0, 0]}>
          <sphereGeometry args={[radii.crust, 96, 96]} />
          {matCrust && <primitive object={matCrust} attach="material" />}
        </mesh>
        {/* Manto */}
        <mesh position={[offsets.mantle, 0, 0]}>
          <sphereGeometry args={[radii.mantle, 96, 96]} />
          {matMantle && <primitive object={matMantle} attach="material" />}
        </mesh>
        {/* Núcleo externo */}
        <mesh position={[offsets.outer, 0, 0]}>
          <sphereGeometry args={[radii.outer, 96, 96]} />
          {matOuter && <primitive object={matOuter} attach="material" />}
        </mesh>
        {/* Núcleo interno */}
        <mesh position={[offsets.inner, 0, 0]}>
          <sphereGeometry args={[radii.inner, 96, 96]} />
          {matInner && <primitive object={matInner} attach="material" />}
        </mesh>

        {/* Señalética prolija (líneas + etiquetas) */}
        <LabelWithLine
          text="Corteza"
          from={new THREE.Vector3(offsets.crust + radii.crust * 0.9, radii.crust * 0.35, 0)}
          to={new THREE.Vector3(offsets.crust + radii.crust * 1.15, radii.crust * 0.35, 0)}
        />
        <LabelWithLine
          text="Manto"
          from={new THREE.Vector3(offsets.mantle + radii.mantle * 0.9, -radii.mantle * 0.15, 0)}
          to={new THREE.Vector3(offsets.mantle + radii.mantle * 1.25, -radii.mantle * 0.15, 0)}
        />
        <LabelWithLine
          text="Núcleo externo"
          from={new THREE.Vector3(offsets.outer + radii.outer * 0.9, radii.outer * 0.15, 0)}
          to={new THREE.Vector3(offsets.outer + radii.outer * 1.35, radii.outer * 0.15, 0)}
        />
        <LabelWithLine
          text="Núcleo interno"
          from={new THREE.Vector3(offsets.inner + radii.inner * 0.9, 0, 0)}
          to={new THREE.Vector3(offsets.inner + radii.inner * 1.45, 0, 0)}
        />
      </group>
    </group>
  );
}

/* =================== Escena con fly-to (para sistema solar) =================== */
const SceneSolar = forwardRef(function SceneSolar(
  {
    speed, moving, sunSpeed, onSelect, useRealMoonDistance, scaleCfg,
    planetsMoving,
  },
  ref
) {
  const maps = useSolarTextures();
  const controls = useRef();
  const solarSystemRef = useRef();
  const { camera } = useThree();
  const [controlsAutoTarget, setControlsAutoTarget] = useState(true);

  const flyRef = useRef({
    active: false, t: 0, dur: 1.1,
    fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3(),
  });

  const startFly = (targetPos, distance) => {
    const dir = new THREE.Vector3().subVectors(
      camera.position, controls.current?.target || new THREE.Vector3(0, 0, 0)
    );
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    const toPos = new THREE.Vector3().addVectors(targetPos, dir.multiplyScalar(distance));
    flyRef.current.active = true;
    flyRef.current.t = 0;
    flyRef.current.fromPos.copy(camera.position);
    flyRef.current.toPos.copy(toPos);
    flyRef.current.fromTarget.copy(controls.current?.target || new THREE.Vector3());
    flyRef.current.toTarget.copy(targetPos);
  };

  useFrame((_, dt) => {
    if (!flyRef.current.active) return;
    const f = flyRef.current;
    f.t = Math.min(1, f.t + dt / f.dur);
    const k = f.t < 0.5 ? 4 * f.t * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 3) / 2;
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    if (controls.current) {
      controls.current.target.lerpVectors(f.fromTarget, f.toTarget, k);
      controls.current.update();
    }
    if (f.t >= 1) f.active = false;
  });

  useImperativeHandle(ref, () => ({
    focusOn(key) {
      if (!solarSystemRef.current) return;
      const pos = solarSystemRef.current.getWorldPositionOf(key);
      if (!pos) return;
      const r = solarSystemRef.current.getApproxPlanetRadius(key);
      const dist = THREE.MathUtils.clamp(r * 4.0, 2.5, 80);
      setControlsAutoTarget(false);
      startFly(pos, dist);
    },
  }), []);

  return (
    <>
      <Stars radius={1200} depth={200} count={18000} factor={4} fade />
      <ambientLight intensity={0.35} />
      <SolarSystem
        ref={solarSystemRef}
        maps={useSolarTextures()}
        speed={speed}
        scaleCfg={scaleCfg}
        moving={moving}
        sunSpeed={sunSpeed}
        swayAmp={2}
        swayFreq={0.6}
        onSelect={(obj) => obj?.key && ref?.current?.focusOn?.(obj.key)}
        selectedKey={null}
        controlsRef={controls}
        useRealMoonDistance={useRealMoonDistance}
        planetsMoving={planetsMoving}
        controlsAutoTarget={controlsAutoTarget}
        showVisualMeasures={false}
      />
      <OrbitControls ref={controls} enableDamping dampingFactor={0.08} maxDistance={3000} minDistance={2.5} />
      <AdaptiveDpr pixelated />
      <Preload all />
    </>
  );
});

/* =================== Escena "Capas de la Tierra" =================== */
function SceneEarthLayers({ explode }) {
  const maps = useSolarTextures();
  return (
    <>
      <Stars radius={800} depth={120} count={9000} factor={3} fade />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 8, 6]} intensity={1.2} />
      <EarthLayers maps={maps} explode={explode} />
      <AdaptiveDpr pixelated />
      <Preload all />
    </>
  );
}

/* =================== HUD (UI externa) — PLEGABLE =================== */
function HUD({
  open, setOpen,
  scene, setScene,
  modeKey, setModeKey,
  speed, setSpeed,
  moving, setMoving,
  sunSpeed, setSunSpeed,
  useRealMoonDistance, setUseRealMoonDistance,
  planetsMoving, setPlanetsMoving,
  explode, setExplode,
}) {
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 30,
          padding: "10px 12px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(0,0,0,.45)", color: "#fff",
          fontFamily: "Roboto Mono, monospace"
        }}
        title="Mostrar controles"
      >
        ⚙️ Controles
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", top: 16, left: 16, color: "#fff", zIndex: 30,
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div
        style={{
          backdropFilter: "blur(6px)", background: "rgba(0,0,0,.55)",
          padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.2)",
          maxWidth: 440,
        }}
      >
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:800,fontFamily:"Orbitron, sans-serif",letterSpacing:1}}>CONTROLES</div>
          <button
            onClick={() => setOpen(false)}
            style={{border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.08)",color:"#fff",borderRadius:8,padding:"4px 8px",fontFamily:"Roboto Mono, monospace"}}
            title="Ocultar controles"
          >
            ✕
          </button>
        </div>

        <div style={{fontWeight:800,fontFamily:"Orbitron, sans-serif",marginBottom:8,letterSpacing:1}}>ESCENA</div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {Object.entries({ solar:"Sistema Solar", earthlayers:"Capas de la Tierra" }).map(([k,label]) => (
            <button key={k} onClick={() => setScene(k)}
              style={{
                fontSize:12,padding:"6px 8px",borderRadius:10,
                border:"1px solid rgba(255,255,255,.25)",
                background: scene===k ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)",
                color:"#fff", fontFamily:"Roboto Mono, monospace"
              }}>
              {label}
            </button>
          ))}
        </div>

        {scene === "solar" && (
          <>
            <div style={{fontWeight:800,fontFamily:"Orbitron, sans-serif",marginBottom:8,letterSpacing:1}}>
              ESCALA (RENDER)
            </div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
              {Object.entries(RENDER_SCALES_BASE).map(([k,v]) => (
                <button key={k} onClick={() => setModeKey(k)}
                  style={{
                    fontSize:12,padding:"6px 8px",borderRadius:10,
                    border:"1px solid rgba(255,255,255,.25)",
                    background: modeKey===k ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)",
                    color:"#fff", fontFamily:"Roboto Mono, monospace"
                  }}>
                  {v.name}
                </button>
              ))}
            </div>

            <div style={{fontFamily:"Roboto Mono, monospace",marginBottom:6}}>
              Velocidad orbital: x{speed.toFixed(1)}
            </div>
            <input type="range" min={0.1} max={20} step={0.1} value={speed}
              onChange={(e)=>setSpeed(parseFloat(e.target.value))} style={{width:260}} />

            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12,fontFamily:"Roboto Mono, monospace"}}>
              <input id="planetsMove" type="checkbox" checked={planetsMoving} onChange={(e)=>setPlanetsMoving(e.target.checked)} />
              <label htmlFor="planetsMove">Planetas en movimiento</label>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,fontFamily:"Roboto Mono, monospace"}}>
              <input id="moveSun" type="checkbox" checked={moving} onChange={(e)=>setMoving(e.target.checked)} />
              <label htmlFor="moveSun">Sol en movimiento</label>
            </div>

            <div style={{fontSize:12,opacity:0.9,fontFamily:"Roboto Mono, monospace"}}>
              Velocidad del Sol: {sunSpeed.toFixed(1)}
            </div>
            <input type="range" min={0.5} max={15} step={0.1} value={sunSpeed}
              onChange={(e)=>setSunSpeed(parseFloat(e.target.value))} style={{width:260}} />

            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,fontFamily:"Roboto Mono, monospace"}}>
              <input id="moonReal" type="checkbox" checked={useRealMoonDistance} onChange={(e)=>setUseRealMoonDistance(e.target.checked)} />
              <label htmlFor="moonReal">Usar distancia Tierra–Luna real (384.400 km)</label>
            </div>
          </>
        )}

        {scene === "earthlayers" && (
          <>
            <div style={{fontWeight:800,fontFamily:"Orbitron, sans-serif",marginBottom:8,letterSpacing:1}}>
              CAPAS DE LA TIERRA
            </div>
            <div style={{fontFamily:"Roboto Mono, monospace",marginBottom:6}}>
              Separación de capas (exploded): {(explode*100).toFixed(0)}%
            </div>
            <input type="range" min={0} max={1} step={0.01} value={explode}
              onChange={(e)=>setExplode(parseFloat(e.target.value))} style={{width:260}} />
            <div style={{fontSize:12,opacity:.85,fontFamily:"Roboto Mono, monospace",marginTop:8}}>
              * No hay cortes parciales ni transparencias ⇒ no aparecen huecos.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =================== App =================== */
export default function App() {
  useInjectFonts();

  // Overlay de errores en dev (autocierra)
  useEffect(() => {
    const handler = (e) => {
      const msg = (e?.reason?.message || e?.message || String(e)).slice(0, 200);
      if (!msg) return;
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;inset:16px auto auto 16px;z-index:99999;background:#111a;border:1px solid #f55a;color:#ffd;padding:10px 12px;border-radius:10px;font:12px/1.35 'Roboto Mono',monospace;max-width:600px";
      el.textContent = "Runtime error: " + msg;
      document.body.appendChild(el);
      setTimeout(() => { try { document.body.removeChild(el); } catch {} }, 5000);
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  // Estado general
  const [scene, setScene] = useState("earthlayers"); // arrancamos mostrando las capas
  const [modeKey, setModeKey] = useState("didactica");
  const [speed, setSpeed] = useState(3.0);
  const [moving, setMoving] = useState(false);
  const [sunSpeed, setSunSpeed] = useState(5.0);
  const [useRealMoonDistance, setUseRealMoonDistance] = useState(true);
  const [planetsMoving, setPlanetsMoving] = useState(false);
  const [hudOpen, setHudOpen] = useState(true);
  const [explode, setExplode] = useState(1); // 0 = cerrado, 1 = totalmente abierto

  const scaleCfg = useMemo(() => buildScale(modeKey), [modeKey]);
  const solarRef = useRef();

  return (
    <div style={{ width: "100%", height: "100vh", background: "black" }}>
      <HUD
        open={hudOpen} setOpen={setHudOpen}
        scene={scene} setScene={setScene}
        modeKey={modeKey} setModeKey={setModeKey}
        speed={speed} setSpeed={setSpeed}
        moving={moving} setMoving={setMoving}
        sunSpeed={sunSpeed} setSunSpeed={setSunSpeed}
        useRealMoonDistance={useRealMoonDistance} setUseRealMoonDistance={setUseRealMoonDistance}
        planetsMoving={planetsMoving} setPlanetsMoving={setPlanetsMoving}
        explode={explode} setExplode={setExplode}
      />

      <Canvas
        style={{ zIndex: 0 }}
        camera={{ position: [0, 10, 40], fov: 55, near: 0.05, far: 20000 }}
        gl={{
          ...(THREE.SRGBColorSpace
            ? { outputColorSpace: THREE.SRGBColorSpace }
            : { outputEncoding: THREE.sRGBEncoding }),
          toneMapping: THREE.ACESFilmicToneMapping,
          antialias: true,
          logarithmicDepthBuffer: true,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => { gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); }}
        shadows
      >
        <Suspense fallback={null}>
          {scene === "solar" ? (
            <SceneSolar
              ref={solarRef}
              speed={speed}
              moving={moving}
              sunSpeed={sunSpeed}
              onSelect={(o)=>o}
              useRealMoonDistance={useRealMoonDistance}
              scaleCfg={scaleCfg}
              planetsMoving={planetsMoving}
            />
          ) : (
            <SceneEarthLayers explode={explode} />
          )}
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.08} maxDistance={200} minDistance={3} />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
    </div>
  );
}