# HiAPI Seedance 2.5 视频技能

![HiAPI Seedance 2.5 视频技能](assets/social-preview-seedance-2-5.png)

一个可安装的 Agent Skill：通过 HiAPI 规划、生成、恢复、下载并质检 Seedance 2.5 视频。

**文生视频 · 图生视频 · 参考生视频 · 最长 30 秒 · 原生音频**

[获取 API Key](https://www.hiapi.ai/zh/dashboard/api-keys) · [查看价格](https://www.hiapi.ai/zh/pricing) · [API 文档](https://docs.hiapi.ai/zh/models/video/seedance-2-5/) · [Seedance 2.5 提示词库](https://github.com/HiAPIAI/awesome-ai-video-prompts) · [全部 HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills)

Languages: [English](README.md) | [简体中文](README.zh-CN.md)

## 为什么要做这个 Skill

真正有用的视频技能不应只是包一层 API。它要把创意规划和付费动作分开，选对生产模型 ID，保存恢复凭据，并把生成结果带到技术与内容质检。

- 三个生产模型 ID：`seedance-2.5/text-to-video`、`image-to-video`、`reference-to-video`。
- 对齐线上合同：4-30 秒，参考模式支持 -1 自动时长，按模式支持 480p/720p/1080p，并校验画幅和素材限制。
- 付费前预检：校验脱敏 payload，并从公开价格接口获取当前估价。
- 防重复扣费：幂等键与 `--resume-task-id`。
- 长任务可恢复：默认轮询 120 分钟，瞬时网络错误自动退避重试。
- 可控升级：兼容更新只提醒；仅在不安全或不兼容时硬阻断新任务。
- 完整工作流：需求、素材、提示词、估价、生成、恢复、下载、质检、剪辑、发布门禁。

## 安装

推荐：

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill -y
```

指定 Agent：

```bash
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --codex
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --claude
npx -y github:HiAPIAI/hiapi-seedance-2-5-video-skill --target=/path/to/skills
```

OpenClaw：

```bash
openclaw skills add https://github.com/HiAPIAI/hiapi-seedance-2-5-video-skill
```

安装后重启 Agent。

## 配置

```bash
export HIAPI_API_KEY="your_hiapi_api_key"
node scripts/check-config.mjs
```

检查三个模型的公开合同（不创建付费任务，也不验证 Key）：

```bash
node scripts/check-config.mjs --live
```

## 第一次安全运行

先校验请求并获取当前估价，不创建付费任务：

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "海上暴风雨中的玻璃展馆，连续电影长镜头" \
  --seconds 5 \
  --resolution 720p \
  --ratio 16:9 \
  --dry-run \
  --estimate
```

确认后移除 `--dry-run --estimate` 再提交。

## 使用示例

文生视频：

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "海上暴风雨中的玻璃展馆，连续电影长镜头" \
  --seconds 5 \
  --resolution 1080p \
  --ratio 16:9 \
  --generate-audio
```

首尾帧图生视频：

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "从开场画面自然运动到最终产品英雄构图" \
  --first-frame-url "https://example.com/first.png" \
  --last-frame-url "https://example.com/last.png" \
  --seconds 8 \
  --resolution 720p
```

参考生视频：

```bash
node scripts/hiapi-seedance-2-video.mjs \
  --prompt "使用 @video1 的运镜、@image1 的主体设计和 @audio1 的音色" \
  --reference-video-url "https://example.com/motion.mp4" \
  --reference-video-duration 12 \
  --reference-image-url "https://example.com/subject.png" \
  --reference-audio-url "https://example.com/voice.wav" \
  --reference-audio-duration 12 \
  --seconds 12 \
  --resolution 720p
```

恢复已有任务，不新建也不重复计费：

```bash
node scripts/hiapi-seedance-2-video.mjs --resume-task-id "tk-hiapi-..."
```

## 当前合同

| 能力 | HiAPI 当前支持 |
| --- | --- |
| 时长 | 4-30 秒整数；参考模式还支持 -1 自动时长 |
| 文生/图生分辨率 | 720p、1080p；默认 720p |
| 参考生分辨率 | 480p、720p、1080p；默认 480p |
| 输出格式 | MP4、MOV |
| 文生/参考生画幅 | 16:9、4:3、1:1、3:4、9:16、21:9、adaptive |
| 图生视频画幅 | adaptive，跟随首帧 |
| 参考图 | 最多 30 张 |
| 参考视频 | 最多 10 段；每段 2-30 秒；总计 ≤30 秒 |
| 参考音频 | 最多 10 段；每段 2-30 秒；总计 ≤30 秒 |

本 Skill 会在选定模式后校验分辨率：文生/图生不会发送 `480p`，参考生仍保留 `480p`。当前公开合同未开放 4K；修改限制前先运行线上合同检查。

## 必须更新到 1.2.0

旧版会拒绝参考视频自动时长，并低估参考视频费用。请重新运行安装命令后再创建付费任务。R2V 按参考视频加输出视频时长计费，自动模式仅给出费用范围。全部参数和限制见 [API 合同](references/api.md)。

运行时先读取 [HiAPI Skills](https://github.com/HiAPIAI/hiapi-skills) 中央清单，再回退读取本仓库的 [`update-policy.json`](update-policy.json)。

- 有新版本时，必须更新后才能新建付费任务。
- 最低版本 1.2.0 用于修正自动时长校验和参考视频计费估价。
- 即使需要硬升级，也允许恢复已有任务，避免用户产物被困住。
- 1.2.0 起，离线或跳过版本检查仅允许预检与已有任务恢复，不允许新建付费任务。这是客户端门禁，不会封禁直接 API 调用。

细则见 [references/upgrade-policy.md](references/upgrade-policy.md)。

## 视频生产流程

[references/workflow.md](references/workflow.md) 已把可复用步骤凝聚成一条链路：

`目标 → 素材与版权检查 → 模式选择 → 时间轴 → 提示词 → 预检/估价 → 只提交一次 → 恢复/下载 → 技术质检 → 内容质检 → 剪辑 → 发布门禁`

生成不等于发布。没有明确授权和可验证的公开 URL，本 Skill 不会发布，也不会声称已经发布。

## 开发验证

```bash
npm test
npm run check:contract
```

合同检查只读取公开 schema 与价格元数据，不创建任务、不验证 API Key/余额，也不证明上游容量。

GitHub Actions 会在每次改动时运行单测，并每天检查三个公开模型 schema，及时发现参数变化。

## License

MIT
