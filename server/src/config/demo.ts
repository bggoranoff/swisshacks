export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function scenarioNewsEnabled(): boolean {
  return process.env.SCENARIO_NEWS === "true" || demoModeEnabled();
}
