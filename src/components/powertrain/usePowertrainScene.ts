import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { DrivetrainTelemetry } from "../../engine";
import { vehicleLayout } from "./layout";
import { createSuvBody } from "./createSuvBody";
import { createDriveControls } from "./createDriveControls";
import { createDriveEnvironment } from "./createDriveEnvironment";
import {
  clamp,
  createBeltSpan,
  createCamLobeGeometry,
  createClutchPack,
  createRingGear,
  createRoadWheel,
  createSpurGear,
  createSuspensionLink,
  createWishbone,
  cylinder,
  cylinderAlongZ,
  getExternalTangent,
  phaseToCamAngle,
} from "./geometry";

export type PowertrainSceneOptions = {
  mountRef: RefObject<HTMLDivElement>;
  labelsLayerRef: RefObject<HTMLDivElement>;
  labelsVisibleRef: MutableRefObject<boolean>;
  cutawayEnabledRef: MutableRefObject<boolean>;
  bodyVisibleRef: MutableRefObject<boolean>;
  sceneModeRef: MutableRefObject<PowertrainSceneMode>;
  telemetryRef: MutableRefObject<DrivetrainTelemetry>;
  setReadout: Dispatch<SetStateAction<DrivetrainTelemetry>>;
};

export type PowertrainSceneMode = "explore" | "drive";

export function usePowertrainScene({
  mountRef,
  labelsLayerRef,
  labelsVisibleRef,
  cutawayEnabledRef,
  bodyVisibleRef,
  sceneModeRef,
  telemetryRef,
  setReadout,
}: PowertrainSceneOptions) {
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const exploreBackground = new THREE.Color("#0d0d12");
    const driveBackground = new THREE.Color("#8b9fac");
    scene.background = exploreBackground;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
    camera.position.set(13, 6.4, 29);
    camera.lookAt(vehicleLayout.chassisFrameCenterX, -0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    type ComponentAnnotation = {
      anchor: THREE.Object3D;
      element: HTMLDivElement;
      offset: THREE.Vector3;
    };
    const annotations: ComponentAnnotation[] = [];
    type CutawayMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
    const cutawayRegistry = {
      materials: [] as { material: CutawayMaterial; solidOpacity: number; cutawayOpacity: number }[],
      hideWhenOpen: [] as THREE.Object3D[],
      revealWhenOpen: [] as THREE.Object3D[],
    };
    const registerCutawayMaterial = (material: CutawayMaterial, cutawayOpacity: number) => {
      cutawayRegistry.materials.push({
        material,
        solidOpacity: material.opacity,
        cutawayOpacity,
      });
    };
    const addAnnotation = (
      anchor: THREE.Object3D,
      label: string,
      taggedObjects: THREE.Object3D[],
      offset: THREE.Vector3
    ) => {
      const element = document.createElement("div");
      element.className = "component-label";
      element.textContent = label;
      labelsLayerRef.current?.appendChild(element);
      const annotation = { anchor, element, offset };
      annotations.push(annotation);
      taggedObjects.forEach((taggedObject) => {
        taggedObject.traverse((child) => {
          child.userData.componentAnnotation = annotation;
        });
      });
    };

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.07;
    orbit.minDistance = 9;
    orbit.maxDistance = 70;
    orbit.zoomSpeed = 1.25;
    orbit.zoomToCursor = true;
    orbit.target.set(vehicleLayout.chassisFrameCenterX, -0.3, 0);
    const driveControls = createDriveControls({
      isEnabled: () => sceneModeRef.current === "drive",
    });

    const ambient = new THREE.HemisphereLight("#b6c1d6", "#15151c", 2.8);
    scene.add(ambient);
    const key = new THREE.DirectionalLight("#f4f7ff", 4.4);
    key.position.set(3, 5, 8);
    scene.add(key);
    const frontFill = new THREE.DirectionalLight("#8cb4ff", 2.1);
    frontFill.position.set(-3, 2, 12);
    scene.add(frontFill);
    const rim = new THREE.PointLight("#e10600", 8, 12, 2);
    rim.position.set(-2.7, 1.6, -2.5);
    scene.add(rim);
    const fill = new THREE.PointLight("#4b82ff", 4, 10, 2);
    fill.position.set(2.4, -1.2, 3);
    scene.add(fill);
    const exploreLights = [ambient, key, frontFill, rim, fill];
    const driveEnvironment = createDriveEnvironment(scene);

    const metal = new THREE.MeshStandardMaterial({
      color: "#77808e",
      metalness: 0.58,
      roughness: 0.34,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: "#3a404c",
      metalness: 0.55,
      roughness: 0.38,
    });
    const pumpMetal = new THREE.MeshStandardMaterial({
      color: "#a92924",
      metalness: 0.84,
      roughness: 0.3,
      emissive: "#260606",
      emissiveIntensity: 0.45,
    });
    const turbineMetal = new THREE.MeshStandardMaterial({
      color: "#4277ba",
      metalness: 0.86,
      roughness: 0.27,
      emissive: "#06182f",
      emissiveIntensity: 0.42,
    });
    const statorMetal = new THREE.MeshStandardMaterial({
      color: "#c18a31",
      metalness: 0.82,
      roughness: 0.3,
    });
    const housingMaterial = new THREE.MeshPhysicalMaterial({
      color: "#7d8491",
      metalness: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.17,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const vehicleRig = new THREE.Group();
    vehicleRig.name = "driveable-suv-rig";
    scene.add(vehicleRig);

    const assembly = new THREE.Group();
    // Keep the SUV level in Drive Mode. The former static-inspection tilt made
    // the body look nose-down as soon as it was placed on the road.
    assembly.rotation.set(0, 0, 0);
    vehicleRig.add(assembly);

    // Keep every rotating driveline component coaxial with the engine crank,
    // rather than centering the converter and gearbox independently above it.
    const drivetrain = new THREE.Group();
    drivetrain.position.set(-1.52, -0.98, 0);
    assembly.add(drivetrain);

    const housing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.43, 20, 96, Math.PI * 1.72),
      housingMaterial
    );
    housing.rotation.y = Math.PI / 2;
    housing.rotation.z = Math.PI * 0.13;
    drivetrain.add(housing);

    const housingRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.34, 0.065, 12, 72),
      darkMetal
    );
    housingRim.rotation.y = Math.PI / 2;
    drivetrain.add(housingRim);

    const impeller = new THREE.Group();
    impeller.position.x = -0.42;
    drivetrain.add(impeller);
    const pumpHub = cylinder(0.38, 0.3, pumpMetal);
    pumpHub.position.x = -0.08;
    impeller.add(pumpHub);

    const turbine = new THREE.Group();
    turbine.position.x = 0.42;
    drivetrain.add(turbine);
    const turbineHub = cylinder(0.38, 0.3, turbineMetal);
    turbineHub.position.x = 0.08;
    turbine.add(turbineHub);

    const bladeGeometry = new THREE.BoxGeometry(0.23, 0.78, 0.12);
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      const pumpBlade = new THREE.Mesh(bladeGeometry, pumpMetal);
      pumpBlade.position.set(-0.06, Math.cos(angle) * 0.83, Math.sin(angle) * 0.83);
      pumpBlade.rotation.x = angle + Math.PI / 2;
      pumpBlade.rotation.y = -0.32;
      impeller.add(pumpBlade);

      const turbineBlade = new THREE.Mesh(bladeGeometry, turbineMetal);
      turbineBlade.position.set(0.06, Math.cos(angle) * 0.83, Math.sin(angle) * 0.83);
      turbineBlade.rotation.x = angle + Math.PI / 2;
      turbineBlade.rotation.y = 0.32;
      turbine.add(turbineBlade);
    }

    const stator = new THREE.Group();
    drivetrain.add(stator);
    const statorHub = cylinder(0.28, 0.24, statorMetal);
    stator.add(statorHub);
    const statorBladeGeometry = new THREE.BoxGeometry(0.27, 0.45, 0.12);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const blade = new THREE.Mesh(statorBladeGeometry, statorMetal);
      blade.position.set(0, Math.cos(angle) * 0.52, Math.sin(angle) * 0.52);
      blade.rotation.x = angle + Math.PI / 2;
      blade.rotation.y = -0.38;
      stator.add(blade);
    }

    // Pump drive starts at the flexplate and physically enters the impeller hub.
    const pumpDriveShaft = cylinder(0.14, 0.62, darkMetal);
    pumpDriveShaft.position.x = -0.8;
    drivetrain.add(pumpDriveShaft);
    const pumpDriveFlange = cylinder(0.4, 0.12, pumpMetal, 24);
    pumpDriveFlange.position.x = -0.52;
    drivetrain.add(pumpDriveFlange);

    const bellhousing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 1.38, 0.96, 36, 1, true),
      housingMaterial
    );
    bellhousing.rotation.z = Math.PI / 2;
    bellhousing.position.x = -0.86;
    drivetrain.add(bellhousing);
    [-1.34, -0.38].forEach((x, index) => {
      const flange = new THREE.Mesh(
        new THREE.TorusGeometry(index === 0 ? 1.2 : 1.38, 0.08, 10, 48),
        darkMetal
      );
      flange.rotation.y = Math.PI / 2;
      flange.position.x = x;
      drivetrain.add(flange);
    });

    const engine = new THREE.Group();
    assembly.add(engine);
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: "#48515e",
      metalness: 0.42,
      roughness: 0.45,
    });
    const headMaterial = new THREE.MeshStandardMaterial({
      color: "#626b78",
      metalness: 0.48,
      roughness: 0.38,
    });
    const gasketMaterial = new THREE.MeshStandardMaterial({
      color: "#1a1c23",
      metalness: 0.35,
      roughness: 0.46,
    });

    // The front face remains open so the working pistons are visible; these rails form the cast block around them.
    const blockRearWall = new THREE.Mesh(new THREE.BoxGeometry(4.18, 2.36, 0.18), blockMaterial);
    blockRearWall.position.set(-4.9, 0.05, -0.96);
    engine.add(blockRearWall);
    const blockLowerRail = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.35, 1.98), blockMaterial);
    blockLowerRail.position.set(-4.9, -1.08, 0);
    engine.add(blockLowerRail);
    const blockFrontSill = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.22, 0.2), blockMaterial);
    blockFrontSill.position.set(-4.9, -0.78, 0.95);
    engine.add(blockFrontSill);
    [-2.08, 2.08].forEach((offset) => {
      const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.36, 1.96), blockMaterial);
      endWall.position.set(-4.9 + offset, 0.05, 0);
      engine.add(endWall);
    });
    [-1.245, -0.415, 0.415, 1.245].forEach((offset) => {
      const web = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.7, 0.16), blockMaterial);
      web.position.set(-4.9 + offset, -0.08, 0.94);
      engine.add(web);
    });

    const headDeck = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.24, 2.04), headMaterial);
    headDeck.position.set(-4.9, 1.36, 0);
    engine.add(headDeck);
    const headGasket = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.06, 2.1), gasketMaterial);
    headGasket.position.set(-4.9, 1.2, 0);
    engine.add(headGasket);
    [-0.82, 0.82].forEach((z) => {
      const headRail = cylinder(0.15, 4.22, headMaterial, 20);
      headRail.position.set(-4.9, 1.62, z);
      engine.add(headRail);
    });
    const camCarrierBase = new THREE.Mesh(new THREE.BoxGeometry(4.04, 0.16, 1.42), headMaterial);
    camCarrierBase.position.set(-4.9, 1.57, 0);
    engine.add(camCarrierBase);

    const crankshaft = cylinder(0.13, 3.25, metal);
    crankshaft.position.set(-4.9, -0.98, 0);
    engine.add(crankshaft);
    const crankFlange = cylinder(0.24, 0.38, metal, 24);
    crankFlange.position.set(-3.08, -0.98, 0);
    engine.add(crankFlange);
    const rearBlockFlange = new THREE.Mesh(
      new THREE.TorusGeometry(1.17, 0.1, 10, 48),
      blockMaterial
    );
    rearBlockFlange.rotation.y = Math.PI / 2;
    rearBlockFlange.position.set(-2.82, -0.98, 0);
    engine.add(rearBlockFlange);

    // The flexplate is bolted to the crank flange. Its drive lugs carry that
    // rotation into the converter pump rather than leaving a visual dead zone.
    const flexplateAssembly = new THREE.Group();
    flexplateAssembly.position.y = -0.98;
    engine.add(flexplateAssembly);
    const engineFlywheel = cylinder(0.76, 0.18, darkMetal);
    engineFlywheel.position.x = -2.9;
    flexplateAssembly.add(engineFlywheel);
    const flexplate = cylinder(0.87, 0.075, metal, 36);
    flexplate.position.x = -2.98;
    flexplateAssembly.add(flexplate);
    const flexplateRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.055, 8, 56),
      darkMetal
    );
    flexplateRim.rotation.y = Math.PI / 2;
    flexplateRim.position.x = -3.03;
    flexplateAssembly.add(flexplateRim);
    const engineOutputShaft = cylinder(0.16, 0.82, metal);
    engineOutputShaft.position.x = -2.48;
    flexplateAssembly.add(engineOutputShaft);

    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI * 0.25;
      const y = Math.cos(angle) * 0.43;
      const z = Math.sin(angle) * 0.43;
      const driveLug = cylinder(0.065, 0.9, darkMetal, 12);
      driveLug.position.set(-2.5, y, z);
      flexplateAssembly.add(driveLug);
      const bolt = cylinder(0.09, 0.055, metal, 12);
      bolt.position.set(-2.94, y, z);
      flexplateAssembly.add(bolt);
    }

    // Front accessory drive: crank snout, pulleys, belt, alternator, and water pump.
    const accessoryDriveX = -7.42;
    const timingCover = cylinder(1.08, 0.24, blockMaterial, 28);
    timingCover.position.set(-7.04, -0.08, 0);
    engine.add(timingCover);
    // This hub overlaps the crankshaft end and the crank pulley: no visual or physical gap.
    const crankHub = cylinder(0.23, 1.02, metal, 22);
    crankHub.position.set(-6.98, -0.98, 0);
    engine.add(crankHub);
    const pulleyMaterial = new THREE.MeshStandardMaterial({
      color: "#252a34",
      metalness: 0.7,
      roughness: 0.3,
    });
    const beltMaterial = new THREE.MeshStandardMaterial({
      color: "#101217",
      metalness: 0.1,
      roughness: 0.7,
    });
    const accessoryPulleys: { group: THREE.Group; ratio: number }[] = [];
    const addAccessoryPulley = (y: number, z: number, radius: number, ratio: number) => {
      const group = new THREE.Group();
      group.position.set(accessoryDriveX, y, z);
      const outer = cylinder(radius, 0.16, pulleyMaterial, 28);
      const hub = cylinder(radius * 0.42, 0.19, metal, 20);
      hub.position.x = -0.02;
      const driveShaft = cylinder(Math.max(radius * 0.31, 0.08), 0.54, darkMetal, 18);
      driveShaft.position.x = 0.27;
      const beltSeat = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.038, 0.045, 8, 32),
        beltMaterial
      );
      beltSeat.rotation.y = Math.PI / 2;
      beltSeat.position.x = -0.13;
      group.add(outer, hub, driveShaft, beltSeat);
      engine.add(group);
      accessoryPulleys.push({ group, ratio });
      return group;
    };
    const beltPulleys = [
      { center: new THREE.Vector2(-0.98, 0), radius: 0.42, ratio: 1 },
      { center: new THREE.Vector2(0.45, -0.58), radius: 0.27, ratio: 1.58 },
      { center: new THREE.Vector2(0.58, 0.44), radius: 0.3, ratio: 1.42 },
      { center: new THREE.Vector2(-0.16, 0.64), radius: 0.16, ratio: 2.65 },
    ];
    beltPulleys.forEach(({ center, radius, ratio }) => {
      addAccessoryPulley(center.x, center.y, radius, ratio);
    });

    const alternatorBody = cylinder(0.31, 0.52, metal, 24);
    alternatorBody.position.set(-7.06, 0.45, -0.58);
    engine.add(alternatorBody);
    const waterPumpBody = cylinder(0.32, 0.46, headMaterial, 24);
    waterPumpBody.position.set(-7.08, 0.58, 0.44);
    engine.add(waterPumpBody);
    const accessoryBrace = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-7.0, 0.35, -0.52),
          new THREE.Vector3(-6.72, -0.02, -0.34),
          new THREE.Vector3(-6.55, -0.36, -0.12),
        ]),
        16,
        0.055,
        8,
        false
      ),
      darkMetal
    );
    engine.add(accessoryBrace);
    const alternatorMount = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-6.92, 0.18, -0.44),
          new THREE.Vector3(-7.0, 0.36, -0.56),
          new THREE.Vector3(-7.05, 0.45, -0.58),
        ]),
        10,
        0.07,
        8,
        false
      ),
      darkMetal
    );
    engine.add(alternatorMount);
    const waterPumpMount = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-6.92, 0.22, 0.34),
          new THREE.Vector3(-7.0, 0.48, 0.4),
          new THREE.Vector3(-7.08, 0.58, 0.44),
        ]),
        10,
        0.07,
        8,
        false
      ),
      darkMetal
    );
    engine.add(waterPumpMount);
    const tensionerArm = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-6.95, -0.48, 0.34),
          new THREE.Vector3(-7.16, -0.26, 0.55),
          new THREE.Vector3(accessoryDriveX, -0.16, 0.64),
        ]),
        10,
        0.065,
        8,
        false
      ),
      headMaterial
    );
    engine.add(tensionerArm);

    // Four external tangents make the belt route physically legible. The torus
    // seats on each pulley supply the wrapped sections of the serpentine belt.
    const beltConnections: Array<[number, number, 1 | -1]> = [
      [0, 1, -1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 0, 1],
    ];
    beltConnections.forEach(([from, to, side]) => {
      const tangent = getExternalTangent(beltPulleys[from], beltPulleys[to], side);
      engine.add(createBeltSpan(accessoryDriveX - 0.13, tangent.first, tangent.second, beltMaterial));
    });

    const camShafts = [-0.3, 0.3].map((z) => {
      const cam = new THREE.Group();
      cam.position.set(-4.9, 1.76, z);
      engine.add(cam);

      const shaft = cylinder(0.12, 4.05, metal, 24);
      cam.add(shaft);

      return cam;
    });

    // Continuous rails, saddles, and bolted caps make the twin cams a head-mounted assembly.
    [-0.3, 0.3].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.06, 0.14, 0.3), headMaterial);
      rail.position.set(-4.9, 1.55, z);
      engine.add(rail);
    });
    [-1.72, -0.86, 0, 0.86, 1.72].forEach((x) => {
      [-0.3, 0.3].forEach((z) => {
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.38), headMaterial);
        saddle.position.set(-4.9 + x, 1.66, z);
        engine.add(saddle);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.36), darkMetal);
        cap.position.set(-4.9 + x, 1.93, z);
        engine.add(cap);
        [-0.12, 0.12].forEach((boltOffset) => {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 10), metal);
          bolt.position.set(-4.9 + x, 1.98, z + boltOffset);
          engine.add(bolt);
        });
      });
    });

    const pistonData: {
      piston: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
      rod: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
      crankPin: THREE.Mesh;
      valves: [THREE.Group, THREE.Group];
      exhaustMaterial: THREE.MeshStandardMaterial;
      exhaustProgress: number;
      x: number;
      phase: number;
    }[] = [];
    const pistonPositions = [-6.15, -5.32, -4.49, -3.66];
    const boreMaterial = new THREE.MeshStandardMaterial({
      color: "#3b414e",
      metalness: 0.7,
      roughness: 0.34,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const camLobeGeometry = createCamLobeGeometry();
    const camLobeMaterial = new THREE.MeshStandardMaterial({
      color: "#8f9baa",
      metalness: 0.68,
      roughness: 0.26,
    });
    const intakeMaterial = new THREE.MeshStandardMaterial({
      color: "#365a78",
      metalness: 0.48,
      roughness: 0.33,
      emissive: "#06101b",
      emissiveIntensity: 0.22,
    });
    const exhaustHeaderCurves: THREE.CatmullRomCurve3[] = [];

    pistonPositions.forEach((x, index) => {
      const bore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.39, 1.86, 28, 1, true),
        boreMaterial
      );
      bore.position.set(x, 0.42, 0);
      engine.add(bore);

      const sparkPlug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.06, 0.34, 12),
        new THREE.MeshStandardMaterial({ color: "#d8dce2", metalness: 0.32, roughness: 0.42 })
      );
      sparkPlug.position.set(x, 1.62, 0);
      engine.add(sparkPlug);
      const coilBoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.12, 12),
        darkMetal
      );
      coilBoot.position.set(x, 1.84, 0);
      engine.add(coilBoot);

      const pistonMaterial = new THREE.MeshStandardMaterial({
        color: "#9aa2ad",
        metalness: 0.9,
        roughness: 0.23,
        emissive: "#120807",
        emissiveIntensity: 0,
      });
      const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.28, 24), pistonMaterial);
      engine.add(piston);

      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.09, 1, 10),
        new THREE.MeshStandardMaterial({ color: "#777f8c", metalness: 0.92, roughness: 0.25 })
      );
      engine.add(rod);

      const crankPin = cylinder(0.17, 0.2, statorMetal, 18);
      engine.add(crankPin);

      const valves: [THREE.Group, THREE.Group] = [] as unknown as [THREE.Group, THREE.Group];
      [-0.24, 0.24].forEach((z, valveIndex) => {
        const valve = new THREE.Group();
        valve.position.set(x, 1.18, z);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.48, 10), metal);
        stem.position.y = -0.14;
        valve.add(stem);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.055, 16), darkMetal);
        head.position.y = -0.39;
        valve.add(head);
        const spring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 8, 14), metal);
        spring.rotation.x = Math.PI / 2;
        spring.position.y = 0.07;
        valve.add(spring);
        // Bucket tappet: the visible contact path between a cam lobe and its valve stem.
        const follower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 10), metal);
        follower.position.y = 0.17;
        valve.add(follower);
        const tappet = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.14, 16), darkMetal);
        tappet.position.y = 0.31;
        valve.add(tappet);

        const lobePivot = new THREE.Group();
        lobePivot.position.x = x + 4.9;
        // The lobe's high point faces down exactly during this valve's open stroke.
        lobePivot.rotation.x =
          phaseToCamAngle(index, valveIndex === 0 ? "intake" : "exhaust");
        const lobe = new THREE.Mesh(camLobeGeometry, camLobeMaterial);
        lobePivot.add(lobe);
        camShafts[valveIndex].add(lobePivot);
        engine.add(valve);
        valves.push(valve);
      });

      const intakePort = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.28, 14),
        intakeMaterial
      );
      intakePort.rotation.x = Math.PI / 2;
      intakePort.position.set(x, 0.81, -0.51);
      engine.add(intakePort);
      const intakeFlange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16),
        darkMetal
      );
      intakeFlange.rotation.x = Math.PI / 2;
      intakeFlange.position.set(x, 0.81, -0.69);
      engine.add(intakeFlange);
      const intakeRunner = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, 0.81, -0.73),
            new THREE.Vector3(x, 0.9, -0.94),
            new THREE.Vector3(x, 1.02, -1.12),
          ]),
          20,
          0.09,
          8,
          false
        ),
        intakeMaterial
      );
      engine.add(intakeRunner);

      const exhaustMaterial = new THREE.MeshStandardMaterial({
        color: "#5c4c49",
        metalness: 0.82,
        roughness: 0.31,
        emissive: "#1d0503",
        emissiveIntensity: 0.05,
      });
      const exhaustPort = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.28, 14),
        exhaustMaterial
      );
      exhaustPort.rotation.x = Math.PI / 2;
      exhaustPort.position.set(x, 0.81, 0.51);
      engine.add(exhaustPort);
      const exhaustFlange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16),
        darkMetal
      );
      exhaustFlange.rotation.x = Math.PI / 2;
      exhaustFlange.position.set(x, 0.81, 0.69);
      engine.add(exhaustFlange);
      const headerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.81, 0.73),
        new THREE.Vector3(x, 0.56, 1.08),
        new THREE.Vector3(x + 0.12, -0.16, 1.7),
        new THREE.Vector3(-2.92, -1.16, vehicleLayout.collectorZ),
      ]);
      const header = new THREE.Mesh(
        new THREE.TubeGeometry(headerCurve, 32, 0.085, 9, false),
        exhaustMaterial
      );
      engine.add(header);
      exhaustHeaderCurves.push(headerCurve);

      pistonData.push({
        piston,
        rod,
        crankPin,
        valves,
        exhaustMaterial,
        exhaustProgress: 0,
        x,
        phase: index * Math.PI,
      });
    });

    const intakePlenum = cylinder(0.32, 4.16, intakeMaterial, 28);
    intakePlenum.position.set(-4.9, 1.05, -1.16);
    engine.add(intakePlenum);
    const throttleBody = cylinder(0.2, 0.34, darkMetal, 20);
    throttleBody.position.set(-2.64, 1.05, -1.16);
    engine.add(throttleBody);

    // The turbo stays visible in both induction modes; in NA mode it is an
    // unpowered, dimmed reference assembly instead of disappearing entirely.
    const turboAssembly = new THREE.Group();
    engine.add(turboAssembly);
    const turboTurbineCenter = new THREE.Vector3(-2.13, -1.2, vehicleLayout.turboCenterZ);
    const turboCompressorCenter = new THREE.Vector3(-1.16, -1.2, vehicleLayout.turboCenterZ);
    const turboHotMaterial = new THREE.MeshStandardMaterial({
      color: "#5b3934",
      metalness: 0.62,
      roughness: 0.38,
      emissive: "#180403",
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.58,
    });
    const turboColdMaterial = new THREE.MeshStandardMaterial({
      color: "#58728b",
      metalness: 0.64,
      roughness: 0.29,
      emissive: "#071727",
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.58,
    });
    // A short, aligned reducer seals the charge pipe to the larger throttle body.
    const chargeCouplerMaterial = new THREE.MeshStandardMaterial({
      color: "#1c2631",
      metalness: 0.18,
      roughness: 0.52,
    });
    const throttleChargeCoupler = cylinder(0.145, 0.18, chargeCouplerMaterial, 20);
    throttleChargeCoupler.position.set(-2.33, 1.05, -1.16);
    turboAssembly.add(throttleChargeCoupler);
    [-2.42, -2.24].forEach((x) => {
      const clamp = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.012, 8, 24),
        darkMetal
      );
      clamp.rotation.y = Math.PI / 2;
      clamp.position.set(x, 1.05, -1.16);
      turboAssembly.add(clamp);
    });
    const turboTurbineHousing = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), turboHotMaterial);
    turboTurbineHousing.scale.set(1.16, 0.9, 0.9);
    turboTurbineHousing.position.copy(turboTurbineCenter);
    turboAssembly.add(turboTurbineHousing);
    const turboCompressorHousing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), turboColdMaterial);
    turboCompressorHousing.scale.set(1.12, 0.9, 0.9);
    turboCompressorHousing.position.copy(turboCompressorCenter);
    turboAssembly.add(turboCompressorHousing);
    const turboBearing = cylinder(0.16, 0.9, darkMetal, 20);
    turboBearing.position.set(-1.65, -1.2, vehicleLayout.turboCenterZ);
    turboAssembly.add(turboBearing);
    [turboTurbineCenter, turboCompressorCenter].forEach((center, index) => {
      const vBand = new THREE.Mesh(
        new THREE.TorusGeometry(index === 0 ? 0.41 : 0.37, 0.035, 8, 28),
        metal
      );
      vBand.rotation.y = Math.PI / 2;
      vBand.position.set(center.x + (index === 0 ? 0.12 : -0.12), center.y, center.z);
      turboAssembly.add(vBand);
    });
    const turboTurbineWheel = new THREE.Group();
    turboTurbineWheel.position.copy(turboTurbineCenter);
    turboTurbineWheel.add(cylinder(0.16, 0.16, statorMetal, 16));
    const turboCompressorWheel = new THREE.Group();
    turboCompressorWheel.position.copy(turboCompressorCenter);
    turboCompressorWheel.add(cylinder(0.15, 0.16, turbineMetal, 16));
    const turboBladeGeometry = new THREE.BoxGeometry(0.08, 0.26, 0.055);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const turbineBlade = new THREE.Mesh(turboBladeGeometry, statorMetal);
      turbineBlade.position.set(0, Math.cos(angle) * 0.24, Math.sin(angle) * 0.24);
      turbineBlade.rotation.x = angle + Math.PI / 2;
      turboTurbineWheel.add(turbineBlade);
      const compressorBlade = new THREE.Mesh(turboBladeGeometry, turbineMetal);
      compressorBlade.position.set(0, Math.cos(angle) * 0.21, Math.sin(angle) * 0.21);
      compressorBlade.rotation.x = angle + Math.PI / 2;
      turboCompressorWheel.add(compressorBlade);
    }
    turboAssembly.add(turboTurbineWheel, turboCompressorWheel);
    // The charge pipe stays outside the rear face of the engine. It sweeps
    // around the bellhousing perimeter and ends on the *outer* throttle-body
    // face, so it never appears to pass through the block or converter.
    const turboCompressorPipe = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          turboCompressorCenter.clone().add(new THREE.Vector3(-0.28, 0, 0.04)),
          new THREE.Vector3(-1.62, -0.86, 2.62),
          new THREE.Vector3(-2.06, -0.34, 2.72),
          new THREE.Vector3(-2.4, 0.22, 2.38),
          new THREE.Vector3(-2.5, 0.84, 1.36),
          new THREE.Vector3(-2.5, 1.24, 0.18),
          new THREE.Vector3(-2.48, 1.2, -0.8),
          new THREE.Vector3(-2.6, 1.05, -1.16),
          new THREE.Vector3(-2.24, 1.05, -1.16),
        ], false, "centripetal"),
        72,
        0.12,
        10,
        false
      ),
      turboColdMaterial
    );
    turboAssembly.add(turboCompressorPipe);

    const tailPipeMaterial = new THREE.MeshStandardMaterial({
      color: "#4c4343",
      metalness: 0.86,
      roughness: 0.29,
      emissive: "#160302",
      emissiveIntensity: 0.04,
    });
    const exhaustTailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.92, -1.16, vehicleLayout.collectorZ),
      new THREE.Vector3(-2.25, -1.35, vehicleLayout.turboCenterZ),
      turboTurbineCenter.clone().add(new THREE.Vector3(-0.3, 0, 0)),
      turboTurbineCenter.clone().add(new THREE.Vector3(0.34, -0.06, 0.05)),
      new THREE.Vector3(-0.45, -1.58, 2.58),
      new THREE.Vector3(1.6, -1.7, vehicleLayout.exhaustTunnelZ),
      new THREE.Vector3(4.25, -1.74, vehicleLayout.exhaustTunnelZ),
      new THREE.Vector3(vehicleLayout.rearAxleX + 1.82, -1.68, vehicleLayout.exhaustTunnelZ),
    ]);
    const collector = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 14),
      tailPipeMaterial
    );
    collector.position.set(-2.92, -1.16, vehicleLayout.collectorZ);
    engine.add(collector);
    const tailPipe = new THREE.Mesh(
      new THREE.TubeGeometry(exhaustTailCurve, 96, 0.11, 10, false),
      tailPipeMaterial
    );
    engine.add(tailPipe);
    const tailTip = cylinder(0.15, 0.42, tailPipeMaterial, 20);
    tailTip.position.set(vehicleLayout.rearAxleX + 2.02, -1.68, vehicleLayout.exhaustTunnelZ);
    engine.add(tailTip);

    const exhaustParticleGeometry = new THREE.SphereGeometry(0.055, 10, 10);
    const exhaustParticles: { mesh: THREE.Mesh; cylinderIndex: number; offset: number }[] = [];
    pistonData.forEach((_, cylinderIndex) => {
      for (let index = 0; index < 12; index += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: index < 3 ? "#ff7a22" : "#9a3d20",
          transparent: true,
          opacity: 0.84,
        });
        const particle = new THREE.Mesh(exhaustParticleGeometry, material);
        particle.visible = false;
        engine.add(particle);
        exhaustParticles.push({ mesh: particle, cylinderIndex, offset: index * 0.065 });
      }
    });

    const turbineShaft = cylinder(0.13, 2.15, metal);
    turbineShaft.position.x = 1.48;
    drivetrain.add(turbineShaft);

    const lockupPlate = cylinder(0.92, 0.075, metal);
    lockupPlate.position.x = 0.95;
    drivetrain.add(lockupPlate);
    const clutchDisc = cylinder(0.72, 0.045, darkMetal);
    clutchDisc.position.x = 1.03;
    drivetrain.add(clutchDisc);

    const gearbox = new THREE.Group();
    gearbox.position.x = 3.15;
    drivetrain.add(gearbox);
    // A translucent cast-aluminum cutaway keeps the geartrain visible while
    // giving the automatic a continuous, believable housing.
    const gearboxShell = new THREE.Mesh(
      new THREE.CylinderGeometry(1.08, 1.08, 2.9, 36, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: "#6d7786",
        metalness: 0.62,
        roughness: 0.28,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    gearboxShell.rotation.z = Math.PI / 2;
    gearbox.add(gearboxShell);
    [-1.52, 1.52].forEach((x) => {
      const flange = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.105, 10, 48), headMaterial);
      flange.rotation.y = Math.PI / 2;
      flange.position.x = x;
      gearbox.add(flange);
    });
    [-1.24, -0.82, -0.4, 0.04, 0.46, 0.88, 1.3].forEach((x) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.045, 8, 40), metal);
      rib.rotation.y = Math.PI / 2;
      rib.position.x = x;
      gearbox.add(rib);
    });
    const transmissionPan = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.3, 1.54), headMaterial);
    transmissionPan.position.set(0, -1.02, 0);
    gearbox.add(transmissionPan);
    const transmissionPanRail = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.07, 1.68), darkMetal);
    transmissionPanRail.position.set(0, -1.18, 0);
    gearbox.add(transmissionPanRail);

    const gearStages: {
      ring: THREE.Group;
      sun: THREE.Group;
      carrier: THREE.Group;
      planets: THREE.Group[];
    }[] = [];
    const planetaryStages = [
      { x: -0.92, ring: 0.76, sun: 0.17, planet: 0.235, orbit: 0.44, ringTeeth: 34, sunTeeth: 13, planetTeeth: 11, width: 0.22 },
      { x: 0, ring: 0.64, sun: 0.14, planet: 0.19, orbit: 0.36, ringTeeth: 29, sunTeeth: 12, planetTeeth: 10, width: 0.18 },
      { x: 0.92, ring: 0.8, sun: 0.19, planet: 0.25, orbit: 0.47, ringTeeth: 36, sunTeeth: 15, planetTeeth: 12, width: 0.25 },
    ];
    planetaryStages.forEach((stageSpec) => {
      const stage = new THREE.Group();
      stage.position.x = stageSpec.x;
      gearbox.add(stage);

      const ring = createRingGear(stageSpec.ring, stageSpec.width, stageSpec.ringTeeth, headMaterial);
      stage.add(ring);
      const sun = createSpurGear(stageSpec.sun, stageSpec.width + 0.025, stageSpec.sunTeeth, statorMetal, darkMetal);
      stage.add(sun);
      const carrier = new THREE.Group();
      stage.add(carrier);
      const planets: THREE.Group[] = [];
      for (let planetIndex = 0; planetIndex < 3; planetIndex += 1) {
        const angle = (planetIndex / 3) * Math.PI * 2;
        const planet = createSpurGear(
          stageSpec.planet,
          stageSpec.width + 0.04,
          stageSpec.planetTeeth,
          metal,
          darkMetal
        );
        planet.position.set(0, Math.cos(angle) * stageSpec.orbit, Math.sin(angle) * stageSpec.orbit);
        carrier.add(planet);
        planets.push(planet);

        const carrierArm = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.LineCurve3(
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(
                0,
                Math.cos(angle) * stageSpec.orbit,
                Math.sin(angle) * stageSpec.orbit
              )
            ),
            8,
            0.045,
            8,
            false
          ),
          headMaterial
        );
        carrier.add(carrierArm);
      }
      gearStages.push({ ring, sun, carrier, planets });
    });

    // Interleaved clutch drums make the planetary sets read as a coupled
    // automatic, rather than three independent gears on a shaft.
    [
      { x: -1.3, radius: 0.84, discs: 4 },
      { x: -0.46, radius: 0.7, discs: 5 },
      { x: 0.46, radius: 0.74, discs: 4 },
      { x: 1.31, radius: 0.86, discs: 5 },
    ].forEach(({ x, radius, discs }) => {
      const clutch = createClutchPack(radius, 0.13, discs, darkMetal, statorMetal);
      clutch.position.x = x;
      gearbox.add(clutch);
    });

    const outputShaft = cylinder(0.15, 1.3, darkMetal);
    outputShaft.position.x = 4.95;
    drivetrain.add(outputShaft);

    // Rear final drive: the transmission output continues into a propshaft,
    // then turns through the differential into the two lateral half-shafts.
    const rearDriveline = new THREE.Group();
    assembly.add(rearDriveline);
    const propshaftStart = new THREE.Vector3(4.1, -0.98, 0);
    const propshaftEnd = new THREE.Vector3(vehicleLayout.rearAxleX - 0.38, vehicleLayout.wheelCenterY, 0);
    const propshaft = createSuspensionLink(propshaftStart, propshaftEnd, 0.11, darkMetal);
    rearDriveline.add(propshaft);
    [propshaftStart, propshaftEnd].forEach((position) => {
      const universal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), metal);
      universal.position.copy(position);
      rearDriveline.add(universal);
    });

    const differential = new THREE.Group();
    differential.position.set(vehicleLayout.rearAxleX, vehicleLayout.wheelCenterY, 0);
    rearDriveline.add(differential);
    const differentialHousingMaterial = new THREE.MeshStandardMaterial({
      color: "#4b5564",
      metalness: 0.58,
      roughness: 0.34,
    });
    registerCutawayMaterial(differentialHousingMaterial, 0.2);
    const differentialHousing = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 28, 20),
      differentialHousingMaterial
    );
    differentialHousing.scale.set(1.16, 0.88, 0.9);
    differential.add(differentialHousing);
    [-1, 1].forEach((side) => {
      const axleTube = cylinderAlongZ(0.24, 4.3, differentialHousingMaterial, 24);
      axleTube.position.z = side * 2.15;
      differential.add(axleTube);
    });
    const differentialCoverMaterial = new THREE.MeshStandardMaterial({
      color: "#626b78",
      metalness: 0.48,
      roughness: 0.38,
    });
    const differentialCover = cylinderAlongZ(0.63, 0.12, differentialCoverMaterial, 32);
    differentialCover.position.z = 0.76;
    differential.add(differentialCover);
    const differentialCoverFlangeMaterial = new THREE.MeshStandardMaterial({
      color: "#3a404c",
      metalness: 0.55,
      roughness: 0.38,
    });
    const differentialCoverFlange = new THREE.Mesh(
      new THREE.TorusGeometry(0.64, 0.05, 8, 40),
      differentialCoverFlangeMaterial
    );
    differentialCoverFlange.position.z = 0.84;
    differential.add(differentialCoverFlange);
    const differentialCoverBolts: THREE.Object3D[] = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const coverBolt = cylinderAlongZ(0.032, 0.07, metal, 10);
      coverBolt.position.set(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0.86);
      differential.add(coverBolt);
      differentialCoverBolts.push(coverBolt);
    }

    const pinionShaft = cylinder(0.13, 0.82, metal, 20);
    pinionShaft.position.x = -0.45;
    differential.add(pinionShaft);
    const pinionGear = createSpurGear(0.19, 0.24, 12, statorMetal, darkMetal);
    pinionGear.position.x = -0.08;
    differential.add(pinionGear);

    const finalDriveRingRotator = new THREE.Group();
    finalDriveRingRotator.rotation.y = Math.PI / 2;
    differential.add(finalDriveRingRotator);
    // Internal ring gear remains animated, but the cast carrier contains it
    // instead of exposing a floating giant spur gear as the differential.
    const finalDriveRing = createSpurGear(0.48, 0.16, 30, headMaterial, darkMetal);
    finalDriveRing.visible = false;
    finalDriveRingRotator.add(finalDriveRing);
    cutawayRegistry.hideWhenOpen.push(
      differentialCover,
      differentialCoverFlange,
      ...differentialCoverBolts
    );
    cutawayRegistry.revealWhenOpen.push(finalDriveRing);
    const sideGearLeft = cylinderAlongZ(0.2, 0.14, statorMetal, 18);
    sideGearLeft.position.z = -0.19;
    differential.add(sideGearLeft);
    const sideGearRight = cylinderAlongZ(0.2, 0.14, statorMetal, 18);
    sideGearRight.position.z = 0.19;
    differential.add(sideGearRight);
    const spiderGearCross = cylinderAlongZ(0.055, 0.68, metal, 12);
    differential.add(spiderGearCross);

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: "#11141a",
      metalness: 0.12,
      roughness: 0.72,
    });
    registerCutawayMaterial(tireMaterial, 0.22);
    const brakeRotorMaterial = new THREE.MeshStandardMaterial({
      color: "#aab2bf",
      metalness: 0.9,
      roughness: 0.24,
    });
    const caliperMaterial = new THREE.MeshStandardMaterial({
      color: "#b32925",
      metalness: 0.54,
      roughness: 0.3,
      emissive: "#280303",
      emissiveIntensity: 0.16,
    });
    const drivenWheels: THREE.Group[] = [];
    const wheelAssemblies: THREE.Group[] = [];
    const cvAxles: THREE.Object3D[] = [];
    [-1, 1].forEach((side) => {
      // The half shaft reaches the full-size wheel hub; each end gets a joint
      // and boot so it reads as a real CV axle rather than a floating line.
      const shaft = cylinderAlongZ(0.115, 4.66, darkMetal, 16);
      shaft.position.set(vehicleLayout.rearAxleX, vehicleLayout.wheelCenterY, side * 2.33);
      rearDriveline.add(shaft);
      cvAxles.push(shaft);
      [0.18, vehicleLayout.rearCvJointZ].forEach((distance) => {
        const cvJoint = new THREE.Mesh(new THREE.SphereGeometry(distance > 1 ? 0.21 : 0.17, 16, 12), metal);
        cvJoint.position.set(vehicleLayout.rearAxleX, vehicleLayout.wheelCenterY, side * distance);
        rearDriveline.add(cvJoint);
        cvAxles.push(cvJoint);
        const boot = new THREE.Mesh(new THREE.TorusGeometry(distance > 1 ? 0.18 : 0.14, 0.045, 8, 18), darkMetal);
        boot.position.set(vehicleLayout.rearAxleX, vehicleLayout.wheelCenterY, side * (distance - 0.12));
        rearDriveline.add(boot);
        cvAxles.push(boot);
      });

      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(vehicleLayout.rearAxleX, vehicleLayout.wheelCenterY, side * vehicleLayout.wheelCenterZ);
      const { wheel, caliper } = createRoadWheel(
        side,
        tireMaterial,
        metal,
        brakeRotorMaterial,
        darkMetal,
        caliperMaterial
      );
      wheelAssembly.add(wheel, caliper);
      rearDriveline.add(wheelAssembly);
      wheelAssemblies.push(wheelAssembly);
      drivenWheels.push(wheel);
    });

    // A simple ladder-style frame establishes the vehicle's longitudinal
    // structure and makes the engine, rear drive and steering axle one system.
    const chassis = new THREE.Group();
    assembly.add(chassis);
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: "#323a46",
      metalness: 0.66,
      roughness: 0.36,
    });
    [-2.15, 2.15].forEach((z) => {
      const frameRail = new THREE.Mesh(new THREE.BoxGeometry(vehicleLayout.chassisFrameLength, 0.2, 0.24), chassisMaterial);
      frameRail.position.set(vehicleLayout.chassisFrameCenterX, -1.95, z);
      chassis.add(frameRail);
    });
    [-6.2, -3.25, 0.1, 3.15, 6.15, 7.95, vehicleLayout.rearAxleX - 1.45].forEach((x) => {
      const crossmember = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 4.55), chassisMaterial);
      crossmember.position.set(x, -1.95, 0);
      chassis.add(crossmember);
    });
    // Open rear cradle: the former solid subframe cut through the differential.
    // These members support the axle while keeping the pumpkin and cover unobstructed.
    const rearSubframe = new THREE.Group();
    chassis.add(rearSubframe);
    [-2.62, 2.62].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.22), chassisMaterial);
      rail.position.set(vehicleLayout.rearAxleX, -1.82, z);
      rearSubframe.add(rail);
    });
    [-1.08, 1.08].forEach((offset) => {
      const crossmember = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 5.46), chassisMaterial);
      crossmember.position.set(vehicleLayout.rearAxleX + offset, -2.16, 0);
      rearSubframe.add(crossmember);
    });

    // The front axle is only a steering/braking assembly. It is deliberately
    // not linked to the propshaft or differential, but its wheels free-roll.
    const frontAxle = new THREE.Group();
    chassis.add(frontAxle);
    const frontAxleX = vehicleLayout.frontAxleX;
    const frontSteeringRack = cylinderAlongZ(0.1, 4.95, darkMetal, 18);
    frontSteeringRack.position.set(frontAxleX, -1.42, 0);
    frontAxle.add(frontSteeringRack);
    const frontCrossmember = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.18, 4.9), headMaterial);
    frontCrossmember.position.set(frontAxleX, -1.88, 0);
    frontAxle.add(frontCrossmember);
    const freeRollingWheels: THREE.Group[] = [];
    const frontWheelAssemblies: THREE.Group[] = [];
    [-1, 1].forEach((side) => {
      const uprightZ = side * vehicleLayout.frontUprightZ;
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.94, 14), headMaterial);
      upright.position.set(frontAxleX, -1.38, uprightZ);
      frontAxle.add(upright);
      const spindle = cylinderAlongZ(0.13, 0.72, metal, 18);
      spindle.position.set(frontAxleX, vehicleLayout.wheelCenterY, side * 4.49);
      frontAxle.add(spindle);

      const upperJoint = new THREE.Vector3(frontAxleX, -0.96, uprightZ);
      const lowerJoint = new THREE.Vector3(frontAxleX, -1.8, uprightZ);
      const upperWishbone = createWishbone(
        new THREE.Vector3(frontAxleX - 0.62, -1.46, side * 2.02),
        new THREE.Vector3(frontAxleX + 0.46, -1.46, side * 2.02),
        upperJoint,
        chassisMaterial,
        darkMetal,
        0.052
      );
      frontAxle.add(upperWishbone);
      const lowerWishbone = createWishbone(
        new THREE.Vector3(frontAxleX - 0.66, -2.08, side * 2.04),
        new THREE.Vector3(frontAxleX + 0.52, -2.08, side * 2.04),
        lowerJoint,
        chassisMaterial,
        darkMetal,
        0.068
      );
      frontAxle.add(lowerWishbone);

      const tieRod = createSuspensionLink(
        new THREE.Vector3(frontAxleX, -1.42, side * 2.42),
        new THREE.Vector3(frontAxleX - 0.15, -1.42, side * (vehicleLayout.frontUprightZ - 0.1)),
        0.042,
        metal
      );
      frontAxle.add(tieRod);
      [upperJoint, lowerJoint].forEach((joint) => {
        const ballJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 10), metal);
        ballJoint.position.copy(joint);
        frontAxle.add(ballJoint);
      });

      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(frontAxleX, vehicleLayout.wheelCenterY, side * vehicleLayout.wheelCenterZ);
      const { wheel, caliper } = createRoadWheel(
        side,
        tireMaterial,
        metal,
        brakeRotorMaterial,
        darkMetal,
        caliperMaterial
      );
      wheelAssembly.add(wheel, caliper);
      frontAxle.add(wheelAssembly);
      frontWheelAssemblies.push(wheelAssembly);
      freeRollingWheels.push(wheel);
    });

    const { bodyShell, suvBody, tailLightMaterial } = createSuvBody({
      assembly,
      metal,
      darkMetal,
      tireMaterial,
      brakeRotorMaterial,
      caliperMaterial,
      registerCutawayMaterial,
    });
    // The scene remains a cutaway in Explore Mode, but the same complete rig
    // receives real terrain shadows when it is driven outdoors.
    assembly.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    const fluid = new THREE.Group();
    drivetrain.add(fluid);
    const fluidMaterial = new THREE.MeshBasicMaterial({
      color: "#f28c28",
      transparent: true,
      opacity: 0.8,
    });
    const particleGeometry = new THREE.SphereGeometry(0.045, 10, 10);
    const particles: THREE.Mesh[] = [];
    for (let index = 0; index < 48; index += 1) {
      const particle = new THREE.Mesh(particleGeometry, fluidMaterial);
      particles.push(particle);
      fluid.add(particle);
    }

    // These are the major assemblies a learner can identify in the cutaway.
    // Labels stay out of the way until explicitly enabled or hovered.
    addAnnotation(
      headDeck,
      "CYLINDER HEAD / BLOCK",
      [blockRearWall, blockLowerRail, blockFrontSill, headDeck, headGasket],
      new THREE.Vector3(0, 0.38, 0)
    );
    addAnnotation(
      bodyShell,
      "TRANSLUCENT SUV BODY / LIGHTING",
      [suvBody],
      new THREE.Vector3(0, 0.52, 0)
    );
    addAnnotation(camShafts[0], "DOHC CAMSHAFTS", camShafts, new THREE.Vector3(0, 0.42, 0));
    addAnnotation(
      pistonData[1].piston,
      "PISTONS + CONNECTING RODS",
      pistonData.flatMap(({ piston, rod, crankPin }) => [piston, rod, crankPin]),
      new THREE.Vector3(0, 0.32, 0)
    );
    addAnnotation(
      accessoryPulleys[0].group,
      "SERPENTINE ACCESSORY DRIVE",
      accessoryPulleys.map(({ group }) => group),
      new THREE.Vector3(0, 0.36, 0)
    );
    addAnnotation(
      intakePlenum,
      "INTAKE PLENUM + THROTTLE BODY",
      [intakePlenum, throttleBody],
      new THREE.Vector3(0, 0.3, -0.15)
    );
    addAnnotation(turboAssembly, "TURBOCHARGER", [turboAssembly], new THREE.Vector3(0, 0.42, 0));
    addAnnotation(
      collector,
      "EXHAUST MANIFOLD + TAILPIPE",
      [collector, tailPipe, tailTip],
      new THREE.Vector3(0, 0.33, 0)
    );
    addAnnotation(
      flexplateAssembly,
      "FLEXPLATE / CRANK OUTPUT",
      [flexplateAssembly],
      new THREE.Vector3(0, 0.38, 0)
    );
    addAnnotation(
      housing,
      "TORQUE CONVERTER",
      [housing, housingRim, impeller, turbine, stator, bellhousing],
      new THREE.Vector3(0, 0.5, 0)
    );
    addAnnotation(gearbox, "6-SPEED AUTOMATIC", [gearbox], new THREE.Vector3(0, 0.5, 0));
    addAnnotation(propshaft, "PROPSHAFT", [propshaft], new THREE.Vector3(0, 0.26, 0));
    addAnnotation(differential, "FINAL DRIVE / DIFFERENTIAL", [differential], new THREE.Vector3(0, 0.5, 0));
    addAnnotation(cvAxles[0], "CV AXLES", cvAxles, new THREE.Vector3(0, 0.24, 0));
    addAnnotation(wheelAssemblies[0], "DRIVEN WHEELS + BRAKES", wheelAssemblies, new THREE.Vector3(0, 0.42, 0));
    addAnnotation(rearSubframe, "LADDER CHASSIS / FRAME", [chassis], new THREE.Vector3(0, 0.32, 0));
    addAnnotation(
      frontSteeringRack,
      "FRONT STEERING AXLE / FREE-ROLLING WHEELS",
      [frontAxle],
      new THREE.Vector3(0, 0.52, 0)
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredAnnotation: ComponentAnnotation | null = null;
    const findAnnotation = (object: THREE.Object3D) => {
      let current: THREE.Object3D | null = object;
      while (current) {
        const annotation = current.userData.componentAnnotation as ComponentAnnotation | undefined;
        if (annotation) return annotation;
        current = current.parent;
      }
      return null;
    };
    const onPointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      hoveredAnnotation = null;
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        const annotation = findAnnotation(hit.object);
        if (annotation) {
          hoveredAnnotation = annotation;
          break;
        }
      }
      renderer.domElement.style.cursor = hoveredAnnotation ? "pointer" : "grab";
    };
    const onPointerLeave = () => {
      hoveredAnnotation = null;
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const onDrivetrain = (event: Event) => {
      telemetryRef.current = (event as CustomEvent<DrivetrainTelemetry>).detail;
    };
    window.addEventListener("engine:drivetrain", onDrivetrain);

    let frameId = 0;
    let lastFrame = performance.now();
    let lastReadout = 0;
    let fluidPhase = 0;
    let appliedCutaway = false;
    let appliedSceneMode: PowertrainSceneMode | null = null;
    let driveSpeed = 0;
    let steeringAngle = 0;
    let lastDriveThrottle = -1;
    let lastDriveBrake = -1;
    let lastDriveTuningSignature = "";
    let driveInputWasActive = false;
    const driveTuning = {
      steeringLock: document.getElementById("driveSteeringLock") as HTMLInputElement | null,
      steeringResponse: document.getElementById("driveSteeringResponse") as HTMLInputElement | null,
      highSpeedSteer: document.getElementById("driveHighSpeedSteer") as HTMLInputElement | null,
      turnRate: document.getElementById("driveTurnRate") as HTMLInputElement | null,
      launchGain: document.getElementById("driveLaunchGain") as HTMLInputElement | null,
      brakeForce: document.getElementById("driveBrakeForce") as HTMLInputElement | null,
      coastDecay: document.getElementById("driveCoastDecay") as HTMLInputElement | null,
      creep: document.getElementById("driveCreep") as HTMLInputElement | null,
      speedLimit: document.getElementById("driveSpeedLimit") as HTMLInputElement | null,
      finalDrive: document.getElementById("finalDrive") as HTMLInputElement | null,
    };
    const driveForward = new THREE.Vector3();
    const driveFocus = new THREE.Vector3();
    const driveCameraDelta = new THREE.Vector3();
    const driveRearAxleLocal = new THREE.Vector3(vehicleLayout.rearAxleX, 0, 0);
    const driveRearAxleBeforeTurn = new THREE.Vector3();
    const driveRearAxleAfterTurn = new THREE.Vector3();
    const driveWheelbase = Math.abs(vehicleLayout.rearAxleX - vehicleLayout.frontAxleX);
    const inspectCameraOffset = new THREE.Vector3(13, 6.4, 29);
    const driveStartPosition = new THREE.Vector3(0, 0, -7.2);
    const syncSceneMode = () => {
      const mode = sceneModeRef.current;
      if (mode === appliedSceneMode) return;
      appliedSceneMode = mode;
      const driving = mode === "drive";
      driveEnvironment.setVisible(driving);
      exploreLights.forEach((light) => {
        light.visible = !driving;
      });
      scene.background = driving ? driveBackground : exploreBackground;
      // Keep the distant mountain layers visible while still softening the
      // far end of the proving ground into the sky.
      scene.fog = driving ? new THREE.Fog("#8b9fac", 300, 820) : null;
      // Orbit remains enabled in Drive Mode. We move its target with the SUV,
      // so the camera follows the vehicle without taking manual orbit away.
      orbit.enabled = true;

      if (driving) {
        // In Explore Mode the vehicle is centered for inspection. Drive Mode
        // starts it in the right-hand lane, with enough clearance on both sides.
        if (vehicleRig.position.lengthSq() < 0.01) {
          vehicleRig.position.copy(driveStartPosition);
        }
        camera.position.copy(vehicleRig.position).add(new THREE.Vector3(21, 10.5, 25));
        orbit.target.set(vehicleRig.position.x - 2.2, 0.2, vehicleRig.position.z);
        orbit.update();
      } else {
        if (driveInputWasActive) {
          window.dispatchEvent(new CustomEvent("engine:drive-input", { detail: { throttle: 0, brake: 0 } }));
          driveInputWasActive = false;
        }
        orbit.target.set(
          vehicleRig.position.x + vehicleLayout.chassisFrameCenterX,
          vehicleRig.position.y - 0.3,
          vehicleRig.position.z
        );
        camera.position.copy(vehicleRig.position).add(inspectCameraOffset);
        camera.lookAt(orbit.target);
      }
    };
    const updateDriveMode = (state: DrivetrainTelemetry, dt: number) => {
      if (sceneModeRef.current !== "drive") return;
      const input = driveControls.read();
      if (input.reset) {
        vehicleRig.position.copy(driveStartPosition);
        vehicleRig.rotation.set(0, 0, 0);
        driveSpeed = 0;
        steeringAngle = 0;
        window.dispatchEvent(new CustomEvent("engine:drive-input", { detail: { reset: true } }));
      }
      const tuning = {
        launchGain: Number(driveTuning.launchGain?.value ?? 100) / 100,
        brakeForce: Number(driveTuning.brakeForce?.value ?? 100) / 100,
        coastDecay: Number(driveTuning.coastDecay?.value ?? 72) / 100,
        creep: Number(driveTuning.creep?.value ?? 38) / 100,
        speedLimit: Number(driveTuning.speedLimit?.value ?? 24),
      };
      const tuningSignature = Object.values(tuning).join(":");
      if (
        input.throttle !== lastDriveThrottle ||
        input.brake !== lastDriveBrake ||
        tuningSignature !== lastDriveTuningSignature
      ) {
        window.dispatchEvent(
          new CustomEvent("engine:drive-input", {
            detail: { throttle: input.throttle, brake: input.brake, tuning },
          })
        );
        lastDriveThrottle = input.throttle;
        lastDriveBrake = input.brake;
        lastDriveTuningSignature = tuningSignature;
      }
      driveInputWasActive = input.throttle > 0 || input.brake > 0;

      // The engine model owns road speed. Its wheel circumference is matched
      // to the rendered tire, so translation, wheel RPM and the speed readout
      // now refer to exactly the same physical value.
      const direction = state.transmission === "R" ? -1 : 1;
      driveSpeed = state.running && state.inGear ? direction * state.vehicleSpeed : 0;
      const speedMph = Math.abs(driveSpeed) * 2.23694;
      const highSpeedAuthority = Number(driveTuning.highSpeedSteer?.value ?? 45) / 100;
      const speedFade = THREE.MathUtils.smoothstep(speedMph, 8, 58);
      const steeringAuthority = THREE.MathUtils.lerp(1, highSpeedAuthority, speedFade);
      const maxSteer =
        THREE.MathUtils.degToRad(Number(driveTuning.steeringLock?.value ?? 32)) * steeringAuthority;
      // Input maps directly to the visual wheel direction: A turns left and
      // D turns right from the driver's perspective. Steering range decays
      // smoothly with road speed, preventing full-lock highway turns.
      const targetSteer = input.steering * maxSteer;
      const steeringResponse = Number(driveTuning.steeringResponse?.value ?? 8) * (1 - speedFade * 0.28);
      steeringAngle += (targetSteer - steeringAngle) * Math.min(dt * steeringResponse, 1);
      frontWheelAssemblies.forEach((wheel) => {
        // Wheel meshes use the opposite local forward axis from the vehicle
        // rig, so their visual steering must be mirrored independently.
        wheel.rotation.y = -steeringAngle;
      });

      // Bicycle-model steering: the front wheels set the curvature while the
      // rear axle tracks the curve. Preserving the rear axle position during
      // yaw prevents the tail from swinging around the rig's arbitrary origin.
      const steeringGain = Number(driveTuning.turnRate?.value ?? 14) / 10;
      const yawDelta =
        -(driveSpeed / driveWheelbase) * Math.tan(steeringAngle) * steeringGain * dt;
      if (Math.abs(yawDelta) > 0.000001) {
        vehicleRig.localToWorld(driveRearAxleBeforeTurn.copy(driveRearAxleLocal));
        vehicleRig.rotation.y += yawDelta;
        vehicleRig.localToWorld(driveRearAxleAfterTurn.copy(driveRearAxleLocal));
        vehicleRig.position.add(driveRearAxleBeforeTurn.sub(driveRearAxleAfterTurn));
      }
      // The SUV's front axle is on the negative X side of the existing model.
      // Driving forward must therefore use local -X, not local +X.
      driveForward.set(-1, 0, 0).applyQuaternion(vehicleRig.quaternion).normalize();
      vehicleRig.position.addScaledVector(driveForward, driveSpeed * dt);

      driveFocus.copy(vehicleRig.position).addScaledVector(driveForward, 3.5);
      driveFocus.y += 0.15;
      // Translate the existing orbit camera by the target delta. This retains
      // the angle the user chose with drag while keeping the SUV centered.
      driveCameraDelta.copy(driveFocus).sub(orbit.target);
      camera.position.add(driveCameraDelta);
      orbit.target.copy(driveFocus);
    };
    const syncCutaway = () => {
      const shouldOpen = cutawayEnabledRef.current;
      if (shouldOpen === appliedCutaway) return;
      appliedCutaway = shouldOpen;
      cutawayRegistry.materials.forEach(({ material, solidOpacity, cutawayOpacity }) => {
        material.transparent = shouldOpen || solidOpacity < 1;
        material.opacity = shouldOpen ? cutawayOpacity : solidOpacity;
        material.depthWrite = !shouldOpen;
        material.needsUpdate = true;
      });
      cutawayRegistry.hideWhenOpen.forEach((part) => {
        part.visible = !shouldOpen;
      });
      cutawayRegistry.revealWhenOpen.forEach((part) => {
        part.visible = shouldOpen;
      });
    };
    const animate = (now: number) => {
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      const state = telemetryRef.current;
      syncSceneMode();
      updateDriveMode(state, dt);
      // Brake lights follow the simulator brake state even after the driver
      // releases Drive Mode, rather than remaining stuck at their last value.
      tailLightMaterial.emissiveIntensity = state.brake > 2 ? 4.8 : 1.55;
      syncCutaway();
      suvBody.visible = bodyVisibleRef.current;
      const impellerSpeed = (state.engineRpm / 60) * Math.PI * 2;
      const turbineSpeed = (state.turbineRpm / 60) * Math.PI * 2;
      const outputSpeed = (state.outputRpm / 60) * Math.PI * 2;

      const camAngle = state.crankAngle * 0.5;
      // The flexplate and its four converter lugs share the crank angle.
      flexplateAssembly.rotation.x = state.crankAngle;
      camShafts.forEach((cam) => {
        cam.rotation.x = camAngle;
      });
      accessoryPulleys.forEach(({ group, ratio }) => {
        group.rotation.x = state.crankAngle * ratio;
      });
      turboAssembly.visible = true;
      const turboMultiplier = state.running && state.turbo ? 5 + state.throttle * 0.07 : 0;
      turboTurbineWheel.rotation.x += impellerSpeed * turboMultiplier * dt;
      turboCompressorWheel.rotation.x += impellerSpeed * turboMultiplier * dt;
      const turboHeat = state.running && state.turbo ? 0.12 + state.throttle / 100 * 0.9 : 0.03;
      turboHotMaterial.emissiveIntensity = turboHeat;
      turboColdMaterial.emissiveIntensity = state.running && state.turbo ? 0.22 + state.throttle / 100 * 0.35 : 0.08;
      intakeMaterial.emissiveIntensity = state.running ? 0.14 + state.throttle / 100 * 0.24 : 0.05;
      pistonData.forEach((cylinderState) => {
        const { piston, rod, crankPin, valves, exhaustMaterial, x, phase } = cylinderState;
        const angle = state.crankAngle + phase;
        const pistonY = 0.22 + Math.cos(angle) * 0.63;
        const pinY = -0.98 + Math.cos(angle) * 0.19;
        const pinZ = Math.sin(angle) * 0.19;
        const rodTop = new THREE.Vector3(x, pistonY - 0.16, 0);
        const rodBottom = new THREE.Vector3(x, pinY, pinZ);
        const rodVector = rodBottom.clone().sub(rodTop);

        piston.position.set(x, pistonY, 0);
        crankPin.position.set(x, pinY, pinZ);
        rod.position.copy(rodTop.clone().add(rodBottom).multiplyScalar(0.5));
        rod.scale.set(1, rodVector.length(), 1);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodVector.normalize());

        const cycleAngle = ((angle % (Math.PI * 4)) + Math.PI * 4) % (Math.PI * 4);
        const strokeIndex = Math.floor(cycleAngle / Math.PI);
        const strokePhase = (cycleAngle % Math.PI) / Math.PI;
        const intakeLift = strokeIndex === 0 ? Math.sin(strokePhase * Math.PI) : 0;
        const exhaustLift = strokeIndex === 3 ? Math.sin(strokePhase * Math.PI) : 0;
        valves[0].position.y = 1.18 - intakeLift * 0.24;
        valves[1].position.y = 1.18 - exhaustLift * 0.24;
        cylinderState.exhaustProgress = strokeIndex === 3 ? strokePhase : -1;

        const exhaustHeat = exhaustLift * (0.3 + state.throttle * 0.007);
        exhaustMaterial.emissive.setRGB(0.48, 0.04, 0.01);
        exhaustMaterial.emissiveIntensity = 0.05 + exhaustHeat * 1.4;

        const firing = strokeIndex === 2 && strokePhase < 0.13;
        piston.material.emissive.set(firing ? "#e64a19" : "#120807");
        piston.material.emissiveIntensity = firing ? 1.35 : 0;
      });

      const activeExhaust = pistonData.reduce(
        (total, cylinderState) => total + Math.max(cylinderState.exhaustProgress, 0),
        0
      );
      tailPipeMaterial.emissive.setRGB(0.36, 0.025, 0.008);
      tailPipeMaterial.emissiveIntensity = 0.04 + activeExhaust * 0.28;
      exhaustParticles.forEach(({ mesh, cylinderIndex, offset }) => {
        const cylinderState = pistonData[cylinderIndex];
        const progress = cylinderState.exhaustProgress - offset;
        if (!state.running || progress < 0 || progress > 1) {
          mesh.visible = false;
          return;
        }

        const position =
          progress < 0.42
            ? exhaustHeaderCurves[cylinderIndex].getPoint(progress / 0.42)
            : exhaustTailCurve.getPoint((progress - 0.42) / 0.58);
        mesh.position.copy(position);
        mesh.visible = true;
        mesh.scale.setScalar(0.55 + (1 - offset) * 0.65);
      });

      impeller.rotation.x += impellerSpeed * dt;
      turbine.rotation.x += turbineSpeed * dt;
      stator.rotation.x += impellerSpeed * (1 - state.speedRatio) * 0.08 * dt;
      lockupPlate.position.x = 0.95 - state.lockup * 0.19;
      clutchDisc.position.x = 1.03 - state.lockup * 0.19;

      gearStages.forEach(({ ring, sun, carrier, planets }, index) => {
        const stageDirection = index % 2 === 0 ? 1 : -1;
        // A planetary set: turbine drives the sun, planets counter-rotate in a
        // carrier, and the ring follows the transmission output.
        sun.rotation.x += turbineSpeed * stageDirection * (0.26 + index * 0.05) * dt;
        ring.rotation.x += outputSpeed * stageDirection * (0.11 + index * 0.03) * dt;
        carrier.rotation.x += outputSpeed * stageDirection * (0.18 + index * 0.025) * dt;
        planets.forEach((planet) => {
          planet.rotation.x -= turbineSpeed * stageDirection * (0.44 + index * 0.06) * dt;
        });
      });
      const finalDriveRatio = Number(driveTuning.finalDrive?.value ?? 3.8);
      // `outputRpm` is the simulated wheel RPM. Use it as the single source
      // for visible tire speed, then apply the final-drive ratio upstream for
      // the propshaft and differential. Converter/turbine slip can therefore
      // remain visible while the vehicle side of the transmission is stopped.
      const wheelAngularSpeed =
        outputSpeed * (state.transmission === "R" ? -1 : 1);
      const drivelineSpeed = wheelAngularSpeed * finalDriveRatio;
      // createSuspensionLink aligns its local Y axis with the angled shaft.
      propshaft.rotateY(drivelineSpeed * dt);
      pinionGear.rotateX(drivelineSpeed * dt);
      finalDriveRingRotator.rotateX(drivelineSpeed * dt);
      sideGearLeft.rotateZ(wheelAngularSpeed * dt);
      sideGearRight.rotateZ(wheelAngularSpeed * dt);
      drivenWheels.forEach((wheel) => {
        wheel.rotateZ(wheelAngularSpeed * dt);
      });
      freeRollingWheels.forEach((wheel) => {
        wheel.rotateZ(wheelAngularSpeed * dt);
      });

      const slipFactor = clamp(state.slipRpm / 2200, 0, 1);
      const fluidSpeed = 0.45 + slipFactor * 3.5 + state.engineRpm / 9000;
      fluidPhase += fluidSpeed * dt;
      const fluidColor = new THREE.Color().lerpColors(
        new THREE.Color("#f2b84b"),
        new THREE.Color("#ff3b1f"),
        slipFactor
      );
      fluidMaterial.color.copy(fluidColor);
      fluidMaterial.opacity = state.running ? 0.35 + slipFactor * 0.55 : 0.05;
      particles.forEach((particle, index) => {
        const progress = (index / particles.length + fluidPhase * 0.11) % 1;
        const angle = progress * Math.PI * 2;
        const radius = 0.68 + Math.sin(angle * 2) * 0.18;
        particle.position.set(
          Math.sin(angle) * 0.55,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.92
        );
        const scale = 0.55 + slipFactor * 0.9;
        particle.scale.setScalar(scale);
      });

      if (now - lastReadout > 100) {
        setReadout({ ...state });
        lastReadout = now;
      }
      annotations.forEach((annotation) => {
        const projected = annotation.anchor
          .getWorldPosition(new THREE.Vector3())
          .add(annotation.offset)
          .project(camera);
        const isOnScreen =
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 1.05 &&
          Math.abs(projected.y) < 1.05;
        const shouldShow = isOnScreen && (labelsVisibleRef.current || hoveredAnnotation === annotation);
        annotation.element.classList.toggle("visible", shouldShow);
        if (shouldShow) {
          annotation.element.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
          annotation.element.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
        }
      });
      orbit.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("engine:drivetrain", onDrivetrain);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
      orbit.dispose();
      driveControls.dispose();
      driveEnvironment.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      annotations.forEach(({ element }) => element.remove());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

}
