# Changelog

## 1.2.0 — 2026-09-08

- Support reference-mode duration=-1, complete field aliases and explicit false options.
- Include reference-video duration in estimates; automatic/unknown durations return ranges rather than false fixed totals.
- Make reference-duration hints optional and correct unsupported image format/asset-ID handling.
- Require the latest verified version before new paid creation, including direct create-helper use. Keep preflight and existing-task recovery available when update checks cannot run.
- Refresh the complete parameter map and live contract checks. This release does not change API configuration or create paid tasks.

## 1.1.0 — 2026-08-24

- Align text-to-video and image-to-video with the live `720p`/`1080p` contract and `720p` default.
- Align reference-to-video with the live `480p`/`720p`/`1080p` contract and `480p` default.
- Validate resolution by inferred mode so text/image requests cannot send unsupported `480p` while reference requests retain it.
- Extend the public contract monitor to verify each mode's resolution enum and default.
- Require versions older than 1.1.0 to update before creating a new paid task; existing task recovery remains available.

## 1.0.0 — 2026-08-10

- Support the three live HiAPI Seedance 2.5 model IDs: text-to-video, image-to-video, and reference-to-video.
- Align duration, resolution, ratio, output-format, media-count, and media-duration validation with the public production schemas.
- Add dry-run payload validation and current public price estimation before a paid task.
- Send an idempotency key, print it before submission, and print the task ID immediately after creation.
- Add `--resume-task-id` so polling/download interruptions do not cause duplicate paid tasks.
- Preserve recovery during a required update while blocking incompatible new submissions.
- Add central-manifest plus repository-policy fallback for soft and hard upgrades.
- Add live three-model contract checks, long polling, transient poll retry, mixed-output video selection, and actionable errors.
- Add CI plus a daily public-contract monitor so schema drift is detected before upgrade policy changes.
- Add the brief-to-delivery workflow, technical/creative QC, provenance, retention, and publication boundaries.
- Add the Image-generated HiAPI README cover to both language entry points.
- Add `.hiapi-skill-release.json` so the local publisher can audit the skill, central directory, related prompt repository, upgrade policy, and public release as one unit.
