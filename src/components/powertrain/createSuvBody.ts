import * as THREE from "three";
import { suvBodyLayout, vehicleLayout } from "./layout";
import { cylinder, createRoadWheel, createSuspensionLink } from "./geometry";

type CutawayMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export type CreateSuvBodyOptions = {
  assembly: THREE.Group;
  metal: THREE.Material;
  darkMetal: THREE.Material;
  tireMaterial: THREE.Material;
  brakeRotorMaterial: THREE.Material;
  caliperMaterial: THREE.Material;
  registerCutawayMaterial: (material: CutawayMaterial, cutawayOpacity: number) => void;
};

export type SuvBodyAssembly = {
  suvBody: THREE.Group;
  bodyShell: THREE.Group;
  tailLightMaterial: THREE.MeshStandardMaterial;
};

export function createSuvBody({
  assembly,
  metal,
  darkMetal,
  tireMaterial,
  brakeRotorMaterial,
  caliperMaterial,
  registerCutawayMaterial,
}: CreateSuvBodyOptions): SuvBodyAssembly {
    // The exterior uses a continuous side sheet with stamped wheel openings.
    // Keeping the cutouts in the sheet avoids decorative rings, discs, and
    // detached fender blocks fighting the actual wheel geometry.
    const suvBody = new THREE.Group();
    assembly.add(suvBody);
    const bodyShell = new THREE.Group();
    suvBody.add(bodyShell);
    const bodyShellMaterial = new THREE.MeshPhysicalMaterial({
      color: "#52759b",
      metalness: 0.46,
      roughness: 0.23,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    registerCutawayMaterial(bodyShellMaterial, 0.1);
    const bodyPaintMaterial = new THREE.MeshStandardMaterial({
      color: "#385773",
      metalness: 0.73,
      roughness: 0.22,
      transparent: true,
      opacity: 0.76,
      side: THREE.DoubleSide,
    });
    registerCutawayMaterial(bodyPaintMaterial, 0.16);
    const bodyTrimMaterial = new THREE.MeshStandardMaterial({
      color: "#151a21",
      metalness: 0.66,
      roughness: 0.3,
    });
    const mirrorHousingMaterial = new THREE.MeshStandardMaterial({
      color: "#24364d",
      metalness: 0.7,
      roughness: 0.2,
    });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: "#2a4d6f",
      metalness: 0.08,
      roughness: 0.08,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    registerCutawayMaterial(glassMaterial, 0.1);
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: "#e6f5ff",
      emissive: "#a8ddff",
      emissiveIntensity: 2.2,
      metalness: 0.22,
      roughness: 0.16,
    });
    const tailLightMaterial = new THREE.MeshStandardMaterial({
      color: "#d33536",
      emissive: "#8f060a",
      emissiveIntensity: 1.55,
      metalness: 0.3,
      roughness: 0.2,
    });
    const lampHousingMaterial = new THREE.MeshStandardMaterial({
      color: "#18212e",
      metalness: 0.72,
      roughness: 0.24,
    });

    const bodyHalfWidth = suvBodyLayout.bodyWidth * 0.5;
    const roundedRect = (width: number, height: number, radius: number) => {
      const shape = new THREE.Shape();
      const left = -width * 0.5;
      const right = width * 0.5;
      const bottom = -height * 0.5;
      const top = height * 0.5;
      shape.moveTo(left + radius, bottom);
      shape.lineTo(right - radius, bottom);
      shape.quadraticCurveTo(right, bottom, right, bottom + radius);
      shape.lineTo(right, top - radius);
      shape.quadraticCurveTo(right, top, right - radius, top);
      shape.lineTo(left + radius, top);
      shape.quadraticCurveTo(left, top, left, top - radius);
      shape.lineTo(left, bottom + radius);
      shape.quadraticCurveTo(left, bottom, left + radius, bottom);
      return shape;
    };
    const mirrorShellGeometry = new THREE.ExtrudeGeometry(
      roundedRect(1.08, 0.58, 0.18),
      { depth: 0.5, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }
    );
    const mirrorGlassGeometry = new THREE.ShapeGeometry(roundedRect(0.84, 0.4, 0.12));
    // Keep the lower sheetmetal below the visible chassis rails. The openings
    // remain defined from the same axle centers, so lowering the sill cannot
    // intrude into the tires.
    const sillY = -1.58;
    const archRadius = suvBodyLayout.wheelArchRadius;
    const archRiseAtSill = sillY - vehicleLayout.wheelCenterY;
    const archStartAngle = Math.asin(archRiseAtSill / archRadius);
    const archHalfSpan = Math.cos(archStartAngle) * archRadius;
    // Every visible exterior edge below is driven by these same body anchors.
    // This is deliberately a shared profile: body shell, glazing, pillars and
    // cross-car roof/windscreen panels cannot drift apart independently.
    const suvProfile = {
      // The nose and A-pillar use a deliberately steep inset. This is the
      // main side silhouette change: the upper front moves rearward as it
      // rises rather than continuing the vertical lower fender plane.
      hoodFront: new THREE.Vector2(-8.12, 2.28),
      hoodRear: new THREE.Vector2(-3.54, 2.42),
      windshieldBase: new THREE.Vector2(-3.48, suvBodyLayout.greenhouseBaseY),
      windshieldTop: new THREE.Vector2(-1.04, suvBodyLayout.greenhouseTopY),
      // Retain a usable cargo window but make it roughly half the former span.
      roofRear: new THREE.Vector2(vehicleLayout.rearAxleX + 0.56, suvBodyLayout.greenhouseTopY),
      rearGlassBase: new THREE.Vector2(vehicleLayout.rearAxleX + 2.22, suvBodyLayout.greenhouseBaseY),
    };
    const rearLiftgateX = vehicleLayout.rearAxleX + 2.46;
    const rearBodyEndX = vehicleLayout.rearAxleX + 2.66;
    const lowerShoulderY = suvBodyLayout.beltlineY;
    const upperBodyHalfWidth = suvBodyLayout.greenhouseSideZ;
    const upperBodyWidth = upperBodyHalfWidth * 2;

    const bodySideProfile = new THREE.Shape();
    bodySideProfile.moveTo(-9.0, sillY);
    bodySideProfile.lineTo(-8.96, 0.62);
    bodySideProfile.quadraticCurveTo(-8.84, 1.2, -8.48, 1.62);
    bodySideProfile.quadraticCurveTo(-8.28, 1.98, suvProfile.hoodFront.x, suvProfile.hoodFront.y);
    bodySideProfile.lineTo(suvProfile.hoodRear.x, suvProfile.hoodRear.y);
    // The outer shell stops at the shoulder. The greenhouse is deliberately
    // inset above it, producing a real SUV tumblehome instead of a tall box.
    bodySideProfile.lineTo(suvProfile.windshieldBase.x, lowerShoulderY);
    bodySideProfile.lineTo(suvProfile.rearGlassBase.x, lowerShoulderY);
    // The rear quarter rolls down into the wheel opening instead of ending
    // as a flat rectangular tail panel next to a curved arch.
    bodySideProfile.quadraticCurveTo(rearBodyEndX - 0.22, 2.34, rearBodyEndX - 0.08, 1.76);
    bodySideProfile.quadraticCurveTo(rearBodyEndX + 0.08, 0.88, rearBodyEndX, 0.02);
    bodySideProfile.quadraticCurveTo(
      rearBodyEndX - 0.02,
      -0.7,
      vehicleLayout.rearAxleX + archHalfSpan,
      sillY
    );
    bodySideProfile.absarc(
      vehicleLayout.rearAxleX,
      vehicleLayout.wheelCenterY,
      archRadius,
      archStartAngle,
      Math.PI - archStartAngle,
      false
    );
    bodySideProfile.lineTo(vehicleLayout.frontAxleX + archHalfSpan, sillY);
    bodySideProfile.absarc(
      vehicleLayout.frontAxleX,
      vehicleLayout.wheelCenterY,
      archRadius,
      archStartAngle,
      Math.PI - archStartAngle,
      false
    );
    bodySideProfile.lineTo(-9.0, sillY);
    bodySideProfile.closePath();
    const bodySideGeometry = new THREE.ExtrudeGeometry(bodySideProfile, {
      depth: 0.13,
      bevelEnabled: false,
    });
    [-1, 1].forEach((side) => {
      const panel = new THREE.Mesh(bodySideGeometry, bodyShellMaterial);
      panel.position.z = side * suvBodyLayout.shellSideZ;
      panel.scale.z = side;
      bodyShell.add(panel);
    });

    const createQuadPanel = (
      points: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
      material: THREE.Material
    ) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          points.flatMap((point) => [point.x, point.y, point.z]),
          3
        )
      );
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, material);
    };

    // These stamped shoulder panels are the physical transition from the wide
    // lower body to the narrower glasshouse; they close the former open gap.
    [-1, 1].forEach((side) => {
      bodyShell.add(
        createQuadPanel(
          [
            new THREE.Vector3(suvProfile.windshieldBase.x, lowerShoulderY, side * suvBodyLayout.shellSideZ),
            new THREE.Vector3(suvProfile.rearGlassBase.x, lowerShoulderY, side * suvBodyLayout.shellSideZ),
            new THREE.Vector3(suvProfile.rearGlassBase.x, suvBodyLayout.greenhouseBaseY, side * upperBodyHalfWidth),
            new THREE.Vector3(suvProfile.windshieldBase.x, suvBodyLayout.greenhouseBaseY, side * upperBodyHalfWidth),
          ],
          bodyPaintMaterial
        )
      );
    });
    // Cross-car cowl and tailgate shoulders seal the taper at both ends.
    bodyShell.add(
      createQuadPanel(
        [
          new THREE.Vector3(suvProfile.hoodRear.x, suvProfile.hoodRear.y, -bodyHalfWidth),
          new THREE.Vector3(suvProfile.hoodRear.x, suvProfile.hoodRear.y, bodyHalfWidth),
          new THREE.Vector3(suvProfile.windshieldBase.x, suvProfile.windshieldBase.y, upperBodyHalfWidth),
          new THREE.Vector3(suvProfile.windshieldBase.x, suvProfile.windshieldBase.y, -upperBodyHalfWidth),
        ],
        bodyPaintMaterial
      )
    );
    bodyShell.add(
      createQuadPanel(
        [
          new THREE.Vector3(suvProfile.rearGlassBase.x, lowerShoulderY, -bodyHalfWidth),
          new THREE.Vector3(suvProfile.rearGlassBase.x, lowerShoulderY, bodyHalfWidth),
          new THREE.Vector3(suvProfile.rearGlassBase.x, suvProfile.rearGlassBase.y, upperBodyHalfWidth),
          new THREE.Vector3(suvProfile.rearGlassBase.x, suvProfile.rearGlassBase.y, -upperBodyHalfWidth),
        ],
        bodyPaintMaterial
      )
    );

    const sideStepStart = vehicleLayout.frontAxleX + archHalfSpan + 0.28;
    const sideStepEnd = vehicleLayout.rearAxleX - archHalfSpan - 0.28;
    const sideStepLength = sideStepEnd - sideStepStart;
    // A recessed, matte undertray closes the center without becoming a bright
    // shelf beside the rear wheel or crossing into either tire opening.
    const bellyPan = new THREE.Mesh(
      new THREE.BoxGeometry(sideStepLength - 0.62, 0.1, suvBodyLayout.bodyWidth - 1.12),
      bodyTrimMaterial
    );
    bellyPan.position.set((sideStepStart + sideStepEnd) * 0.5, -1.9, 0);
    bodyShell.add(bellyPan);

    // Cross-car panels bridge the two shared side profiles at their exact
    // edges, so the roof and hood now meet the glazing instead of floating.
    const hoodLength = suvProfile.hoodRear.distanceTo(suvProfile.hoodFront);
    const hoodCenter = suvProfile.hoodFront.clone().add(suvProfile.hoodRear).multiplyScalar(0.5);
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(hoodLength, 0.14, suvBodyLayout.bodyWidth - 0.22),
      bodyPaintMaterial
    );
    hood.position.set(hoodCenter.x, hoodCenter.y, 0);
    hood.rotation.z = Math.atan2(
      suvProfile.hoodRear.y - suvProfile.hoodFront.y,
      suvProfile.hoodRear.x - suvProfile.hoodFront.x
    );
    bodyShell.add(hood);
    const hoodCrease = new THREE.Mesh(new THREE.BoxGeometry(hoodLength - 0.82, 0.04, 0.1), metal);
    hoodCrease.position.set(hoodCenter.x, hoodCenter.y + 0.09, 0);
    hoodCrease.rotation.z = hood.rotation.z;
    bodyShell.add(hoodCrease);
    const roofLength = suvProfile.roofRear.x - suvProfile.windshieldTop.x;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(roofLength, 0.18, upperBodyWidth - 0.18),
      bodyPaintMaterial
    );
    roof.position.set(
      (suvProfile.windshieldTop.x + suvProfile.roofRear.x) * 0.5,
      suvProfile.windshieldTop.y,
      0
    );
    bodyShell.add(roof);
    const roofSpoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.12, upperBodyWidth - 0.34),
      bodyTrimMaterial
    );
    roofSpoiler.position.set(suvProfile.roofRear.x + 0.12, suvProfile.roofRear.y - 0.1, 0);
    roofSpoiler.rotation.z = 0;
    bodyShell.add(roofSpoiler);

    // One continuous greenhouse panel prevents gaps between separately drawn
    // windows; pillars and seams sit on top of this solid glazing layer.
    const greenhouseShape = new THREE.Shape();
    greenhouseShape.moveTo(suvProfile.windshieldBase.x, suvProfile.windshieldBase.y);
    greenhouseShape.lineTo(suvProfile.windshieldTop.x, suvProfile.windshieldTop.y);
    greenhouseShape.lineTo(suvProfile.roofRear.x, suvProfile.roofRear.y);
    greenhouseShape.lineTo(suvProfile.rearGlassBase.x, suvProfile.rearGlassBase.y);
    greenhouseShape.closePath();
    const greenhouseGeometry = new THREE.ShapeGeometry(greenhouseShape);
    const createPillar = (from: THREE.Vector2, to: THREE.Vector2, side: number) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, from.distanceTo(to) + 0.16, 0.13),
        bodyTrimMaterial
      );
      pillar.position.set(
        (from.x + to.x) * 0.5,
        (from.y + to.y) * 0.5,
        side * (upperBodyHalfWidth + 0.17)
      );
      pillar.rotation.z = -Math.atan2(to.x - from.x, to.y - from.y);
      return pillar;
    };
    // The beltline follows the current body envelope. It used to retain the
    // pre-shortened SUV length and visibly poked through the rear corner.
    const beltlineStartX = suvProfile.windshieldBase.x - 0.08;
    const beltlineEndX = rearBodyEndX - 0.16;
    const beltlineLength = beltlineEndX - beltlineStartX;
    [-1, 1].forEach((side) => {
      const greenhouse = new THREE.Mesh(greenhouseGeometry, glassMaterial);
      greenhouse.position.z = side * (upperBodyHalfWidth + 0.12);
      bodyShell.add(greenhouse);

      bodyShell.add(createPillar(suvProfile.windshieldBase, suvProfile.windshieldTop, side));
      bodyShell.add(
        createPillar(
          new THREE.Vector2(1.84, suvBodyLayout.greenhouseBaseY),
          new THREE.Vector2(1.84, suvBodyLayout.greenhouseTopY),
          side
        )
      );
      bodyShell.add(
        createPillar(
          new THREE.Vector2(6.62, suvBodyLayout.greenhouseBaseY),
          new THREE.Vector2(6.62, suvBodyLayout.greenhouseTopY),
          side
        )
      );
      bodyShell.add(createPillar(suvProfile.rearGlassBase, suvProfile.roofRear, side));
      const beltline = new THREE.Mesh(
        new THREE.BoxGeometry(beltlineLength, 0.12, 0.12),
        bodyTrimMaterial
      );
      beltline.position.set(
        (beltlineStartX + beltlineEndX) * 0.5,
        suvBodyLayout.beltlineY,
        side * (suvBodyLayout.shellSideZ + 0.17)
      );
      bodyShell.add(beltline);
      // This is a two-door SUV: one long front door and one rear door per
      // side. Keep both the handles and the single B-pillar seam driven by
      // that layout so an extra phantom door cannot reappear.
      [-1.08, 6.42].forEach((x) => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.065, 0.09), metal);
        handle.position.set(x, 2.15, side * (suvBodyLayout.shellSideZ + 0.2));
        bodyShell.add(handle);
      });
      [2.36].forEach((x) => {
        const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.62, 0.04), bodyTrimMaterial);
        doorSeam.position.set(x, 0.84, side * (suvBodyLayout.shellSideZ + 0.16));
        bodyShell.add(doorSeam);
      });

    });

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.1,
        suvProfile.windshieldBase.distanceTo(suvProfile.windshieldTop),
        upperBodyWidth - 0.18
      ),
      glassMaterial
    );
    windshield.position.set(
      (suvProfile.windshieldBase.x + suvProfile.windshieldTop.x) * 0.5,
      (suvProfile.windshieldBase.y + suvProfile.windshieldTop.y) * 0.5,
      0
    );
    windshield.rotation.z = -Math.atan2(
      suvProfile.windshieldTop.x - suvProfile.windshieldBase.x,
      suvProfile.windshieldTop.y - suvProfile.windshieldBase.y
    );
    bodyShell.add(windshield);
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(
        0.1,
        suvProfile.rearGlassBase.distanceTo(suvProfile.roofRear),
        upperBodyWidth - 0.18
      ),
      glassMaterial
    );
    rearGlass.position.set(
      (suvProfile.rearGlassBase.x + suvProfile.roofRear.x) * 0.5,
      (suvProfile.rearGlassBase.y + suvProfile.roofRear.y) * 0.5,
      0
    );
    rearGlass.rotation.z = -Math.atan2(
      suvProfile.roofRear.x - suvProfile.rearGlassBase.x,
      suvProfile.roofRear.y - suvProfile.rearGlassBase.y
    );
    bodyShell.add(rearGlass);

    const roofRackY = suvProfile.roofRear.y + 0.42;
    const roofRailZ = upperBodyHalfWidth - 0.24;
    const roofRackStartX = suvProfile.windshieldTop.x + 0.22;
    const roofRackEndX = suvProfile.roofRear.x + 0.1;
    [-1, 1].forEach((side) => {
      const rail = createSuspensionLink(
        new THREE.Vector3(
          roofRackStartX,
          roofRackY,
          side * roofRailZ
        ),
        new THREE.Vector3(
          roofRackEndX,
          roofRackY,
          side * roofRailZ
        ),
        0.1,
        bodyTrimMaterial
      );
      bodyShell.add(rail);
      [roofRackStartX + 1.05, roofRackEndX - 0.9].forEach((x) => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.28), bodyTrimMaterial);
        foot.position.set(x, suvProfile.roofRear.y + 0.18, side * roofRailZ);
        bodyShell.add(foot);
      });
      const mirrorStalk = createSuspensionLink(
        new THREE.Vector3(-3.04, 2.9, side * (upperBodyHalfWidth + 0.06)),
        new THREE.Vector3(-3.05, 3.06, side * (upperBodyHalfWidth + 0.6)),
        0.075,
        bodyTrimMaterial
      );
      bodyShell.add(mirrorStalk);
      const mirror = new THREE.Mesh(mirrorShellGeometry, mirrorHousingMaterial);
      mirror.position.set(-3.3, 3.08, side * (upperBodyHalfWidth + 0.76));
      // The shell is a Y/Z pod and its reflective surface faces rearward,
      // rather than presenting a sideways disk to the camera.
      mirror.rotation.y = Math.PI * 0.5;
      mirror.scale.x = side;
      bodyShell.add(mirror);
      const mirrorGlass = new THREE.Mesh(mirrorGlassGeometry, glassMaterial);
      mirrorGlass.position.set(-2.76, 3.08, side * (upperBodyHalfWidth + 0.76));
      mirrorGlass.rotation.y = Math.PI * 0.5;
      mirrorGlass.scale.x = side;
      bodyShell.add(mirrorGlass);
    });
    // A real rack has two raised side rails and crossbars, all mounted to the
    // roof at known feet rather than floating decorative lines.
    [
      roofRackStartX + 0.65,
      (roofRackStartX + roofRackEndX) * 0.5,
      roofRackEndX - 0.65,
    ].forEach((x) => {
      const crossbar = createSuspensionLink(
        new THREE.Vector3(x, roofRackY, -(roofRailZ + 0.28)),
        new THREE.Vector3(x, roofRackY, roofRailZ + 0.28),
        0.075,
        bodyTrimMaterial
      );
      bodyShell.add(crossbar);
    });
    // Give the rack a useful, visibly mounted load: a low expedition cargo
    // case on a tray, retained by two cross straps rather than floating above
    // the roof rails.
    const roofCargoTray = new THREE.Mesh(
      new THREE.BoxGeometry(7.65, 0.1, upperBodyWidth - 1.02),
      bodyTrimMaterial
    );
    roofCargoTray.position.set((roofRackStartX + roofRackEndX) * 0.5, roofRackY + 0.12, 0);
    bodyShell.add(roofCargoTray);
    const roofCargoCase = new THREE.Mesh(
      new THREE.BoxGeometry(5.75, 0.42, upperBodyWidth - 2.35),
      darkMetal
    );
    roofCargoCase.position.set((roofRackStartX + roofRackEndX) * 0.5, roofRackY + 0.37, -0.18);
    bodyShell.add(roofCargoCase);
    const roofCargoLid = new THREE.Mesh(
      new THREE.BoxGeometry(5.56, 0.055, upperBodyWidth - 2.55),
      metal
    );
    roofCargoLid.position.set((roofRackStartX + roofRackEndX) * 0.5, roofRackY + 0.61, -0.18);
    bodyShell.add(roofCargoLid);
    [
      (roofRackStartX + roofRackEndX) * 0.5 - 1.65,
      (roofRackStartX + roofRackEndX) * 0.5 + 1.65,
    ].forEach((x) => {
      const cargoStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.065, upperBodyWidth - 2.02),
        bodyPaintMaterial
      );
      cargoStrap.position.set(x, roofRackY + 0.65, -0.18);
      bodyShell.add(cargoStrap);
    });

    const frontFascia = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.84, suvBodyLayout.bodyWidth - 0.3),
      bodyShellMaterial
    );
    frontFascia.position.set(-8.98, 0.38, 0);
    bodyShell.add(frontFascia);
    // The upper nose is a continuous, raked panel from the upright grille to
    // the hood. This removes the old flat wall at the front of the vehicle.
    bodyShell.add(
      createQuadPanel(
        [
          new THREE.Vector3(-9.06, 1.28, -bodyHalfWidth),
          new THREE.Vector3(-9.06, 1.28, bodyHalfWidth),
          new THREE.Vector3(suvProfile.hoodFront.x, suvProfile.hoodFront.y, bodyHalfWidth),
          new THREE.Vector3(suvProfile.hoodFront.x, suvProfile.hoodFront.y, -bodyHalfWidth),
        ],
        bodyPaintMaterial
      )
    );
    const grilleFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.12, suvBodyLayout.bodyWidth - 3.7),
      bodyTrimMaterial
    );
    grilleFrame.position.set(-9.1, 0.72, 0);
    bodyShell.add(grilleFrame);
    [-0.38, -0.13, 0.12, 0.37].forEach((y) => {
      const grilleSlat = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, suvBodyLayout.bodyWidth - 4.28),
        metal
      );
      grilleSlat.position.set(-9.2, y + 0.72, 0);
      bodyShell.add(grilleSlat);
    });
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.46, suvBodyLayout.bodyWidth + 0.08),
      bodyTrimMaterial
    );
    frontBumper.position.set(-8.98, -0.24, 0);
    bodyShell.add(frontBumper);
    // Close the front below the bumper. The former grille ended above the
    // suspension, leaving a large empty rectangle when the car was viewed
    // head-on. This valance and undertray now form one continuous lower nose.
    const lowerValance = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.25, suvBodyLayout.bodyWidth - 0.58),
      bodyPaintMaterial
    );
    lowerValance.position.set(-8.9, -1.16, 0);
    bodyShell.add(lowerValance);
    const lowerIntake = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.34, 5.7),
      bodyTrimMaterial
    );
    lowerIntake.position.set(-9.06, -1.15, 0);
    bodyShell.add(lowerIntake);
    const frontSkidPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.16, suvBodyLayout.bodyWidth - 1.48),
      metal
    );
    frontSkidPlate.position.set(-9.12, -1.78, 0);
    bodyShell.add(frontSkidPlate);
    const frontUndertray = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.16, suvBodyLayout.bodyWidth - 0.8),
      bodyTrimMaterial
    );
    frontUndertray.position.set(-7.72, -1.82, 0);
    bodyShell.add(frontUndertray);
    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.42, suvBodyLayout.bodyWidth + 0.04),
      bodyTrimMaterial
    );
    rearBumper.position.set(rearLiftgateX - 0.02, -0.24, 0);
    bodyShell.add(rearBumper);
    // Continue the tailgate down behind the bumper. This closes the empty
    // rear underside while retaining a full tire-radius clearance envelope.
    // It sits aft of the rear axle instead of clipping through the rear tire.
    const rearLowerValance = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 1.14, suvBodyLayout.bodyWidth - 1.06),
      bodyPaintMaterial
    );
    rearLowerValance.position.set(rearBodyEndX + 0.08, -0.9, 0);
    bodyShell.add(rearLowerValance);
    const rearSkidPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.12, suvBodyLayout.bodyWidth - 1.72),
      metal
    );
    rearSkidPlate.position.set(rearBodyEndX + 0.1, -1.5, 0);
    bodyShell.add(rearSkidPlate);
    // Close the rear as a proper liftgate rather than leaving the drivetrain
    // visible through an open rectangle beneath the sloped rear glass.
    const tailgatePanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3.08, suvBodyLayout.bodyWidth - 0.3),
      bodyPaintMaterial
    );
    tailgatePanel.position.set(rearLiftgateX, 1.16, 0);
    bodyShell.add(tailgatePanel);
    bodyShell.add(
      createQuadPanel(
        [
          new THREE.Vector3(suvProfile.rearGlassBase.x, suvProfile.rearGlassBase.y, -upperBodyHalfWidth),
          new THREE.Vector3(suvProfile.rearGlassBase.x, suvProfile.rearGlassBase.y, upperBodyHalfWidth),
          new THREE.Vector3(rearLiftgateX, 2.7, bodyHalfWidth),
          new THREE.Vector3(rearLiftgateX, 2.7, -bodyHalfWidth),
        ],
        bodyPaintMaterial
      )
    );
    const tailgateHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.58), metal);
    tailgateHandle.position.set(rearLiftgateX + 0.12, 1.94, -1.1);
    bodyShell.add(tailgateHandle);
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 1.25), metal);
    rearPlate.position.set(rearLiftgateX + 0.14, 0.56, 0);
    bodyShell.add(rearPlate);

    [-1, 1].forEach((side) => {
      const headlightHousing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 1.7), lampHousingMaterial);
      headlightHousing.position.set(-8.84, 1.64, side * 3.72);
      bodyShell.add(headlightHousing);
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 1.34), headlightMaterial);
      headlight.position.set(-8.92, 1.66, side * 3.72);
      bodyShell.add(headlight);
      const daytimeRunningLight = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.055, 1.46), headlightMaterial);
      daytimeRunningLight.position.set(-8.98, 1.38, side * 3.72);
      bodyShell.add(daytimeRunningLight);
      // Each lamp is recessed into a dark housing, instead of presenting as a
      // bare red block floating outside the liftgate.
      const tailLightHousing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 1.52), lampHousingMaterial);
      tailLightHousing.position.set(rearLiftgateX + 0.11, 1.72, side * 3.78);
      bodyShell.add(tailLightHousing);
      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 1.08), tailLightMaterial);
      tailLight.position.set(rearLiftgateX + 0.2, 1.72, side * 3.78);
      bodyShell.add(tailLight);
    });
    const tailgateGarnish = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 4.1), lampHousingMaterial);
    tailgateGarnish.position.set(rearLiftgateX + 0.12, 1.8, 0);
    bodyShell.add(tailgateGarnish);
    const tailLightBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 2.8), tailLightMaterial);
    tailLightBar.position.set(rearLiftgateX + 0.2, 1.8, 0);
    bodyShell.add(tailLightBar);

    // The externally mounted spare sits slightly to one side of the liftgate,
    // leaving the center plate and both tail lamps visible from behind.
    const spareCarrierZ = 1.28;
    const spareCarrierY = 1.3;
    const spareCarrierPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1.48, 1.48),
      bodyTrimMaterial
    );
    spareCarrierPlate.position.set(rearLiftgateX + 0.16, spareCarrierY, spareCarrierZ);
    bodyShell.add(spareCarrierPlate);
    [-0.42, 0.42].forEach((verticalOffset) => {
      const carrierBolt = cylinder(0.09, 0.12, metal, 16);
      carrierBolt.position.set(
        rearLiftgateX + 0.28,
        spareCarrierY + verticalOffset,
        spareCarrierZ
      );
      bodyShell.add(carrierBolt);
    });
    const spareCarrier = cylinder(0.13, 0.62, darkMetal, 18);
    spareCarrier.position.set(rearLiftgateX + 0.36, spareCarrierY, spareCarrierZ);
    bodyShell.add(spareCarrier);
    const spareMount = cylinder(0.58, 0.1, bodyTrimMaterial, 28);
    spareMount.position.set(rearLiftgateX + 0.62, spareCarrierY, spareCarrierZ);
    bodyShell.add(spareMount);
    const { wheel: spareWheel } = createRoadWheel(
      1,
      tireMaterial,
      metal,
      brakeRotorMaterial,
      darkMetal,
      caliperMaterial
    );
    spareWheel.rotation.y = Math.PI * 0.5;
    spareWheel.position.set(rearLiftgateX + 0.76, spareCarrierY, spareCarrierZ);
    bodyShell.add(spareWheel);


  return { bodyShell, suvBody, tailLightMaterial };
}
