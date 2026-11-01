import type { DrivetrainTelemetry } from "../../engine";

export const stoppedTelemetry: DrivetrainTelemetry = {
  engineRpm: 0,
  crankAngle: 0,
  throttle: 0,
  brake: 0,
  vehicleSpeed: 0,
  turbineRpm: 0,
  outputRpm: 0,
  slipRpm: 0,
  speedRatio: 0,
  torqueRatio: 1,
  lockup: 0,
  inputTorque: 0,
  outputTorque: 0,
  gear: 1,
  inGear: true,
  transmission: "D",
  running: false,
  turbo: false,
};

// Shared packaging dimensions keep the axle, suspension and tire geometry in
// agreement as the vehicle illustration grows.
export const vehicleLayout = {
  // Wheels sit below the crank/converter axis to give the drivetrain a real
  // ground-clearance envelope rather than letting the converter sit below tire level.
  wheelCenterY: -1.28,
  wheelCenterZ: 4.95,
  tireMajorRadius: 1.42,
  tireSectionHalfWidth: 0.68,
  frontAxleX: -6.15,
  // The compact SUV wheelbase keeps the rear glass and tail short instead of
  // stretching a long wagon body behind the second row.
  rearAxleX: 8.65,
  chassisFrameLength: 19.3,
  chassisFrameCenterX: 1.7,
  frontUprightZ: 4.25,
  rearCvJointZ: 4.65,
  turboCenterZ: 2.45,
  collectorZ: 2.34,
  exhaustTunnelZ: 2.78,
};

// Exterior packaging is kept separate from the mechanical layout so the SUV
// can be proportioned without moving the educational drivetrain cutaway.
export const suvBodyLayout = {
  // The prior shell was much narrower than the wheel track, forcing fake
  // torus flares. A wider body lets real stamped wheel openings do the work.
  shellSideZ: 5.05,
  // The cabin is notably narrower than the fender line, giving the body a
  // pronounced off-road SUV shoulder rather than a vertical slab side.
  greenhouseSideZ: 3.65,
  bodyWidth: 10.1,
  bodyFloorY: -1.7,
  rockerY: -1.48,
  beltlineY: 2.48,
  hoodY: 2.24,
  greenhouseBaseY: 2.7,
  greenhouseTopY: 5.72,
  // Generous jounce clearance keeps the tall tires clear of the side sheet.
  wheelArchRadius: vehicleLayout.tireMajorRadius + vehicleLayout.tireSectionHalfWidth + 0.52,
};
