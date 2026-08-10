# HiAPI Seedance 2.5 Video Skill

An installable Agent Skill for planning, generating, recovering, downloading, and quality-checking Seedance 2.5 videos through HiAPI.

**Text-to-video · Image-to-video · Reference-to-video · Up to 30 seconds · Native audio**

[Get an API key](https://www.hiapi.ai/en/dashboard/api-keys) · [Pricing](https://www.hiapi.ai/en/pricing) · [API docs](https://docs.hiapi.ai/models/video/seedance-2-5/) · [Seedance 2.5 prompts](https://github.com/HiAPIAI/awesome-seedance-2-5-prompts) · [All HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills)

Languages: [English](README.md) | [简体中文](README.zh-CN.md)

## Why This Skill Exists

A useful video skill is more than a thin API call. This one separates creative planning from a paid side effect, chooses the correct production model ID, preserves recovery handles, and carries the result through technical and creative QC.

- Three production IDs: `seedance-2.5/text-to-video`, `image-to-video`, and `reference-to-video`.
- Live-aligned validation: 4-30 seconds, 480p/720p, correct ratios and media limits.
- Cost-aware preflight: validate a redacted payload and fetch current public pricing before submitting.
- Duplicate-charge protection: idempotency keys and `--resume-task-id`.
- Long-job resilience: 120-minute default polling with transient retry.
- Upgrade control: soft notices for compatible releases; hard stops only for unsafe/incompatible creation.
- Full workflow: brief, sources, prompt, estimate, generation, recovery, download, QC, edit, and publish gate.

## Install

Recommended:

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y
```

Target one runtime:

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --codex
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --claude
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --target=/path/to/skills
```

OpenClaw:

```bash
openclaw skills add https://github.com/HiAPIAI/hiapi-seedance-2-5-video-skill
```

Restart the Agent after installation.

## Configure

```bash
export HIAPI_API_KEY="your_hiapi_api_key"
node scripts/check-config.mjs
```

Public three-model contract check (no paid task, does not validate the key):

```bash
node scripts/check-config.mjs --live
```

## Safe First Run

Validate the request and fetch a current estimate without creating a paid task:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "A continuous cinematic shot of a glass pavilion above a stormy ocean" \
  --seconds 5 \
  --resolution 480p \
  --ratio 16:9 \
  --dry-run \
  --estimate
```

After reviewing it, remove `--dry-run --estimate` to submit.

## Examples

Text-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "A continuous cinematic shot of a glass pavilion above a stormy ocean" \
  --seconds 5 \
  --resolution 480p \
  --ratio 16:9 \
  --generate-audio
```

First/last-frame image-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "Move naturally from the opening frame to the final hero composition" \
  --first-frame-url "https://example.com/first.png" \
  --last-frame-url "https://example.com/last.png" \
  --seconds 8 \
  --resolution 720p
```

Reference-to-video:

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "Use @video1 camera motion, @image1 subject design, and @audio1 voice" \
  --reference-video-url "https://example.com/motion.mp4" \
  --reference-video-duration 12 \
  --reference-image-url "https://example.com/subject.png" \
  --reference-audio-url "https://example.com/voice.wav" \
  --reference-audio-duration 12 \
  --seconds 12 \
  --resolution 720p
```

Recover a task without creating or billing a duplicate:

```bash
node scripts/hiapi-seedance-2-video.mjs --resume-task-id "tk-hiapi-..."
```

## Current Contract

| Capability | Current HiAPI support |
| --- | --- |
| Duration | Integer 4-30 seconds |
| Resolution | 480p, 720p |
| Output | MP4, MOV |
| Text/reference ratios | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive |
| Image mode ratio | adaptive; follows first frame |
| Reference images | Up to 30 |
| Reference videos | Up to 10; each 2-30s; total ≤30s |
| Reference audio | Up to 10; each 2-30s; total ≤30s |

This skill does not send 1080p or 4K because the current public HiAPI Seedance 2.5 task schemas expose 480p and 720p. Run the live check before changing the contract.

## Soft And Hard Upgrades

The runtime reads the central [HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills) manifest and falls back to this repository's [`update-policy.json`](update-policy.json).

- Soft upgrade: notify and continue.
- Hard upgrade: block new paid tasks only for incompatibility, billing/duplication risk, security, or materially wrong payload/output behavior.
- Existing-task recovery stays available during a hard upgrade.
- Offline update-check failure does not block work.

See [references/upgrade-policy.md](references/upgrade-policy.md).

## Production Workflow

The reusable workflow is documented in [references/workflow.md](references/workflow.md):

`outcome → source/rights audit → mode → timed plan → prompt → dry-run/estimate → submit once → recover/download → technical QC → creative QC → edit → publish gate`

Generation is not publication. The skill never publishes a result or claims a public post without explicit authorization and a verified public URL.

## Development

```bash
npm test
npm run check:contract
```

The contract check reads public schemas and pricing metadata only. It does not create a task, validate the API key/account balance, or prove provider capacity.

## License

MIT
