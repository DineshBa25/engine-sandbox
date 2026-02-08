type EngineStartButtonProps = {
  id?: string;
};

export default function EngineStartButton({ id = "engineStart" }: EngineStartButtonProps) {
  return (
    <button id={id} className="engine-button" data-value="OFF" type="button">
      <span className="engine-button__ring"></span>
      <span className="engine-button__label">
        ENGINE
        <span>START</span>
        STOP
      </span>
    </button>
  );
}
