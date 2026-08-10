import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

export const SKILL_ID = "hiapi-seedance-2-5-video";
export const SKILL_VERSION = "1.0.0";
export const DEFAULT_BASE_URL = "https://api.hiapi.ai";
export const DEFAULT_SITE_URL = "https://www.hiapi.ai";
export const DEFAULT_SKILLS_MANIFEST_URL = "https://raw.githubusercontent.com/HiAPIAI/hiapi-skills/main/skills.json";
export const DEFAULT_REPOSITORY_POLICY_URL = "https://raw.githubusercontent.com/HiAPIAI/hiapi-seedance-2-5-video-skill/main/update-policy.json";
export const UPDATE_COMMAND = "npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y";

export const MODELS = Object.freeze({
  text: "seedance-2.5/text-to-video",
  image: "seedance-2.5/image-to-video",
  reference: "seedance-2.5/reference-to-video",
});
export const DEFAULT_SECONDS = 5;
export const MIN_SECONDS = 4;
export const MAX_SECONDS = 30;
export const DEFAULT_RESOLUTION = "480p";
export const SUPPORTED_RESOLUTIONS = new Set(["480p", "720p"]);
export const DEFAULT_RATIO = "adaptive";
export const SUPPORTED_RATIOS = new Set(["16:9", "4:3", "1:1", "3:4", "9:16", "21:9", "adaptive"]);
export const SUPPORTED_OUTPUT_FORMATS = new Set(["mp4", "mov"]);
export const MAX_REFERENCE_IMAGES = 30;
export const MAX_REFERENCE_VIDEOS = 10;
export const MAX_REFERENCE_AUDIO = 10;
export const MIN_REFERENCE_MEDIA_SECONDS = 2;
export const MAX_REFERENCE_MEDIA_SECONDS = 30;
export const MAX_REFERENCE_MEDIA_TOTAL_SECONDS = 30;
export const DEFAULT_TIMEOUT_MINUTES = 120;
export const MIN_TIMEOUT_MINUTES = 1;
export const MAX_TIMEOUT_MINUTES = 180;
export const POLL_INTERVAL_MS = 5_000;
export const DEFAULT_OUTPUT_DIR = "outputs";
export const DEFAULT_STORAGE = "temp";
export const SUPPORTED_STORAGE = new Set(["temp", "persistent"]);
export const HIAPI_API_KEYS_URL = "https://www.hiapi.ai/en/dashboard/api-keys";
export const HIAPI_DASHBOARD_URL = "https://www.hiapi.ai/en/dashboard";
export const HIAPI_PRICING_URL = "https://www.hiapi.ai/en/pricing";

const TERMINAL_FAILURES = new Set(["fail", "failed", "error", "cancelled", "canceled"]);

export function resolveConfig(env = process.env) {
  const apiKey = env.HIAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      `HIAPI_API_KEY is required for task creation or recovery. Get one at ${HIAPI_API_KEYS_URL}, then export it in your shell.`,
    );
  }
  return {
    apiKey,
    baseUrl: (env.HIAPI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  };
}

export function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  const aliases = new Map([
    ["text", "text"], ["text-to-video", "text"], ["t2v", "text"],
    ["image", "image"], ["image-to-video", "image"], ["i2v", "image"],
    ["reference", "reference"], ["reference-to-video", "reference"], ["r2v", "reference"],
  ]);
  if (!aliases.has(mode)) {
    throw new Error('Unsupported mode. Use "text", "image", or "reference".');
  }
  return aliases.get(mode);
}

export function resolveMode(options = {}) {
  const videoRefs = normalizeList(options.referenceVideoUrls);
  const imageRefs = normalizeList(options.referenceImageUrls);
  const audioRefs = normalizeList(options.referenceAudioUrls);
  const hasFrames = Boolean(cleanMedia(options.firstFrameUrl || options.inputReference) || cleanMedia(options.lastFrameUrl));
  const inferred = videoRefs.length > 0 ? "reference" : (hasFrames || imageRefs.length > 0 || audioRefs.length > 0 ? "image" : "text");
  const explicit = options.mode ? normalizeMode(options.mode) : inferred;

  if (explicit === "text" && (hasFrames || imageRefs.length || videoRefs.length || audioRefs.length)) {
    throw new Error("Text-to-video cannot include frame or reference media.");
  }
  if (explicit === "image" && videoRefs.length) {
    throw new Error("Reference videos require --mode reference (or omit --mode and let the skill select it).");
  }
  if (explicit === "reference" && videoRefs.length === 0) {
    throw new Error("Reference-to-video requires at least one --reference-video-url.");
  }
  return explicit;
}

export function normalizeSeconds(value = DEFAULT_SECONDS) {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    throw new Error(`Unsupported duration "${value}". Use an integer from ${MIN_SECONDS} to ${MAX_SECONDS}.`);
  }
  return seconds;
}

export function normalizeResolution(value = DEFAULT_RESOLUTION) {
  const resolution = String(value ?? DEFAULT_RESOLUTION).trim().toLowerCase();
  if (!SUPPORTED_RESOLUTIONS.has(resolution)) {
    throw new Error(`Unsupported resolution "${value}". Current HiAPI Seedance 2.5 supports 480p or 720p.`);
  }
  return resolution;
}

export function normalizeRatio(value = DEFAULT_RATIO, mode = "text") {
  const ratio = String(value ?? DEFAULT_RATIO).trim();
  if (!SUPPORTED_RATIOS.has(ratio)) {
    throw new Error(`Unsupported ratio "${value}". Use one of: ${Array.from(SUPPORTED_RATIOS).join(", ")}.`);
  }
  if (mode === "image" && ratio !== "adaptive") {
    throw new Error('Seedance 2.5 image-to-video follows the first frame. Use --ratio adaptive.');
  }
  return ratio;
}

export function normalizeOutputFormat(value = "mp4") {
  const format = String(value ?? "mp4").trim().toLowerCase();
  if (!SUPPORTED_OUTPUT_FORMATS.has(format)) {
    throw new Error(`Unsupported output format "${value}". Use mp4 or mov.`);
  }
  return format;
}

export function normalizeTimeoutMinutes(value = DEFAULT_TIMEOUT_MINUTES) {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < MIN_TIMEOUT_MINUTES || minutes > MAX_TIMEOUT_MINUTES) {
    throw new Error(`Unsupported timeout "${value}". Use ${MIN_TIMEOUT_MINUTES}-${MAX_TIMEOUT_MINUTES} minutes.`);
  }
  return minutes;
}

export function normalizeStorage(value = DEFAULT_STORAGE) {
  const storage = String(value ?? "").trim().toLowerCase();
  if (!SUPPORTED_STORAGE.has(storage)) {
    throw new Error(`Unsupported storage "${value}". Use temp or persistent.`);
  }
  return storage;
}

export function normalizeBoolean(value, name) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new Error(`${name} must be true or false.`);
}

export function normalizeList(value) {
  if (value === undefined || value === null || value === "") return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(cleanMedia).filter(Boolean);
}

function cleanMedia(value) {
  return String(value ?? "").trim();
}

function validateTimedReferences(label, urls, durations) {
  if (urls.length === 0) {
    if (normalizeList(durations).length) throw new Error(`${label} durations were provided without ${label} URLs.`);
    return;
  }
  const rawDurations = Array.isArray(durations) ? durations : (durations === undefined ? [] : [durations]);
  if (rawDurations.length !== urls.length) {
    throw new Error(`Provide one --${label.replaceAll(" ", "-")}-duration for each --${label.replaceAll(" ", "-")}-url.`);
  }
  const normalized = rawDurations.map(Number);
  if (normalized.some((duration) => !Number.isFinite(duration) || duration < MIN_REFERENCE_MEDIA_SECONDS || duration > MAX_REFERENCE_MEDIA_SECONDS)) {
    throw new Error(`Each ${label} must be ${MIN_REFERENCE_MEDIA_SECONDS}-${MAX_REFERENCE_MEDIA_SECONDS} seconds.`);
  }
  const total = normalized.reduce((sum, duration) => sum + duration, 0);
  if (total > MAX_REFERENCE_MEDIA_TOTAL_SECONDS) {
    throw new Error(`${label} total duration must not exceed ${MAX_REFERENCE_MEDIA_TOTAL_SECONDS} seconds.`);
  }
}

export function normalizeMediaOptions(options = {}, mode = resolveMode(options)) {
  const firstFrameUrl = cleanMedia(options.firstFrameUrl || options.inputReference);
  const lastFrameUrl = cleanMedia(options.lastFrameUrl);
  const referenceImageUrls = normalizeList(options.referenceImageUrls);
  const referenceVideoUrls = normalizeList(options.referenceVideoUrls);
  const referenceAudioUrls = normalizeList(options.referenceAudioUrls);

  if (lastFrameUrl && !firstFrameUrl) {
    throw new Error("Seedance 2.5 last-frame mode requires --first-frame-url.");
  }
  if (referenceImageUrls.length > MAX_REFERENCE_IMAGES) {
    throw new Error(`Seedance 2.5 accepts at most ${MAX_REFERENCE_IMAGES} reference images.`);
  }
  if (referenceVideoUrls.length > MAX_REFERENCE_VIDEOS) {
    throw new Error(`Seedance 2.5 accepts at most ${MAX_REFERENCE_VIDEOS} reference videos.`);
  }
  if (referenceAudioUrls.length > MAX_REFERENCE_AUDIO) {
    throw new Error(`Seedance 2.5 accepts at most ${MAX_REFERENCE_AUDIO} reference audio clips.`);
  }
  if (mode === "reference" && referenceVideoUrls.length === 0) {
    throw new Error("Reference-to-video requires at least one reference video.");
  }
  if (mode === "reference" && (firstFrameUrl || lastFrameUrl)) {
    throw new Error("Reference-to-video does not accept first/last-frame fields.");
  }
  if (mode === "reference" && referenceAudioUrls.length > 0 && referenceVideoUrls.length === 0) {
    throw new Error("Reference audio must be provided together with at least one reference video.");
  }

  validateTimedReferences("reference video", referenceVideoUrls, options.referenceVideoDurations);
  validateTimedReferences("reference audio", referenceAudioUrls, options.referenceAudioDurations);
  return { firstFrameUrl, lastFrameUrl, referenceImageUrls, referenceVideoUrls, referenceAudioUrls };
}

export function buildVideoPayload(options = {}) {
  const prompt = String(options.prompt || "").trim();
  if (!prompt) throw new Error("A prompt is required for a new Seedance 2.5 task.");
  const mode = resolveMode(options);
  const media = normalizeMediaOptions(options, mode);
  const input = {
    prompt,
    duration: normalizeSeconds(options.seconds),
    resolution: normalizeResolution(options.resolution),
    aspect_ratio: normalizeRatio(options.ratio, mode),
    output_format: normalizeOutputFormat(options.outputFormat),
  };

  if (options.generateAudio !== undefined) input.generate_audio = normalizeBoolean(options.generateAudio, "generate_audio");
  if (options.webSearch !== undefined) input.web_search = normalizeBoolean(options.webSearch, "web_search");
  if (options.watermark !== undefined) {
    if (mode === "reference") throw new Error("The current reference-to-video contract does not accept watermark.");
    input.watermark = normalizeBoolean(options.watermark, "watermark");
  }
  if (media.firstFrameUrl) input.first_frame_url = media.firstFrameUrl;
  if (media.lastFrameUrl) input.last_frame_url = media.lastFrameUrl;
  if (media.referenceImageUrls.length) input.reference_image_urls = media.referenceImageUrls;
  if (media.referenceVideoUrls.length) input.reference_video_urls = media.referenceVideoUrls;
  if (media.referenceAudioUrls.length) input.reference_audio_urls = media.referenceAudioUrls;

  const payload = { model: MODELS[mode], input };
  const storage = normalizeStorage(options.storage);
  if (storage === "persistent") {
    if (!options.acceptStorageCost) {
      throw new Error('Persistent storage is billed. Re-run with --accept-storage-cost after reviewing https://docs.hiapi.ai/storage/.');
    }
    payload.storage = "persistent";
  }
  if (options.callbackUrl) {
    payload.callback = { url: String(options.callbackUrl).trim(), when: "final" };
  }
  return payload;
}

export function redactPayload(payload) {
  const clone = structuredClone(payload);
  const input = clone.input || {};
  for (const field of ["first_frame_url", "last_frame_url"]) {
    if (String(input[field] || "").startsWith("data:")) input[field] = `[data-uri:${input[field].length} chars]`;
  }
  for (const field of ["reference_image_urls", "reference_video_urls", "reference_audio_urls"]) {
    if (Array.isArray(input[field])) {
      input[field] = input[field].map((value) => String(value).startsWith("data:") ? `[data-uri:${value.length} chars]` : value);
    }
  }
  return clone;
}

export async function requestJson(url, options = {}, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, options);
  } catch (cause) {
    const error = new Error(`Network request failed: ${cause?.message || cause}`);
    error.cause = cause;
    throw error;
  }
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(buildHttpErrorMessage(response.status, body));
    error.httpStatus = response.status;
    error.httpResponse = body;
    throw error;
  }
  return body;
}

export function buildHttpErrorMessage(status, body) {
  const summary = summarizeErrorBody(body);
  const prefix = `HiAPI request failed with HTTP ${status}: ${summary}`;
  const lower = summary.toLowerCase();
  if (status === 401 || (status === 403 && !/(quota|credit|balance|payment)/i.test(lower))) {
    return `${prefix}\nCheck HIAPI_API_KEY at ${HIAPI_API_KEYS_URL}.`;
  }
  if (status === 402 || /(quota|credit|balance|payment|insufficient)/i.test(lower)) {
    return `${prefix}\nCheck balance at ${HIAPI_DASHBOARD_URL} and pricing at ${HIAPI_PRICING_URL}.`;
  }
  if (status === 400 || lower.includes("invalid")) {
    return `${prefix}\nRun --dry-run --estimate and check the selected mode, 4-30s duration, 480p/720p resolution, media counts, formats, sizes, and reference durations.`;
  }
  if (status === 429) return `${prefix}\nWait and retry, or reduce concurrent video tasks.`;
  return prefix;
}

export function extractTaskId(response) {
  return response?.data?.taskId || response?.data?.task_id || response?.taskId || response?.task_id || null;
}

export function extractStatus(response) {
  return String(response?.data?.status || response?.status || "").toLowerCase();
}

export function isTerminalFailureStatus(status) {
  return TERMINAL_FAILURES.has(String(status || "").toLowerCase());
}

export function extractTaskFailureSummary(response) {
  return summarizeErrorBody(response?.data?.error || response?.error || response?.data?.message || response?.message || response);
}

export function extractVideoUrl(response) {
  const output = response?.data?.output || response?.output;
  if (Array.isArray(output)) {
    const item = output.find((entry) => {
      const url = typeof entry === "string" ? entry : entry?.url;
      const type = typeof entry === "object" ? String(entry?.type || "").toLowerCase() : "";
      return type === "video" || /\.(?:mp4|mov|webm)(?:\?|#|$)/i.test(String(url || ""));
    });
    if (typeof item === "string") return item;
    if (item?.url) return item.url;
  }
  return response?.data?.video_url || response?.video_url || response?.data?.url || response?.url || response?.metadata?.url || null;
}

export async function createVideoTask(payload, config = resolveConfig(), options = {}) {
  const idempotencyKey = String(options.idempotencyKey || randomUUID()).trim();
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  };
  const response = await requestJson(`${config.baseUrl}/v1/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }, options.fetchImpl || fetch);
  const taskId = extractTaskId(response);
  if (!taskId) throw new Error("HiAPI accepted the request but did not return a task ID.");
  return { taskId, idempotencyKey, response };
}

export async function getTask(taskId, config = resolveConfig(), fetchImpl = fetch) {
  return requestJson(`${config.baseUrl}/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
  }, fetchImpl);
}

export async function waitForVideo(taskId, config = resolveConfig(), options = {}) {
  const timeoutMs = normalizeTimeoutMinutes(options.timeoutMinutes) * 60_000;
  const pollIntervalMs = Number(options.pollIntervalMs ?? POLL_INTERVAL_MS);
  const deadline = Date.now() + timeoutMs;
  let transientFailures = 0;

  while (Date.now() < deadline) {
    let response;
    try {
      response = await getTask(taskId, config, options.fetchImpl || fetch);
      transientFailures = 0;
    } catch (error) {
      if (![429, 500, 502, 503, 504].includes(error.httpStatus) && !error.message.startsWith("Network request failed")) throw error;
      transientFailures += 1;
      const delay = Math.min(pollIntervalMs * (2 ** Math.min(transientFailures, 3)), 30_000);
      await sleep(delay);
      continue;
    }
    const status = extractStatus(response);
    const videoUrl = extractVideoUrl(response);
    if (status === "success" && videoUrl) return { response, videoUrl };
    if (isTerminalFailureStatus(status)) {
      throw new Error(`Video generation failed: ${extractTaskFailureSummary(response)}`);
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Video generation timed out after ${normalizeTimeoutMinutes(options.timeoutMinutes)} minutes. Task ${taskId} may still be running; resume it with --resume-task-id ${taskId}.`);
}

export async function saveVideoOutput(videoUrl, outputDir = DEFAULT_OUTPUT_DIR, options = {}) {
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) return null;
  let response;
  try { response = await (options.fetchImpl || fetch)(videoUrl); } catch { return null; }
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const urlExtension = extname(new URL(videoUrl).pathname).toLowerCase();
  const extension = urlExtension === ".mov" || /quicktime/i.test(contentType) ? ".mov" : ".mp4";
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const filename = `seedance-2-5-${timestamp()}${extension}`;
  const path = join(directory, filename);
  await writeFile(path, bytes);
  return path;
}

export async function generateVideo(options = {}, config = resolveConfig()) {
  let taskId = String(options.resumeTaskId || "").trim();
  let idempotencyKey = options.idempotencyKey ? String(options.idempotencyKey).trim() : null;
  let model = null;
  let payload = null;

  if (!taskId) {
    payload = buildVideoPayload(options);
    model = payload.model;
    idempotencyKey ||= randomUUID();
    console.error(`HiAPI idempotency key: ${idempotencyKey}`);
    let created;
    try {
      created = await createVideoTask(payload, config, { idempotencyKey });
    } catch (error) {
      if (error.message.startsWith("Network request failed")) {
        throw new Error(`${error.message}\nSubmission acceptance is unknown. Do not create a new paid task blindly; retry with --idempotency-key ${idempotencyKey}.`);
      }
      throw error;
    }
    taskId = created.taskId;
    console.error(`HiAPI task created: ${taskId}`);
  } else {
    console.error(`Resuming HiAPI task: ${taskId}`);
  }

  if (options.wait === false) return { ok: true, taskId, model, idempotencyKey, status: "submitted" };
  const finished = await waitForVideo(taskId, config, options);
  model ||= finished.response?.data?.model || finished.response?.model || null;
  const path = options.save === false ? null : await saveVideoOutput(finished.videoUrl, options.outputDir, options);
  return {
    ok: true,
    taskId,
    model,
    idempotencyKey,
    status: "success",
    output: path
      ? { kind: "file", path, value: path, sourceUrl: finished.videoUrl }
      : { kind: "url", value: finished.videoUrl },
  };
}

export async function fetchPricingEstimate(payload, options = {}) {
  const siteUrl = (options.siteUrl || process.env.HIAPI_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const response = await (options.fetchImpl || fetch)(`${siteUrl}/api/pricing`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Pricing check failed with HTTP ${response.status}.`);
  const body = await response.json();
  const model = body?.data?.find((entry) => entry?.model_name === payload.model);
  if (!model) throw new Error(`Current public pricing does not list ${payload.model}.`);
  const matchingPolicy = (model.policies || []).find((policy) => policyMatches(policy.rule, payload.input));
  const unitUsd = Number(matchingPolicy?.usd_value ?? model.base_usd_value);
  if (!Number.isFinite(unitUsd)) throw new Error(`Pricing for ${payload.model} is not a numeric per-second rate.`);
  const duration = Number(payload.input.duration);
  return {
    model: payload.model,
    resolution: payload.input.resolution,
    duration,
    unitUsd,
    estimatedUsd: Number((unitUsd * duration).toFixed(4)),
    billingUnit: model.base_display_unit?.en || "per second",
    pricingPage: HIAPI_PRICING_URL,
    note: "Estimate from the current public pricing endpoint; final billing follows the accepted task parameters.",
  };
}

function policyMatches(rule, input) {
  return Object.entries(rule || {}).every(([field, condition]) => {
    if (Object.hasOwn(condition || {}, "match")) return input[field] === condition.match;
    if (condition?.with === true) return input[field] !== undefined && input[field] !== null;
    return false;
  });
}

export async function checkLiveContract(options = {}) {
  const siteUrl = (options.siteUrl || process.env.HIAPI_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl || fetch;
  const expected = {
    [MODELS.text]: { required: ["prompt", "model"], properties: ["duration", "resolution", "aspect_ratio", "generate_audio", "output_format", "watermark", "web_search"] },
    [MODELS.image]: { required: ["prompt", "model"], properties: ["first_frame_url", "last_frame_url", "reference_image_urls", "reference_audio_urls"] },
    [MODELS.reference]: { required: ["prompt", "reference_video_urls", "model"], properties: ["reference_video_urls", "reference_image_urls", "reference_audio_urls"] },
  };
  const checks = [];
  for (const [model, contract] of Object.entries(expected)) {
    const response = await fetchImpl(`${siteUrl}/api/models/content?name=${encodeURIComponent(model)}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Contract check failed for ${model}: HTTP ${response.status}.`);
    const body = await response.json();
    const schema = body?.data?.input_schema || body?.data?.param_schema;
    if (!schema) throw new Error(`Contract check failed for ${model}: public schema missing.`);
    const missingRequired = contract.required.filter((field) => !(schema.required || []).includes(field));
    const missingProperties = contract.properties.filter((field) => !Object.hasOwn(schema.properties || {}, field));
    const duration = schema.properties?.duration || {};
    const resolutions = schema.properties?.resolution?.enum || [];
    const ok = missingRequired.length === 0
      && missingProperties.length === 0
      && duration.minimum === MIN_SECONDS
      && duration.maximum === MAX_SECONDS
      && SUPPORTED_RESOLUTIONS.size === resolutions.length
      && [...SUPPORTED_RESOLUTIONS].every((value) => resolutions.includes(value));
    checks.push({ model, ok, missingRequired, missingProperties, duration: [duration.minimum, duration.maximum], resolutions });
  }
  return { ok: checks.every((check) => check.ok), checkedAt: new Date().toISOString(), checks };
}

export async function checkSkillUpdate(options = {}) {
  const env = options.env || process.env;
  if (["1", "true"].includes(String(env.HIAPI_SKIP_UPDATE_CHECK || "").toLowerCase())) return { status: "skipped" };
  const urls = options.manifestUrls || [
    env.HIAPI_SKILLS_MANIFEST_URL || DEFAULT_SKILLS_MANIFEST_URL,
    env.HIAPI_SKILL_POLICY_URL || DEFAULT_REPOSITORY_POLICY_URL,
  ];
  for (const url of urls) {
    const manifest = await fetchManifest(url, options);
    if (!manifest) continue;
    const skill = Array.isArray(manifest.skills)
      ? manifest.skills.find((entry) => entry?.id === (options.skillId || SKILL_ID))
      : (manifest.id === (options.skillId || SKILL_ID) ? manifest : null);
    if (!skill?.updatePolicy) continue;
    return evaluateUpdatePolicy(skill, options.currentVersion || SKILL_VERSION);
  }
  return { status: "current" };
}

async function fetchManifest(url, options) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs || 1_500) : null;
  try {
    const response = await (options.fetchImpl || fetch)(url, { headers: { Accept: "application/json" }, signal: controller?.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; } finally { if (timer) clearTimeout(timer); }
}

function evaluateUpdatePolicy(skill, currentVersion) {
  const policy = skill.updatePolicy;
  const minimumVersion = policy.minimumVersion || skill.version || currentVersion;
  const latestVersion = policy.latestVersion || skill.version || minimumVersion;
  const updateCommand = policy.updateCommand || UPDATE_COMMAND;
  if (compareVersions(currentVersion, minimumVersion) < 0) {
    return {
      status: "required", latestVersion, minimumVersion, updateCommand,
      message: `${policy.requiredNotice || "This skill version is incompatible with the current API."}\nInstalled: ${currentVersion}; required: ${minimumVersion}.\nUpdate now: ${updateCommand}`,
    };
  }
  if (compareVersions(currentVersion, latestVersion) < 0) {
    return {
      status: "available", latestVersion, minimumVersion, updateCommand,
      message: `${policy.notice || "A newer skill version is available."}\nInstalled: ${currentVersion}; latest: ${latestVersion}.\nUpdate: ${updateCommand}`,
    };
  }
  return { status: "current", latestVersion, minimumVersion, updateCommand };
}

export async function warnOrRequireSkillUpdate(options = {}) {
  const result = await checkSkillUpdate(options);
  if (result.status === "required" && !options.allowRecovery) throw new Error(result.message);
  if (["required", "available"].includes(result.status) && result.message) console.error(result.message);
  return result;
}

export function compareVersions(left, right) {
  const parse = (value) => String(value || "0.0.0").split(/[+-]/, 1)[0].split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left); const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta > 0 ? 1 : -1;
  }
  return 0;
}

export function parseArgs(argv) {
  const options = {};
  const repeatable = new Map([
    ["--reference-image-url", "referenceImageUrls"],
    ["--reference-video-url", "referenceVideoUrls"],
    ["--reference-audio-url", "referenceAudioUrls"],
    ["--reference-video-duration", "referenceVideoDurations"],
    ["--reference-audio-duration", "referenceAudioDurations"],
  ]);
  const values = new Map([
    ["--prompt", "prompt"], ["--mode", "mode"], ["--seconds", "seconds"], ["--resolution", "resolution"],
    ["--ratio", "ratio"], ["--output-format", "outputFormat"], ["--input-reference", "inputReference"],
    ["--first-frame-url", "firstFrameUrl"], ["--last-frame-url", "lastFrameUrl"], ["--output-dir", "outputDir"],
    ["--timeout-minutes", "timeoutMinutes"], ["--storage", "storage"], ["--callback-url", "callbackUrl"],
    ["--resume-task-id", "resumeTaskId"], ["--idempotency-key", "idempotencyKey"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--estimate") options.estimate = true;
    else if (arg === "--check-contract") options.checkContract = true;
    else if (arg === "--generate-audio") options.generateAudio = true;
    else if (arg === "--no-audio" || arg === "--no-generate-audio") options.generateAudio = false;
    else if (arg === "--web-search") options.webSearch = true;
    else if (arg === "--watermark") options.watermark = true;
    else if (arg === "--no-watermark") options.watermark = false;
    else if (arg === "--no-save") options.save = false;
    else if (arg === "--no-wait") options.wait = false;
    else if (arg === "--accept-storage-cost") options.acceptStorageCost = true;
    else if (repeatable.has(arg)) {
      const key = repeatable.get(arg); const next = argv[++index];
      if (next === undefined) throw new Error(`${arg} requires a value.`);
      (options[key] ||= []).push(next);
    } else if (values.has(arg)) {
      const key = values.get(arg); const next = argv[++index];
      if (next === undefined) throw new Error(`${arg} requires a value.`);
      options[key] = next;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.resumeTaskId && (options.dryRun || options.estimate || options.checkContract)) {
    throw new Error("--resume-task-id cannot be combined with --dry-run, --estimate, or --check-contract.");
  }
  return options;
}

export function usage() {
  return `HiAPI Seedance 2.5 video skill

Preflight (no paid task):
  node scripts/hiapi-seedance-2-video.mjs --prompt "..." --seconds 5 --resolution 480p --dry-run --estimate

Create and wait:
  node scripts/hiapi-seedance-2-video.mjs --prompt "..." --seconds 5 --resolution 480p

Recover an existing paid task (does not create another task):
  node scripts/hiapi-seedance-2-video.mjs --resume-task-id <task-id>

Core options:
  --mode <text|image|reference>       Usually inferred from media inputs
  --prompt <text>                     Required for new tasks
  --seconds <4-30>                    Default: 5
  --resolution <480p|720p>            Default: 480p
  --ratio <16:9|4:3|1:1|3:4|9:16|21:9|adaptive>  Default: adaptive
  --output-format <mp4|mov>           Default: mp4
  --first-frame-url <url>             Selects image-to-video
  --last-frame-url <url>              Requires first frame
  --reference-image-url <url>         Repeatable; max 30
  --reference-video-url <url>         Repeatable; max 10; selects reference-to-video
  --reference-video-duration <2-30>   One per reference video; total <= 30s
  --reference-audio-url <url>         Repeatable; max 10
  --reference-audio-duration <2-30>   One per reference audio; total <= 30s
  --generate-audio | --no-audio       API default: audio on
  --web-search                        Enable supported web grounding
  --watermark | --no-watermark        Text/image modes only
  --dry-run                           Validate and print a redacted payload; no paid task
  --estimate                          Fetch current public per-second pricing
  --check-contract                    Compare this skill with live public schemas
  --idempotency-key <key>             Reuse after an ambiguous submit failure
  --resume-task-id <task-id>          Poll/download an existing task without resubmitting
  --no-wait                           Return immediately after task creation
  --timeout-minutes <1-180>            Default: 120
  --output-dir <path>                 Default: outputs
  --no-save                           Return the remote URL without downloading
  --callback-url <https-url>          Add a final-state callback
  --storage <temp|persistent>         Persistent storage is billed
  --accept-storage-cost               Required with persistent storage
`;
}

function summarizeErrorBody(body) {
  if (!body) return "Unknown error";
  if (typeof body === "string") return body;
  return body?.error?.message || body?.message || body?.error || body?.detail || JSON.stringify(body);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

function sleep(ms) { return new Promise((resolveSleep) => setTimeout(resolveSleep, ms)); }
