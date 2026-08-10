# Seedance 2.5 Brief-To-Delivery Workflow

This workflow condenses the repeatable steps used in HiAPI video production into a single recoverable path.

## 1. Define The Outcome

Write one sentence for each:

- viewer takeaway or emotion;
- intended channel and aspect ratio;
- maximum useful duration;
- draft versus final-quality goal;
- required audio/dialogue;
- non-negotiable subject, product, text, and brand constraints.

If the output is a comparison, demonstration, or product claim, record what the source actually proves. A generated effect is not evidence that a real product has that feature.

## 2. Audit Inputs And Rights

Inventory every source image, video, audio clip, logo, prompt, and factual claim.

- Use only user-provided, properly licensed, or workflow-generated sources.
- Keep third-party URLs as references when redistribution rights are unclear; do not copy binaries into a public repository.
- Inspect source dimensions, duration, frame rate, audio, visible text, faces, packaging, and continuity before generation.
- Do not use an unrelated local file merely because it is convenient.

## 3. Choose The Smallest Sufficient Mode

- Text mode for open ideation and one-shot scenes.
- Image mode when the starting composition, ending composition, subject design, or visual style must be anchored.
- Reference mode when motion, camera language, action rhythm, style, or voice must be transferred from a video/audio reference.

Use fewer references when they do not each have a named job. More input is useful only when each reference reduces a specific uncertainty.

## 4. Build A Timed Creative Plan

For multi-beat clips, write a timecoded plan whose ranges add up to the requested duration:

```text
0-2s: establish subject and environment
2-5s: primary action and camera move
5-8s: consequence/reveal
8-10s: stable ending composition
```

Keep one primary action per beat. Define continuity anchors once, then repeat only critical constraints. Avoid asking one short clip to carry too many scene changes.

## 5. Write The Generation Prompt

Use this order:

```text
Outcome and subject
Timecoded actions
Camera position/lens/movement
Environment, light, materials, physics
Continuity anchors
Audio/dialogue/ambience
Negative constraints
```

For reference mode, name inputs in their actual order (`@video1`, `@image1`, `@audio1`) and state exactly what to borrow from each.

## 6. Preflight The Paid Task

Run `--dry-run --estimate`.

Check:

- inferred mode and exact model ID;
- 4-30 second integer duration;
- 480p/720p resolution;
- ratio compatibility;
- audio and watermark decisions;
- input counts, formats, sizes, durations, and ordering;
- current estimated total;
- temporary versus billed persistent storage.

Obtain confirmation when the user has not already approved this exact paid setup.

## 7. Submit Once And Preserve Recovery Handles

- Keep the printed idempotency key.
- Keep the task ID immediately after creation.
- If the terminal or network fails, resume the task or reuse the same idempotency key; do not start over blindly.
- Use callbacks for production systems and polling for local workflows/fallback reconciliation.

## 8. Download And Preserve The Raw Result

Download before temporary retention expires. Never overwrite the raw file with an edited derivative. Record model, parameters, task ID, source URL, and generation time next to the raw result.

## 9. Technical QC

Use `ffprobe`/`ffmpeg` when available:

- full decode succeeds;
- expected container and codecs;
- expected dimensions, duration, and frame rate;
- video stream present;
- audio stream matches the chosen audio setting;
- no unexplained truncation, black tail, or corrupt frames.

## 10. Creative QC

Inspect at full resolution:

- first, middle, and final frames;
- each action boundary and any text/face/product close-up;
- subject identity, wardrobe, object geometry, and scene layout;
- camera continuity, motion physics, flicker, morphing, and extra objects;
- dialogue intelligibility, ambience, effects, music, and lip/audio sync;
- whether the output actually communicates the original outcome.

Reject or revise based on a frozen issue list. Do not keep changing the creative target after each render.

## 11. Edit As A Separate Stage

Generation is raw footage, not automatically a final deliverable. Perform only necessary downstream work:

- trim and synchronize;
- caption and label outside critical visual areas;
- mix or duck audio cleanly;
- add brand elements only when requested;
- encode for the target platform;
- re-run technical and visual QC on the final export.

## 12. Package And Publish With A Human Gate

Deliver the raw result, final export, prompt, settings, task ID, source credits, QC record, and publish copy together.

Before public posting, verify the exact account, copy, media, thumbnail, visibility, audience, and final file. Uploading or seeing a composer is not publication; only a verified public URL proves publication.
