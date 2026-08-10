#!/usr/bin/env node
import { checkLiveContract, DEFAULT_BASE_URL } from "./lib/seedance-2-video.mjs";

async function main() {
  const apiKeyPresent = Boolean(process.env.HIAPI_API_KEY?.trim());
  console.log(`HIAPI_API_KEY: ${apiKeyPresent ? "present" : "missing"}`);
  console.log(`Base URL: ${(process.env.HIAPI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")}`);

  if (process.argv.includes("--live")) {
    const result = await checkLiveContract();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 2;
  }

  if (!apiKeyPresent) {
    console.log("Set HIAPI_API_KEY before creating or recovering a task. --live checks public schemas only and does not validate the key.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
