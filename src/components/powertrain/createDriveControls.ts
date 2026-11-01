export type DriveInput = {
  throttle: number;
  brake: number;
  steering: number;
  reset: boolean;
};

type DriveControlsOptions = {
  isEnabled: () => boolean;
};

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** Keyboard input is kept independent of the simulation so it can later be
 * replaced by controller input without changing the vehicle rig. */
export function createDriveControls({ isEnabled }: DriveControlsOptions) {
  const keys = new Set<string>();
  let resetRequested = false;

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled() || isEditableTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (!["w", "a", "s", "d", "arrowup", "arrowdown", "r"].includes(key)) return;
    event.preventDefault();
    if (key === "r") {
      resetRequested = true;
      return;
    }
    keys.add(key);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    keys.delete(key);
  };
  const onBlur = () => keys.clear();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return {
    read(): DriveInput {
      const brake = keys.has("s") || keys.has("arrowdown") ? 100 : 0;
      // Braking always wins over throttle. This prevents W + S from sending
      // conflicting commands into the engine model.
      const throttle = brake > 0 ? 0 : keys.has("w") || keys.has("arrowup") ? 100 : 0;
      const steering = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const reset = resetRequested;
      resetRequested = false;
      return { throttle, brake, steering, reset };
    },
    dispose() {
      keys.clear();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
