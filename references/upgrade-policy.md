# Soft And Hard Upgrade Policy

The runtime checks the central HiAPI skills manifest first and this repository's `update-policy.json` second. The repository fallback makes upgrade control available even before a directory change is merged.

## Version Fields

- `version`: version shipped by the repository.
- `latestVersion`: newest recommended version.
- `minimumVersion`: oldest version permitted to create new paid tasks.

## Soft Upgrade

Set `latestVersion` above the installed version while keeping `minimumVersion` compatible.

Use for:

- new modes or optional fields;
- better prompts/workflow/QC;
- clearer errors and docs;
- performance or reliability improvements that do not make the installed version unsafe.

Behavior: print the notice and continue.

## Hard Upgrade

Raise `minimumVersion` only when continued task creation is materially unsafe or incompatible:

- model ID or required-field contract changed;
- old code can misprice, double-submit, or silently lose paid output;
- security/privacy issue;
- old code generates the wrong mode or materially wrong payload;
- a provider/API migration rejects or misroutes all old requests.

Behavior: block new paid task creation and print the exact update command. Recovery of an existing task remains allowed.

Do not use a hard upgrade simply to increase adoption of a new feature.

## Release Sequence

1. Update runtime `SKILL_VERSION` and `package.json` together.
2. Add tests for the compatibility change.
3. Update `CHANGELOG.md`, English/Chinese README, `SKILL.md`, and affected references.
4. Run unit tests and the live contract check.
5. Publish the new repository version.
6. Change `update-policy.json` only after the new version is publicly installable.
7. Update the central `HiAPIAI/hiapi-skills` manifest to the same policy.
8. Verify an older compatible client receives a soft notice and an older incompatible client receives a hard stop.

## Failure Behavior

- Manifest timeout, offline mode, invalid JSON, or missing entry does not block tasks.
- `HIAPI_SKIP_UPDATE_CHECK=1` explicitly skips checks for offline/locked-down environments.
- A hard-upgrade message must say why the old version is unsafe and give one copyable update command.
