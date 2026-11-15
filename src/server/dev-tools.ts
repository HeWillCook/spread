/** Dev tooling is only mounted by `next dev`; production builds never see it. */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
