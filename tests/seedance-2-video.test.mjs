import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  MODELS,
  SKILL_VERSION,
  buildHttpErrorMessage,
  buildVideoPayload,
  checkLiveContract,
  checkSkillUpdate,
  compareVersions,
  createVideoTask,
  extractTaskId,
  extractVideoUrl,
  fetchPricingEstimate,
  isTerminalFailureStatus,
  normalizeMediaOptions,
  normalizeRatio,
  normalizeResolution,
  normalizeSeconds,
  parseArgs,
  redactPayload,
  requestJson,
  resolveMode,
} from "../scripts/lib/seedance-2-video.mjs";

test("runtime and package versions stay aligned", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(SKILL_VERSION, "1.0.0");
  assert.equal(SKILL_VERSION, packageJson.version);
});

test("selects the three production model IDs from media intent", () => {
  assert.equal(resolveMode({}), "text");
  assert.equal(resolveMode({ firstFrameUrl: "asset://first" }), "image");
  assert.equal(resolveMode({ referenceImageUrls: ["asset://style"] }), "image");
  assert.equal(resolveMode({ referenceVideoUrls: ["https://example.com/ref.mp4"] }), "reference");
  assert.throws(() => resolveMode({ mode: "text", firstFrameUrl: "asset://first" }), /cannot include/i);
  assert.throws(() => resolveMode({ mode: "reference" }), /requires at least one/i);
});

test("builds an exact text-to-video payload", () => {
  assert.deepEqual(buildVideoPayload({
    prompt: "A continuous cinematic shot",
    seconds: 30,
    resolution: "720P",
    ratio: "21:9",
    outputFormat: "mov",
    generateAudio: true,
    webSearch: true,
    watermark: false,
  }), {
    model: MODELS.text,
    input: {
      prompt: "A continuous cinematic shot",
      duration: 30,
      resolution: "720p",
      aspect_ratio: "21:9",
      output_format: "mov",
      generate_audio: true,
      web_search: true,
      watermark: false,
    },
  });
});

test("builds image-to-video with first/last frames and optional references", () => {
  const image = "data:image/png;base64,ZmFrZSxkYXRh";
  const payload = buildVideoPayload({
    prompt: "Move between the keyframes",
    firstFrameUrl: image,
    lastFrameUrl: "asset://last",
    referenceImageUrls: ["asset://character"],
    referenceAudioUrls: ["https://example.com/music.mp3"],
    referenceAudioDurations: [12],
  });
  assert.equal(payload.model, MODELS.image);
  assert.equal(payload.input.aspect_ratio, "adaptive");
  assert.equal(payload.input.first_frame_url, image);
  assert.deepEqual(payload.input.reference_audio_urls, ["https://example.com/music.mp3"]);
  assert.equal(redactPayload(payload).input.first_frame_url, `[data-uri:${image.length} chars]`);
  assert.throws(() => buildVideoPayload({ prompt: "x", firstFrameUrl: image, ratio: "16:9" }), /adaptive/i);
});

test("builds reference-to-video and enforces current reference limits", () => {
  const payload = buildVideoPayload({
    prompt: "Use @video1 motion and @audio1 voice",
    referenceVideoUrls: ["https://example.com/ref.mp4"],
    referenceVideoDurations: [30],
    referenceImageUrls: ["asset://subject"],
    referenceAudioUrls: ["https://example.com/voice.wav"],
    referenceAudioDurations: [30],
  });
  assert.equal(payload.model, MODELS.reference);
  assert.deepEqual(payload.input.reference_video_urls, ["https://example.com/ref.mp4"]);
  assert.throws(() => normalizeMediaOptions({
    referenceVideoUrls: Array.from({ length: 11 }, (_, index) => `https://example.com/${index}.mp4`),
    referenceVideoDurations: Array(11).fill(2),
  }, "reference"), /at most 10/i);
  assert.throws(() => normalizeMediaOptions({
    referenceVideoUrls: ["https://example.com/1.mp4", "https://example.com/2.mp4"],
    referenceVideoDurations: [16, 16],
  }, "reference"), /total duration.*30/i);
  assert.throws(() => buildVideoPayload({
    prompt: "x",
    referenceVideoUrls: ["https://example.com/ref.mp4"],
  }), /one --reference-video-duration/i);
  assert.throws(() => buildVideoPayload({
    prompt: "x",
    referenceVideoUrls: ["https://example.com/ref.mp4"],
    referenceVideoDurations: [5],
    watermark: true,
  }), /does not accept watermark/i);
});

test("validates current duration, resolution, and ratio contract", () => {
  assert.equal(normalizeSeconds(4), 4);
  assert.equal(normalizeSeconds("30"), 30);
  assert.throws(() => normalizeSeconds(3), /4 to 30/i);
  assert.throws(() => normalizeSeconds(31), /4 to 30/i);
  assert.equal(normalizeResolution("720P"), "720p");
  assert.throws(() => normalizeResolution("1080p"), /480p or 720p/i);
  assert.equal(normalizeRatio("16:9", "text"), "16:9");
});

test("persistent storage requires explicit cost acceptance", () => {
  assert.throws(() => buildVideoPayload({ prompt: "x", storage: "persistent" }), /billed/i);
  const payload = buildVideoPayload({ prompt: "x", storage: "persistent", acceptStorageCost: true });
  assert.equal(payload.storage, "persistent");
});

test("parses preflight, recovery, idempotency, and repeated media options", () => {
  assert.deepEqual(parseArgs([
    "--prompt", "x", "--dry-run", "--estimate", "--reference-image-url", "asset://1",
    "--reference-image-url", "asset://2", "--idempotency-key", "job-123",
  ]), {
    prompt: "x",
    dryRun: true,
    estimate: true,
    referenceImageUrls: ["asset://1", "asset://2"],
    idempotencyKey: "job-123",
  });
  assert.throws(() => parseArgs(["--resume-task-id", "task-1", "--dry-run"]), /cannot be combined/i);
});

test("extracts task IDs and prefers video from mixed output", () => {
  assert.equal(extractTaskId({ data: { taskId: "task-1" } }), "task-1");
  assert.equal(extractVideoUrl({ data: { output: [
    { type: "image", url: "https://cdn.example.com/last.png" },
    { type: "video", url: "https://cdn.example.com/out.mp4" },
  ] } }), "https://cdn.example.com/out.mp4");
  for (const status of ["fail", "failed", "error", "cancelled", "canceled"]) assert.equal(isTerminalFailureStatus(status), true);
});

test("preserves HTTP metadata and gives actionable errors", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ message: "insufficient balance" }), {
    status: 402,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(() => requestJson("https://example.com", {}, fetchImpl), (error) => {
    assert.equal(error.httpStatus, 402);
    assert.match(error.message, /balance/i);
    return true;
  });
  assert.match(buildHttpErrorMessage(429, { message: "too many" }), /reduce concurrent/i);
});

test("sends an idempotency key when creating a paid task", async () => {
  let seenHeaders;
  const fetchImpl = async (_url, options) => {
    seenHeaders = options.headers;
    return new Response(JSON.stringify({ data: { taskId: "task-123" } }), { status: 200 });
  };
  const result = await createVideoTask(buildVideoPayload({ prompt: "x" }), {
    apiKey: "test-key",
    baseUrl: "https://api.example.com",
  }, { idempotencyKey: "stable-job-key", fetchImpl });
  assert.equal(result.taskId, "task-123");
  assert.equal(seenHeaders["Idempotency-Key"], "stable-job-key");
});

test("calculates the live-shaped per-second price estimate", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ data: [{
    model_name: MODELS.text,
    base_usd_value: 0.1395,
    base_display_unit: { en: "per second" },
    policies: [{ rule: { resolution: { match: "720p" } }, usd_value: 0.3019 }],
  }] }), { status: 200 });
  const estimate = await fetchPricingEstimate(buildVideoPayload({ prompt: "x", seconds: 10, resolution: "720p" }), { fetchImpl });
  assert.equal(estimate.unitUsd, 0.3019);
  assert.equal(estimate.estimatedUsd, 3.019);
});

test("supports optional and required updates with repository fallback", async () => {
  const centralWithoutSkill = { skills: [] };
  const repositoryPolicy = {
    id: "hiapi-seedance-2-5-video",
    version: "1.2.0",
    updatePolicy: {
      latestVersion: "1.2.0",
      minimumVersion: "1.1.0",
      updateCommand: "npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y",
      notice: "Soft upgrade.",
      requiredNotice: "Hard upgrade.",
    },
  };
  const fetchImpl = async (url) => new Response(JSON.stringify(url.endsWith("central") ? centralWithoutSkill : repositoryPolicy), { status: 200 });
  const required = await checkSkillUpdate({ currentVersion: "1.0.0", manifestUrls: ["https://x/central", "https://x/repo"], fetchImpl });
  assert.equal(required.status, "required");
  assert.match(required.message, /Hard upgrade/);
  const available = await checkSkillUpdate({ currentVersion: "1.1.0", manifestUrls: ["https://x/central", "https://x/repo"], fetchImpl });
  assert.equal(available.status, "available");
  assert.match(available.message, /Soft upgrade/);
  assert.equal(compareVersions("1.2.0", "1.1.9"), 1);
});

test("live contract checker validates all three public schemas", async () => {
  const shared = {
    prompt: {}, model: {}, duration: { minimum: 4, maximum: 30 },
    resolution: { enum: ["480p", "720p"] }, generate_audio: {},
    output_format: { enum: ["mp4", "mov"] }, web_search: {},
  };
  const generalRatios = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"];
  const schemas = {
    [MODELS.text]: { required: ["prompt", "model"], properties: {
      ...shared, aspect_ratio: { enum: generalRatios }, watermark: {},
    } },
    [MODELS.image]: { required: ["prompt", "model"], properties: {
      ...shared, aspect_ratio: { enum: ["adaptive"] }, watermark: {},
      first_frame_url: {}, last_frame_url: {},
      reference_image_urls: { maxItems: 30 }, reference_audio_urls: { maxItems: 10 },
    } },
    [MODELS.reference]: { required: ["prompt", "reference_video_urls", "model"], properties: {
      ...shared, aspect_ratio: { enum: generalRatios },
      reference_video_urls: { minItems: 1, maxItems: 10 },
      reference_image_urls: { maxItems: 30 }, reference_audio_urls: { maxItems: 10 },
    } },
  };
  const fetchImpl = async (url) => {
    const model = new URL(url).searchParams.get("name");
    return new Response(JSON.stringify({ data: { input_schema: schemas[model] } }), { status: 200 });
  };
  const result = await checkLiveContract({ fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, 3);
});
