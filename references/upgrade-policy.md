# Required updates

Version 1.2.0 is the minimum supported release. Older releases reject automatic reference duration and underestimate reference-video billing.

Before new paid creation, the CLI and exported create helper check the central hiapi-skills entry first, then this repository policy if the central source is unavailable or missing the entry. The installed version must be at least latestVersion and minimumVersion. An outdated or unverifiable installation stops before POST /v1/tasks.

Update with `npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y`.

## Recovery and offline use

Dry-run, pricing lookup, schema checks and existing-task recovery/download remain available.
From 1.2.0, manifest failure or HIAPI_SKIP_UPDATE_CHECK=1 cannot authorize new paid creation. This latest-only rule was explicitly requested for this release. An update-source outage affects creation, not recovery.

## Enforcement limits

This gate runs in the client, not in the API. Already-installed old scripts may include offline/skip-check paths. Users can modify local files or call the API directly.
Publishing the central minimum blocks normal online use of older clients that implement the check; it cannot replace or revoke every installed script. Do not claim server-side enforcement or change API configuration to enforce an update.

## Release order

Publish an installable runtime and repository policy, verify a clean public installation, then publish the identical central policy. Keep package version, SKILL_VERSION, update-policy.json and central skills.json aligned.
Required releases raise latestVersion and minimumVersion together. Test that blocked creation performs zero paid POSTs and that recovery remains available.
