import { useEffect, useRef, useState } from "react";
import type { DrivetrainTelemetry } from "../engine";
import { stoppedTelemetry } from "./powertrain/layout";
import { usePowertrainScene } from "./powertrain/usePowertrainScene";
import type { PowertrainSceneMode } from "./powertrain/usePowertrainScene";

export default function PowertrainExplorer() {
  const viewportRef = useRef<HTMLElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsLayerRef = useRef<HTMLDivElement>(null);
  const labelsVisibleRef = useRef(false);
  const cutawayEnabledRef = useRef(false);
  const bodyVisibleRef = useRef(true);
  const sceneModeRef = useRef<PowertrainSceneMode>("explore");
  const telemetryRef = useRef<DrivetrainTelemetry>(stoppedTelemetry);
  const [readout, setReadout] = useState(stoppedTelemetry);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [cutawayEnabled, setCutawayEnabled] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(true);
  const [sceneMode, setSceneMode] = useState<PowertrainSceneMode>("explore");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    labelsVisibleRef.current = labelsVisible;
  }, [labelsVisible]);

  useEffect(() => {
    cutawayEnabledRef.current = cutawayEnabled;
  }, [cutawayEnabled]);

  useEffect(() => {
    bodyVisibleRef.current = bodyVisible;
  }, [bodyVisible]);

  useEffect(() => {
    sceneModeRef.current = sceneMode;
  }, [sceneMode]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void viewportRef.current?.requestFullscreen();
  };


  usePowertrainScene({
    mountRef,
    labelsLayerRef,
    labelsVisibleRef,
    cutawayEnabledRef,
    bodyVisibleRef,
    sceneModeRef,
    telemetryRef,
    setReadout,
  });

  const speedRatio = Math.round(readout.speedRatio * 100);
  const lockup = Math.round(readout.lockup * 100);
  const speedMph = Math.round(readout.vehicleSpeed * 2.23694);

  return (
    <section className={`converter-panel powertrain-viewport ${sceneMode === "drive" ? "drive-mode" : "explore-mode"}`} ref={viewportRef}>
      <div className="converter-heading">
        <div className="converter-heading-copy">
          <div className="panel-title">LIVE POWERTRAIN</div>
          <div className="converter-subtitle">
            {sceneMode === "drive"
              ? "OFF-ROAD PROVING GROUND / INLINE-4 / 6-SPEED AUTOMATIC"
              : "INLINE-4 / TORQUE CONVERTER / 6-SPEED AUTOMATIC"}
          </div>
          <button
            type="button"
            className={`component-label-toggle body-shell-toggle ${!bodyVisible ? "active" : ""}`}
            onClick={() => setBodyVisible((value) => !value)}
            aria-pressed={!bodyVisible}
          >
            {bodyVisible ? "REMOVE BODY" : "RESTORE BODY"}
          </button>
        </div>
        <div className="converter-actions">
          <button
            type="button"
            className={`component-label-toggle drive-mode-toggle ${sceneMode === "drive" ? "active" : ""}`}
            onClick={() => setSceneMode((mode) => (mode === "drive" ? "explore" : "drive"))}
            aria-pressed={sceneMode === "drive"}
          >
            {sceneMode === "drive" ? "EXPLORE MODE" : "DRIVE MODE"}
          </button>
          <button
            type="button"
            className={`component-label-toggle ${labelsVisible ? "active" : ""}`}
            onClick={() => setLabelsVisible((value) => !value)}
            aria-pressed={labelsVisible}
          >
            {labelsVisible ? "HIDE LABELS" : "SHOW LABELS"}
          </button>
          <button
            type="button"
            className={`component-label-toggle ${cutawayEnabled ? "active" : ""}`}
            onClick={() => setCutawayEnabled((value) => !value)}
            aria-pressed={cutawayEnabled}
          >
            {cutawayEnabled ? "CUTAWAY: ON" : "CUTAWAY: OFF"}
          </button>
          <button
            type="button"
            className="component-label-toggle"
            onClick={toggleFullscreen}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? "EXIT FULL SCREEN" : "FULL SCREEN"}
          </button>
          <div className={`converter-status ${readout.lockup > 0.85 ? "locked" : ""}`}>
            {readout.lockup > 0.85 ? "LOCK-UP" : "FLUID COUPLING"}
          </div>
        </div>
      </div>
      <div className="converter-stage-wrap">
        <div
          className="converter-stage"
          ref={mountRef}
          role="img"
          aria-label="Orbitable 3D inline-four engine, torque converter, and automatic transmission cutaway"
        />
        <div className="converter-stage-labels" ref={labelsLayerRef} aria-hidden="true" />
        <div className="orbit-hint">
          {sceneMode === "drive"
            ? "W THROTTLE · S / DOWN BRAKE · A / D STEER · SELECT D / N / R IN PANEL · DRAG TO ORBIT · R RESET"
            : "DRAG TO ORBIT · SCROLL TO ZOOM"}
        </div>
      </div>
      <div className="converter-readouts">
        <div><span>SPEED</span><strong>{speedMph} MPH</strong></div>
        <div><span>IMPELLER</span><strong>{Math.round(readout.engineRpm)} RPM</strong></div>
        <div><span>TURBINE</span><strong>{Math.round(readout.turbineRpm)} RPM</strong></div>
        <div><span>SLIP</span><strong>{Math.round(readout.slipRpm)} RPM</strong></div>
        <div><span>TORQUE</span><strong>{readout.torqueRatio.toFixed(2)}x</strong></div>
        <div><span>COUPLING</span><strong>{speedRatio}%</strong></div>
        <div><span>LOCK-UP</span><strong>{lockup}%</strong></div>
      </div>
      <div className="converter-legend" aria-label="Torque converter legend">
        <span><i className="legend-pump" />PUMP / IMPELLER</span>
        <span><i className="legend-turbine" />TURBINE</span>
        <span><i className="legend-fluid" />ATF FLOW</span>
        <span><i className="legend-stator" />STATOR</span>
        <span><i className="legend-exhaust" />EXHAUST PULSE</span>
      </div>
    </section>
  );
}
