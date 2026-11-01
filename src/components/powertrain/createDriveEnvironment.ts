import * as THREE from "three";

export type DriveEnvironment = {
  group: THREE.Group;
  lights: THREE.Light[];
  setVisible: (visible: boolean) => void;
  dispose: () => void;
};

const groundY = -3.42;

type RoadAxis = "x" | "z";

type RoadSpec = {
  x: number;
  z: number;
  length: number;
  width: number;
  axis: RoadAxis;
};

type StructureFootprint = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

const mainRoadX = 40;
const mainRoadLength = 1180;
const mainRoadWidth = 42;
const parallelStreetZ = [-142, 142];
const connectorXs = [-330, -60, 230, 500];
const upperRouteZ = 270;
const lowerRouteZ = -270;
const roadSpecs: RoadSpec[] = [
  { x: mainRoadX, z: 0, length: mainRoadLength, width: mainRoadWidth, axis: "x" },
  ...parallelStreetZ.map((z) => ({ x: mainRoadX, z, length: 980, width: mainRoadWidth, axis: "x" as const })),
  ...connectorXs.map((x) => ({ x, z: 0, length: 310, width: mainRoadWidth, axis: "z" as const })),
  { x: 270, z: upperRouteZ, length: 590, width: mainRoadWidth, axis: "x" },
  { x: -210, z: lowerRouteZ, length: 560, width: mainRoadWidth, axis: "x" },
  { x: 500, z: 206, length: 258, width: mainRoadWidth, axis: "z" },
  { x: -330, z: -206, length: 258, width: mainRoadWidth, axis: "z" },
];

function distanceToRoad(x: number, z: number, road: RoadSpec) {
  const halfLength = road.length / 2;
  const halfWidth = road.width / 2;
  const along = road.axis === "x" ? Math.abs(x - road.x) : Math.abs(z - road.z);
  const across = road.axis === "x" ? Math.abs(z - road.z) : Math.abs(x - road.x);
  const outsideAlong = Math.max(along - halfLength, 0);
  const outsideAcross = Math.max(across - halfWidth, 0);
  return Math.hypot(outsideAlong, outsideAcross);
}

function isNearRoad(x: number, z: number, clearance: number) {
  return roadSpecs.some((road) => distanceToRoad(x, z, road) < clearance);
}

function addMesh(group: THREE.Group, mesh: THREE.Mesh) {
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

/**
 * A lightweight proving ground keeps Drive Mode legible without introducing a
 * physics engine or a second, disconnected scene graph.
 */
export function createDriveEnvironment(scene: THREE.Scene): DriveEnvironment {
  const group = new THREE.Group();
  group.visible = false;
  group.name = "drive-proving-ground";
  scene.add(group);

  const terrain = new THREE.PlaneGeometry(1440, 1080, 144, 108);
  const positions = terrain.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getY(index);
    const edgeFade = Math.min(1, Math.abs(z) / 340);
    const undulation =
      (Math.sin(x * 0.11) * 0.12 + Math.cos(z * 0.14) * 0.1 + Math.sin((x + z) * 0.08) * 0.08) *
      edgeFade;
    // Grade the ground flat near pavement so the terrain never breaks through
    // an intersection or shoulder as the camera moves around the scene.
    const nearestRoad = roadSpecs.reduce((distance, road) => Math.min(distance, distanceToRoad(x, z, road)), Infinity);
    positions.setZ(index, undulation * Math.min(nearestRoad / 18, 1));
  }
  terrain.computeVertexNormals();
  const terrainMesh = addMesh(
    group,
    new THREE.Mesh(
      terrain,
      new THREE.MeshStandardMaterial({ color: "#42513b", roughness: 0.95, metalness: 0 })
    )
  );
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.y = groundY;

  const roadMaterial = new THREE.MeshStandardMaterial({ color: "#2a2e31", roughness: 0.88 });
  const shoulderMaterial = new THREE.MeshStandardMaterial({ color: "#786446", roughness: 1 });
  const roadMarkMaterial = new THREE.MeshBasicMaterial({ color: "#e7c96d", transparent: true, opacity: 0.82 });
  const edgeLineMaterial = new THREE.MeshBasicMaterial({ color: "#f2efcf", transparent: true, opacity: 0.72 });

  const addRoad = (x: number, z: number, length: number, width: number, axis: RoadAxis) => {
    const roadSize = axis === "x" ? [length, 0.06, width] : [width, 0.06, length];
    const shoulderSize = axis === "x" ? [length + 10, 0.035, width + 6] : [width + 6, 0.035, length + 10];
    const shoulder = addMesh(group, new THREE.Mesh(new THREE.BoxGeometry(...shoulderSize), shoulderMaterial));
    shoulder.position.set(x, groundY - 0.006, z);
    const road = addMesh(group, new THREE.Mesh(new THREE.BoxGeometry(...roadSize), roadMaterial));
    road.position.set(x, groundY + 0.025, z);
  };
  const addRoadMarkings = (x: number, z: number, length: number, width: number, axis: RoadAxis) => {
    const start = -length / 2 + 5;
    for (let offset = start; offset < length / 2 - 4; offset += 11) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(axis === "x" ? 4.9 : 0.2, 0.018, axis === "x" ? 0.2 : 4.9),
        roadMarkMaterial
      );
      marker.position.set(axis === "x" ? x + offset : x, groundY + 0.064, axis === "x" ? z : z + offset);
      group.add(marker);
    }
    [-1, 1].forEach((side) => {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(axis === "x" ? length : 0.2, 0.018, axis === "x" ? 0.2 : length),
        edgeLineMaterial
      );
      edge.position.set(
        axis === "x" ? x : x + side * (width / 2 - 0.75),
        groundY + 0.064,
        axis === "x" ? z + side * (width / 2 - 0.75) : z
      );
      group.add(edge);
    });
  };

  // A connected road hierarchy gives Drive Mode destinations rather than a
  // single strip of asphalt: highway, frontage streets, cross-links, and two
  // longer routes which lead toward the town and mountains.
  roadSpecs.forEach((road) => {
    addRoad(road.x, road.z, road.length, road.width, road.axis);
    addRoadMarkings(road.x, road.z, road.length, road.width, road.axis);
  });

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#554333", roughness: 0.96 });
  const foliageMaterials = ["#314b37", "#3d5c40", "#455d36"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true })
  );
  const homeMaterials = ["#b56d56", "#c0ae7d", "#7f9db0", "#a47e65", "#8a765f", "#91a79c", "#b28b76"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.84 })
  );
  const roofMaterials = ["#4a3d39", "#303942", "#62483c", "#595650", "#3f4d4a"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.92 })
  );
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: "#9fc8de",
    emissive: "#243b4c",
    emissiveIntensity: 0.22,
    roughness: 0.28,
  });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: "#fff0bd",
    emissive: "#ffc75e",
    emissiveIntensity: 1.2,
    roughness: 0.32,
  });
  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#50565b", roughness: 0.68, metalness: 0.42 });
  const mountainMaterials = ["#5b6d72", "#4f6261", "#46595c"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.98, flatShading: true })
  );
  const shrubMaterials = ["#2f4937", "#39543d", "#4b633e"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.96, flatShading: true })
  );
  const storefrontMaterials = ["#8f5b4e", "#b38a5b", "#557c8f"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
  );
  const signalHousingMaterial = new THREE.MeshStandardMaterial({ color: "#25292b", roughness: 0.6, metalness: 0.35 });
  const stopRedMaterial = new THREE.MeshStandardMaterial({ color: "#b62f29", roughness: 0.44, metalness: 0.14 });
  const signWhiteMaterial = new THREE.MeshStandardMaterial({ color: "#f4f0df", roughness: 0.48, metalness: 0.08 });
  const signalRedMaterial = new THREE.MeshStandardMaterial({ color: "#a01f1c", emissive: "#5a0805", emissiveIntensity: 0.4 });
  const signalAmberMaterial = new THREE.MeshStandardMaterial({ color: "#df9a2c", emissive: "#744006", emissiveIntensity: 0.45 });
  const signalGreenMaterial = new THREE.MeshStandardMaterial({ color: "#4fa45a", emissive: "#0f4d1e", emissiveIntensity: 0.42 });
  const drivewayMaterial = new THREE.MeshStandardMaterial({ color: "#57534e", roughness: 0.96 });
  const parkingMaterial = new THREE.MeshStandardMaterial({ color: "#383d3e", roughness: 0.94 });
  const parkingLineMaterial = new THREE.MeshBasicMaterial({ color: "#d9d5bd", transparent: true, opacity: 0.68 });
  const hedgeMaterial = new THREE.MeshStandardMaterial({ color: "#2b4533", roughness: 0.98, flatShading: true });
  const structureFootprints: StructureFootprint[] = [];
  const isNearStructure = (x: number, z: number, clearance: number) =>
    structureFootprints.some((structure) =>
      Math.abs(x - structure.x) < structure.width / 2 + clearance &&
      Math.abs(z - structure.z) < structure.depth / 2 + clearance
    );

  const addTree = (x: number, z: number, scale: number) => {
    const tree = new THREE.Group();
    tree.position.set(x, groundY, z);
    const variant = Math.abs(Math.round(x * 0.17 + z * 0.11)) % 3;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.66, 5.9 * scale, 7), trunkMaterial);
    trunk.position.y = 2.65 * scale;
    tree.add(trunk);
    const foliage = foliageMaterials[Math.abs(Math.round(x + z)) % foliageMaterials.length];
    if (variant === 0) {
      const lowerCrown = new THREE.Mesh(new THREE.ConeGeometry(3.25 * scale, 7.15 * scale, 7), foliage);
      lowerCrown.position.y = 6.25 * scale;
      const upperCrown = new THREE.Mesh(new THREE.ConeGeometry(2.38 * scale, 6 * scale, 7), foliage);
      upperCrown.position.y = 9.35 * scale;
      tree.add(lowerCrown, upperCrown);
    } else if (variant === 1) {
      [-1.65, 0, 1.65].forEach((offset, index) => {
        const crown = new THREE.Mesh(
          new THREE.DodecahedronGeometry((2.45 + (index % 2) * 0.4) * scale, 0),
          foliageMaterials[(Math.abs(Math.round(x + z + index))) % foliageMaterials.length]
        );
        crown.position.set(offset * scale, (7.2 + (index % 2) * 1.15) * scale, (index - 1) * 0.48 * scale);
        crown.scale.y = 1.25;
        tree.add(crown);
      });
    } else {
      const broadCrown = new THREE.Mesh(new THREE.ConeGeometry(4.1 * scale, 6.2 * scale, 8), foliage);
      broadCrown.position.y = 6.15 * scale;
      const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 * scale, 0), foliage);
      cap.position.y = 10.1 * scale;
      cap.scale.y = 1.18;
      tree.add(broadCrown, cap);
    }
    tree.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(tree);
  };

  // The old cone/cylinder roofs ignored the rectangular building footprint,
  // creating broad diamond shapes from the road. This mesh keeps every eave,
  // ridge, and gable edge locked to the wall below it.
  const createGableRoof = (
    width: number,
    depth: number,
    height: number,
    material: THREE.Material
  ) => {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const roof = new THREE.BufferGeometry();
    roof.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -halfWidth, 0, -halfDepth,
          halfWidth, 0, -halfDepth,
          halfWidth, 0, halfDepth,
          -halfWidth, 0, halfDepth,
          -halfWidth, height, 0,
          halfWidth, height, 0,
        ],
        3
      )
    );
    roof.setIndex([
      0, 4, 5, 0, 5, 1,
      3, 2, 5, 3, 5, 4,
      0, 3, 4,
      1, 5, 2,
    ]);
    roof.computeVertexNormals();
    return new THREE.Mesh(roof, material);
  };

  const addHouse = (
    x: number,
    z: number,
    width: number,
    depth: number,
    material: THREE.MeshStandardMaterial,
    heightScale = 1,
    variant = 0
  ) => {
    const home = new THREE.Group();
    home.position.set(x, groundY, z);
    const wallHeight = (16.5 + (variant % 3) * 1.8) * heightScale;
    const roofHeight = (4.15 + (variant % 2) * 0.9) * heightScale;
    const roofMaterial = roofMaterials[variant % roofMaterials.length];
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), material);
    wall.position.y = wallHeight / 2;
    home.add(wall);

    if (variant % 4 === 1) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.62, depth + 0.9), roofMaterial);
      roof.position.y = wallHeight + 0.31;
      const rooftopUnit = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.26, 0.92, depth * 0.18),
        roofMaterials[(variant + 1) % roofMaterials.length]
      );
      rooftopUnit.position.set(-width * 0.2, wallHeight + 0.77, 0);
      home.add(roof, rooftopUnit);
    } else {
      const ridgeRunsLengthwise = variant % 4 !== 3;
      const roof = createGableRoof(
        ridgeRunsLengthwise ? width + 1 : depth + 1,
        ridgeRunsLengthwise ? depth + 1 : width + 1,
        roofHeight,
        roofMaterial
      );
      roof.position.y = wallHeight;
      if (!ridgeRunsLengthwise) roof.rotation.y = Math.PI / 2;
      home.add(roof);

      if (variant % 4 === 2) {
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, roofHeight * 0.72, 1.25),
          roofMaterials[(variant + 2) % roofMaterials.length]
        );
        chimney.position.set(-width * 0.26, wallHeight + roofHeight * 0.72, 0);
        home.add(chimney);
      }
    }

    const roadFacingZ = z > 0 ? -1 : 1;
    const windowOffsets = variant % 3 === 0 ? [-width * 0.24, width * 0.24] : [-width * 0.3, 0, width * 0.3];
    windowOffsets.forEach((windowX) => {
      const window = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.4, 0.1), windowMaterial);
      window.position.set(windowX, wallHeight * 0.57, roadFacingZ * (depth / 2 + 0.06));
      home.add(window);
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6, 0.13), roofMaterial);
    door.position.set(0, 3.2 * heightScale, roadFacingZ * (depth / 2 + 0.08));
    home.add(door);
    if (variant % 3 === 1) {
      const garage = new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, wallHeight * 0.48, depth * 0.52), roofMaterials[(variant + 2) % roofMaterials.length]);
      garage.position.set(width * 0.36, wallHeight * 0.24, roadFacingZ * (depth * 0.26));
      home.add(garage);
    }
    structureFootprints.push({ x, z, width: width + (variant % 3 === 1 ? width * 0.24 : 0), depth });
    home.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(home);
  };

  const addStreetLight = (x: number, z: number) => {
    const light = new THREE.Group();
    light.position.set(x, groundY, z);
    const poleHeight = 23;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, poleHeight, 8), poleMaterial);
    pole.position.y = poleHeight / 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 5.2), poleMaterial);
    arm.position.set(0, poleHeight - 0.75, z > 0 ? -2.45 : 2.45);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 1.6), lampMaterial);
    fixture.position.set(0, poleHeight - 1.15, z > 0 ? -4.75 : 4.75);
    light.add(pole, arm, fixture);
    group.add(light);
  };

  const addShrub = (x: number, z: number, scale: number) => {
    const shrub = new THREE.Group();
    shrub.position.set(x, groundY, z);
    [-0.48, 0, 0.5].forEach((offset, index) => {
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry((0.8 + (index % 2) * 0.16) * scale, 0),
        shrubMaterials[(Math.abs(Math.round(x * 3 + z + index))) % shrubMaterials.length]
      );
      crown.position.set(offset * scale, 0.58 * scale + (index % 2) * 0.12, (index - 1) * 0.12 * scale);
      crown.scale.y = 0.76;
      shrub.add(crown);
    });
    shrub.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(shrub);
  };

  const addDriveway = (x: number, z: number, length: number, width: number, axis: RoadAxis) => {
    const driveway = addMesh(
      group,
      new THREE.Mesh(
        new THREE.BoxGeometry(axis === "x" ? length : width, 0.045, axis === "x" ? width : length),
        drivewayMaterial
      )
    );
    driveway.position.set(x, groundY + 0.028, z);
    return driveway;
  };

  const addParkingLot = (x: number, z: number, width: number, depth: number, spaces: number) => {
    const lot = addMesh(group, new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), parkingMaterial));
    lot.position.set(x, groundY + 0.028, z);

    for (let index = 0; index <= spaces; index += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, depth * 0.72), parkingLineMaterial);
      line.position.set(x - width / 2 + (index / spaces) * width, groundY + 0.06, z);
      group.add(line);
    }
  };

  const addHedge = (x: number, z: number, length: number, axis: RoadAxis) => {
    const hedge = addMesh(
      group,
      new THREE.Mesh(
        new THREE.BoxGeometry(axis === "x" ? length : 1.45, 1.65, axis === "x" ? 1.45 : length),
        hedgeMaterial
      )
    );
    hedge.position.set(x, groundY + 0.82, z);
  };

  // The distant ground cover is instanced rather than emitted as thousands of
  // standalone meshes. This makes a much denser scene inexpensive to render.
  const addInstancedShrubField = (count: number) => {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const instances = shrubMaterials.map((material) => new THREE.InstancedMesh(geometry, material, count));
    const cursors = shrubMaterials.map(() => 0);
    const dummy = new THREE.Object3D();

    for (let index = 0; index < count; index += 1) {
      const x = -650 + ((index * 83 + (index % 7) * 31) % 1300);
      const side = index % 2 === 0 ? -1 : 1;
      const z = side * (44 + ((index * 47 + (index % 11) * 13) % 430));
      if (isNearRoad(x, z, 15) || isNearStructure(x, z, 5)) continue;

      const materialIndex = Math.abs(Math.round(x + z)) % instances.length;
      const scale = 1.12 + (index % 6) * 0.18;
      dummy.position.set(x, groundY + scale * 0.5, z);
      dummy.rotation.set(0, index * 0.61, index * 0.13);
      dummy.scale.set(1.32 * scale, 0.78 * scale, scale);
      dummy.updateMatrix();
      instances[materialIndex].setMatrixAt(cursors[materialIndex], dummy.matrix);
      cursors[materialIndex] += 1;
    }

    instances.forEach((field, index) => {
      field.count = cursors[index];
      field.instanceMatrix.needsUpdate = true;
      field.castShadow = true;
      field.receiveShadow = true;
      group.add(field);
    });
  };

  const addApartmentBlock = (
    x: number,
    z: number,
    width: number,
    depth: number,
    floors: number,
    material: THREE.MeshStandardMaterial
  ) => {
    const building = new THREE.Group();
    building.position.set(x, groundY, z);
    const floorHeight = 4.15;
    const height = floors * floorHeight;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    wall.position.y = height / 2;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.2, 0.42, depth + 1.2),
      roofMaterials[Math.abs(Math.round(x + z)) % roofMaterials.length]
    );
    roof.position.y = height + 0.21;
    building.add(wall, roof);
    structureFootprints.push({ x, z, width, depth });
    for (let floor = 0; floor < floors; floor += 1) {
      [-0.27, 0, 0.27].forEach((offset) => {
        [-1, 1].forEach((side) => {
          const window = new THREE.Mesh(new THREE.BoxGeometry(4.25, 1.55, 0.11), windowMaterial);
          window.position.set(offset * width, floor * floorHeight + 2.1, side * (depth / 2 + 0.07));
          building.add(window);
        });
      });
    }
    building.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(building);
  };

  const addRoadsideStore = (x: number, z: number, width: number, depth: number, material: THREE.MeshStandardMaterial) => {
    const store = new THREE.Group();
    store.position.set(x, groundY, z);
    const wallHeight = 9.4;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), material);
    building.position.y = wallHeight / 2;
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.55, depth + 0.9), signalHousingMaterial);
    parapet.position.y = wallHeight + 0.28;
    const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.36, 1.25), stopRedMaterial);
    awning.position.set(0, 4.9, -depth / 2 - 0.62);
    const facade = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 2.45, 0.1), windowMaterial);
    facade.position.set(0, 3.05, -depth / 2 - 0.07);
    store.add(building, parapet, awning, facade);
    structureFootprints.push({ x, z, width, depth });
    store.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    group.add(store);
  };

  const addStopSign = (x: number, z: number, faceAlongX: boolean) => {
    const sign = new THREE.Group();
    sign.position.set(x, groundY, z);
    const poleHeight = 8.8;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, poleHeight, 10), poleMaterial);
    pole.position.y = poleHeight / 2;
    const signHead = new THREE.Group();
    signHead.position.y = poleHeight - 1.25;
    signHead.rotation.y = faceAlongX ? Math.PI / 2 : 0;
    const border = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.13, 8), signWhiteMaterial);
    border.rotation.x = Math.PI / 2;
    [-1, 1].forEach((side) => {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(1.39, 1.39, 0.16, 8), stopRedMaterial);
      face.rotation.x = Math.PI / 2;
      face.position.z = side * 0.09;
      signHead.add(face);
    });
    signHead.add(border);
    sign.add(pole, signHead);
    group.add(sign);
  };

  const addTrafficSignal = (
    x: number,
    z: number,
    mastAxis: RoadAxis,
    mastDirection: 1 | -1,
    faceAxis: RoadAxis,
    faceDirection: 1 | -1,
    phaseOffset: number
  ) => {
    const signal = new THREE.Group();
    signal.position.set(x, groundY, z);
    const poleHeight = 16.5;
    const armLength = 12;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, poleHeight, 10), signalHousingMaterial);
    pole.position.y = poleHeight / 2;
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(mastAxis === "x" ? armLength : 0.34, 0.36, mastAxis === "x" ? 0.34 : armLength),
      signalHousingMaterial
    );
    arm.position.set(
      mastAxis === "x" ? mastDirection * armLength / 2 : 0,
      poleHeight - 1.05,
      mastAxis === "z" ? mastDirection * armLength / 2 : 0
    );
    const head = new THREE.Group();
    head.position.set(
      mastAxis === "x" ? mastDirection * (armLength - 1.05) : 0,
      poleHeight - 3.45,
      mastAxis === "z" ? mastDirection * (armLength - 1.05) : 0
    );
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(faceAxis === "x" ? 1.1 : 1.78, 4.45, faceAxis === "x" ? 1.78 : 1.1),
      signalHousingMaterial
    );
    head.add(housing);
    [signalRedMaterial, signalAmberMaterial, signalGreenMaterial].forEach((material, index) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 12), material);
      const lensMaterial = material.clone();
      lamp.material = lensMaterial;
      lamp.position.set(
        faceAxis === "x" ? faceDirection * 0.61 : 0,
        1.28 - index * 1.28,
        faceAxis === "z" ? faceDirection * 0.61 : 0
      );
      // One lamp is active at a time. The phase offset keeps intersecting
      // directions complementary instead of lighting the whole town together.
      lamp.onBeforeRender = () => {
        const cycleTime = (performance.now() / 1000 + phaseOffset) % 12;
        const activeLamp = cycleTime < 5 ? 2 : cycleTime < 7 ? 1 : 0;
        lensMaterial.emissiveIntensity = activeLamp === index ? 1.5 : 0.04;
      };
      head.add(lamp);
    });
    signal.add(pole, arm, head);
    group.add(signal);
  };

  const addMountainRange = (z: number, direction: number) => {
    for (let index = 0; index < 14; index += 1) {
      const x = -650 + index * 100 + (index % 2) * 24;
      const radius = 52 + (index % 4) * 13;
      const height = 54 + ((index * 17) % 46);
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 7),
        mountainMaterials[index % mountainMaterials.length]
      );
      mountain.position.set(x, groundY + height / 2 - 2, z + direction * ((index % 3) * 12));
      mountain.rotation.y = index * 0.48;
      mountain.receiveShadow = true;
      group.add(mountain);
    }
  };

  // The layered peaks sit well beyond the road network, making the horizon
  // read as a real valley without colliding with the drivable foreground.
  addMountainRange(470, 1);
  addMountainRange(-470, -1);

  // A dense but road-safe residential grid makes the proving ground feel like
  // a destination. Every lot owns a driveway, hedges, and a clear setback from
  // the nearest carriageway rather than floating scenery around the roads.
  const residentialLots = [
    [-520, 215, 38, 32], [-448, 215, 42, 34], [-370, 215, 36, 30], [-280, 215, 44, 34],
    [-196, 215, 40, 32], [-112, 215, 36, 30], [12, 215, 42, 34], [102, 215, 38, 32],
    [316, 215, 44, 34], [404, 215, 38, 32], [574, 215, 40, 34],
    [-512, -215, 40, 32], [-430, -215, 36, 30], [-245, -215, 42, 34], [-154, -215, 38, 32],
    [-76, -215, 44, 34], [38, -215, 38, 32], [140, -215, 36, 30], [310, -215, 42, 34],
    [400, -215, 38, 32], [568, -215, 44, 34],
    [-548, 352, 42, 34], [-405, 352, 38, 32], [-282, 352, 44, 34], [-120, 352, 40, 32],
    [142, 352, 42, 34], [246, 352, 38, 32], [385, 352, 44, 34],
    [-550, -360, 44, 34], [-410, -360, 40, 32], [-288, -360, 38, 32], [-54, -360, 42, 34],
    [122, -360, 38, 32], [264, -360, 44, 34], [382, -360, 40, 32],
  ] as const;
  residentialLots.forEach(([x, z, width, depth], index) => {
    addHouse(x, z, width, depth, homeMaterials[index % homeMaterials.length], 1, index);
    const towardRoad = z > 0 ? -1 : 1;
    const drivewayLength = Math.abs(z) < 300 ? 20 : 24;
    const drivewayZ = z + towardRoad * (depth / 2 + drivewayLength / 2 + 8);
    addDriveway(x, drivewayZ, drivewayLength, 6.6, "z");
    addHedge(x - width / 2 - 3.2, z, depth + 7, "z");
    addHedge(x + width / 2 + 3.2, z, depth + 7, "z");
    addHedge(x, z - towardRoad * (depth / 2 + 4), width + 7, "x");
  });

  // These large frontage homes sit in the wide strip between the main road
  // and its frontage streets. They keep the near camera view populated, with
  // building height and mass that read against the full-size SUV.
  const frontageLots = [
    [-500, 78, 48, 28], [-410, 78, 42, 26], [-260, 78, 48, 28], [-160, 78, 44, 26],
    [78, 78, 48, 28], [168, 78, 42, 26], [338, 78, 48, 28], [430, 78, 42, 26], [580, 78, 48, 28],
    [-500, -78, 48, 28], [-410, -78, 42, 26], [-260, -78, 48, 28], [-160, -78, 44, 26],
    [78, -78, 48, 28], [168, -78, 42, 26], [338, -78, 48, 28], [430, -78, 42, 26], [580, -78, 48, 28],
  ] as const;
  frontageLots.forEach(([x, z, width, depth], index) => {
    addHouse(x, z, width, depth, homeMaterials[(index + 2) % homeMaterials.length], 1.28, index + 3);
    const towardMainRoad = z > 0 ? -1 : 1;
    const drivewayLength = 32;
    addDriveway(x, z + towardMainRoad * (depth / 2 + drivewayLength / 2 + 3), drivewayLength, 7.2, "z");
    addHedge(x - width / 2 - 3.5, z, depth + 8, "z");
    addHedge(x + width / 2 + 3.5, z, depth + 8, "z");
  });

  // Larger non-residential lots break up the housing with real destinations:
  // parking aprons and storefronts attached to the connected road hierarchy.
  addApartmentBlock(-480, 350, 56, 40, 4, storefrontMaterials[2]);
  addParkingLot(-480, 313, 68, 20, 8);
  addApartmentBlock(8, 365, 50, 36, 5, storefrontMaterials[0]);
  addParkingLot(8, 329, 62, 18, 7);
  addApartmentBlock(455, -360, 62, 42, 3, storefrontMaterials[1]);
  addParkingLot(455, -321, 74, 20, 9);
  addApartmentBlock(-575, -385, 58, 38, 4, storefrontMaterials[0]);
  addParkingLot(-575, -347, 70, 20, 8);
  addApartmentBlock(120, -386, 54, 40, 4, storefrontMaterials[2]);
  addParkingLot(120, -349, 66, 18, 8);
  addRoadsideStore(-175, -350, 48, 32, storefrontMaterials[1]);
  addParkingLot(-175, -316, 60, 18, 7);
  addRoadsideStore(305, 350, 54, 34, storefrontMaterials[0]);
  addParkingLot(305, 315, 66, 18, 8);
  addRoadsideStore(-300, 390, 50, 34, storefrontMaterials[2]);
  addParkingLot(-300, 357, 62, 16, 7);
  addRoadsideStore(560, 382, 50, 32, storefrontMaterials[1]);
  addParkingLot(560, 350, 62, 16, 7);

  connectorXs.forEach((x, index) => {
    const signOffset = mainRoadWidth / 2 + 4.5;
    addStopSign(x - signOffset, -signOffset, true);
    addStopSign(x + signOffset, signOffset, true);
    if (index === 1 || index === 2) {
      // Main-road mast arms span across a lane (Z) while their lenses face
      // approaching traffic on the X axis. The cross-road pair does the
      // inverse. These are deliberately separate axes rather than a single
      // rotation flag so the signal heads cannot hang sideways.
      addTrafficSignal(x - signOffset, -signOffset, "z", 1, "x", -1, 0);
      addTrafficSignal(x + signOffset, signOffset, "z", -1, "x", 1, 6);
      addTrafficSignal(x - signOffset, signOffset, "x", 1, "z", 1, 6);
      addTrafficSignal(x + signOffset, -signOffset, "x", -1, "z", -1, 0);
    }
  });

  for (let index = 0; index < 210; index += 1) {
    const x = -560 + ((index * 59) % 1160);
    const side = index % 2 === 0 ? -1 : 1;
    let z = side * (58 + ((index * 37) % 282));
    if (Math.abs(Math.abs(z) - 142) < 48 || Math.abs(Math.abs(z) - 270) < 48) z += side * 64;
    if (!isNearRoad(x, z, 18) && !isNearStructure(x, z, 13)) {
      addTree(x, z, 3.1 + (index % 5) * 0.28);
    }
  }
  for (let index = 0; index < 260; index += 1) {
    const x = -560 + ((index * 43) % 1150);
    const side = index % 2 === 0 ? -1 : 1;
    const z = side * (46 + ((index * 29) % 350));
    if (!isNearRoad(x, z, 12) && !isNearStructure(x, z, 4)) {
      addShrub(x, z, 1.18 + (index % 4) * 0.2);
    }
  }
  addInstancedShrubField(760);
  // Alternate sides rather than lining both road edges with a dense row of
  // low poles. The taller, staggered spacing reads like a real arterial.
  for (let x = -500; x <= 600; x += 118) {
    addStreetLight(x, -(mainRoadWidth / 2 + 4));
    addStreetLight(x + 58, mainRoadWidth / 2 + 4);
  }

  const rockMaterial = new THREE.MeshStandardMaterial({ color: "#5d6257", roughness: 0.92, flatShading: true });
  for (let index = 0; index < 180; index += 1) {
    const x = -560 + ((index * 67) % 1160);
    const side = index % 2 === 0 ? -1 : 1;
    const z = side * (58 + ((index * 31) % 360));
    if (isNearRoad(x, z, 11) || isNearStructure(x, z, 3)) continue;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.7 + (index % 5) * 0.38, 0), rockMaterial);
    rock.position.set(x, groundY + 0.78, z);
    rock.rotation.set(index * 0.4, index * 0.7, index * 0.2);
    rock.scale.y = 0.7;
    addMesh(group, rock);
  }

  const postMaterial = new THREE.MeshStandardMaterial({ color: "#d9c66f", roughness: 0.55, metalness: 0.24 });
  for (let x = -540; x <= 650; x += 20) {
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.15, 8), postMaterial);
      post.position.set(x, groundY + 1.07, side * (mainRoadWidth / 2 + 3));
      addMesh(group, post);
    });
  }

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(720, 720, 3.2, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: "#8ea4af", side: THREE.BackSide, transparent: true, opacity: 0.32 })
  );
  horizon.position.y = groundY - 0.45;
  group.add(horizon);

  const sun = new THREE.DirectionalLight("#fff0c6", 4.8);
  sun.position.set(-28, 34, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.bias = -0.0002;
  scene.add(sun);

  const sky = new THREE.HemisphereLight("#9cc6e4", "#283224", 2.7);
  scene.add(sky);

  return {
    group,
    lights: [sun, sky],
    setVisible(visible) {
      group.visible = visible;
      sun.visible = visible;
      sky.visible = visible;
    },
    dispose() {
      group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      scene.remove(group, sun, sky);
    },
  };
}
