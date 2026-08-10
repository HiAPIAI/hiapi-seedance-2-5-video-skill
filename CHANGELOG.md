# Changelog

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
