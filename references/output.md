# Output, Recovery, And Retention

## Lifecycle

1. The CLI prints the idempotency key before submitting.
2. `POST /v1/tasks` returns a task ID.
3. The CLI prints that task ID immediately.
4. It polls `GET /v1/tasks/{taskId}` until success/failure or the local timeout.
5. On success, it prefers a video item when the response contains mixed outputs, downloads HTTP(S) output when possible, and otherwise returns the remote URL.

Example result:

```json
{
  "ok": true,
  "taskId": "tk-hiapi-123",
  "model": "seedance-2.5/text-to-video",
  "idempotencyKey": "stable-job-key",
  "status": "success",
  "output": {
    "kind": "file",
    "path": "/absolute/path/to/outputs/seedance-2-5-20260810-120000.mp4",
    "value": "/absolute/path/to/outputs/seedance-2-5-20260810-120000.mp4",
    "sourceUrl": "https://cdn.example.com/video.mp4"
  }
}
```

## Recovery Rules

- If a task ID exists, use `--resume-task-id`. This never submits a new task.
- If submission acceptance is ambiguous and only an idempotency key exists, retry the exact payload with `--idempotency-key`.
- Never reuse one idempotency key for a changed prompt or parameter set.
- A local timeout is not a remote cancellation.
- A required skill update may block new task creation, but the CLI still permits recovery of an existing task.

## Retention

Temporary output is the default and normally expires after about 7 days. Download accepted output promptly and retain the task ID plus source URL in the local delivery record.

Persistent output storage is billed at the current HiAPI Output Storage rate. Confirm the current price before using it. Deleting a persistent output stops future storage charges.

## Delivery Record

Keep these together:

- creative brief and final prompt;
- source-media provenance and usage rights;
- exact model ID and input settings;
- estimate shown before generation;
- idempotency key and task ID;
- raw downloaded output;
- technical and visual/audio QC notes;
- edited derivatives and publication state.
