import pkg from "../../package.json";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cravely.space";
export const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "https://cravely.space";
export const APP_VERSION = `v${pkg.version}`;
