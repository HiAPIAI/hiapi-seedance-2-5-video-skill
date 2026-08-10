#!/usr/bin/env node
import {
  buildVideoPayload,
  checkLiveContract,
  fetchPricingEstimate,
  generateVideo,
  parseArgs,
  redactPayload,
  resolveConfig,
  usage,
  warnOrRequireSkillUpdate,
} from "./lib/seedance-2-video.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.checkContract) {
    const result = await checkLiveContract();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 2;
    return;
  }

  await warnOrRequireSkillUpdate({ allowRecovery: Boolean(options.resumeTaskId || options.dryRun || options.estimate) });

  if (options.dryRun || options.estimate) {
    const payload = buildVideoPayload(options);
    const estimate = options.estimate ? await fetchPricingEstimate(payload) : null;
    console.log(JSON.stringify({
      ok: true,
      paidTaskCreated: false,
      payload: redactPayload(payload),
      estimate,
      next: "Review the payload and estimate, then remove --dry-run and --estimate to create the paid task.",
    }, null, 2));
    return;
  }

  const config = resolveConfig();
  const result = await generateVideo(options, config);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
