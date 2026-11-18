---
name: hiapi-seedance-2-5-video
description: Plan, generate, recover, download, and quality-check Seedance 2.5 videos through HiAPI. Use for Seedance 2.5 text-to-video, first/last-frame image-to-video, multimodal reference-to-video, or a complete brief-to-delivery video workflow.
metadata:
  short-description: Produce Seedance 2.5 videos through HiAPI
---

# HiAPI Seedance 2.5 Video

Use this skill when the user wants Seedance 2.5 generation through HiAPI or wants a repeatable video-production workflow built around it.

## Requirements

- Node.js 18 or newer.
- `HIAPI_API_KEY` for creating or recovering tasks.
- Optional `ffprobe` and `ffmpeg` for technical output inspection.

Links:

- API key: https://www.hiapi.ai/en/dashboard/api-keys
- Pricing: https://www.hiapi.ai/en/pricing
- Docs: https://docs.hiapi.ai/models/video/seedance-2-5/
- Prompt gallery: https://github.com/HiAPIAI/awesome-ai-video-prompts

Never invent a result, task status, price, or downloaded path. Never submit a second paid task merely because polling or downloading was interrupted.

## Start From Intent, Not Parameters

Resolve these before creating a paid task:

1. What must the viewer understand or feel?
2. What evidence or source media is allowed?
3. Which output is required: draft, final clip, edit-ready MOV, or social deliverable?
4. What duration, orientation, audio behavior, and continuity constraints matter?
5. Has the user already authorized the paid generation with the reviewed settings?

If the request is vague, produce a short creative brief and one recommended setup. Do not force the user to specify API fields they do not understand.

For a full brief-to-delivery workflow, read `references/workflow.md`. For direct API details, read `references/api.md`.

## Select The Correct Mode

The skill infers the mode from media inputs, or accepts `--mode` explicitly:

| Intent | HiAPI model ID | Inputs |
| --- | --- | --- |
| Generate from text | `seedance-2.5/text-to-video` | prompt only |
| Animate or bridge images | `seedance-2.5/image-to-video` | first frame, optional last frame, reference images/audio |
| Transfer motion/camera/voice from video | `seedance-2.5/reference-to-video` | at least one reference video, optional images/audio |

Reference-to-video is reference-guided generation, not literal video editing or extension. Do not promise pixel-preserving edits unless a separate editing model and verified contract are used.

## Current HiAPI Contract

- Duration: integer `4`-`30` seconds; reference mode also accepts `-1` for automatic output. Default 5.
- Text/image resolution: `720p` or `1080p`; default `720p`.
- Reference resolution: `480p`, `720p`, or `1080p`; default `480p`.
- Output format: `mp4` or `mov`.
- Text/reference ratios: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, `adaptive`.
- Image-to-video ratio: `adaptive` only; output follows the first frame.
- Native audio: on by API default; use `--generate-audio` or `--no-audio` when the choice matters.
- Reference images: up to 30; JPEG/PNG/WebP/BMP/TIFF/GIF. SVG, HEIC, HEIF and reference asset IDs are unsupported. Only the image-mode first frame may use an asset ID.
- Reference videos: up to 10, each 2-30 seconds, combined duration at most 30 seconds.
- Reference audio: up to 10, each 2-30 seconds, combined duration at most 30 seconds.
- Text/image modes support an optional watermark; reference mode currently does not.

Do not send `480p` for text/image mode or advertise 4K for the current HiAPI contract. Re-run the live contract check before changing these limits.

Read `references/api.md` for every exposed field, CLI mapping and media constraint. Reference-duration flags are optional estimate hints, never trusted billing inputs. R2V charges reference-video duration plus output-video duration; automatic output must be estimated as a range, not a fixed total.

## Paid-Task Preflight

First validate the payload and fetch a current estimate without creating a task:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "A continuous cinematic shot of a glass pavilion above a stormy ocean" \
  --seconds 5 \
  --resolution 720p \
  --ratio 16:9 \
  --dry-run \
  --estimate
```

Show the user the selected mode, model ID, duration, resolution, audio choice, reference set, and estimate when cost or intent is not already approved. A public price estimate is not a billing guarantee.

## Generate

Text-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "A continuous cinematic shot of a glass pavilion above a stormy ocean" \
  --seconds 5 \
  --resolution 1080p \
  --ratio 16:9 \
  --generate-audio
```

First/last-frame image-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "Move naturally from @first frame to the final hero composition" \
  --first-frame-url "https://example.com/first.png" \
  --last-frame-url "https://example.com/last.png" \
  --seconds 8 \
  --resolution 720p
```

Reference-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "Use @video1 camera movement, @image1 character design, and @audio1 voice quality" \
  --reference-video-url "https://example.com/motion.mp4" \
  --reference-video-duration 12 \
  --reference-image-url "https://example.com/character.png" \
  --reference-audio-url "https://example.com/voice.wav" \
  --reference-audio-duration 12 \
  --seconds 12 \
  --resolution 720p
```

The CLI prints an idempotency key before submission and the task ID immediately after creation. It polls for up to 120 minutes by default and downloads the finished video to `outputs/` when possible.

## Recover Without Paying Twice

If polling, the terminal, or download is interrupted after a task ID was printed, resume that task:

```bash
node scripts/hiapi-seedance-2-video.mjs --resume-task-id "tk-hiapi-..."
```

If task submission ended with an ambiguous network failure before a task ID appeared, reuse the printed idempotency key:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "same reviewed prompt" \
  --idempotency-key "the-previously-printed-key"
```

Do not alter the payload while reusing an idempotency key.

For production backends, prefer `--callback-url` with `--no-wait` and reconcile callbacks by task ID. Polling is suitable for local Agent workflows and fallback recovery.

## Prompt Construction

Build prompts in this order:

1. Outcome and subject.
2. Ordered action or timecoded beats.
3. Camera position and movement.
4. Environment, lighting, material, and physics.
5. Continuity anchors: identity, wardrobe, object geometry, spatial layout.
6. Audio: dialogue, ambience, effects, music, or explicit silence.
7. Negative constraints: no random text, logos, identity drift, extra limbs, flicker, or unrequested cuts.

For references, name them in order as `@image1`, `@video1`, and `@audio1`. Use a first/last-frame pair when exact boundary frames matter; use reference mode when motion, camera language, style, or voice transfer matters.

## Output And Quality Gate

After download:

1. Confirm the task reached `success` and record the task ID.
2. Confirm the file exists and decodes fully.
3. Inspect duration, dimensions, frame rate, video/audio streams, and output format.
4. Inspect beginning, middle, end, and any critical action/text frames at full resolution.
5. Check prompt intent, identity/object continuity, motion physics, temporal stability, crop, and audio sync.
6. Keep source, prompt, task ID, raw output, and QC notes together.
7. Treat editing, captions, music mix, platform crop, and publishing as separate downstream stages.

Do not describe a technically valid generation as publish-ready until both visual/audio review and platform-specific review pass.

## Storage

Temporary output is the default and normally expires after about 7 days. Download important results promptly.

Persistent HiAPI storage is billed. Use it only after telling the user and pass both flags:

```bash
--storage persistent --accept-storage-cost
```

## Update Behavior

Every new task checks the HiAPI skills directory, then this repository's `update-policy.json` fallback:

- **Required update:** use 1.2.0 or the published latest version before creating a new paid task. Both the CLI and exported create helper enforce this check.
- **Recovery exception:** an existing task may still be resumed/downloaded during a hard upgrade so user output is not stranded.
- **Offline behavior:** failed or disabled update checks allow preflight and recovery, but block new paid tasks. Restore update access before creating a task.

The central policy blocks normal online use of old versions. It cannot revoke local scripts that bypass checks or stop direct API calls.

Read `references/upgrade-policy.md` before releasing an update.

## Contract Check

Verify all three live public schemas without using an API key or creating a task:

```bash
node scripts/check-config.mjs --live
```

This checks public contract compatibility. It does not prove the API key, account balance, provider capacity, or end-to-end generation.

## Error Guidance

- Missing key: create/copy a key from https://www.hiapi.ai/en/dashboard/api-keys.
- `401`/auth `403`: verify the key.
- `402`, quota, credits, balance: check https://www.hiapi.ai/en/dashboard and current pricing.
- `400`: run `--dry-run --estimate`; check mode, duration, resolution, media format/size/count, and reference durations.
- `429`: wait or reduce concurrency.
- Ambiguous submit network failure: reuse the same idempotency key; do not blindly submit again.
- Poll/download interruption: use `--resume-task-id`.
- Task failure: report the task's returned error; do not invent an output.
- Timeout: the remote task may still run; resume later with the same task ID.

## Publishing Boundary

Generating, downloading, editing, uploading, drafting, and publishing are distinct states. Do not publish or claim publication without explicit authorization and a verified public URL. Do not move third-party reference media into a public repository unless its rights allow that use.
