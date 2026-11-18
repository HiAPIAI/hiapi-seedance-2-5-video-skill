# HiAPI Seedance 2.5 API contract

Verified against production schemas and published HiAPI docs on 2026-09-08. Run `node scripts/check-config.mjs --live` to detect drift without an API key or paid task.

## Complete field map

Create with `POST https://api.hiapi.ai/v1/tasks`; poll `GET https://api.hiapi.ai/v1/tasks/{taskId}`. Use Authorization Bearer, JSON Content-Type and a stable Idempotency-Key for creation.

| Public field | CLI | Current contract |
| --- | --- | --- |
| `model` | `--model` or `--mode` | `seedance-2.5/text-to-video`, `seedance-2.5/image-to-video`, `seedance-2.5/reference-to-video` |
| `input.prompt` | `--prompt` | Required in all three modes |
| `input.duration` | `--seconds` / `--duration` | Default 5; integers 4-30; -1 for automatic output only in reference mode |
| `input.resolution` | `--resolution` | Text/image 720p or 1080p, default 720p; reference 480p/720p/1080p, default 480p |
| `input.aspect_ratio` | `--ratio` / `--aspect-ratio` | Text/reference 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive; image adaptive only; default adaptive |
| `input.output_format` | `--output-format` | mp4 or mov; default mp4 |
| `input.generate_audio` | `--generate-audio` / `--no-audio` | Boolean; API default true |
| `input.web_search` | `--web-search` / `--no-web-search` | Boolean; API default false |
| `input.watermark` | `--watermark` / `--no-watermark` | Text/image only; API default false |
| `input.first_frame_url` | `--first-frame-url` | Image only; HTTP(S), supported image data URL, or asset:// ID |
| `input.last_frame_url` | `--last-frame-url` | Image only; requires first frame; HTTP(S) or supported image data URL |
| `input.reference_image_urls` | Repeat `--reference-image-url` | Image/reference modes; up to 30 |
| `input.reference_video_urls` | Repeat `--reference-video-url` | Reference mode only; required, 1-10 |
| `input.reference_audio_urls` | Repeat `--reference-audio-url` | Image/reference modes; up to 10; reference mode also requires video |
| `callback.url` | `--callback-url` | Optional HTTPS callback |
| `callback.when` | Set by CLI | Only final |
| `storage` | `--storage` | temp by default; persistent requires --accept-storage-cost |

Only these fields are exposed. Do not add 4K, draft, last-frame-return, edit or extension parameters.

## Media requirements

- Images: JPEG, PNG, WebP, BMP, TIFF or GIF; under 30 MB each; 300-6000 px per side; aspect ratio 0.4-2.5; up to 30 images and 120 MB combined. GIF uses the first frame.
- SVG, HEIC and HEIF are unsupported. Asset IDs are allowed only for the image-mode first_frame_url, not last frame or reference images.
- Reference videos: public HTTPS MP4/MOV; 1-10 clips; 2-30 seconds each, at most 30 seconds combined; under 200 MB each; 24-60 fps; at least 409600 pixels (such as 854x480); 300-6000 px per side; aspect ratio 0.4-2.5.
- Reference audio: WAV/MP3; up to 10 clips; under 15 MB each; 2-30 seconds each, at most 30 seconds combined.

Some image-schema descriptions retain older format/asset wording. Published HiAPI media preflight is narrower; follow the actual supported formats above.
Local validation checks URL schemes, obvious unsupported image extensions, data-URL MIME types and counts. It does not inspect remote bytes, size or timeline validity. HiAPI checks the actual media.
`--reference-video-duration` and `--reference-audio-duration` are optional local metadata, never API fields. If supplied, provide one duration per corresponding URL. Do not invent durations.

## Reference billing and automatic output

Text/image modes use requested output seconds. Reference mode charges the selected per-second rate for reference-video duration plus output-video duration.
For duration=-1, output length is unknown until completion. Final billing uses server-verified reference and output evidence. Explicit mode uses the selected output duration.
CLI reference-duration hints are estimates only. Automatic output or missing reference hints return estimatedUsd=null with a range, never a fixed total. Group pricing and promotions may change the account charge.

```bash
node scripts/hiapi-seedance-2-video.mjs --mode reference --prompt "Use @video1 motion to create a new nature scene" --reference-video-url "https://example.com/reference.mp4" --reference-video-duration 2 --duration -1 --resolution 480p --no-audio --no-web-search --dry-run --estimate
```

Remove dry-run/estimate only after the user authorizes paid generation. Recover interrupted work with --resume-task-id rather than creating a replacement.

## Contract sources

- https://www.hiapi.ai/docs/models/video/seedance-2-5/
- https://www.hiapi.ai/docs/models/video/seedance-2-5-i2v/
- https://www.hiapi.ai/docs/models/video/seedance-2-5-r2v/
- Public schema for each exact model via `https://api.hiapi.ai/api/models/content?name=<encoded-model-id>`
- https://api.hiapi.ai/api/pricing
