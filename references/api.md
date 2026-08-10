# HiAPI Seedance 2.5 API Contract

Verified against the public HiAPI model schemas on 2026-08-10. Re-run `node scripts/check-config.mjs --live` before changing runtime constants.

## Endpoints

```text
POST https://api.hiapi.ai/v1/tasks
GET  https://api.hiapi.ai/v1/tasks/{taskId}
```

Headers:

```text
Authorization: Bearer $HIAPI_API_KEY
Content-Type: application/json
Idempotency-Key: <stable key for this exact submission>
```

## Model IDs

- `seedance-2.5/text-to-video`
- `seedance-2.5/image-to-video`
- `seedance-2.5/reference-to-video`

These are independent public model IDs. Do not send the old draft ID `seedance-2-5` or the family-only ID `seedance-2.5`.

## Shared Input

| Field | Contract |
| --- | --- |
| `prompt` | Required non-empty string. |
| `duration` | Integer 4-30; default 5. Billed by requested duration. |
| `resolution` | `480p` or `720p`; default 480p. |
| `output_format` | `mp4` or `mov`; default mp4. |
| `generate_audio` | Boolean; default true. |
| `web_search` | Boolean; default false. |

Text and reference modes accept `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, or `adaptive`. Image mode currently accepts `adaptive` only and follows the first frame.

## Text-To-Video

```json
{
  "model": "seedance-2.5/text-to-video",
  "input": {
    "prompt": "A continuous cinematic shot...",
    "duration": 5,
    "resolution": "480p",
    "aspect_ratio": "16:9",
    "output_format": "mp4",
    "generate_audio": true,
    "watermark": false,
    "web_search": false
  }
}
```

## Image-To-Video

```json
{
  "model": "seedance-2.5/image-to-video",
  "input": {
    "prompt": "Move from the first frame to the final hero frame...",
    "duration": 8,
    "resolution": "720p",
    "aspect_ratio": "adaptive",
    "output_format": "mp4",
    "first_frame_url": "asset://first",
    "last_frame_url": "asset://last",
    "reference_image_urls": ["asset://character"],
    "reference_audio_urls": ["https://example.com/mood.wav"],
    "generate_audio": true,
    "watermark": false
  }
}
```

- `last_frame_url` requires `first_frame_url`.
- Frame images: jpeg/png/webp/bmp/tiff/gif/heic/heif, under 30 MB, each side 300-6000 px, ratio 0.4-2.5.
- Up to 30 reference images with the same image constraints.
- Up to 10 reference audio clips; wav/mp3, under 15 MB each, 2-30 seconds each, combined at most 30 seconds.

## Reference-To-Video

```json
{
  "model": "seedance-2.5/reference-to-video",
  "input": {
    "prompt": "Use @video1 camera movement, @image1 subject, and @audio1 voice...",
    "duration": 12,
    "resolution": "720p",
    "aspect_ratio": "adaptive",
    "output_format": "mp4",
    "reference_video_urls": ["https://example.com/motion.mp4"],
    "reference_image_urls": ["asset://subject"],
    "reference_audio_urls": ["https://example.com/voice.wav"],
    "generate_audio": true
  }
}
```

- At least one reference video is required.
- Up to 10 reference videos; mp4/mov, 24-60 fps, under 200 MB each, 2-30 seconds each, each side 300-6000 px, ratio 0.4-2.5, at least 409,600 total pixels, combined duration at most 30 seconds.
- Up to 30 reference images.
- Up to 10 reference audio clips. Audio references require at least one reference video.
- This model ID is reference-guided generation, not literal editing or extension.

The CLI duration flags are local preflight metadata and are not sent in `input`; the media URLs themselves are sent.

## Callback And Storage

Callbacks are top-level:

```json
{
  "model": "seedance-2.5/text-to-video",
  "input": { "prompt": "..." },
  "callback": { "url": "https://example.com/hiapi/callback", "when": "final" }
}
```

Persistent output storage is also top-level:

```json
{ "storage": "persistent" }
```

Persistent storage is billed. The CLI requires `--accept-storage-cost` with `--storage persistent`.

## Public Contract Sources

- `GET https://www.hiapi.ai/api/models/content?name=seedance-2.5%2Ftext-to-video`
- `GET https://www.hiapi.ai/api/models/content?name=seedance-2.5%2Fimage-to-video`
- `GET https://www.hiapi.ai/api/models/content?name=seedance-2.5%2Freference-to-video`
- `GET https://www.hiapi.ai/api/pricing`
