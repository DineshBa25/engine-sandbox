import { useEffect, useState } from "react";
import { initEngine } from "./engine";
import EngineStartButton from "./components/EngineStartButton";
import PowertrainExplorer from "./components/PowertrainExplorer";

type DrawerPanel = "controls" | "telemetry" | "about" | "advanced";

export default function App() {
  const [drawersOpen, setDrawersOpen] = useState(true);
  const [openPanels, setOpenPanels] = useState<Record<DrawerPanel, boolean>>({
    controls: true,
    telemetry: false,
    about: false,
    advanced: false,
  });

  const setPanelOpen = (panel: DrawerPanel, open: boolean) => {
    setOpenPanels((current) => ({ ...current, [panel]: open }));
  };

  const expandAllPanels = () => {
    setOpenPanels({ controls: true, telemetry: true, about: true, advanced: true });
  };

  const collapseAllPanels = () => {
    setOpenPanels({ controls: false, telemetry: false, about: false, advanced: false });
  };

  useEffect(() => {
    const cleanup = initEngine();
    return () => cleanup();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="title">ENGINE SIM</div>
          <button id="muteToggle" className="mute-button" data-value="ON" type="button">
            <span className="icon-on">🔊</span>
            <span className="icon-off">🔇</span>
            <span className="mute-text mute-text-on">MUTE</span>
            <span className="mute-text mute-text-off">UNMUTE</span>
          </button>
        </div>
        <div className="status" id="statusText">
          IDLE
        </div>
      </header>
      <main className={`workspace ${drawersOpen ? "drawers-visible" : "drawers-hidden"}`}>
        <PowertrainExplorer />
        <button
          className="drawer-rail-toggle"
          type="button"
          aria-controls="simulator-drawers"
          aria-expanded={drawersOpen}
          aria-label={drawersOpen ? "Hide simulator panels" : "Show simulator panels"}
          onClick={() => setDrawersOpen((open) => !open)}
        >
          <span>{drawersOpen ? "HIDE PANELS" : "SHOW PANELS"}</span>
          <span className="drawer-rail-icon" aria-hidden="true">
            {drawersOpen ? "v" : "^"}
          </span>
        </button>
        <aside
          id="simulator-drawers"
          className={`dashboard-drawers ${drawersOpen ? "is-open" : "is-collapsed"}`}
          aria-label="Simulator controls and telemetry"
        >
        <div className="drawer-deck-toolbar" aria-label="Panel visibility">
          <button type="button" className="drawer-deck-button" onClick={expandAllPanels}>
            EXPAND ALL
          </button>
          <button type="button" className="drawer-deck-button" onClick={collapseAllPanels}>
            COLLAPSE ALL
          </button>
        </div>
        <details
          className="panel collapsible-panel telemetry-panel"
          open={openPanels.telemetry}
          onToggle={(event) => {
            if (event.target === event.currentTarget) setPanelOpen("telemetry", event.currentTarget.open);
          }}
        >
          <summary className="drawer-summary">
            <span className="panel-title">TELEMETRY</span>
            <span className="drawer-meta">RPM / STATE / TORQUE</span>
            <span className="drawer-action" aria-hidden="true"></span>
          </summary>
          <div className="drawer-content">
          <div className="cards">
            <div className="card rpm-card">
              <div className="card-header">
                <div className="card-label">RPM</div>
                <div className="toggle-group compact" data-group="rpmDisplay">
                  <button className="toggle small active" data-value="BAR">
                    BAR
                  </button>
                  <button className="toggle small" data-value="GAUGE">
                    GAUGE
                  </button>
                </div>
              </div>
              <div className="rpm-readout">
                <span id="rpmValue">0000</span>
                <span className="rpm-unit">RPM</span>
              </div>
              <div className="rpm-band" data-rpm-display="BAR">
                <div className="rpm-fill" id="rpmFill"></div>
                <div className="rpm-redline"></div>
              </div>
              <div className="rpm-gauge" data-rpm-display="GAUGE">
                <svg viewBox="0 0 200 120" role="img" aria-label="RPM gauge">
                  <path
                    className="gauge-track"
                    d="M20 100 A80 80 0 0 1 180 100"
                  />
                  <path
                    className="gauge-redline"
                    d="M140 44 A80 80 0 0 1 180 100"
                  />
                  <line
                    className="gauge-needle"
                    id="rpmNeedle"
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="30"
                  />
                  <circle className="gauge-center" cx="100" cy="100" r="6" />
                </svg>
              </div>
            </div>

            <div className="card">
              <div className="card-label">ENGINE STATE</div>
              <div className="state-grid">
                <div className="state-item">
                  <div className="state-label">MODE</div>
                  <div className="state-value" id="modeValue">
                    I4
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">GEAR</div>
                  <div className="state-value" id="gearValue">
                    1
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">TRANS</div>
                  <div className="state-value" id="transValue">
                    D
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">DRIVE</div>
                  <div className="state-value" id="driveValue">
                    NORMAL
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">EXHAUST</div>
                  <div className="state-value" id="exhaustValue">
                    STOCK
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">LIMITER</div>
                  <div className="state-value" id="limiterValue">
                    ON
                  </div>
                </div>
                <div className="state-item">
                  <div className="state-label">LOAD</div>
                  <div className="state-value" id="loadValue">
                    0%
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-label">TORQUE / POWER</div>
              <div className="bars">
                <div className="bar">
                  <div className="bar-label">TORQUE</div>
                  <div className="bar-track">
                    <div className="bar-fill" id="torqueFill"></div>
                  </div>
                </div>
                <div className="bar">
                  <div className="bar-label">POWER</div>
                  <div className="bar-track">
                    <div className="bar-fill" id="powerFill"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </details>

        <details
          className="panel collapsible-panel controls-panel"
          open={openPanels.controls}
          onToggle={(event) => {
            if (event.target === event.currentTarget) setPanelOpen("controls", event.currentTarget.open);
          }}
        >
          <summary className="drawer-summary">
            <span className="panel-title">CONTROLS</span>
            <span className="drawer-meta">PEDALS / START / CONFIG / TUNING</span>
            <span className="drawer-action" aria-hidden="true"></span>
          </summary>
          <div className="drawer-content">
            <div className="controls">
          <div className="controls-primary">
            <div className="control-block">
              <div className="control-label">THROTTLE</div>
              <div id="throttlePedal" className="pedal">
                <div id="pedalFace" className="pedal-face"></div>
                <div className="pedal-grip"></div>
                <div id="pedalLimit" className="pedal-limit"></div>
              </div>
              <input
                id="throttle"
                className="throttle-input"
                type="range"
                min="0"
                max="100"
                defaultValue="0"
              />
              <div className="throttle-readout">
                <span id="throttleValue">0</span>%
              </div>
            </div>
            <div className="control-block">
              <div className="control-label">BRAKE</div>
              <div id="brakePedal" className="pedal pedal-brake">
                <div id="brakeFace" className="pedal-face"></div>
                <div className="pedal-grip"></div>
              </div>
              <input
                id="brake"
                className="throttle-input"
                type="range"
                min="0"
                max="100"
                defaultValue="0"
              />
              <div className="throttle-readout">
                <span id="brakeValue">0</span>%
              </div>
            </div>
            <div className="control-block">
              <div className="control-label">ENGINE START</div>
              <EngineStartButton />
            </div>
          </div>

          <div className="controls-secondary">
            <div className="control-block">
              <div className="control-label">ENGINE CONFIG</div>
              <div className="toggle-group" data-group="engine">
                <button className="toggle active" data-value="I4">
                  I4
                </button>
              </div>
              <div className="toggle-group" data-group="induction">
                <button className="toggle active" data-value="NA">
                  NA
                </button>
                <button className="toggle" data-value="TURBO">
                  TURBO
                </button>
              </div>
              <div className="toggle-group" data-group="exhaust">
                <button className="toggle active" data-value="STOCK">
                  STOCK
                </button>
                <button className="toggle" data-value="STRAIGHT">
                  STRAIGHT
                </button>
              </div>
            </div>
            <div className="control-block">
              <div className="control-label">DRIVE MODE</div>
              <div className="toggle-group" data-group="drive">
                <button className="toggle" data-value="ECO">
                  ECO
                </button>
                <button className="toggle active" data-value="NORMAL">
                  NORMAL
                </button>
                <button className="toggle" data-value="SPORT">
                  SPORT
                </button>
                <button className="toggle" data-value="SPORT_PLUS">
                  SPORT+
                </button>
              </div>
            </div>
            <div className="control-block">
              <div className="control-label">TRANSMISSION</div>
              <div className="toggle-group" data-group="trans">
                <button className="toggle" data-value="R">
                  R
                </button>
                <button className="toggle" data-value="N">
                  N
                </button>
                <button className="toggle active" data-value="D">
                  D
                </button>
              </div>
            </div>
            <div className="control-block">
              <div className="control-label">VIEW</div>
              <button id="singleCylinderToggle" className="toggle small" data-value="OFF">
                SINGLE CYLINDER
              </button>
            </div>
          </div>

          <details
            className="controls-advanced"
            open={openPanels.advanced}
            onToggle={(event) => {
              if (event.target === event.currentTarget) setPanelOpen("advanced", event.currentTarget.open);
            }}
          >
            <summary className="advanced-title">
              <span>ADVANCED SETTINGS</span>
              <span className="advanced-state">AUDIO / SHIFT / DRIVE / RATIOS / TIME</span>
            </summary>
            <div className="advanced-grid">
              <div className="control-block" id="audioBlock" data-audio-mode="SYNTH">
                <div className="control-label">AUDIO</div>
                <div className="toggle-group" data-group="audioMode">
                  <button className="toggle active" data-value="SYNTH">
                    SYNTH
                  </button>
                  <button className="toggle" data-value="COMBUSTION">
                    COMBUSTION
                  </button>
                </div>
                <div className="slider-row audio-common">
                  <label htmlFor="volume">MASTER</label>
                  <input
                    id="volume"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="30"
                  />
                  <span className="slider-value" id="volumeValue">
                    30
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="resonance">RESONANCE</label>
                  <input
                    id="resonance"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="40"
                  />
                  <span className="slider-value" id="resonanceValue">
                    40
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="rumble">RUMBLE</label>
                  <input
                    id="rumble"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="70"
                  />
                  <span className="slider-value" id="rumbleValue">
                    70
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="growl">GROWL</label>
                  <input
                    id="growl"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="55"
                  />
                  <span className="slider-value" id="growlValue">
                    55
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="burble">BURBLE</label>
                  <input
                    id="burble"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="60"
                  />
                  <span className="slider-value" id="burbleValue">
                    60
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="dirt">DIRT</label>
                  <input
                    id="dirt"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="55"
                  />
                  <span className="slider-value" id="dirtValue">
                    55
                  </span>
                </div>
                <div className="slider-row audio-synth">
                  <label htmlFor="noise">NOISE</label>
                  <input
                    id="noise"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="35"
                  />
                  <span className="slider-value" id="noiseValue">
                    35
                  </span>
                </div>
                <div className="slider-row audio-combustion">
                  <label htmlFor="combustion">COMBUSTION LVL</label>
                  <input
                    id="combustion"
                    className="mini-slider"
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="40"
                  />
                  <span className="slider-value" id="combustionValue">
                    40
                  </span>
                </div>
                <button
                  id="limiterToggle"
                  className="toggle small active"
                  data-value="ON"
                >
                  REV LIMITER
                </button>
              </div>
              <div className="control-block">
                <div className="control-label">SHIFT TUNING</div>
                <div className="slider-row">
                  <label htmlFor="upshiftBase">UPSHIFT BASE</label>
                  <input
                    id="upshiftBase"
                    className="mini-slider"
                    type="range"
                    min="1800"
                    max="5200"
                    defaultValue="3000"
                  />
                  <span className="slider-value" id="upshiftBaseValue">
                    3000
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="upshiftSpan">UPSHIFT SPAN</label>
                  <input
                    id="upshiftSpan"
                    className="mini-slider"
                    type="range"
                    min="300"
                    max="2500"
                    defaultValue="1100"
                  />
                  <span className="slider-value" id="upshiftSpanValue">
                    1100
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="downshiftBase">DOWNSHIFT BASE</label>
                  <input
                    id="downshiftBase"
                    className="mini-slider"
                    type="range"
                    min="900"
                    max="2600"
                    defaultValue="1700"
                  />
                  <span className="slider-value" id="downshiftBaseValue">
                    1700
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="downshiftSpan">DOWNSHIFT SPAN</label>
                  <input
                    id="downshiftSpan"
                    className="mini-slider"
                    type="range"
                    min="200"
                    max="1400"
                    defaultValue="600"
                  />
                  <span className="slider-value" id="downshiftSpanValue">
                    600
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="desiredRpm">TARGET RPM</label>
                  <input
                    id="desiredRpm"
                    className="mini-slider"
                    type="range"
                    min="1500"
                    max="3200"
                    defaultValue="2200"
                  />
                  <span className="slider-value" id="desiredRpmValue">
                    2200
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="shiftDuration">SHIFT SPEED</label>
                  <input
                    id="shiftDuration"
                    className="mini-slider"
                    type="range"
                    min="100"
                    max="600"
                    defaultValue="250"
                  />
                  <span className="slider-value" id="shiftDurationValue">
                    250ms
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="upshiftCooldown">UPSHIFT GAP</label>
                  <input
                    id="upshiftCooldown"
                    className="mini-slider"
                    type="range"
                    min="400"
                    max="2000"
                    defaultValue="1000"
                  />
                  <span className="slider-value" id="upshiftCooldownValue">
                    1000ms
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="downshiftCooldown">DOWNSHIFT GAP</label>
                  <input
                    id="downshiftCooldown"
                    className="mini-slider"
                    type="range"
                    min="100"
                    max="1000"
                    defaultValue="200"
                  />
                  <span className="slider-value" id="downshiftCooldownValue">
                    200ms
                  </span>
                </div>
              </div>
              <div className="control-block">
                <div className="control-label">THROTTLE RESPONSE</div>
                <div className="slider-row">
                  <label htmlFor="throttleRampUp">RAMP UP</label>
                  <input
                    id="throttleRampUp"
                    className="mini-slider"
                    type="range"
                    min="30"
                    max="140"
                    defaultValue="70"
                  />
                  <span className="slider-value" id="throttleRampUpValue">
                    70
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="throttleRampDown">RAMP DOWN</label>
                  <input
                    id="throttleRampDown"
                    className="mini-slider"
                    type="range"
                    min="40"
                    max="200"
                    defaultValue="120"
                  />
                  <span className="slider-value" id="throttleRampDownValue">
                    120
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="coastFactor">COAST INERTIA</label>
                  <input
                    id="coastFactor"
                    className="mini-slider"
                    type="range"
                    min="5"
                    max="60"
                    defaultValue="18"
                  />
                  <span className="slider-value" id="coastFactorValue">
                    18
                  </span>
                </div>
              </div>
              <div className="control-block">
                <div className="control-label">DRIVE TUNING</div>
                <div className="slider-row">
                  <label htmlFor="driveSteeringLock">STEERING RANGE</label>
                  <input id="driveSteeringLock" className="mini-slider" type="range" min="10" max="40" defaultValue="32" />
                  <span className="slider-value" id="driveSteeringLockValue">32°</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveHighSpeedSteer">HIGH-SPEED STEER</label>
                  <input id="driveHighSpeedSteer" className="mini-slider" type="range" min="25" max="80" defaultValue="45" />
                  <span className="slider-value" id="driveHighSpeedSteerValue">45%</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveSteeringResponse">STEERING RESPONSE</label>
                  <input id="driveSteeringResponse" className="mini-slider" type="range" min="2" max="14" step="0.5" defaultValue="8" />
                  <span className="slider-value" id="driveSteeringResponseValue">8.0x</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveTurnRate">TURN RATE</label>
                  <input id="driveTurnRate" className="mini-slider" type="range" min="5" max="18" defaultValue="14" />
                  <span className="slider-value" id="driveTurnRateValue">0.14x</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveLaunchGain">LAUNCH GAIN</label>
                  <input id="driveLaunchGain" className="mini-slider" type="range" min="40" max="180" defaultValue="100" />
                  <span className="slider-value" id="driveLaunchGainValue">100%</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveBrakeForce">BRAKE FORCE</label>
                  <input id="driveBrakeForce" className="mini-slider" type="range" min="40" max="180" defaultValue="100" />
                  <span className="slider-value" id="driveBrakeForceValue">100%</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveCoastDecay">COAST DECAY</label>
                  <input id="driveCoastDecay" className="mini-slider" type="range" min="20" max="150" defaultValue="72" />
                  <span className="slider-value" id="driveCoastDecayValue">0.72x</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveCreep">IDLE CREEP</label>
                  <input id="driveCreep" className="mini-slider" type="range" min="0" max="100" defaultValue="38" />
                  <span className="slider-value" id="driveCreepValue">38%</span>
                </div>
                <div className="slider-row">
                  <label htmlFor="driveSpeedLimit">VEHICLE SPEED LIMIT</label>
                  <input id="driveSpeedLimit" className="mini-slider" type="range" min="12" max="40" defaultValue="24" />
                  <span className="slider-value" id="driveSpeedLimitValue">24</span>
                </div>
              </div>
              <div className="control-block">
                <div className="control-label">GEAR RATIOS</div>
                <div className="slider-row">
                  <label htmlFor="gear1">GEAR 1</label>
                  <input
                    id="gear1"
                    className="mini-slider"
                    type="range"
                    min="2.0"
                    max="4.5"
                    step="0.05"
                    defaultValue="3.2"
                  />
                  <span className="slider-value" id="gear1Value">
                    3.20
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="gear2">GEAR 2</label>
                  <input
                    id="gear2"
                    className="mini-slider"
                    type="range"
                    min="1.4"
                    max="2.8"
                    step="0.05"
                    defaultValue="2.1"
                  />
                  <span className="slider-value" id="gear2Value">
                    2.10
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="gear3">GEAR 3</label>
                  <input
                    id="gear3"
                    className="mini-slider"
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    defaultValue="1.5"
                  />
                  <span className="slider-value" id="gear3Value">
                    1.50
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="gear4">GEAR 4</label>
                  <input
                    id="gear4"
                    className="mini-slider"
                    type="range"
                    min="0.8"
                    max="1.6"
                    step="0.05"
                    defaultValue="1.1"
                  />
                  <span className="slider-value" id="gear4Value">
                    1.10
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="gear5">GEAR 5</label>
                  <input
                    id="gear5"
                    className="mini-slider"
                    type="range"
                    min="0.6"
                    max="1.2"
                    step="0.05"
                    defaultValue="0.9"
                  />
                  <span className="slider-value" id="gear5Value">
                    0.90
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="gear6">GEAR 6</label>
                  <input
                    id="gear6"
                    className="mini-slider"
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    defaultValue="0.75"
                  />
                  <span className="slider-value" id="gear6Value">
                    0.75
                  </span>
                </div>
                <div className="slider-row">
                  <label htmlFor="finalDrive">FINAL DRIVE</label>
                  <input
                    id="finalDrive"
                    className="mini-slider"
                    type="range"
                    min="2.5"
                    max="4.5"
                    step="0.05"
                    defaultValue="3.8"
                  />
                  <span className="slider-value" id="finalDriveValue">
                    3.80
                  </span>
                </div>
              </div>
              <div className="control-block">
                <div className="control-label">TIME</div>
                <div className="slider-row">
                  <label htmlFor="timeScale">SLOW-MO</label>
                  <input
                    id="timeScale"
                    className="mini-slider"
                    type="range"
                    min="5"
                    max="200"
                    defaultValue="100"
                  />
                  <span className="slider-value" id="timeScaleValue">
                    1.00x
                  </span>
                </div>
              </div>
            </div>
          </details>
            </div>
          </div>
        </details>
      <details
        className="summary intro-drawer"
        open={openPanels.about}
        onToggle={(event) => {
          if (event.target === event.currentTarget) setPanelOpen("about", event.currentTarget.open);
        }}
      >
        <summary className="drawer-summary">
          <span className="summary-title">Interactive engine sandbox</span>
          <span className="drawer-meta">HOW TO USE</span>
          <span className="drawer-action" aria-hidden="true"></span>
        </summary>
        <div className="summary-body">
          Control throttle and brake, start/stop the engine, and watch the 4‑stroke cycle in
          real time. Tune audio, shifting, driving behavior, and gear ratios in Advanced Settings
          to shape the sound and behavior.
        </div>
      </details>
        </aside>
      </main>
      <canvas id="engineCanvas" className="engine-simulation-canvas" width={640} height={640}></canvas>
    </div>
  );
}
