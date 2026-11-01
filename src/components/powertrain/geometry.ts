import * as THREE from "three";
import { vehicleLayout } from "./layout";

export function cylinder(
  radius: number,
  length: number,
  material: THREE.Material,
  radialSegments = 28
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material
  );
  mesh.rotation.z = Math.PI / 2;
  return mesh;
}
export function cylinderAlongZ(
  radius: number,
  length: number,
  material: THREE.Material,
  radialSegments = 28
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, radialSegments),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function createSuspensionLink(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material
) {
  const direction = end.clone().sub(start);
  const link = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 12),
    material
  );
  link.position.copy(start.clone().add(end).multiplyScalar(0.5));
  link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return link;
}

export function createWishbone(
  inboardFront: THREE.Vector3,
  inboardRear: THREE.Vector3,
  outboard: THREE.Vector3,
  material: THREE.Material,
  jointMaterial: THREE.Material,
  radius: number
) {
  const arm = new THREE.Group();
  arm.add(
    createSuspensionLink(inboardFront, outboard, radius, material),
    createSuspensionLink(inboardRear, outboard, radius, material)
  );
  [inboardFront, inboardRear, outboard].forEach((position) => {
    const bushing = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.55, 12, 10), jointMaterial);
    bushing.position.copy(position);
    arm.add(bushing);
  });
  return arm;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createSpurGear(
  radius: number,
  width: number,
  teeth: number,
  material: THREE.Material,
  hubMaterial: THREE.Material
) {
  const gear = new THREE.Group();
  gear.add(cylinder(radius, width, material, Math.max(teeth * 2, 20)));
  gear.add(cylinder(radius * 0.35, width + 0.04, hubMaterial, 18));

  const toothDepth = Math.max(radius * 0.18, 0.055);
  const toothWidth = (Math.PI * 2 * radius / teeth) * 0.58;
  const toothGeometry = new THREE.BoxGeometry(width + 0.035, toothDepth, toothWidth);
  for (let index = 0; index < teeth; index += 1) {
    const angle = (index / teeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeometry, material);
    tooth.position.set(
      0,
      Math.cos(angle) * (radius + toothDepth * 0.5),
      Math.sin(angle) * (radius + toothDepth * 0.5)
    );
    tooth.rotation.x = angle;
    gear.add(tooth);
  }
  return gear;
}

export function createRingGear(
  radius: number,
  width: number,
  teeth: number,
  material: THREE.Material
) {
  const ring = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.1, 0.1, 10, teeth * 2), material);
  outer.rotation.y = Math.PI / 2;
  ring.add(outer);

  const toothDepth = 0.08;
  const toothWidth = (Math.PI * 2 * radius / teeth) * 0.46;
  const toothGeometry = new THREE.BoxGeometry(width, toothDepth, toothWidth);
  for (let index = 0; index < teeth; index += 1) {
    const angle = (index / teeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeometry, material);
    tooth.position.set(
      0,
      Math.cos(angle) * (radius - toothDepth * 0.55),
      Math.sin(angle) * (radius - toothDepth * 0.55)
    );
    tooth.rotation.x = angle;
    ring.add(tooth);
  }
  return ring;
}

export function createClutchPack(
  radius: number,
  width: number,
  discCount: number,
  drumMaterial: THREE.Material,
  plateMaterial: THREE.Material
) {
  const pack = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.075, 0.075, 10, 40), drumMaterial);
  drum.rotation.y = Math.PI / 2;
  pack.add(drum);

  for (let index = 0; index < discCount; index += 1) {
    const progress = discCount === 1 ? 0.5 : index / (discCount - 1);
    const plate = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.72, 0.026, 8, 32),
      plateMaterial
    );
    plate.rotation.y = Math.PI / 2;
    plate.position.x = -width * 0.5 + progress * width;
    pack.add(plate);
  }
  return pack;
}

export function createRoadWheel(
  side: number,
  tireMaterial: THREE.Material,
  rimMaterial: THREE.Material,
  brakeMaterial: THREE.Material,
  hubMaterial: THREE.Material,
  caliperMaterial: THREE.Material
) {
  const wheel = new THREE.Group();
  const tireRadius = vehicleLayout.tireMajorRadius;
  const tireOutsideRadius = tireRadius + vehicleLayout.tireSectionHalfWidth;
  // Sidewall, tread and rim are separate forms so this reads as a road wheel,
  // not a single torus around a solid disc.
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(tireRadius, vehicleLayout.tireSectionHalfWidth, 24, 64),
    tireMaterial
  );
  wheel.add(tire);

  [-1, 1].forEach((face) => {
    const sidewall = new THREE.Mesh(new THREE.TorusGeometry(tireRadius, 0.055, 10, 64), hubMaterial);
    sidewall.position.z = face * (vehicleLayout.tireSectionHalfWidth - 0.01);
    wheel.add(sidewall);
  });

  const rimBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.08, vehicleLayout.tireSectionHalfWidth * 1.82, 48, 1, true),
    rimMaterial
  );
  rimBarrel.rotation.x = Math.PI / 2;
  wheel.add(rimBarrel);
  const rimLip = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.07, 10, 56), rimMaterial);
  rimLip.position.z = side * (vehicleLayout.tireSectionHalfWidth - 0.02);
  wheel.add(rimLip);

  const rotor = cylinderAlongZ(0.86, 0.06, brakeMaterial, 48);
  rotor.position.z = -side * 0.19;
  wheel.add(rotor);
  const rotorHat = cylinderAlongZ(0.23, 0.1, hubMaterial, 24);
  rotorHat.position.z = -side * 0.21;
  wheel.add(rotorHat);
  const rotorVentMaterial = new THREE.MeshBasicMaterial({ color: "#11141a" });
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const vent = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), rotorVentMaterial);
    vent.position.set(Math.cos(angle) * 0.64, Math.sin(angle) * 0.64, -side * 0.157);
    if (side < 0) vent.rotation.y = Math.PI;
    wheel.add(vent);
  }
  const hub = cylinderAlongZ(0.17, 0.28, hubMaterial, 20);
  hub.position.z = side * 0.04;
  wheel.add(hub);

  const spokeGeometry = new THREE.BoxGeometry(0.94, 0.15, 0.14);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2 + Math.PI * 0.1;
    const spoke = new THREE.Mesh(spokeGeometry, rimMaterial);
    spoke.position.set(
      Math.cos(angle) * 0.67,
      Math.sin(angle) * 0.67,
      side * (vehicleLayout.tireSectionHalfWidth - 0.01)
    );
    spoke.rotation.z = angle;
    wheel.add(spoke);

    const wheelStud = cylinderAlongZ(0.04, 0.09, hubMaterial, 12);
    wheelStud.position.set(Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, side * 0.34);
    wheel.add(wheelStud);
  }

  const treadGeometry = new THREE.BoxGeometry(0.15, 0.11, 0.17);
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    [-0.8, -0.4, 0, 0.4, 0.8].map((lane) => lane * vehicleLayout.tireSectionHalfWidth).forEach((lane, laneIndex) => {
      const tread = new THREE.Mesh(treadGeometry, tireMaterial);
      tread.position.set(Math.cos(angle) * (tireOutsideRadius - 0.035), Math.sin(angle) * (tireOutsideRadius - 0.035), lane);
      tread.rotation.z = angle + (laneIndex === 1 ? 0.09 : 0);
      wheel.add(tread);
    });
  }

  const caliper = new THREE.Group();
  caliper.position.set(0.8, 0.05, side * 0.18);
  const caliperBracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.12), hubMaterial);
  caliperBracket.position.z = -side * 0.08;
  caliper.add(caliperBracket);
  const caliperBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 5, 12), caliperMaterial);
  caliperBody.rotation.z = -0.24;
  caliper.add(caliperBody);
  const caliperBridge = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.28, 0.3), caliperMaterial);
  caliperBridge.position.set(-0.08, -0.1, -side * 0.12);
  caliperBridge.rotation.z = -0.25;
  caliper.add(caliperBridge);

  return { wheel, caliper };
}

export function createBeltSpan(
  x: number,
  start: THREE.Vector2,
  end: THREE.Vector2,
  material: THREE.Material
) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.LineCurve3(
        new THREE.Vector3(x, start.x, start.y),
        new THREE.Vector3(x, end.x, end.y)
      ),
      12,
      0.05,
      8,
      false
    ),
    material
  );
}

export function getExternalTangent(
  first: { center: THREE.Vector2; radius: number },
  second: { center: THREE.Vector2; radius: number },
  side: 1 | -1
) {
  const delta = second.center.clone().sub(first.center);
  const distance = delta.length();
  const direction = delta.multiplyScalar(1 / Math.max(distance, 0.001));
  const normal = new THREE.Vector2(-direction.y, direction.x);
  const radiusDelta = (first.radius - second.radius) / Math.max(distance, 0.001);
  const normalScale = Math.sqrt(Math.max(0, 1 - radiusDelta * radiusDelta));
  const radial = direction
    .multiplyScalar(radiusDelta)
    .add(normal.multiplyScalar(side * normalScale));
  return {
    first: first.center.clone().addScaledVector(radial, first.radius),
    second: second.center.clone().addScaledVector(radial, second.radius),
  };
}

export function phaseToCamAngle(cylinderIndex: number, stroke: "intake" | "exhaust") {
  const cylinderPhase = cylinderIndex * Math.PI * 0.5;
  return cylinderPhase + (stroke === "intake" ? Math.PI * 0.75 : Math.PI * 1.25);
}

export function createCamLobeGeometry() {
  const shape = new THREE.Shape();
  const segments = 28;
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    // An asymmetric lobe profile: small base circle with a single raised nose.
    const lift = Math.pow(Math.max(0, Math.cos(angle)), 2.2) * 0.12;
    const radius = 0.135 + lift;
    const x = Math.sin(angle) * radius * 0.8;
    const y = Math.cos(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 10,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-0.11, 0, 0);
  return geometry;
}
