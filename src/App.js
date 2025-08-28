// App.js — Sistema Solar 3D (Luna anidada + fly-to + Datos importantes + fix texturas Sol + HUD plegable + medidas en km)
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

/* =================== Rutas de texturas (más tolerantes a mayúsculas) =================== */
const TEX = {
  sun: [
    "/textures/sol/sun",
    "/textures/sol/sun.JPG",
    "/textures/sol/Sun.jpg",
    "/textures/sol/Sun.JPG",
    "/textures/sol/sun.jpeg",
    "/textures/sol/sun.JPEG",
    "/textures/sol/Sun.jpeg",
    "/textures/sol/Sun.JPEG",
    "/textures/sol/sun.png",
    "/textures/sol/sun.PNG",
    "/textures/sol/sun.webp",
    "/textures/sol/sun.WEBP",
    "/textures/sun.jpg",
    "/textures/sun.JPG",
    "/textures/sun.png",
    "/textures/sun.PNG",
    "/textures/sun.webp",
    "/textures/sun.WEBP",
  ],
  mercury: [
    "/textures/planetas/mercury.jpg",
    "/textures/mercury.jpg",
    "/textures/planetas/mercury.png",
  ],
  venus: [
    "/textures/planetas/venus.jpg",
    "/textures/venus.jpg",
    "/textures/planetas/venus.png",
  ],
  earth: [
    "/textures/planetas/earth.jpg",
    "/textures/earth.jpg",
    "/textures/planetas/earth.png",
  ],
  mars: [
    "/textures/planetas/mars.jpg",
    "/textures/mars.jpg",
    "/textures/planetas/mars.png",
  ],
  jupiter: [
    "/textures/planetas/jupiter.jpg",
    "/textures/jupiter.jpg",
    "/textures/planetas/jupiter.png",
  ],
  saturn: [
    "/textures/planetas/saturn.jpg",
    "/textures/saturn.jpg",
    "/textures/planetas/saturn.png",
  ],
  uranus: [
    "/textures/planetas/uranus.jpg",
    "/textures/uranus.jpg",
    "/textures/planetas/uranus.png",
  ],
  neptune: [
    "/textures/planetas/neptune.jpg",
    "/textures/neptune.jpg",
    "/textures/planetas/neptune.png",
  ],
  ring: [
    "/textures/planetas/saturn_ring_alpha.png",
    "/textures/planetas/saturn-ring.png",
    "/textures/saturn_ring_alpha.png",
    "/textures/saturn-ring.png",
  ],
  moon: ["/textures/luna/moon.jpg", "/textures/moon.jpg", "/textures/luna/moon.png"],
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
  {
    key: "Mercurio",
    type: "Planeta rocoso",
    color: "#b5a642",
    radius_km: 2440,
    au: 0.39,
    period_y: 0.241,
    day_h: 1407.6,
    tempC: "≈167 °C",
    life: "No conocida",
    formed: "Acreción (~4.5 Ga)",
    fact: "Su año dura 88 días y casi no tiene atmósfera.",
    tex: "mercury",
  },
  {
    key: "Venus",
    type: "Planeta rocoso",
    color: "#caa46a",
    radius_km: 6052,
    au: 0.72,
    period_y: 0.615,
    day_h: -5832.5,
    tempC: "≈465 °C",
    life: "No conocida",
    formed: "Acreción (~4.5 Ga)",
    fact: "Rota al revés y su día es más largo que su año.",
    tex: "venus",
  },
  {
    key: "Tierra",
    type: "Planeta rocoso",
    color: "#2e86de",
    radius_km: 6371,
    au: 1.0,
    period_y: 1.0,
    day_h: 23.93,
    tempC: "≈15 °C",
    life: "Sí, confirmada",
    formed: "Acreción (~4.54 Ga)",
    fact: "La Luna estabiliza el eje y el clima a largo plazo.",
    tex: "earth",
  },
  {
    key: "Marte",
    type: "Planeta rocoso",
    color: "#b4513c",
    radius_km: 3389,
    au: 1.52,
    period_y: 1.881,
    day_h: 24.62,
    tempC: "≈−60 °C",
    life: "No confirmada",
    formed: "Acreción (~4.5 Ga)",
    fact: "Olympus Mons es el volcán más grande conocido.",
    tex: "mars",
  },
  {
    key: "Júpiter",
    type: "Gigante gaseoso",
    color: "#d2b48c",
    radius_km: 69911,
    au: 5.2,
    period_y: 11.86,
    day_h: 9.93,
    tempC: "≈−110 °C",
    life: "No conocida",
    formed: "Inestabilidad/acreción",
    fact: "Campo magnético ~20.000× el de la Tierra.",
    tex: "jupiter",
  },
  {
    key: "Saturno",
    type: "Gigante gaseoso",
    color: "#f0e0b6",
    radius_km: 58232,
    au: 9.58,
    period_y: 29.46,
    day_h: 10.7,
    tempC: "≈−140 °C",
    life: "No conocida",
    formed: "Inestabilidad/acreción",
    fact: "Anillos de hielo y roca.",
    tex: "saturn",
    ring: true,
  },
  {
    key: "Urano",
    type: "Gigante helado",
    color: "#66e0d9",
    radius_km: 25362,
    au: 19.2,
    period_y: 84.01,
    day_h: -17.24,
    tempC: "≈−195 °C",
    life: "No conocida",
    formed: "Acreción (regiones frías)",
    fact: "Gira casi tumbado (inclinación ~98°).",
    tex: "uranus",
  },
  {
    key: "Neptuno",
    type: "Gigante helado",
    color: "#4169e1",
    radius_km: 24622,
    au: 30.05,
    period_y: 164.8,
    day_h: 16.11,
    tempC: "≈−200 °C",
    life: "No conocida",
    formed: "Acreción (regiones frías)",
    fact: "Vientos >2.000 km/h.",
    tex: "neptune",
  },
];

/* =================== Escalas de render =================== */
const RENDER_SCALES_BASE = {
  didactica: {
    name: "Didáctica (compacta)",
    sunR: 3.0,
    auInSunR: 4,
    planetExaggeration: 1.2,
    minSize: 0.18,
  },
  real: { name: "Real (muy dispar)", sunR: 3.0, auInSunR: 30, planetExaggeration: 1.0, minSize: 0.2 },
  visual: { name: "Visual realista", sunR: 3.2, auInSunR: 20, planetExaggeration: 1.4, minSize: 0.16 },
};
function buildScale(key) {
  const cfg = RENDER_SCALES_BASE[key];
  const sizeFactor = cfg.sunR / SUN.radius_km; // km -> unidades (tamaños)
  const distFactor = (cfg.sunR * cfg.auInSunR) / AU_KM; // km -> unidades (distancias)
  return {
    ...cfg,
    sizeFactor,
    distFactor,
    planetExaggeration: cfg.planetExaggeration ?? 1.0,
  };
}

/* =================== Modos de datos (paneles) =================== */
const DATA_MODES = {
  REAL_1_1: { label: "Datos: Real 1:1 (km/UA)" },
  SIMPLE: { label: "Datos: Sencillo (D⊕ / AU)" },
};

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
      if ("colorSpace" in t && "SRGBColorSpace" in THREE)
        t.colorSpace = THREE.SRGBColorSpace;
      else if ("encoding" in t && "sRGBEncoding" in THREE)
        t.encoding = THREE.sRGBEncoding;

      const pot = isPOT(image.width) && isPOT(image.height);
      t.generateMipmaps = !!pot;
      t.minFilter = pot ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      const maxAniso =
        typeof gl.capabilities.getMaxAnisotropy === "function"
          ? gl.capabilities.getMaxAnisotropy()
          : 8;
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

          if ((img.width || 0) <= 1 && (img.height || 0) <= 1) {
            console.warn("Textura inválida (1x1):", url);
            continue;
          }

          if (img.width > maxSize || img.height > maxSize) {
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img = canvas;
            console.warn(
              `Redimensionada ${url} -> ${canvas.width}x${canvas.height}`
            );
          }

          const t = makeTexture(img);
          if (!cancelled) setTex(t);
          return;
        } catch (e) {
          console.warn("Fallo al cargar textura:", url, e);
        }
      }
      if (!cancelled) setTex(null);
    })();

    return () => {
      cancelled = true;
    };
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
  };
}

/* =================== Órbitas =================== */
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
    <Line
      points={points}
      color="#4b5563"
      lineWidth={1}
      dashed
      dashSize={0.4}
      gapSize={0.2}
    />
  );
}

/* =================== Conversores =================== */
const kmToSceneRadius = (km, sc) =>
  Math.max(sc.minSize, km * sc.sizeFactor * sc.planetExaggeration);
const auToSceneDistance = (au, sc) => Math.max(5, au * AU_KM * sc.distFactor);
const kmToSceneDistance = (km, sc) => Math.max(0.6, km * sc.distFactor);

/* =================== Objetos 3D =================== */
function Sun({ map, onSelect, radius }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });

  const material = map ? (
    <meshBasicMaterial map={map} toneMapped={false} />
  ) : (
    <meshBasicMaterial color="#ffcc66" toneMapped={false} />
  );

  return (
    <group>
      <mesh
        ref={ref}
        onClick={() => onSelect && onSelect(SUN)}
        frustumCulled={false}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        {material}
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={3.2} distance={600} decay={2} />
      <Text
        position={[0, radius + 0.8, 0]}
        fontSize={0.6}
        anchorX="center"
        anchorY="middle"
      >
        Sol
      </Text>
    </group>
  );
}

function Planet({
  p,
  map,
  ringMap,
  speed,
  scaleCfg,
  onSelect,
  showTrails,
  selectedKey,
  planetsMoving,
  planetRefCb,
  children,
}) {
  const group = useRef();
  const mesh = useRef();
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const radius = kmToSceneRadius(p.radius_km, scaleCfg);
  const orbitR = auToSceneDistance(p.au, scaleCfg);

  useEffect(() => {
    planetRefCb && planetRefCb(p.key, group.current);
  }, [planetRefCb, p.key]);

  useFrame((_, dt) => {
    if (planetsMoving) {
      angleRef.current +=
        (dt * speed / Math.max(1e-6, p.period_y)) * Math.PI * 2;
    }
    const x = Math.cos(angleRef.current) * orbitR;
    const z = Math.sin(angleRef.current) * orbitR;
    group.current?.position.set(x, 0, z);

    if (mesh.current && planetsMoving) {
      mesh.current.rotation.y += dt * (p.day_h < 0 ? -0.05 : 0.05);
    }
    if (mesh.current) {
      const target = selectedKey === p.key ? 1.18 : 1.0;
      mesh.current.scale.setScalar(
        THREE.MathUtils.lerp(mesh.current.scale.x, target, 0.15)
      );
    }
  });

  return (
    <group ref={group} frustumCulled={false}>
      {showTrails && planetsMoving && (
        <Trail
          width={0.08}
          color={new THREE.Color(p.color)}
          length={140}
          decay={1}
          attenuation={(t) => t}
          target={group}
        />
      )}
      <mesh
        ref={mesh}
        castShadow
        receiveShadow
        onClick={() => onSelect && onSelect(p)}
        frustumCulled={false}
      >
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
            <meshBasicMaterial
              map={ringMap}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          ) : (
            <meshBasicMaterial
              color={"#d9c9a5"}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          )}
        </mesh>
      )}
      <Text
        position={[0, radius * 1.6, 0]}
        fontSize={Math.max(0.3, radius * 0.35)}
        anchorX="center"
        anchorY="middle"
      >
        {p.key}
      </Text>

      {/* hijos (p.ej. Luna) */}
      {children}
    </group>
  );
}

/* =================== Meteoroides =================== */
function Meteors({ count = 70, radius = 260 }) {
  const speeds = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: count }, () =>
          (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1)
        )
      ),
    [count]
  );
  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => [
        (Math.random() - 0.5) * radius,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * radius,
      ]),
    [count, radius]
  );

  const group = useRef();
  useFrame((_, dt) => {
    if (!group.current) return;
    for (let i = 0; i < group.current.children.length; i++) {
      const m = group.current.children[i];
      const v = speeds[i];
      m.position.x += v * dt * 10;
      m.position.z += v * dt * 10;
      if (
        Math.abs(m.position.x) > radius / 2 ||
        Math.abs(m.position.z) > radius / 2
      ) {
        m.position.set(
          (Math.random() - 0.5) * radius,
          (Math.random() - 0.5) * 10,
          (-radius / 2) * Math.sign(v || 1)
        );
      }
    }
  });

  return (
    <group ref={group} frustumCulled={false}>
      <Instances limit={count} range={count}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial roughness={1} metalness={0} />
        {positions.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  );
}

/* =================== Medidas visuales Sol→planeta =================== */
function PlanetMeasureLine({ planetKey, planetRefs, color, au }) {
  const [pts, setPts] = useState(null);
  const [labelPos, setLabelPos] = useState(new THREE.Vector3());
  useFrame(() => {
    const ref = planetRefs.current[planetKey];
    if (!ref) return;
    const planetPos = new THREE.Vector3();
    ref.getWorldPosition(planetPos);
    setPts([new THREE.Vector3(0, 0, 0), planetPos.clone()]);
    setLabelPos(planetPos.clone().multiplyScalar(0.52));
  });
  if (!pts) return null;

  // SOLO km
  const km = Math.round(au * AU_KM);
  const label = `${fmtKm(km)} km`;

  return (
    <>
      <Line points={pts} color={color} lineWidth={1.1} transparent opacity={0.55} />
      <Text position={labelPos} fontSize={0.55} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </>
  );
}

/* =================== Tierra + Luna (Luna anidada) =================== */
function EarthWithMoon({
  maps,
  speed,
  scaleCfg,
  onSelect,
  selectedKey,
  showTrails,
  useRealMoonDistance,
  planetsMoving,
  planetRefCb,
}) {
  const earth = PLANETS.find((p) => p.key === "Tierra");
  const MOON_RADIUS_KM = 1737;
  const earthRadius = kmToSceneRadius(earth.radius_km, scaleCfg);
  const moonRadius = earthRadius * (MOON_RADIUS_KM / earth.radius_km);
  const moon = useRef();
  const moonAngle = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    if (planetRefCb && moon.current) {
      planetRefCb("Luna", moon.current);
    }
  }, [planetRefCb]);

  const moonDistance = useRealMoonDistance
    ? kmToSceneDistance(384_400, scaleCfg)
    : earthRadius * 8;

  useFrame((_, dt) => {
    if (!moon.current) return;
    if (planetsMoving) {
      moonAngle.current += dt * 1.2;
    }
    moon.current.position.set(
      Math.cos(moonAngle.current) * moonDistance,
      0,
      Math.sin(moonAngle.current) * moonDistance
    );
    if (planetsMoving) moon.current.rotation.y += 0.01;
  });

  return (
    <Planet
      p={earth}
      map={maps.earth}
      ringMap={maps.ring}
      speed={speed}
      scaleCfg={scaleCfg}
      onSelect={onSelect}
      showTrails={showTrails}
      selectedKey={selectedKey}
      planetsMoving={planetsMoving}
      planetRefCb={planetRefCb}
    >
      <group ref={moon}>
        <mesh
          onClick={() =>
            onSelect &&
            onSelect({
              key: "Luna",
              type: "Satélite natural de la Tierra",
              au: null,
              period_y: null,
              day_h: 655.7,
              tempC: "≈−20 a 120 °C (superficie)",
              life: "No",
              formed: "Restos del impacto de Theia (~4.51 Ga)",
              fact: "Siempre nos muestra la misma cara (acoplamiento de marea).",
            })
          }
        >
          <sphereGeometry args={[moonRadius, 48, 48]} />
          {maps.moon ? (
            <meshBasicMaterial map={maps.moon} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#aaa" />
          )}
        </mesh>
        <Text
          position={[0, moonRadius * 1.6, 0]}
          fontSize={Math.max(0.22, moonRadius * 0.45)}
          anchorX="center"
          anchorY="middle"
        >
          Luna
        </Text>
      </group>
    </Planet>
  );
}

/* =================== Sistema Solar (refs) =================== */
const SolarSystem = forwardRef(function SolarSystem(
  {
    maps,
    speed,
    scaleCfg,
    moving,
    sunSpeed,
    swayAmp,
    swayFreq,
    onSelect,
    selectedKey,
    controlsRef,
    useRealMoonDistance,
    planetsMoving,
    controlsAutoTarget,
    showVisualMeasures,
    dataMode, // ya no lo usa PlanetMeasureLine, pero lo dejamos por compat
  },
  ref
) {
  const solarRef = useRef();
  const sunRef = useRef();
  const planetRefs = useRef({});
  const registerPlanetRef = (key, r) => {
    if (r) planetRefs.current[key] = r;
  };

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
      solarRef.current.position.set(
        Math.sin(t * swayFreq) * swayAmp,
        0,
        -sunSpeed * t
      );
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

  const measureColor = "#7dd3fc";

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
              maps={maps}
              speed={speed}
              scaleCfg={scaleCfg}
              onSelect={onSelect}
              selectedKey={selectedKey}
              showTrails={moving && planetsMoving}
              useRealMoonDistance={useRealMoonDistance}
              planetsMoving={planetsMoving}
              planetRefCb={registerPlanetRef}
            />
          ) : (
            <Planet
              p={p}
              map={maps[p.tex]}
              ringMap={maps.ring}
              speed={speed}
              scaleCfg={scaleCfg}
              onSelect={onSelect}
              showTrails={moving && planetsMoving}
              selectedKey={selectedKey}
              planetsMoving={planetsMoving}
              planetRefCb={registerPlanetRef}
            />
          )}
          {showVisualMeasures && (
            <PlanetMeasureLine
              planetKey={p.key}
              planetRefs={planetRefs}
              color={measureColor}
              au={p.au}
            />
          )}
        </group>
      ))}
    </group>
  );
});

/* =================== Utilidades de datos (UI externa) =================== */
function fmtKm(n) {
  return n.toLocaleString("es-AR");
}
function diamInEarths(planet) {
  return (planet.radius_km * 2) / EARTH_DIAM_KM;
}
function sizeDisplay(planet, dataMode) {
  if (dataMode === "REAL_1_1")
    return `${fmtKm(planet.radius_km * 2)} km (diámetro)`;
  return `${diamInEarths(planet).toFixed(2)} D⊕ (diámetro)`;
}
function distDisplayKm(au) {
  const km = Math.round(au * AU_KM);
  return `${fmtKm(km)} km`;
}

/* =================== "Datos importantes" por cuerpo =================== */
const IMPORTANT = {
  Sol: [
    { label: "Composición", value: "≈74% H, ≈24% He, ≈2% (O, C, Fe…)" },
    { label: "Temperatura del núcleo", value: "≈15 millones K (≈ 14.999.727 °C)" },
    { label: "Potencia emitida", value: "≈ 3,8 × 10²⁶ W" },
    { label: "Distancia media a la Tierra", value: "149,6 millones km (1 UA)" },
    { label: "Edad / Vida total", value: "≈ 4,6 Ga / ≈ 10 Ga (a mitad de vida)" },
    { label: "Luz hasta la Tierra", value: "≈ 8 min 20 s" },
  ],
  Mercurio: [
    { label: "Distancia al Sol", value: "≈ 58 millones km (0,39 UA)" },
    { label: "Distancia mínima a la Tierra", value: "≈ 77 millones km" },
    { label: "Radio", value: "≈ 2.440 km" },
    {
      label: "Minerales",
      value:
        "Silicatos; pocos óxidos de Fe; sulfuros y metales; evidencias de grafito (MESSENGER)",
    },
    {
      label: "Energías posibles",
      value:
        "Solar muy intensa (~7× Tierra); Geotérmica limitada; Eólica casi nula; Química (minerales)",
    },
  ],
  Venus: [
    { label: "Distancia al Sol", value: "≈ 108 millones km (0,72 UA)" },
    { label: "Distancia mínima a la Tierra", value: "≈ 40 millones km" },
    { label: "Radio", value: "≈ 6.052 km" },
    {
      label: "Minerales",
      value:
        "Basaltos volcánicos; silicatos (feldespatos, piroxenos); sulfuros/pirita; óxidos de hierro",
    },
    {
      label: "Energías posibles",
      value:
        "Solar intensa (limitada por atmósfera densa); Eólica en capas altas; Geotérmica; Química (CO₂, SO₂)",
    },
  ],
  Tierra: [
    { label: "Diámetro", value: "12.742 km" },
    { label: "Gravedad", value: "9,8 m/s²" },
    { label: "Atmósfera", value: "N₂ y O₂ (apta para la vida)" },
    { label: "Duración del día", value: "23 h 56 min" },
    { label: "Satélites", value: "1 (la Luna)" },
    { label: "Dato curioso", value: "≈ 70% de la superficie es agua líquida" },
  ],
  Marte: [
    { label: "Diámetro", value: "6.779 km" },
    { label: "Gravedad", value: "3,7 m/s²" },
    { label: "Atmósfera", value: "Tenue; ~95% CO₂" },
    { label: "Duración del día", value: "24 h 37 min" },
    { label: "Satélites", value: "2 (Fobos y Deimos)" },
    {
      label: "Dato curioso",
      value: "Monte Olimpo: 22 km (el volcán más grande del Sistema Solar)",
    },
    {
      label: "Energías viables",
      value:
        "Solar (afectada por tormentas); Nuclear (fisión tipo Kilopower, confiable); Eólica (baja densidad); Geotérmica (posible)",
    },
    {
      label: "Recursos",
      value: "Hielo de agua; CO₂ atmosférico; minerales y óxidos de hierro",
    },
    {
      label: "Por qué no Venus",
      value:
        "Temperaturas y atmósfera de Venus son extremas; en Marte el día es similar, hay hielo y exploración exitosa con robots",
    },
  ],
  "Júpiter": [
    { label: "Distancia al Sol", value: "5,2 UA (≈ 778 millones km)" },
    { label: "Diámetro / Radio", value: "≈ 140.000 km / 71.492 km" },
    { label: "Composición", value: "≈90% H, ≈10% He (sin superficie sólida)" },
    {
      label: "Atmósfera",
      value: "Bandas de nubes (amoníaco, hidrosulfuro y agua)",
    },
    {
      label: "Campo magnético",
      value:
        "Muy intenso por hidrógeno metálico + rotación rápida (gran dínamo)",
    },
    {
      label: "Lunas",
      value:
        "95 confirmadas; Europa destaca por posible océano subsuperficial (candidato a vida)",
    },
    {
      label: "Recursos/energía",
      value:
        "Vientos > 500 km/h; hidrógeno metálico conductor; en Europa, energía undimotriz del océano",
    },
  ],
  Saturno: [
    { label: "Distancia al Sol", value: "9,5 UA (≈ 1.430 millones km)" },
    { label: "Diámetro / Radio", value: "≈ 116.000 km / 60.268 km" },
    { label: "Composición", value: "Similar a Júpiter: H y He" },
    { label: "Anillos", value: "Hielo, roca y polvo" },
    { label: "Atmósfera", value: "Vientos > 1.800 km/h" },
    {
      label: "Núcleo",
      value:
        "Difuso; elementos pesados y ‘hielos’ (agua, metano, amoníaco) a alta presión/temperatura",
    },
    {
      label: "Lunas",
      value:
        "146; Titán con atmósfera densa y lagos de metano/etano líquido",
    },
    {
      label: "Recursos/energía",
      value:
        "Hidrocarburos en Titán: metano/etano (combustible si se aporta oxígeno)",
    },
  ],
  Urano: [
    { label: "Distancia al Sol", value: "≈ 3.000 millones km (19,2 UA)" },
    { label: "Periodo orbital", value: "84 años" },
    { label: "Inclinación", value: "≈ 98° (prácticamente acostado)" },
    { label: "Temperatura media", value: "≈ −224 °C (el más frío)" },
    { label: "Atmósfera", value: "Hidrógeno, helio y metano" },
    { label: "Vientos", value: "Hasta ~900 km/h" },
    {
      label: "Campo magnético",
      value: "Inclinado y desalineado respecto al eje de rotación",
    },
    {
      label: "Energía posible",
      value:
        "Eólica (vientos), Magnética (campo irregular), Química (metano/H₂). Robots podrían instalar turbinas y recolectar gases",
    },
  ],
  Neptuno: [
    { label: "Distancia al Sol", value: "≈ 4.500 millones km (30,05 UA)" },
    { label: "Periodo orbital", value: "165 años" },
    { label: "Temperatura media", value: "≈ −214 °C" },
    { label: "Atmósfera", value: "Hidrógeno, helio y metano" },
    { label: "Vientos", value: "Hasta ~2.100 km/h (los más rápidos)" },
    {
      label: "Campo magnético",
      value: "Muy fuerte y desalineado",
    },
    {
      label: "Energía posible",
      value:
        "Eólica (mejor candidato), Magnética (campo potente), Química (metano/H₂ abundantes). Robots soportan el frío extremo",
    },
  ],
};

/* =================== Panel de info =================== */
function InfoPanel({ selected, onClose, dataMode, onFocus }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, [selected?.key]);
  if (!selected) return null;
  const distKm = selected.au ? selected.au * AU_KM : null;
  const vueltas = selected.au ? laps(distKm) : null;

  const important = IMPORTANT[selected.key] || null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        width: 400,
        zIndex: 25,
        color: "#dbeafe",
        backdropFilter: "blur(8px)",
        background: "rgba(10,20,40,.55)",
        border: "1px solid rgba(148,163,184,.35)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,.4)",
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        opacity: mounted ? 1 : 0,
        transition: "opacity .35s ease, transform .35s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.8,
              letterSpacing: 1,
              fontFamily: "Roboto Mono, monospace",
            }}
          >
            ENCICLOPEDIA
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 1.5,
              fontFamily: "Orbitron, sans-serif",
            }}
          >
            {selected.key}
          </div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.85,
              fontFamily: "Roboto Mono, monospace",
            }}
          >
            {selected.type}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onFocus && onFocus(selected.key)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.25)",
              background: "rgba(255,255,255,.15)",
              color: "#fff",
              fontFamily: "Roboto Mono, monospace",
            }}
          >
            Ver de cerca
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.25)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              fontFamily: "Roboto Mono, monospace",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      <div
        style={{
          fontFamily: "Roboto Mono, monospace",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 12,
          marginBottom: 12,
        }}
      >
        {selected.au ? (
          <>
            <div style={{ opacity: 0.7 }}>Distancia media</div>
            <div>{distDisplayKm(selected.au)}</div>
          </>
        ) : null}
        <div style={{ opacity: 0.7 }}>Tamaño</div>{" "}
        <div>{sizeDisplay(selected, dataMode)}</div>
        <div style={{ opacity: 0.7 }}>Período orbital</div>{" "}
        <div>{selected.period_y ? `${selected.period_y} años` : "—"}</div>
        <div style={{ opacity: 0.7 }}>Rotación (día)</div>{" "}
        <div>{selected.day_h ?? "—"} h</div>
        <div style={{ opacity: 0.7 }}>Temperatura</div>{" "}
        <div>{selected.tempC}</div>
        <div style={{ opacity: 0.7 }}>Vida conocida</div>{" "}
        <div>{selected.life}</div>
        <div style={{ opacity: 0.7 }}>Formación</div>{" "}
        <div>{selected.formed}</div>
      </div>

      {vueltas && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            background: "rgba(255,255,255,.06)",
            padding: 10,
            borderRadius: 12,
            border: "1px dashed rgba(148,163,184,.35)",
            fontFamily: "Roboto Mono, monospace",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 6,
              fontFamily: "Orbitron, sans-serif",
            }}
          >
            Analogía de distancia
          </div>
          <div>
            Desde el Sol hasta <strong>{selected.key}</strong> hay unos{" "}
            <strong>{vueltas.toLocaleString()}</strong> vueltas a la Tierra
            (circunf. ≈ 40.075 km).
          </div>
        </div>
      )}

      {/* ===== Datos importantes (sin viñetas) ===== */}
      {important && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            background: "rgba(255,255,255,.06)",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,.35)",
            fontFamily: "Roboto Mono, monospace",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              marginBottom: 8,
              fontFamily: "Orbitron, sans-serif",
            }}
          >
            Datos importantes
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 8,
              rowGap: 6,
            }}
          >
            {important.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ opacity: 0.8 }}>{row.label}</div>
                <div>{row.value}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== Panel de distancias (cerrable) =================== */
function DistancesPanel({ scaleCfg, visible, onClose }) {
  const rows = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PLANETS.length - 1; i++) {
      const a = PLANETS[i],
        b = PLANETS[i + 1];
      const dAU = Math.abs(b.au - a.au),
        dKM = dAU * AU_KM,
        dScene = dKM * scaleCfg.distFactor;
      arr.push({ from: a.key, to: b.key, dAU, dKM, dScene });
    }
    return arr;
  }, [scaleCfg]);

  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 26,
        color: "#e5f2ff",
        backdropFilter: "blur(8px)",
        background: "rgba(10,20,40,.55)",
        border: "1px solid rgba(148,163,184,.35)",
        borderRadius: 14,
        padding: 12,
        maxWidth: 420,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontFamily: "Orbitron, sans-serif",
            letterSpacing: 1,
          }}
        >
          Distancias entre planetas
        </div>
        <button
          onClick={onClose}
          title="Cerrar"
          style={{
            border: "1px solid rgba(255,255,255,.3)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            borderRadius: 8,
            padding: "4px 8px",
            fontFamily: "Roboto Mono, monospace",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          fontFamily: "Roboto Mono, monospace",
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {rows.map((r, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 8,
              marginBottom: 6,
            }}
          >
            <div style={{ opacity: 0.85 }}>
              {r.from} → {r.to}
            </div>
            <div>
              {r.dAU.toFixed(2)} AU · {fmtKm(Math.round(r.dKM))} km{" "}
              <span style={{ opacity: 0.75 }}>· escena ≈ {r.dScene.toFixed(2)} u</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== Leyenda escala (info) =================== */
function ScaleLegend({ scaleCfg }) {
  const kmPerSceneUnit = 1 / scaleCfg.distFactor;
  const kmPerSceneUnitSizes = 1 / scaleCfg.sizeFactor;
  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 116,
        zIndex: 20,
        color: "#d1e9ff",
        backdropFilter: "blur(8px)",
        background: "rgba(0,0,0,.35)",
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.2)",
        fontFamily: "Roboto Mono, monospace",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.85 }}>RENDER</div>
      <div style={{ fontWeight: 700 }}>
        1 u (tamaño) ≈ {kmPerSceneUnitSizes.toLocaleString("es-AR")} km
      </div>
      <div style={{ fontWeight: 700 }}>
        1 u (distancia) ≈ {kmPerSceneUnit.toLocaleString("es-AR")} km
      </div>
    </div>
  );
}

/* =================== HUD (UI externa) — PLEGABLE =================== */
function HUD({
  speed,
  setSpeed,
  modeKey,
  setModeKey,
  moving,
  setMoving,
  sunSpeed,
  setSunSpeed,
  scene,
  setScene,
  dataMode,
  setDataMode,
  showDistances,
  setShowDistances,
  useRealMoonDistance,
  setUseRealMoonDistance,
  planetsMoving,
  setPlanetsMoving,
  onJumpToKey,
  showVisualMeasures,
  setShowVisualMeasures,
  open, setOpen, // <<< NUEVO
}) {
  // Botón flotante cuando está cerrado
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position:'fixed', top:16, left:16, zIndex:30,
          padding:'10px 12px', borderRadius:12,
          border:'1px solid rgba(255,255,255,.25)',
          background:'rgba(0,0,0,.45)', color:'#fff',
          fontFamily:'Roboto Mono, monospace'
        }}
        title="Mostrar controles"
      >
        ⚙️ Controles
      </button>
    );
  }

  // Tarjeta abierta
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        color: "#fff",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          backdropFilter: "blur(6px)",
          background: "rgba(0,0,0,.55)",
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.2)",
          maxWidth: 420,
        }}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <div style={{fontWeight:800, fontFamily:'Orbitron, sans-serif', letterSpacing:1}}>CONTROLES</div>
          <button
            onClick={() => setOpen(false)}
            style={{border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.08)', color:'#fff', borderRadius:8, padding:'4px 8px', fontFamily:'Roboto Mono, monospace'}}
            title="Ocultar controles"
          >
            ✕
          </button>
        </div>

        <div
          style={{
            fontWeight: 800,
            fontFamily: "Orbitron, sans-serif",
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          ESCENA
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {Object.entries(MODES).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScene(k)}
              style={{
                fontSize: 12,
                padding: "6px 8px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.25)",
                background:
                  scene === k
                    ? "rgba(255,255,255,.18)"
                    : "rgba(255,255,255,.08)",
                color: "#fff",
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {scene === "solar" && (
          <>
            {/* IR A (incluye Luna) */}
            <div
              style={{
                fontWeight: 800,
                fontFamily: "Orbitron, sans-serif",
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              IR A
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
                maxWidth: 360,
              }}
            >
              {["Sol", "Luna", ...PLANETS.map((p) => p.key)].map((name) => (
                <button
                  key={name}
                  onClick={() => onJumpToKey && onJumpToKey(name)}
                  style={{
                    fontSize: 12,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.25)",
                    background: "rgba(255,255,255,.08)",
                    color: "#fff",
                    fontFamily: "Roboto Mono, monospace",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* MODO DE DATOS */}
            <div
              style={{
                fontWeight: 800,
                fontFamily: "Orbitron, sans-serif",
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              MODO DE DATOS
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {Object.entries(DATA_MODES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setDataMode(k)}
                  style={{
                    fontSize: 12,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.25)",
                    background:
                      dataMode === k
                        ? "rgba(255,255,255,.18)"
                        : "rgba(255,255,255,.08)",
                    color: "#fff",
                    fontFamily: "Roboto Mono, monospace",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* ESCALA (RENDER) */}
            <div
              style={{
                fontWeight: 800,
                fontFamily: "Orbitron, sans-serif",
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              ESCALA (RENDER)
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {Object.entries(RENDER_SCALES_BASE).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setModeKey(k)}
                  style={{
                    fontSize: 12,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.25)",
                    background:
                      modeKey === k
                        ? "rgba(255,255,255,.18)"
                        : "rgba(255,255,255,.08)",
                    color: "#fff",
                    fontFamily: "Roboto Mono, monospace",
                  }}
                >
                  {v.name}
                </button>
              ))}
            </div>

            {/* Controles */}
            <div style={{ fontFamily: "Roboto Mono, monospace", marginBottom: 6 }}>
              Velocidad orbital: x{speed.toFixed(1)}
            </div>
            <input
              type="range"
              min={0.1}
              max={20}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              style={{ width: 260 }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <input
                id="planetsMove"
                type="checkbox"
                checked={planetsMoving}
                onChange={(e) => setPlanetsMoving(e.target.checked)}
              />
              <label htmlFor="planetsMove">Planetas en movimiento (órbita + rotación)</label>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <input
                id="moveSun"
                type="checkbox"
                checked={moving}
                onChange={(e) => setMoving(e.target.checked)}
              />
              <label htmlFor="moveSun">Sol en movimiento (trayectorias helicoidales)</label>
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, fontFamily: "Roboto Mono, monospace" }}>
              Velocidad del Sol: {sunSpeed.toFixed(1)}
            </div>
            <input
              type="range"
              min={0.5}
              max={15}
              step={0.1}
              value={sunSpeed}
              onChange={(e) => setSunSpeed(parseFloat(e.target.value))}
              style={{ width: 260 }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <input
                id="distTable"
                type="checkbox"
                checked={showDistances}
                onChange={(e) => setShowDistances(e.target.checked)}
              />
              <label htmlFor="distTable">Mostrar tabla de distancias planeta→planeta</label>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <input
                id="moonReal"
                type="checkbox"
                checked={useRealMoonDistance}
                onChange={(e) => setUseRealMoonDistance(e.target.checked)}
              />
              <label htmlFor="moonReal">Usar distancia Tierra–Luna real (384.400 km)</label>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
                fontFamily: "Roboto Mono, monospace",
              }}
            >
              <input
                id="visualMeasures"
                type="checkbox"
                checked={showVisualMeasures}
                onChange={(e) => setShowVisualMeasures(e.target.checked)}
              />
              <label htmlFor="visualMeasures">Mostrar medidas visuales Sol→planetas</label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =================== Escena con fly-to =================== */
const Scene = forwardRef(function Scene(
  {
    scene,
    speed,
    moving,
    sunSpeed,
    onSelect,
    useRealMoonDistance,
    scaleCfg,
    planetsMoving,
    dataMode,
    showVisualMeasures,
  },
  ref
) {
  const maps = useSolarTextures();
  const controls = useRef();
  const solarSystemRef = useRef();
  const { camera } = useThree();

  const [controlsAutoTarget, setControlsAutoTarget] = useState(true);

  const flyRef = useRef({
    active: false,
    t: 0,
    dur: 1.1,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });

  const startFly = (targetPos, distance) => {
    const dir = new THREE.Vector3().subVectors(
      camera.position,
      controls.current?.target || new THREE.Vector3(0, 0, 0)
    );
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    const toPos = new THREE.Vector3().addVectors(
      targetPos,
      dir.multiplyScalar(distance)
    );

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

  useImperativeHandle(
    ref,
    () => ({
      focusOn(key) {
        if (!solarSystemRef.current) return;
        const pos = solarSystemRef.current.getWorldPositionOf(key);
        if (!pos) return;
        const r = solarSystemRef.current.getApproxPlanetRadius(key);
        // MÁS CERCA
        const dist = THREE.MathUtils.clamp(r * 4.0, 2.5, 80);

        setControlsAutoTarget(false);
        startFly(pos, dist);
      },
    }),
    []
  );

  return (
    <>
      <Stars radius={1200} depth={200} count={18000} factor={4} fade />
      <ambientLight intensity={0.35} />

      {scene === "solar" && (
        <SolarSystem
          ref={solarSystemRef}
          maps={maps}
          speed={speed}
          scaleCfg={scaleCfg}
          moving={moving}
          sunSpeed={sunSpeed}
          swayAmp={2}
          swayFreq={0.6}
          onSelect={onSelect}
          selectedKey={null}
          controlsRef={controls}
          useRealMoonDistance={useRealMoonDistance}
          planetsMoving={planetsMoving}
          controlsAutoTarget={controlsAutoTarget}
          showVisualMeasures={showVisualMeasures}
          dataMode={dataMode}
        />
      )}

      <Meteors count={70} radius={260} />
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        maxDistance={3000}
        minDistance={2.5}
      />
      <AdaptiveDpr pixelated />
      <Preload all />
    </>
  );
});

/* =================== App =================== */
const MODES = { solar: "Sistema Solar" };

export default function App() {
  useInjectFonts();

  // Overlay de errores en dev (autocierra)
  useEffect(() => {
    const handler = (e) => {
      const msg = (e?.reason?.message || e?.message || String(e)).slice(0, 300);
      if (!msg) return;
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;inset:16px auto auto 16px;z-index:99999;background:#111a;border:1px solid #f55a;color:#ffd;padding:10px 12px;border-radius:10px;font:12px/1.35 'Roboto Mono',monospace;max-width:600px";
      el.textContent = "Runtime error: " + msg;
      document.body.appendChild(el);
      setTimeout(() => {
        try {
          document.body.removeChild(el);
        } catch {}
      }, 5000);
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  const [scene, setScene] = useState("solar");
  const [modeKey, setModeKey] = useState("didactica"); // arranca compacta
  const [dataMode, setDataMode] = useState("REAL_1_1");

  // Arranque estático
  const [speed, setSpeed] = useState(3.0);
  const [moving, setMoving] = useState(false); // Sol detenido
  const [sunSpeed, setSunSpeed] = useState(5.0);
  const [planetsMoving, setPlanetsMoving] = useState(false); // Planetas detenidos

  const [selected, setSelected] = useState(null);
  const [showDistances, setShowDistances] = useState(false); // oculto al inicio
  const [useRealMoonDistance, setUseRealMoonDistance] = useState(true);
  const [showVisualMeasures, setShowVisualMeasures] = useState(false); // oculto al inicio (solo km cuando se active)

  const [hudOpen, setHudOpen] = useState(false); // HUD plegable: cerrado al inicio

  const scaleCfg = useMemo(() => buildScale(modeKey), [modeKey]);
  const sceneRef = useRef();

  const handleSelect = (obj) => {
    setSelected(obj);
    if (obj?.key) sceneRef.current?.focusOn(obj.key);
  };

  const jumpToKey = (key) => {
    if (key === "Sol") handleSelect(SUN);
    else if (key === "Luna")
      handleSelect({
        key: "Luna",
        type: "Satélite natural de la Tierra",
        au: null,
        period_y: null,
        day_h: 655.7,
        tempC: "≈−20 a 120 °C (superficie)",
        life: "No",
        formed: "Restos del impacto de Theia (~4.51 Ga)",
        fact: "Siempre nos muestra la misma cara (acoplamiento de marea).",
      });
    else {
      const p = PLANETS.find((pp) => pp.key === key);
      if (p) handleSelect(p);
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", background: "black" }}>
      {/* UI */}
      <HUD
        speed={speed}
        setSpeed={setSpeed}
        modeKey={modeKey}
        setModeKey={setModeKey}
        moving={moving}
        setMoving={setMoving}
        sunSpeed={sunSpeed}
        setSunSpeed={setSunSpeed}
        scene={scene}
        setScene={(s) => {
          setScene(s);
          setSelected(null);
        }}
        dataMode={dataMode}
        setDataMode={setDataMode}
        showDistances={showDistances}
        setShowDistances={setShowDistances}
        useRealMoonDistance={useRealMoonDistance}
        setUseRealMoonDistance={setUseRealMoonDistance}
        planetsMoving={planetsMoving}
        setPlanetsMoving={setPlanetsMoving}
        onJumpToKey={jumpToKey}
        showVisualMeasures={showVisualMeasures}
        setShowVisualMeasures={setShowVisualMeasures}
        open={hudOpen}
        setOpen={setHudOpen}
      />
      <InfoPanel
        selected={selected}
        onClose={() => setSelected(null)}
        dataMode={dataMode}
        onFocus={(k) => sceneRef.current?.focusOn(k)}
      />
      <ScaleLegend scaleCfg={scaleCfg} />
      <DistancesPanel
        scaleCfg={scaleCfg}
        visible={showDistances}
        onClose={() => setShowDistances(false)}
      />

      {/* Canvas */}
      <Canvas
        style={{ zIndex: 0 }}
        camera={{ position: [0, 12, 42], fov: 55, near: 0.05, far: 20000 }}
        gl={{
          ...(THREE.SRGBColorSpace
            ? { outputColorSpace: THREE.SRGBColorSpace }
            : { outputEncoding: THREE.sRGBEncoding }),
          toneMapping: THREE.ACESFilmicToneMapping,
          antialias: true,
          logarithmicDepthBuffer: true,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        }}
        shadows
      >
        <Suspense fallback={null}>
          <Scene
            ref={sceneRef}
            scene={scene}
            speed={speed}
            moving={moving}
            sunSpeed={sunSpeed}
            onSelect={handleSelect}
            useRealMoonDistance={useRealMoonDistance}
            scaleCfg={scaleCfg}
            planetsMoving={planetsMoving}
            dataMode={dataMode}
            showVisualMeasures={showVisualMeasures}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}