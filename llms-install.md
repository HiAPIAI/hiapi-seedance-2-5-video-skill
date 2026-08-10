# HiAPI Seedance 2.5 Video Skill — Agent Install Notes

Install one focused skill; do not clone secrets or copy `.env` files.

## Install

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y
```

Or:

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --codex
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --claude
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --target=/path/to/skills
```

Restart the Agent, set `HIAPI_API_KEY`, and read `SKILL.md` completely before task creation.

## Agent Contract

- Use the exact production IDs selected by the skill: text, image, or reference-to-video.
- Run `--dry-run --estimate` before a paid task when settings/cost are not already approved.
- Preserve the printed idempotency key and task ID.
- Resume an interrupted task with `--resume-task-id`; do not create a duplicate.
- Treat raw generation, edited deliverable, uploaded draft, and public publication as separate states.
- Read `references/workflow.md` for a complete production request.
- Read `references/upgrade-policy.md` before changing soft/hard upgrade policy.

## Verify

```bash
npm test
node scripts/check-config.mjs --live
```

The live check reads public schemas only and does not validate credentials or create a paid task.

## Related Public Resources

- https://github.com/HiAPIAI/awesome-seedance-2-5-prompts
- https://github.com/HiAPIAI/hiapi-skills
- https://docs.hiapi.ai/models/video/seedance-2-5/
- https://www.hiapi.ai/en/dashboard/api-keys
