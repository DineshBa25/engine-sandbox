export function initEngine() {
  const canvas = document.getElementById("engineCanvas") as HTMLCanvasElement | null;
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const rpmValue = document.getElementById("rpmValue");
  const rpmFill = document.getElementById("rpmFill") as HTMLDivElement | null;
  const throttle = document.getElementById("throttle") as HTMLInputElement | null;
  const throttleValue = document.getElementById("throttleValue");
  const brake = document.getElementById("brake") as HTMLInputElement | null;
  const brakeValue = document.getElementById("brakeValue");
  const muteToggle = document.getElementById("muteToggle") as HTMLButtonElement | null;
  const statusText = document.getElementById("statusText");
  const modeValue = document.getElementById("modeValue");
  const exhaustValue = document.getElementById("exhaustValue");
  const limiterValue = document.getElementById("limiterValue");
  const loadValue = document.getElementById("loadValue");
  const torqueFill = document.getElementById("torqueFill") as HTMLDivElement | null;
  const powerFill = document.getElementById("powerFill") as HTMLDivElement | null;
  const limiterToggle = document.getElementById("limiterToggle");
  const rpmNeedle = document.getElementById("rpmNeedle");
  const rpmDisplayButtons = document.querySelectorAll(
    ".toggle-group[data-group='rpmDisplay'] .toggle"
  );
  const rpmDisplays = document.querySelectorAll("[data-rpm-display]");
  const volumeSlider = document.getElementById("volume") as HTMLInputElement | null;
  const resonanceSlider = document.getElementById("resonance") as HTMLInputElement | null;
  const rumbleSlider = document.getElementById("rumble") as HTMLInputElement | null;
  const growlSlider = document.getElementById("growl") as HTMLInputElement | null;
  const burbleSlider = document.getElementById("burble") as HTMLInputElement | null;
  const dirtSlider = document.getElementById("dirt") as HTMLInputElement | null;
  const noiseSlider = document.getElementById("noise") as HTMLInputElement | null;
  const upshiftBaseSlider = document.getElementById("upshiftBase") as HTMLInputElement | null;
  const upshiftSpanSlider = document.getElementById("upshiftSpan") as HTMLInputElement | null;
  const downshiftBaseSlider = document.getElementById("downshiftBase") as HTMLInputElement | null;
  const downshiftSpanSlider = document.getElementById("downshiftSpan") as HTMLInputElement | null;
  const desiredRpmSlider = document.getElementById("desiredRpm") as HTMLInputElement | null;
  const shiftDurationSlider = document.getElementById("shiftDuration") as HTMLInputElement | null;
  const upshiftCooldownSlider = document.getElementById("upshiftCooldown") as HTMLInputElement | null;
  const downshiftCooldownSlider = document.getElementById("downshiftCooldown") as HTMLInputElement | null;
  const throttleRampUpSlider = document.getElementById("throttleRampUp") as HTMLInputElement | null;
  const throttleRampDownSlider = document.getElementById("throttleRampDown") as HTMLInputElement | null;
  const coastFactorSlider = document.getElementById("coastFactor") as HTMLInputElement | null;
  const gear1Slider = document.getElementById("gear1") as HTMLInputElement | null;
  const gear2Slider = document.getElementById("gear2") as HTMLInputElement | null;
  const gear3Slider = document.getElementById("gear3") as HTMLInputElement | null;
  const gear4Slider = document.getElementById("gear4") as HTMLInputElement | null;
  const gear5Slider = document.getElementById("gear5") as HTMLInputElement | null;
  const gear6Slider = document.getElementById("gear6") as HTMLInputElement | null;
  const finalDriveSlider = document.getElementById("finalDrive") as HTMLInputElement | null;
  const timeScaleSlider = document.getElementById("timeScale") as HTMLInputElement | null;
  const timeScaleValue = document.getElementById("timeScaleValue");
  const engineStartButton = document.getElementById("engineStart");
  const singleCylinderToggle = document.getElementById("singleCylinderToggle");
  const gearValue = document.getElementById("gearValue");
  const driveValue = document.getElementById("driveValue");
  const transValue = document.getElementById("transValue");
  const throttlePedal = document.getElementById("throttlePedal");
  const pedalFace = document.getElementById("pedalFace");
  const brakePedal = document.getElementById("brakePedal");
  const brakeFace = document.getElementById("brakeFace");
  const pedalLimit = document.getElementById("pedalLimit");

  const engineConfigs = {
    I4: { cylinders: 4, redline: 7000, idle: 850 },
  };

  const state = {
    rpm: 850,
    throttle: 0,
    throttleTarget: 0,
    throttleLimit: 100,
    brake: 0,
    brakeTarget: 0,
    crank: 0,
    mode: "I4" as keyof typeof engineConfigs,
    exhaust: "STOCK",
    induction: "NA",
    limiter: true,
    limiterBounce: 0,
    time: 0,
    last: 0,
    rpmDisplay: "BAR" as "BAR" | "GAUGE",
    timeScale: 1,
    prevTimeScale: 1,
    running: false,
    singleCylinder: false,
    gear: 1,
    driveMode: "NORMAL" as "ECO" | "NORMAL" | "SPORT" | "SPORT_PLUS",
    inGear: true,
    shiftTimer: 0,
    shiftBlend: 0,
    shiftBlendTotal: 0,
    shiftFrom: 0,
    shiftTo: 0,
    vehicleSpeed: 0,
    muted: false,
    startupStage: null as null | "prime" | "crank" | "flare",
    startupStageTimer: 0,
  };

  const transmission = {
    gears: [3.2, 2.1, 1.5, 1.1, 0.9, 0.75],
    finalDrive: 3.8,
    upshift: 6200,
    downshift: 1700,
  };

  const driveModes = {
    ECO: {
      upshiftBase: 2200,
      upshiftSpan: 700,
      downshiftBase: 1400,
      downshiftSpan: 500,
      desiredRpm: 1900,
      downshiftCooldown: 0.18,
    },
    NORMAL: {
      upshiftBase: 3000,
      upshiftSpan: 1100,
      downshiftBase: 1700,
      downshiftSpan: 600,
      desiredRpm: 2200,
      downshiftCooldown: 0.2,
    },
    SPORT: {
      upshiftBase: 3800,
      upshiftSpan: 1700,
      downshiftBase: 1900,
      downshiftSpan: 700,
      desiredRpm: 2600,
      downshiftCooldown: 0.24,
    },
    SPORT_PLUS: {
      upshiftBase: 5200,
      upshiftSpan: 1200,
      downshiftBase: 2200,
      downshiftSpan: 800,
      desiredRpm: 3000,
      downshiftCooldown: 0.28,
    },
  };

  const startupPrimeDuration = 0.45;
  const startupCrankDuration = 0.75;
  const startupFlareDuration = 0.9;
  const vehicleParams = {
    mass: 1200,
    wheelRadius: 0.34,
    dragCoeff: 0.25,
    rollingCoeff: 20,
    drivelineEff: 0.95,
    stallBoost: 2000,
    powerScalar: 1.8,
    brakeForce: 10000,
  };
  const upshiftCooldown = 1.0;
  const downshiftCooldown = 0.2;
  const shiftDuration = 0.25;
  const throttleRampUp = 70;
  const throttleRampDown = 120;

  const audio = createAudioEngine();

  function setActive(group: string, value: string) {
    document
      .querySelectorAll(`.toggle-group[data-group='${group}'] .toggle`)
      .forEach((btn) => {
        btn.classList.toggle("active", (btn as HTMLElement).dataset.value === value);
      });
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function setRunning(running: boolean) {
    const wasRunning = state.running;
    state.running = running;
    engineStartButton?.classList.toggle("active", running);
    if (engineStartButton) engineStartButton.dataset.value = running ? "ON" : "OFF";
    if (running && !wasRunning) {
      state.startupStage = "prime";
      state.startupStageTimer = startupPrimeDuration;
      state.rpm = Math.max(state.rpm, 400);
      audio.triggerStartup?.(startupPrimeDuration, startupCrankDuration, startupFlareDuration);
    }
  }

  function setThrottle(value: number) {
    state.throttleTarget = clamp(value, 0, 100);
    if (state.throttleTarget > 0 && !state.running) {
      setRunning(true);
      audio.resume();
    }
    if (throttle) throttle.value = String(state.throttleTarget);
  }

  function setBrake(value: number) {
    state.brakeTarget = clamp(value, 0, 100);
    if (brake) brake.value = String(state.brakeTarget);
  }

  function handleToggleGroup() {
    document.querySelectorAll(".toggle-group").forEach((group) => {
      group.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest("button");
        if (!button) return;
        const value = button.dataset.value ?? "";
        const groupName = (group as HTMLElement).dataset.group ?? "";
        setActive(groupName, value);

        if (groupName === "engine") {
          state.mode = value as keyof typeof engineConfigs;
        }
        if (groupName === "exhaust") {
          state.exhaust = value;
        }
        if (groupName === "induction") {
          state.induction = value;
        }
        if (groupName === "drive") {
          state.driveMode = value as typeof state.driveMode;
        }
        if (groupName === "trans") {
          state.inGear = value === "D";
        }
      });
    });
  }

  function updateUI() {
    const config = engineConfigs[state.mode];
    const rpm = Math.round(state.rpm);
    if (rpmValue) rpmValue.textContent = rpm.toString().padStart(4, "0");
    if (rpmFill) {
      const ratio = clamp(rpm / config.redline, 0, 1);
      (rpmFill as HTMLDivElement).style.transform = `scaleX(${ratio})`;
    }
    if (throttleValue) throttleValue.textContent = Math.round(state.throttle).toString();
    if (brakeValue) brakeValue.textContent = Math.round(state.brake).toString();
    if (modeValue) modeValue.textContent = state.mode;
    if (exhaustValue) exhaustValue.textContent = state.exhaust;
    if (limiterValue) limiterValue.textContent = state.limiter ? "ON" : "OFF";

    const load = Math.round(clamp(state.throttle + (rpm / config.redline) * 40, 0, 100));
    if (loadValue) loadValue.textContent = `${load}%`;

    const torqueNm = torqueCurve(rpm, config.redline, state.throttle / 100);
    const powerHp = (torqueNm * rpm) / 5252;
    const maxTorque = 360;
    const maxPower = 320;
    if (torqueFill) torqueFill.style.width = `${clamp((torqueNm / maxTorque) * 100, 0, 100)}%`;
    if (powerFill) powerFill.style.width = `${clamp((powerHp / maxPower) * 100, 0, 100)}%`;

    if (statusText) {
      const idleDisplay = config.idle + (state.inGear ? 450 : 0);
      if (!state.running) {
        statusText.textContent = "OFF";
      } else if (state.startupStage === "prime") {
        statusText.textContent = "PRIME";
      } else if (state.startupStage === "crank") {
        statusText.textContent = "CRANK";
      } else if (state.startupStage === "flare") {
        statusText.textContent = "START";
      } else if (rpm < idleDisplay + 100) {
        statusText.textContent = "IDLE";
      } else if (state.limiter && rpm > config.redline - 200) {
        statusText.textContent = "LIMIT";
      } else {
        statusText.textContent = "LOAD";
      }
    }

    if (rpmNeedle) {
      const ratio = clamp(rpm / config.redline, 0, 1);
      const angle = -90 + ratio * 180;
      (rpmNeedle as SVGLineElement).style.transform = `rotate(${angle}deg)`;
    }

    if (timeScaleValue) {
      timeScaleValue.textContent = `${state.timeScale.toFixed(2)}x`;
    }

    if (gearValue) {
      gearValue.textContent = state.inGear ? `D${state.gear}` : "N";
    }
    if (driveValue) {
      driveValue.textContent = state.driveMode === "SPORT_PLUS" ? "SPORT+" : state.driveMode;
    }
    if (transValue) {
      transValue.textContent = state.inGear ? "D" : "N";
    }
    if (pedalFace) {
      const press = clamp(state.throttle / 100, 0, 1);
      const translate = 6 + press * 12;
      const tilt = press * 10;
      (pedalFace as HTMLElement).style.transform = `translateY(${translate}px) rotateX(${tilt}deg)`;
    }
    if (brakeFace) {
      const press = clamp(state.brake / 100, 0, 1);
      const translate = 6 + press * 12;
      const tilt = press * 10;
      (brakeFace as HTMLElement).style.transform = `translateY(${translate}px) rotateX(${tilt}deg)`;
    }
    if (pedalLimit && throttlePedal) {
      const rect = throttlePedal.getBoundingClientRect();
      const limit = clamp(state.throttleLimit / 100, 0, 1);
      const inset = 12;
      const usable = Math.max(rect.height - inset * 2, 0);
      const y = inset + usable * (1 - limit);
      (pedalLimit as HTMLElement).style.transform = `translateY(${y}px)`;
    }
  }

  function updateEngine(dt: number) {
    const config = engineConfigs[state.mode];
    const idle = config.idle;
    const redline = config.redline;

    if (state.startupStage) {
      state.startupStageTimer = Math.max(0, state.startupStageTimer - dt);
      if (state.startupStageTimer === 0) {
        if (state.startupStage === "prime") {
          state.startupStage = "crank";
          state.startupStageTimer = startupCrankDuration;
        } else if (state.startupStage === "crank") {
          state.startupStage = "flare";
          state.startupStageTimer = startupFlareDuration;
        } else {
          state.startupStage = null;
        }
      }
    }

    const rampUp =
      (throttleRampUpSlider ? Number(throttleRampUpSlider.value) : throttleRampUp) * 1.6;
    const rampDown =
      (throttleRampDownSlider ? Number(throttleRampDownSlider.value) : throttleRampDown) * 1.6;
    const throttleDiff = state.throttleTarget - state.throttle;
    const throttleStep = (throttleDiff > 0 ? rampUp : rampDown) * dt;
    if (Math.abs(throttleDiff) <= throttleStep) {
      state.throttle = state.throttleTarget;
    } else {
      state.throttle += Math.sign(throttleDiff) * throttleStep;
    }

    const brakeRampUp = 320;
    const brakeRampDown = 260;
    const brakeDiff = state.brakeTarget - state.brake;
    const brakeStep = (brakeDiff > 0 ? brakeRampUp : brakeRampDown) * dt;
    if (Math.abs(brakeDiff) <= brakeStep) {
      state.brake = state.brakeTarget;
    } else {
      state.brake += Math.sign(brakeDiff) * brakeStep;
    }

    const idleTarget = idle + (state.inGear ? 450 : 0);
    let baseTarget = state.running
      ? idleTarget + (state.throttle / 100) * (redline - idleTarget)
      : 0;

    if (state.startupStage === "prime") {
      baseTarget = Math.min(baseTarget, 120);
    } else if (state.startupStage === "crank") {
      baseTarget = Math.min(baseTarget, 520);
    } else if (state.startupStage === "flare") {
      const progress = 1 - state.startupStageTimer / startupFlareDuration;
      const envelope = Math.sin(Math.min(progress, 1) * Math.PI);
      const startupTarget = idle + 1650 * envelope;
      baseTarget = Math.max(baseTarget, startupTarget);
    }
    const roughness = state.running && state.throttle < 5 ? 1 : 0.25;
    const wobble =
      Math.sin(state.time * 6.2) * 0.6 + Math.sin(state.time * 13.1 + 1.4) * 0.4;
    const jitter = wobble * (idle * 0.03) * roughness;
    const target = baseTarget + jitter;
    const throttleFactor = clamp(state.throttle / 100, 0, 1);
    const gearRatios = [
      gear1Slider ? Number(gear1Slider.value) : transmission.gears[0],
      gear2Slider ? Number(gear2Slider.value) : transmission.gears[1],
      gear3Slider ? Number(gear3Slider.value) : transmission.gears[2],
      gear4Slider ? Number(gear4Slider.value) : transmission.gears[3],
      gear5Slider ? Number(gear5Slider.value) : transmission.gears[4],
      gear6Slider ? Number(gear6Slider.value) : transmission.gears[5],
    ];
    const finalDrive = finalDriveSlider
      ? Number(finalDriveSlider.value)
      : transmission.finalDrive;
    const coasting = throttleFactor < 0.02 && state.running;
    const coastFactor = coastFactorSlider ? Number(coastFactorSlider.value) / 100 : 0.18;
    const accel = state.throttle > 0 ? 6.5 : 1.6;
    const brake = state.throttle > 0 ? 0.6 : 0.35;
    const coastSlow = coasting ? coastFactor : 1;

    let rpm = state.rpm;
    const inStartup = Boolean(state.startupStage);
    const brakeForce = (state.brake / 100) * vehicleParams.brakeForce;
    const brakeDecel = brakeForce / vehicleParams.mass;

    if (!state.running) {
      rpm *= Math.max(0, 1 - dt * 4);
      state.vehicleSpeed = Math.max(0, state.vehicleSpeed - dt * 0.6 - brakeDecel * dt);
    } else if (!state.inGear || inStartup) {
      rpm += (target - rpm) * accel * dt * coastSlow;
      rpm -= rpm * brake * dt * (1 - throttleFactor) * 0.06;
      state.vehicleSpeed = Math.max(0, state.vehicleSpeed - dt * 0.3 - brakeDecel * dt);
    } else {
      const gearRatio = gearRatios[state.gear - 1] * finalDrive;
      const wheelRpm =
        (state.vehicleSpeed / (Math.PI * 2 * vehicleParams.wheelRadius)) * 60;
      const rpmFromSpeed = wheelRpm * gearRatio;
      const stallRpm = idleTarget + throttleFactor * vehicleParams.stallBoost;
      rpm = Math.max(rpmFromSpeed, stallRpm);

      const torqueNm = torqueCurve(Math.max(rpm, idleTarget), redline, throttleFactor);
      const wheelTorque = torqueNm * gearRatio * vehicleParams.drivelineEff;
      const wheelForce = wheelTorque / vehicleParams.wheelRadius;
      const dragForce =
        vehicleParams.dragCoeff * state.vehicleSpeed * state.vehicleSpeed +
        vehicleParams.rollingCoeff * state.vehicleSpeed;
      const engineBrake = throttleFactor < 0.02 ? 120 + rpm * 0.05 : 0;
      const accelMs =
        (wheelForce - dragForce - engineBrake - brakeForce) / vehicleParams.mass;
      state.vehicleSpeed = Math.max(0, state.vehicleSpeed + accelMs * dt);

      const wheelRpmNext =
        (state.vehicleSpeed / (Math.PI * 2 * vehicleParams.wheelRadius)) * 60;
      const rpmFromSpeedNext = wheelRpmNext * gearRatio;
      rpm = Math.max(rpmFromSpeedNext, stallRpm);
    }

    if (state.limiter && rpm > redline) {
      state.limiterBounce += dt * 22;
      rpm = redline - 140 + Math.sin(state.limiterBounce) * 80;
    } else {
      state.limiterBounce = 0;
    }

    if (state.shiftBlend > 0) {
      state.shiftBlend = Math.max(0, state.shiftBlend - dt);
      const total = state.shiftBlendTotal || shiftDuration;
      const t = 1 - state.shiftBlend / total;
      const eased = t * t * (3 - 2 * t);
      rpm = state.shiftFrom + (state.shiftTo - state.shiftFrom) * eased;
      if (state.shiftBlend === 0) {
        rpm = state.shiftTo;
      }
    }

    state.rpm = clamp(rpm, 0, redline + 800);
    state.crank += (state.rpm / 60) * Math.PI * 2 * dt;

    // Automatic shifting (with cooldown + rpm drop)
    if (state.running && state.inGear) {
      state.shiftTimer = Math.max(0, state.shiftTimer - dt);
      const profile = driveModes[state.driveMode];
      const shiftDurationValue = shiftDurationSlider
        ? Number(shiftDurationSlider.value) / 1000
        : shiftDuration;
      const upshiftCooldownValue = upshiftCooldownSlider
        ? Number(upshiftCooldownSlider.value) / 1000
        : upshiftCooldown;
      const downshiftCooldownValue = downshiftCooldownSlider
        ? Number(downshiftCooldownSlider.value) / 1000
        : profile.downshiftCooldown ?? downshiftCooldown;
      const upshiftBase = upshiftBaseSlider
        ? Number(upshiftBaseSlider.value)
        : profile.upshiftBase;
      const upshiftSpan = upshiftSpanSlider
        ? Number(upshiftSpanSlider.value)
        : profile.upshiftSpan;
      const downshiftBase = downshiftBaseSlider
        ? Number(downshiftBaseSlider.value)
        : profile.downshiftBase;
      const downshiftSpan = downshiftSpanSlider
        ? Number(downshiftSpanSlider.value)
        : profile.downshiftSpan;
      const desiredRpmBase = desiredRpmSlider
        ? Number(desiredRpmSlider.value)
        : profile.desiredRpm;

      const upshiftRpm = Math.min(upshiftBase + throttleFactor * upshiftSpan, redline - 600);
      const downshiftRpm = downshiftBase + throttleFactor * downshiftSpan;
      if (state.shiftTimer === 0) {
        if (state.rpm > upshiftRpm && state.gear < gearRatios.length) {
          const oldGear = state.gear;
          state.gear += 1;
          const ratio = gearRatios[state.gear - 1] / gearRatios[oldGear - 1];
          const shiftTime = state.rpm > redline - 800 ? 0.15 : shiftDurationValue;
          state.shiftFrom = state.rpm;
          state.shiftTo = clamp(state.rpm * ratio, idle, redline);
          state.shiftBlend = shiftTime;
          state.shiftBlendTotal = shiftTime;
          state.shiftTimer = upshiftCooldownValue;
        } else if (state.rpm < downshiftRpm && state.gear > 1) {
          const oldGear = state.gear;
          let targetGear = state.gear - 1;
          const desiredRpm = desiredRpmBase + throttleFactor * 300;
          for (let g = state.gear - 1; g >= 1; g -= 1) {
            const ratio = gearRatios[g - 1] / gearRatios[oldGear - 1];
            const rpmAfter = state.rpm * ratio;
            targetGear = g;
            if (rpmAfter >= desiredRpm || g === 1) break;
          }
          state.gear = targetGear;
          const ratio = gearRatios[targetGear - 1] / gearRatios[oldGear - 1];
          state.shiftFrom = state.rpm;
          state.shiftTo = clamp(state.rpm * ratio, idle, redline);
          state.shiftBlend = shiftDurationValue;
          state.shiftBlendTotal = shiftDurationValue;
          state.shiftTimer = downshiftCooldownValue;
        }
      }
    }

    audio.update({
      rpm: state.rpm,
      cylinders: config.cylinders,
      throttle: state.throttle,
      volume: state.muted ? 0 : volumeSlider ? Number(volumeSlider.value) / 100 : 0.3,
      resonance: resonanceSlider ? Number(resonanceSlider.value) / 100 : 0.4,
      rumble: rumbleSlider ? Number(rumbleSlider.value) / 100 : 0.7,
      growl: growlSlider ? Number(growlSlider.value) / 100 : 0.55,
      burble: burbleSlider ? Number(burbleSlider.value) / 100 : 0.6,
      dirt: dirtSlider ? Number(dirtSlider.value) / 100 : 0.55,
      noise: noiseSlider ? Number(noiseSlider.value) / 100 : 0.35,
      exhaust: state.exhaust,
    });
  }

  function pistonLayout(cylinders: number) {
    if (cylinders <= 4) {
      return { rows: 1, perRow: cylinders };
    }
    if (cylinders === 6) {
      return { rows: 2, perRow: 3 };
    }
    return { rows: 2, perRow: 4 };
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawEngine() {
    const config = engineConfigs[state.mode];
    const { rows, perRow } = pistonLayout(config.cylinders);
    const width = canvas.width / devicePixelRatio;
    const height = canvas.height / devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#0f0f14";
    ctx.fillRect(0, 0, width, height);

    const blockPadding = 80;
    const blockWidth = width - blockPadding * 2;
    const blockHeight = height - blockPadding * 2;

    ctx.fillStyle = "#1a1a22";
    ctx.strokeStyle = "#2b2b36";
    ctx.lineWidth = 2;
    roundRect(blockPadding, blockPadding, blockWidth, blockHeight, 24);
    ctx.fill();
    ctx.stroke();

    const crankCenterY = blockPadding + blockHeight - 32;
    const crankData: { centerX: number; crankPinY: number; crankRadius: number }[] = [];
    const rodData: { centerX: number; pistonPinY: number; crankPinY: number; behind: boolean }[] = [];

    const bankGap = 40;
    const pistonAreaHeight = rows === 1 ? blockHeight : (blockHeight - bankGap) / 2;
    const pistonAreaWidth = blockWidth;
    const pistonGap = 16;
    const pistonWidth = (pistonAreaWidth - pistonGap * (perRow + 1)) / perRow;
    const pistonHeight = pistonAreaHeight * 0.42;

    const rowPorts: { y: number; ports: number[] }[] = [];
    let cylinderIndex = 0;
    for (let row = 0; row < rows; row += 1) {
      const baseY =
        blockPadding +
        (rows === 1
          ? (blockHeight - pistonAreaHeight) / 2
          : row * (pistonAreaHeight + bankGap));
      const camInset = pistonGap * 0.5;
      drawHeadCover(
        blockPadding + camInset,
        blockPadding + blockWidth - camInset,
        baseY + 2
      );
      drawCamshaft(
        blockPadding,
        blockWidth,
        pistonGap,
        pistonWidth,
        baseY + 2,
        config.cylinders
      );
      const ports: number[] = [];
      for (let col = 0; col < perRow; col += 1) {
        if (cylinderIndex >= config.cylinders) continue;

        if (state.singleCylinder && cylinderIndex !== 0) {
          cylinderIndex += 1;
          continue;
        }

        const x = blockPadding + pistonGap + col * (pistonWidth + pistonGap);
        const centerX = x + pistonWidth / 2;
        const cycle = getCylinderCycle(cylinderIndex, config.cylinders);

        const chamberTop = baseY + 12;
        const chamberBottom = baseY + pistonAreaHeight - 12;
        const clearance = 10;
        const kinematicTop = chamberTop + clearance;
        const chamberHeight = Math.max(chamberBottom - kinematicTop, 20);
        const kinematics = getPistonKinematics(
          centerX,
          kinematicTop,
          chamberHeight,
          pistonHeight,
          crankCenterY,
          cycle.pistonAngle
        );
        const pistonY = kinematics.pistonTopY;
        const firing = cycle.firing;
        const valveLift = cycle.valveLift;
        const stroke = cycle.stroke;
        drawStrokeLabel(centerX, baseY + 4, stroke);

        ctx.fillStyle = "#24242c";
        ctx.fillRect(x, baseY + 8, pistonWidth, pistonAreaHeight - 16);

        const flowHeight = Math.max(pistonY - chamberTop, 6);
        drawFlowLayer(x + 6, chamberTop, pistonWidth - 12, flowHeight, stroke, cycle.strokePhase);

        ctx.fillStyle = firing ? getAccentColor() : "#3f3f46";
        ctx.fillRect(x + 6, pistonY, pistonWidth - 12, pistonHeight);
        drawPistonRings(x + 6, pistonY, pistonWidth - 12, pistonHeight);
        if (stroke === "combustion") {
          drawForceArrow(centerX, pistonY + 10, pistonY + 10 + 75, false);
        }

        crankData.push({
          centerX,
          crankPinY: kinematics.crankPinY,
          crankRadius: kinematics.crankRadius,
        });
        rodData.push({
          centerX,
          pistonPinY: kinematics.pistonPinY,
          crankPinY: kinematics.crankPinY,
          behind: Math.sin(cycle.pistonAngle) < 0,
        });

        drawValves(centerX, baseY + 10, pistonWidth, valveLift, firing);
        drawIntakeExhaust(x, baseY, pistonWidth, pistonAreaHeight, valveLift, firing);
        ports.push(x + pistonWidth + 22);
        if (firing) {
          drawSpark(centerX, baseY + 18);
        }

        if (firing) {
          ctx.strokeStyle = getAccentColor();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerX, baseY + 6, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        cylinderIndex += 1;
      }
      rowPorts.push({ y: baseY + 34, ports });
    }

    rodData.filter((rod) => rod.behind).forEach((rod) => {
      drawConnectingRod(rod.centerX, rod.pistonPinY, rod.centerX, rod.crankPinY);
    });
    drawCrankshaftAssembly(crankData, crankCenterY);
    rodData.filter((rod) => !rod.behind).forEach((rod) => {
      drawConnectingRod(rod.centerX, rod.pistonPinY, rod.centerX, rod.crankPinY);
    });

    // Exhaust header removed for cleaner top section
  }

  function drawCrankshaftAssembly(
    data: { centerX: number; crankPinY: number; crankRadius: number }[],
    crankCenterY: number
  ) {
    const sorted = [...data].sort((a, b) => a.centerX - b.centerX);
    const journalHeight = 8;
    const journalWidth = 20;
    const linkHeight = 8;
    const webWidth = 10;
    const pinWidth = 22;
    const pinHeight = 8;

    // Main journal links between throws (short, segmented)
    if (sorted.length > 1) {
      ctx.fillStyle = "#3f3f48";
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const x1 = sorted[i].centerX + journalWidth / 2 + 2;
        const x2 = sorted[i + 1].centerX - journalWidth / 2 - 2;
        roundRect(x1, crankCenterY - linkHeight / 2, x2 - x1, linkHeight, 4);
        ctx.fill();
      }
    }

    // Crank ends (flywheel + snout)
    if (sorted.length > 0) {
      const leftShaft = sorted[0].centerX - journalWidth / 2;
      const rightShaft = sorted[sorted.length - 1].centerX + journalWidth / 2;
      const leftEnd = leftShaft - 80;
      const rightEnd = rightShaft + 80;
      drawCrankEnds(leftEnd, rightEnd, crankCenterY, leftShaft, rightShaft);
    }

    data.forEach(({ centerX, crankPinY }) => {
      // Main journal
      ctx.fillStyle = "#3f3f48";
      roundRect(
        centerX - journalWidth / 2,
        crankCenterY - journalHeight / 2,
        journalWidth,
        journalHeight,
        4
      );
      ctx.fill();

      // Crank webs (two cheeks)
      const cheekGap = 6;
      ctx.fillStyle = "#4a4a55";
      roundRect(
        centerX - cheekGap - webWidth,
        Math.min(crankCenterY, crankPinY),
        webWidth,
        Math.abs(crankPinY - crankCenterY) + pinHeight,
        4
      );
      ctx.fill();
      roundRect(
        centerX + cheekGap,
        Math.min(crankCenterY, crankPinY),
        webWidth,
        Math.abs(crankPinY - crankCenterY) + pinHeight,
        4
      );
      ctx.fill();

      // Crank pin
      ctx.fillStyle = "#3f3f48";
      roundRect(
        centerX - pinWidth / 2,
        crankPinY - pinHeight / 2,
        pinWidth,
        pinHeight,
        4
      );
      ctx.fill();
    });
  }

  function drawCrankEnds(
    leftX: number,
    rightX: number,
    y: number,
    leftShaft: number,
    rightShaft: number
  ) {
    // Shaft stubs to connect ends
    ctx.fillStyle = "#3f3f48";
    roundRect(leftX + 6, y - 4, leftShaft - leftX - 6, 8, 4);
    ctx.fill();
    roundRect(rightShaft, y - 4, rightX - rightShaft + 6, 8, 4);
    ctx.fill();

    // Pulley (gear) on belt side (left)
    ctx.fillStyle = "#3f3f48";
    roundRect(leftX - 10, y - 12, 20, 24, 7);
    ctx.fill();

    // Primary belt (wider, driven)
    const beltX = leftX - 16;
    const beltHeight = 120;
    const beltWidth = 14;
    ctx.fillStyle = "#1f1f25";
    const beltTop = y - beltHeight / 2 - 6;
    roundRect(beltX, beltTop, beltWidth, beltHeight, 6);
    ctx.fill();
    ctx.strokeStyle = "#2c2c35";
    ctx.lineWidth = 2;
    const ridgeSpacing = 8;
    const offset = (state.crank * 10) % ridgeSpacing;
    for (let by = beltTop + 4 - offset; by < beltTop + beltHeight; by += ridgeSpacing) {
      ctx.beginPath();
      ctx.moveTo(beltX + 2, by);
      ctx.lineTo(beltX + beltWidth - 2, by);
      ctx.stroke();
    }

    // Secondary belt (narrower, on top)
    const topBeltX = beltX + 3;
    const topBeltWidth = 8;
    const topBeltHeight = 170;
    const topBeltTop = beltTop - 50;
    ctx.fillStyle = "#141418";
    roundRect(topBeltX, topBeltTop, topBeltWidth, topBeltHeight, 4);
    ctx.fill();
    ctx.strokeStyle = "#23232c";
    ctx.lineWidth = 1.5;
    const topRidgeSpacing = 6;
    const topOffset = (state.crank * 12) % topRidgeSpacing;
    for (let by = topBeltTop + 3 - topOffset; by < topBeltTop + topBeltHeight; by += topRidgeSpacing) {
      ctx.beginPath();
      ctx.moveTo(topBeltX + 1.5, by);
      ctx.lineTo(topBeltX + topBeltWidth - 1.5, by);
      ctx.stroke();
    }

    // Flywheel (right) - side view line
    ctx.fillStyle = "#3f3f48";
    roundRect(rightX - 8, y - 32, 16, 64, 7);
    ctx.fill();
    ctx.fillStyle = "#2f2f38";
    roundRect(rightX - 3, y - 22, 6, 44, 5);
    ctx.fill();
  }

  function drawConnectingRod(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const perpX = -uy;
    const perpY = ux;
    const width = 6;

    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.moveTo(x1 + perpX * width, y1 + perpY * width);
    ctx.lineTo(x2 + perpX * (width * 0.6), y2 + perpY * (width * 0.6));
    ctx.lineTo(x2 - perpX * (width * 0.6), y2 - perpY * (width * 0.6));
    ctx.lineTo(x1 - perpX * width, y1 - perpY * width);
    ctx.closePath();
    ctx.fill();

    // Big end and small end
    ctx.fillStyle = "#4a4a55";
    ctx.beginPath();
    ctx.arc(x1, y1, 6, 0, Math.PI * 2);
    ctx.arc(x2, y2, 7, 0, Math.PI * 2);
    ctx.fill();

    // The crank web/journal are drawn in the crankshaft layer.
  }

  function getPistonKinematics(
    centerX: number,
    chamberTopY: number,
    chamberHeight: number,
    pistonHeight: number,
    crankCenterY: number,
    theta: number
  ) {
    const stroke = Math.max(chamberHeight - pistonHeight, 30);
    const desiredRadius = stroke / 2;
    const pinOffset = pistonHeight * 0.92;
    const maxRadius = Math.max((crankCenterY - chamberTopY - pinOffset) * 0.32, 6);
    const crankRadius = Math.min(desiredRadius, maxRadius);

    // Keep rod length constant in a vertical plane for a clean side-view.
    const rodLen = Math.max(crankCenterY - crankRadius - pinOffset - chamberTopY, crankRadius * 1.1);
    const crankPinY = crankCenterY + crankRadius * Math.cos(theta);
    const pistonPinY = crankPinY - rodLen;
    const pistonTopY = pistonPinY - pinOffset;

    return { pistonTopY, pistonPinY, crankPinY, crankRadius };
  }

  function getAccentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  }

  function getCylinderCycle(index: number, cylinders: number) {
    const cycle = Math.PI * 4; // 720 degrees
    const offset = (cycle / cylinders) * index;
    const cycleAngle = (state.crank + offset) % cycle;
    // Align motion: intake = down, compression = up, power = down, exhaust = up
    const pistonAngle = cycleAngle + Math.PI;

    const strokeIndex = Math.floor(cycleAngle / Math.PI); // 0..3
    const strokePhase = (cycleAngle % Math.PI) / Math.PI; // 0..1 within stroke

    const stroke =
      strokeIndex === 0
        ? "intake"
        : strokeIndex === 1
          ? "compression"
          : strokeIndex === 2
            ? "combustion"
            : "exhaust";

    const intakeOpen = strokeIndex === 0;
    const exhaustOpen = strokeIndex === 3;

    const intakeLift = intakeOpen ? Math.sin(strokePhase * Math.PI) : 0;
    const exhaustLift = exhaustOpen ? Math.sin(strokePhase * Math.PI) : 0;

    const firing = strokeIndex === 2 && strokePhase < 0.08;

    return {
      pistonAngle,
      stroke,
      strokePhase,
      firing,
      valveLift: { intake: intakeLift, exhaust: exhaustLift },
    };
  }

  function drawStrokeLabel(x: number, y: number, stroke: "intake" | "compression" | "combustion" | "exhaust") {
    const label = stroke === "intake"
      ? "I"
      : stroke === "compression"
        ? "C"
        : stroke === "combustion"
          ? "P"
          : "E";
    ctx.save();
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function drawForceArrow(x: number, yStart: number, yEnd: number, short: boolean) {
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    ctx.lineTo(x, short ? yStart + 18 : yEnd);
    ctx.stroke();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    const tipY = short ? yStart + 18 : yEnd;
    ctx.moveTo(x - 12, tipY - 10);
    ctx.lineTo(x + 12, tipY - 10);
    ctx.lineTo(x, tipY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function torqueCurve(rpm: number, redline: number, throttle: number) {
    const x = clamp(rpm / redline, 0, 1);
    const peak = Math.exp(-Math.pow((x - 0.55) / 0.28, 2));
    const base = 170 + peak * 300;
    return base * clamp(throttle, 0, 1) * vehicleParams.powerScalar;
  }

  function drawCamshaft(
    blockPadding: number,
    blockWidth: number,
    pistonGap: number,
    pistonWidth: number,
    y: number,
    cylinders: number
  ) {
    const xStart = blockPadding + pistonGap * 0.5;
    const xEnd = blockPadding + blockWidth - pistonGap * 0.5;
    ctx.strokeStyle = "#4a4a55";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(xStart, y);
    ctx.lineTo(xEnd, y);
    ctx.stroke();

    const totalLobes = cylinders * 2;
    for (let i = 0; i < totalLobes; i += 1) {
      const cylIndex = Math.floor(i / 2);
      const isIntake = i % 2 === 0;
      const xLeft = blockPadding + pistonGap + cylIndex * (pistonWidth + pistonGap);
      const valveX = xLeft + pistonWidth / 2 + (isIntake ? -pistonWidth * 0.22 : pistonWidth * 0.22);
      const x = valveX;
      const { strokePhase, stroke } = getCylinderCycle(cylIndex, cylinders);
      const lift =
        (isIntake && stroke === "intake") || (!isIntake && stroke === "exhaust")
          ? Math.sin(strokePhase * Math.PI)
          : 0;
      const lobeHeight = 6 + lift * 7;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = isIntake ? "#5a5a66" : "#70707c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, lobeHeight, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHeadCover(xStart: number, xEnd: number, y: number) {
    ctx.fillStyle = "#1f1f27";
    roundRect(xStart, y, xEnd - xStart, 18, 10);
    ctx.fill();
    ctx.strokeStyle = "#2b2b36";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xStart + 8, y + 4);
    ctx.lineTo(xEnd - 8, y + 4);
    ctx.stroke();
  }

  function drawValves(
    centerX: number,
    topY: number,
    width: number,
    lift: { intake: number; exhaust: number },
    firing: boolean
  ) {
    const valveGap = width * 0.24;
    const stemTop = topY + 1;
    const seatY = topY + 18;
    const liftScale = 18;

    const intakeLift = lift.intake * liftScale;
    const exhaustLift = lift.exhaust * liftScale;

    // Rocker bridge
    ctx.fillStyle = "#2a2a34";
    roundRect(centerX - valveGap - 8, topY - 4, valveGap * 2 + 16, 6, 3);
    ctx.fill();

    // Valve seats
    ctx.strokeStyle = "#2f2f38";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX - valveGap, seatY, 9, 0, Math.PI * 2);
    ctx.arc(centerX + valveGap, seatY, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Stems
    ctx.strokeStyle = "#8a8a96";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - valveGap, stemTop);
    ctx.lineTo(centerX - valveGap, seatY + intakeLift);
    ctx.moveTo(centerX + valveGap, stemTop);
    ctx.lineTo(centerX + valveGap, seatY + exhaustLift);
    ctx.stroke();

    // Springs (denser)
    drawValveSpring(centerX - valveGap, stemTop + 4, seatY + intakeLift, "#6a6a76");
    drawValveSpring(centerX + valveGap, stemTop + 4, seatY + exhaustLift, "#6a6a76");

    // Valve heads
    ctx.fillStyle = firing ? getAccentColor() : "#5a5a66";
    ctx.beginPath();
    ctx.arc(centerX - valveGap, seatY + intakeLift, 6, 0, Math.PI * 2);
    ctx.arc(centerX + valveGap, seatY + exhaustLift, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawIntakeExhaust(
    x: number,
    baseY: number,
    width: number,
    height: number,
    lift: { intake: number; exhaust: number },
    firing: boolean
  ) {
    // Intentionally left minimal (no external tube lines)
  }

  function drawValveSpring(x: number, yTop: number, yBottom: number, color: string) {
    const coils = 4;
    const height = Math.max(yBottom - yTop, 4);
    const step = height / coils;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= coils; i += 1) {
      const y = yTop + i * step;
      const offset = i % 2 === 0 ? -4 : 4;
      ctx.lineTo(x + offset, y);
    }
    ctx.stroke();
  }

  function drawSpark(centerX: number, y: number) {
    ctx.strokeStyle = getAccentColor();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, y);
    ctx.lineTo(centerX + 6, y + 6);
    ctx.moveTo(centerX + 6, y);
    ctx.lineTo(centerX - 6, y + 6);
    ctx.stroke();
  }

  function drawPistonRings(x: number, y: number, w: number, h: number) {
    const ringCount = 3;
    const topOffset = 10;
    const spacing = 8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    for (let i = 0; i < ringCount; i += 1) {
      const ry = y + topOffset + i * spacing;
      if (ry > y + h - 8) break;
      ctx.beginPath();
      ctx.moveTo(x + 4, ry);
      ctx.lineTo(x + w - 4, ry);
      ctx.stroke();
    }
  }

  function drawExhaustHeader(ports: number[], y: number, xEnd: number, mode: string) {
    const accent = getAccentColor();
    const pipeY = y;
    const tailX = xEnd + 70;

    const collectorX = xEnd + 20;
    ctx.strokeStyle = "#3b3b46";
    ctx.lineWidth = 5;
    ports.forEach((portX, index) => {
      const offset = (index - (ports.length - 1) / 2) * 6;
      ctx.beginPath();
      ctx.moveTo(portX + 6, pipeY);
      ctx.quadraticCurveTo(portX + 24, pipeY + offset, collectorX - 12, pipeY + offset);
      ctx.stroke();
    });

    ctx.strokeStyle = "#5a5a66";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(collectorX - 10, pipeY);
    ctx.lineTo(tailX, pipeY);
    ctx.stroke();

    ctx.fillStyle = "#2b2b36";
    ctx.beginPath();
    ctx.roundRect(collectorX - 18, pipeY - 10, 24, 20, 6);
    ctx.fill();

    ctx.strokeStyle = mode === "STRAIGHT" ? accent : "#6b7280";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tailX - 8, pipeY);
    ctx.lineTo(tailX + 12, pipeY);
    ctx.stroke();

    ctx.strokeStyle =
      mode === "STRAIGHT" ? "rgba(225, 6, 0, 0.5)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(tailX + 2, pipeY);
    ctx.lineTo(tailX + 18, pipeY);
    ctx.stroke();
  }

  function drawFlowLayer(
    x: number,
    y: number,
    w: number,
    h: number,
    stroke: "intake" | "compression" | "combustion" | "exhaust",
    strokePhase: number
  ) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    if (stroke === "intake") {
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, "rgba(60,130,255,0.0)");
      grad.addColorStop(0.5, `rgba(60,130,255,${0.25 + strokePhase * 0.5})`);
      grad.addColorStop(1, "rgba(120,200,255,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    } else if (stroke === "compression") {
      const progress = strokePhase;
      ctx.fillStyle = `rgba(245, 158, 11, ${0.15 + progress * 0.6})`;
      ctx.fillRect(x, y, w, h);
    } else if (stroke === "combustion") {
      const flash = Math.max(0, 1 - strokePhase * 8);
      ctx.fillStyle = `rgba(225, 6, 0, ${0.35 + flash * 0.6})`;
      ctx.fillRect(x, y, w, h);
    } else if (stroke === "exhaust") {
      const grad = ctx.createLinearGradient(x + w, y, x, y);
      grad.addColorStop(0, "rgba(255, 120, 70, 0.0)");
      grad.addColorStop(0.5, `rgba(255, 120, 70, ${0.2 + strokePhase * 0.5})`);
      grad.addColorStop(1, "rgba(255, 120, 70, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function onResize() {
    const size = Math.min(canvas.parentElement?.clientWidth ?? 640, 640);
    canvas.width = size * devicePixelRatio;
    canvas.height = size * devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  function loop(timestamp: number) {
    if (!state.last) state.last = timestamp;
    const dt = Math.min((timestamp - state.last) / 1000, 0.033) * state.timeScale;
    state.last = timestamp;
    state.time += dt;

    updateEngine(dt);
    updateUI();
    drawEngine();

    rafId = requestAnimationFrame(loop);
  }

  function onThrottleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    state.throttleLimit = clamp(Number(target.value), 0, 100);
    setThrottle(Number(target.value));
    audio.resume();
  }

  function onLimiterToggle() {
    state.limiter = !state.limiter;
    limiterToggle?.classList.toggle("active", state.limiter);
    if (limiterToggle) limiterToggle.dataset.value = state.limiter ? "ON" : "OFF";
    audio.resume();
  }

  function onMuteToggle() {
    state.muted = !state.muted;
    if (muteToggle) {
      muteToggle.classList.toggle("muted", state.muted);
      muteToggle.dataset.value = state.muted ? "OFF" : "ON";
    }
  }

  function onEngineStartToggle() {
    setRunning(!state.running);
    if (state.running) {
      audio.resume();
    } else {
      state.throttle = 0;
      if (throttle) throttle.value = "0";
    }
  }

  function onTimeScaleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    state.timeScale = Number(target.value) / 100;
    if (!state.singleCylinder) {
      state.prevTimeScale = state.timeScale;
    }
  }

  function onSingleCylinderToggle() {
    state.singleCylinder = !state.singleCylinder;
    singleCylinderToggle?.classList.toggle("active", state.singleCylinder);
    if (singleCylinderToggle) {
      singleCylinderToggle.dataset.value = state.singleCylinder ? "ON" : "OFF";
    }
    if (state.singleCylinder) {
      state.prevTimeScale = state.timeScale;
      state.timeScale = 0.25;
      if (timeScaleSlider) timeScaleSlider.value = "25";
    } else {
      state.timeScale = state.prevTimeScale || 1;
      if (timeScaleSlider) timeScaleSlider.value = String(Math.round(state.timeScale * 100));
    }
  }

  function setRpmDisplay(value: "BAR" | "GAUGE") {
    state.rpmDisplay = value;
    rpmDisplays.forEach((el) => {
      const mode = (el as HTMLElement).dataset.rpmDisplay;
      (el as HTMLElement).style.display = mode === value ? "block" : "none";
    });
    rpmDisplayButtons.forEach((btn) => {
      (btn as HTMLElement).classList.toggle("active", (btn as HTMLElement).dataset.value === value);
    });
  }

  function setupRpmDisplayToggles() {
    rpmDisplayButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = (btn as HTMLElement).dataset.value as "BAR" | "GAUGE";
        if (!value) return;
        setRpmDisplay(value);
        audio.resume();
      });
    });
    setRpmDisplay(state.rpmDisplay);
  }

  function onVolumeChange() {
    audio.resume();
  }

  const sliderValueCleanups: Array<() => void> = [];

  function bindSliderValue(id: string, format?: (value: number) => string) {
    const slider = document.getElementById(id) as HTMLInputElement | null;
    const output = document.getElementById(`${id}Value`);
    if (!slider || !output) return;
    const formatter = format ?? ((value: number) => `${Math.round(value)}`);
    const update = () => {
      output.textContent = formatter(Number(slider.value));
    };
    update();
    slider.addEventListener("input", update);
    sliderValueCleanups.push(() => slider.removeEventListener("input", update));
  }

  bindSliderValue("volume");
  bindSliderValue("resonance");
  bindSliderValue("rumble");
  bindSliderValue("growl");
  bindSliderValue("burble");
  bindSliderValue("dirt");
  bindSliderValue("noise");
  bindSliderValue("upshiftBase");
  bindSliderValue("upshiftSpan");
  bindSliderValue("downshiftBase");
  bindSliderValue("downshiftSpan");
  bindSliderValue("desiredRpm");
  bindSliderValue("shiftDuration", (value) => `${Math.round(value)}ms`);
  bindSliderValue("upshiftCooldown", (value) => `${Math.round(value)}ms`);
  bindSliderValue("downshiftCooldown", (value) => `${Math.round(value)}ms`);
  bindSliderValue("throttleRampUp");
  bindSliderValue("throttleRampDown");
  bindSliderValue("coastFactor");
  bindSliderValue("gear1", (value) => Number(value).toFixed(2));
  bindSliderValue("gear2", (value) => Number(value).toFixed(2));
  bindSliderValue("gear3", (value) => Number(value).toFixed(2));
  bindSliderValue("gear4", (value) => Number(value).toFixed(2));
  bindSliderValue("gear5", (value) => Number(value).toFixed(2));
  bindSliderValue("gear6", (value) => Number(value).toFixed(2));
  bindSliderValue("finalDrive", (value) => Number(value).toFixed(2));

  const DEBUG_PEDAL = false;
  let pedalActive = false;
  let brakeActive = false;

  function getEventClientY(event: Event): number | null {
    if (event instanceof PointerEvent || event instanceof MouseEvent) {
      return event.clientY;
    }
    if ("touches" in event && event.touches.length > 0) {
      return event.touches[0].clientY;
    }
    if ("changedTouches" in event && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientY;
    }
    return null;
  }

  function applyPedalLimit(event: Event) {
    if (!throttlePedal) return;
    const clientY = getEventClientY(event);
    if (clientY === null) return;
    const rect = throttlePedal.getBoundingClientRect();
    const normalized = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    state.throttleLimit = Math.round(normalized * 100);
    setThrottle(state.throttleLimit);
  }

  function onPedalDown(event: Event) {
    pedalActive = true;
    applyPedalLimit(event);
    if (DEBUG_PEDAL) {
      // eslint-disable-next-line no-console
      console.log("[pedal] down");
    }
    if (event instanceof PointerEvent && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    audio.resume();
  }

  function onPedalMove(event: Event) {
    if (!pedalActive) return;
    applyPedalLimit(event);
  }

  function onPedalUp(event?: Event) {
    if (!pedalActive) return;
    pedalActive = false;
    setThrottle(0);
    if (DEBUG_PEDAL) {
      // eslint-disable-next-line no-console
      console.log("[pedal] up");
    }
    if (event instanceof PointerEvent && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onBrakeDown(event: Event) {
    brakeActive = true;
    setBrake(100);
    if (event instanceof PointerEvent && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onBrakeUp(event?: Event) {
    if (!brakeActive) return;
    brakeActive = false;
    setBrake(0);
    if (event instanceof PointerEvent && event.currentTarget instanceof HTMLElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }


  let rafId = 0;

  throttle?.addEventListener("input", onThrottleInput);
  limiterToggle?.addEventListener("click", onLimiterToggle);
  volumeSlider?.addEventListener("input", onVolumeChange);
  resonanceSlider?.addEventListener("input", onVolumeChange);
  rumbleSlider?.addEventListener("input", onVolumeChange);
  growlSlider?.addEventListener("input", onVolumeChange);
  burbleSlider?.addEventListener("input", onVolumeChange);
  dirtSlider?.addEventListener("input", onVolumeChange);
  noiseSlider?.addEventListener("input", onVolumeChange);
  upshiftBaseSlider?.addEventListener("input", onVolumeChange);
  upshiftSpanSlider?.addEventListener("input", onVolumeChange);
  downshiftBaseSlider?.addEventListener("input", onVolumeChange);
  downshiftSpanSlider?.addEventListener("input", onVolumeChange);
  desiredRpmSlider?.addEventListener("input", onVolumeChange);
  shiftDurationSlider?.addEventListener("input", onVolumeChange);
  upshiftCooldownSlider?.addEventListener("input", onVolumeChange);
  downshiftCooldownSlider?.addEventListener("input", onVolumeChange);
  throttleRampUpSlider?.addEventListener("input", onVolumeChange);
  throttleRampDownSlider?.addEventListener("input", onVolumeChange);
  coastFactorSlider?.addEventListener("input", onVolumeChange);
  timeScaleSlider?.addEventListener("input", onTimeScaleChange);
  singleCylinderToggle?.addEventListener("click", onSingleCylinderToggle);
  engineStartButton?.addEventListener("click", onEngineStartToggle);
  muteToggle?.addEventListener("click", onMuteToggle);
  throttlePedal?.addEventListener("pointerdown", onPedalDown);
  throttlePedal?.addEventListener("pointermove", onPedalMove);
  throttlePedal?.addEventListener("pointerup", onPedalUp);
  throttlePedal?.addEventListener("pointerleave", onPedalUp);
  throttlePedal?.addEventListener("pointercancel", onPedalUp);
  window.addEventListener("pointerup", onPedalUp);
  throttlePedal?.addEventListener("mousedown", onPedalDown);
  throttlePedal?.addEventListener("mousemove", onPedalMove);
  throttlePedal?.addEventListener("mouseup", onPedalUp);
  throttlePedal?.addEventListener("mouseleave", onPedalUp);
  throttlePedal?.addEventListener("touchstart", onPedalDown, { passive: true });
  throttlePedal?.addEventListener("touchmove", onPedalMove, { passive: true });
  throttlePedal?.addEventListener("touchend", onPedalUp);
  throttlePedal?.addEventListener("touchcancel", onPedalUp);
  brakePedal?.addEventListener("pointerdown", onBrakeDown);
  brakePedal?.addEventListener("pointerup", onBrakeUp);
  brakePedal?.addEventListener("pointerleave", onBrakeUp);
  brakePedal?.addEventListener("pointercancel", onBrakeUp);
  window.addEventListener("pointerup", onBrakeUp);
  brakePedal?.addEventListener("mousedown", onBrakeDown);
  brakePedal?.addEventListener("mouseup", onBrakeUp);
  brakePedal?.addEventListener("mouseleave", onBrakeUp);
  brakePedal?.addEventListener("touchstart", onBrakeDown, { passive: true });
  brakePedal?.addEventListener("touchend", onBrakeUp);
  brakePedal?.addEventListener("touchcancel", onBrakeUp);

  handleToggleGroup();
  setupRpmDisplayToggles();
  window.addEventListener("resize", onResize);

  onResize();
  rafId = requestAnimationFrame(loop);

  return () => {
    throttle?.removeEventListener("input", onThrottleInput);
    limiterToggle?.removeEventListener("click", onLimiterToggle);
    volumeSlider?.removeEventListener("input", onVolumeChange);
    resonanceSlider?.removeEventListener("input", onVolumeChange);
    rumbleSlider?.removeEventListener("input", onVolumeChange);
    growlSlider?.removeEventListener("input", onVolumeChange);
    burbleSlider?.removeEventListener("input", onVolumeChange);
    dirtSlider?.removeEventListener("input", onVolumeChange);
    noiseSlider?.removeEventListener("input", onVolumeChange);
    upshiftBaseSlider?.removeEventListener("input", onVolumeChange);
    upshiftSpanSlider?.removeEventListener("input", onVolumeChange);
    downshiftBaseSlider?.removeEventListener("input", onVolumeChange);
    downshiftSpanSlider?.removeEventListener("input", onVolumeChange);
    desiredRpmSlider?.removeEventListener("input", onVolumeChange);
    shiftDurationSlider?.removeEventListener("input", onVolumeChange);
    upshiftCooldownSlider?.removeEventListener("input", onVolumeChange);
    downshiftCooldownSlider?.removeEventListener("input", onVolumeChange);
    throttleRampUpSlider?.removeEventListener("input", onVolumeChange);
    throttleRampDownSlider?.removeEventListener("input", onVolumeChange);
    coastFactorSlider?.removeEventListener("input", onVolumeChange);
    timeScaleSlider?.removeEventListener("input", onTimeScaleChange);
    singleCylinderToggle?.removeEventListener("click", onSingleCylinderToggle);
    engineStartButton?.removeEventListener("click", onEngineStartToggle);
    muteToggle?.removeEventListener("click", onMuteToggle);
    window.removeEventListener("pointerup", onPedalUp);
    throttlePedal?.removeEventListener("pointerdown", onPedalDown);
    throttlePedal?.removeEventListener("pointermove", onPedalMove);
    throttlePedal?.removeEventListener("pointerup", onPedalUp);
    throttlePedal?.removeEventListener("pointerleave", onPedalUp);
    throttlePedal?.removeEventListener("pointercancel", onPedalUp);
    window.removeEventListener("pointerup", onPedalUp);
    throttlePedal?.removeEventListener("mousedown", onPedalDown);
    throttlePedal?.removeEventListener("mousemove", onPedalMove);
    throttlePedal?.removeEventListener("mouseup", onPedalUp);
    throttlePedal?.removeEventListener("mouseleave", onPedalUp);
    throttlePedal?.removeEventListener("touchstart", onPedalDown);
    throttlePedal?.removeEventListener("touchmove", onPedalMove);
    throttlePedal?.removeEventListener("touchend", onPedalUp);
    throttlePedal?.removeEventListener("touchcancel", onPedalUp);
    brakePedal?.removeEventListener("pointerdown", onBrakeDown);
    brakePedal?.removeEventListener("pointerup", onBrakeUp);
    brakePedal?.removeEventListener("pointerleave", onBrakeUp);
    brakePedal?.removeEventListener("pointercancel", onBrakeUp);
    window.removeEventListener("pointerup", onBrakeUp);
    brakePedal?.removeEventListener("mousedown", onBrakeDown);
    brakePedal?.removeEventListener("mouseup", onBrakeUp);
    brakePedal?.removeEventListener("mouseleave", onBrakeUp);
    brakePedal?.removeEventListener("touchstart", onBrakeDown);
    brakePedal?.removeEventListener("touchend", onBrakeUp);
    brakePedal?.removeEventListener("touchcancel", onBrakeUp);
    sliderValueCleanups.forEach((cleanup) => cleanup());
    window.removeEventListener("resize", onResize);
    cancelAnimationFrame(rafId);
    audio.dispose();
  };
}

type AudioUpdate = {
  rpm: number;
  cylinders: number;
  throttle: number;
  volume: number;
  resonance: number;
  rumble: number;
  growl: number;
  burble: number;
  dirt: number;
  noise: number;
  exhaust: string;
};

function createAudioEngine() {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const master = audioContext.createGain();
  const tone = audioContext.createOscillator();
  const tone2 = audioContext.createOscillator();
  const pulse = audioContext.createOscillator();
  const sub = audioContext.createOscillator();
  const noise = audioContext.createBufferSource();
  const driveGain = audioContext.createGain();
  const drive = audioContext.createWaveShaper();
  const filter = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const noiseGain = audioContext.createGain();
  const toneGain = audioContext.createGain();
  const tone2Gain = audioContext.createGain();
  const pulseGain = audioContext.createGain();
  const subGain = audioContext.createGain();

  filter.type = "lowpass";
  filter.frequency.value = 850;
  filter.Q.value = 0.9;

  compressor.threshold.value = -22;
  compressor.knee.value = 24;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.18;

  master.gain.value = 0.0;
  tone.type = "sawtooth";
  tone2.type = "triangle";
  pulse.type = "square";
  sub.type = "sine";
  tone.frequency.value = 80;
  tone2.frequency.value = 140;
  pulse.frequency.value = 40;
  sub.frequency.value = 40;

  toneGain.gain.value = 0.16;
  tone2Gain.gain.value = 0.12;
  pulseGain.gain.value = 0.06;
  subGain.gain.value = 0.22;
  noiseGain.gain.value = 0.06;
  driveGain.gain.value = 0.55;

  drive.curve = makeDistortionCurve(20);
  drive.oversample = "4x";

  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = noiseBuffer;
  noise.loop = true;

  tone.connect(toneGain);
  tone2.connect(tone2Gain);
  pulse.connect(pulseGain);
  sub.connect(subGain);
  toneGain.connect(driveGain);
  tone2Gain.connect(driveGain);
  pulseGain.connect(driveGain);
  subGain.connect(driveGain);
  noise.connect(noiseGain);
  noiseGain.connect(driveGain);
  driveGain.connect(drive);
  drive.connect(filter);
  filter.connect(compressor);
  compressor.connect(master);
  master.connect(audioContext.destination);

  tone.start();
  tone2.start();
  pulse.start();
  sub.start();
  noise.start();

  let started = false;
  const clampValue = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  function resume() {
    if (audioContext.state !== "running") {
      audioContext.resume();
    }
    started = true;
  }

  function triggerStartup(
    primeDuration = 0.45,
    crankDuration = 0.75,
    flareDuration = 0.9
  ) {
    resume();
    const t = audioContext.currentTime;
    const primeEnd = t + primeDuration;
    const crankEnd = primeEnd + crankDuration;
    const igniteTime = crankEnd - 0.12;

    const pumpOsc = audioContext.createOscillator();
    const pumpGain = audioContext.createGain();
    pumpOsc.type = "square";
    pumpOsc.frequency.setValueAtTime(120, t);
    pumpGain.gain.setValueAtTime(0.0001, t);
    pumpGain.gain.linearRampToValueAtTime(0.22, t + 0.05);
    pumpGain.gain.exponentialRampToValueAtTime(0.0001, primeEnd);
    pumpOsc.connect(pumpGain);
    pumpGain.connect(driveGain);

    const starterOsc = audioContext.createOscillator();
    const starterGain = audioContext.createGain();
    starterOsc.type = "sawtooth";
    starterOsc.frequency.setValueAtTime(105, primeEnd);
    starterOsc.frequency.exponentialRampToValueAtTime(55, crankEnd);
    starterGain.gain.setValueAtTime(0.0001, primeEnd);
    starterGain.gain.linearRampToValueAtTime(0.65, primeEnd + 0.05);
    starterGain.gain.exponentialRampToValueAtTime(0.0001, crankEnd + 0.08);
    starterOsc.connect(starterGain);
    starterGain.connect(driveGain);

    const starterNoise = audioContext.createBufferSource();
    const starterNoiseGain = audioContext.createGain();
    const starterNoiseFilter = audioContext.createBiquadFilter();
    starterNoise.buffer = noiseBuffer;
    starterNoiseFilter.type = "lowpass";
    starterNoiseFilter.frequency.value = 380;
    starterNoiseGain.gain.setValueAtTime(0.0001, primeEnd);
    starterNoiseGain.gain.linearRampToValueAtTime(0.18, primeEnd + 0.04);
    starterNoiseGain.gain.exponentialRampToValueAtTime(0.0001, crankEnd + 0.1);
    starterNoise.connect(starterNoiseFilter);
    starterNoiseFilter.connect(starterNoiseGain);
    starterNoiseGain.connect(driveGain);

    const click = audioContext.createBufferSource();
    const clickGain = audioContext.createGain();
    click.buffer = noiseBuffer;
    clickGain.gain.setValueAtTime(0.45, igniteTime);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, igniteTime + 0.08);
    click.connect(clickGain);
    clickGain.connect(driveGain);

    const cough1 = audioContext.createBufferSource();
    const coughGain = audioContext.createGain();
    const coughFilter = audioContext.createBiquadFilter();
    cough1.buffer = noiseBuffer;
    coughFilter.type = "bandpass";
    coughFilter.frequency.value = 220;
    coughGain.gain.setValueAtTime(0.35, igniteTime + 0.05);
    coughGain.gain.exponentialRampToValueAtTime(0.0001, igniteTime + 0.18);
    cough1.connect(coughFilter);
    coughFilter.connect(coughGain);
    coughGain.connect(driveGain);

    const cough2 = audioContext.createBufferSource();
    const cough2Gain = audioContext.createGain();
    const cough2Filter = audioContext.createBiquadFilter();
    cough2.buffer = noiseBuffer;
    cough2Filter.type = "bandpass";
    cough2Filter.frequency.value = 180;
    cough2Gain.gain.setValueAtTime(0.28, igniteTime + 0.14);
    cough2Gain.gain.exponentialRampToValueAtTime(0.0001, igniteTime + 0.28);
    cough2.connect(cough2Filter);
    cough2Filter.connect(cough2Gain);
    cough2Gain.connect(driveGain);

    pumpOsc.start(t);
    pumpOsc.stop(primeEnd + 0.05);
    starterOsc.start(primeEnd);
    starterOsc.stop(crankEnd + 0.12);
    starterNoise.start(primeEnd);
    starterNoise.stop(crankEnd + 0.12);
    click.start(igniteTime);
    click.stop(igniteTime + 0.12);
    cough1.start(igniteTime + 0.05);
    cough1.stop(igniteTime + 0.2);
    cough2.start(igniteTime + 0.14);
    cough2.stop(igniteTime + 0.32);
  }

  function update({
    rpm,
    cylinders,
    throttle,
    volume,
    resonance,
    rumble,
    growl,
    burble,
    dirt,
    noise,
    exhaust,
  }: AudioUpdate) {
    if (!started) return;
    // Base frequency follows actual RPM (rev-synced)
    const firingPerSecond = Math.max((rpm / 60) * (cylinders / 2), 10);
    const base = firingPerSecond;

    const load = throttle / 100;
    const exhaustFactor = exhaust === "STRAIGHT" ? 1.2 : 0.85;
    const burbleLevel = clampValue((1 - load) * (rpm / 3500), 0, 1) * burble;
    const rumbleMix = 0.6 + rumble * 0.6;
    const growlMix = 0.35 + growl * 0.9;

    tone.frequency.setTargetAtTime(base * rumbleMix, audioContext.currentTime, 0.06);
    tone2.frequency.setTargetAtTime(base * (1.35 + growlMix * 0.4), audioContext.currentTime, 0.06);
    pulse.frequency.setTargetAtTime(
      base * (1.9 + growlMix * 0.25),
      audioContext.currentTime,
      0.08
    );
    sub.frequency.setTargetAtTime(Math.max(base * (0.35 + rumble * 0.25), 18), audioContext.currentTime, 0.1);

    toneGain.gain.setTargetAtTime(0.08 + growl * 0.18, audioContext.currentTime, 0.08);
    tone2Gain.gain.setTargetAtTime(0.04 + growl * 0.16, audioContext.currentTime, 0.08);
    pulseGain.gain.setTargetAtTime(0.02 + growl * 0.08, audioContext.currentTime, 0.08);
    subGain.gain.setTargetAtTime(
      0.12 + rumble * 0.24 + (1 - load) * 0.06,
      audioContext.currentTime,
      0.1
    );

    driveGain.gain.setTargetAtTime(0.25 + dirt * 0.9 + load * 0.35, audioContext.currentTime, 0.08);
    noiseGain.gain.setTargetAtTime(
      (0.01 + noise * 0.08) * (0.35 + burbleLevel * 1.8),
      audioContext.currentTime,
      0.12
    );
    const idleBoost = (1 - load) * 0.35;
    master.gain.setTargetAtTime(
      volume * 0.55 * (0.36 + load * 0.85 + idleBoost),
      audioContext.currentTime,
      0.06
    );
    filter.frequency.setTargetAtTime(
      (120 + resonance * 1200 + load * 650 + burbleLevel * 240) * exhaustFactor,
      audioContext.currentTime,
      0.1
    );
    filter.Q.setTargetAtTime(0.9 + resonance * 2.1 + burbleLevel * 0.4, audioContext.currentTime, 0.1);
  }

  function dispose() {
    tone.stop();
    tone2.stop();
    pulse.stop();
    sub.stop();
    noise.stop();
    audioContext.close();
  }

  return { update, resume, dispose, triggerStartup };
}

function makeDistortionCurve(amount: number) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = Math.max(1, amount);
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}
