# 保利威 MediaPlayer 集成指南

适用于 `plv-media-player` 2.7.6，支持 uni-app x、Vue 3、UTS 标准模式下的 Android、iOS 和 HarmonyOS App。

## 1. 如何集成

1. 在 DCloud 插件市场搜索「保利威 MediaPlayer 播放器（uni-app x）」，使用 HBuilderX 导入工程。使用插件 ZIP 时，将其中的 `plv-media-player/` 解压到工程的 `uni_modules/`。
2. 使用接入方的应用标识和签名。Android 与 iOS 制作包含插件的自定义调试基座，HarmonyOS 通过 HBuilderX 构建 HAP。更新原生插件后重新构建相应产物，调试时同步更新页面资源。
3. 按 easycom 规则挂载 `<plv-player>` 并设置宽高。收到 `view-init` 后，使用事件的 `sessionId` 设置媒体。组件自动创建并在卸载时销毁自建会话。

HBuilderX 配置要求 4.61+。Android 最低 API 21，支持 arm64-v8a、armeabi-v7a。iOS 最低 15.0，支持 arm64 真机。依赖由 HBuilderX 按平台配置解析。 [SDK 与构建依赖](./DEPENDENCIES.md)

插件在首次使用原生 SDK 前自动设置名称后缀 `uniapp`，由原生 SDK 应用于其 User-Agent 和支持的播放统计。升级无需修改调用，也无需为此调用 `plvConfigSetup`。业务请求和第三方 URL 的自定义请求头继续按原方式配置。

### 最小播放示例

将下列页面中的占位值替换为业务服务返回的 VID、播放 token，以及申请 token 时使用的原始观众 ID。业务请求在视图就绪后才返回时，保存 `sessionId`，在凭证也就绪后调用 `plvPlayerSetMedia`。

```vue
<template>
  <plv-player style="width: 100%; height: 220px;" @view-init="onViewInit" />
</template>

<script lang="uts">
import { plvPlayerSetMedia, plvPlayerStart } from '@/uni_modules/plv-media-player'
import {
  PlvMediaPlayerFail, PlvMediaSource, PlvPlayerEvent, PlvSessionSuccess, PlvViewerPatch
} from '@/uni_modules/plv-media-player/utssdk/interface.uts'

export default {
  methods: {
    onViewInit(event: PlvPlayerEvent) {
      const sessionId = event.sessionId
      const viewer: PlvViewerPatch = { viewerId: '<原始观众 ID>' }
      const source: PlvMediaSource = {
        kind: 'vid',
        vid: '<VID>',
        token: '<播放 token>',
        viewer: viewer
      }
      const onFailure = (error: PlvMediaPlayerFail) => {
        console.error(error.errCode, error.errMsg)
      }
      plvPlayerSetMedia({
        sessionId: sessionId,
        source: source,
        success: (result: PlvSessionSuccess) => {
          plvPlayerStart({
            sessionId: sessionId,
            expectedMediaGeneration: result.mediaGeneration,
            fail: onFailure
          })
        },
        fail: onFailure
      })
    }
  }
}
</script>
```

普通页面也可通过组件 ref 调用 `setMedia`、`start`、`pause` 等方法，组件会传入自身的会话 ID。Feed 等需要控制多个会话的页面可先创建会话，将 `sessionId` 传给组件，再由创建方负责销毁。外部会话随组件卸载而解绑，`pauseOnDetach` 默认为 true。

## 2. 如何获取播放 token

1. App 将 VID 和当前用户的原始 `viewerId` 发给业务服务。
2. 业务服务验证播放权限，在服务端使用保利威账号密钥向 Playsafe 申请该 VID 和观众的播放 token，并把 token、VID 和过期时间返回给 App。
3. App 将 token、VID 和**申请时使用的原始 `viewerId`**填入同一个 `PlvMediaSource`。若服务同时返回编码后的 `viewerId`，播放仍使用原值，平台适配层会处理编码。更换视频、观众或凭证过期时重新申请。

主账号在服务端向 Playsafe 的 `/service/v1/token` 发送 HTTPS POST，签名使用账号密钥。Demo 服务用 URL-safe Base64 编码传给 Playsafe 的观众 ID，并从 `data.token` 读取凭证。 [保利威播放凭证 API](https://help.polyv.net/vod/api/playsafe/token/create_token/)

VID 播放时可直接提交业务服务签发的 token。普通 URL 媒体使用 `{kind: 'url', url}`，适用平台见下表。

### 使用 Demo 的凭证服务

独立 Demo 附带 `server/play-token/`。在该目录使用 Node.js 18+，按 `.env.example` 配置 `PLV_USERID` 和 `PLV_SECRET`，运行 `npm start`。Demo 服务默认监听 8787，`GET /health` 可检查是否启动。

| 方式 | Demo 服务接口 |
| --- | --- |
| 单条 | `GET /play-token?vid=<VID>&viewerId=<原始观众ID>`，返回 `vid`、`token`、`viewerId` 和 `expiredTime`。过期时间为毫秒时间戳。 |
| Feed 预取 | `GET /play-token?vids=<VID1>,<VID2>&viewerId=<原始观众ID>`，多条响应的 `items` 为签发结果，`errors` 为失败条目。服务解析后只有一个 VID 时返回单条结构。 |

在手机 Demo 的「播放凭证」页填写可从手机访问的服务地址，输入 VID 和 viewerId，获取并保存凭证，再进入「播放」页。Feed 使用各条目的 VID 获取各自的凭证。iOS 访问局域网服务时需允许本地网络访问，使用 HTTP 时需配置相应 ATS 策略。生产业务服务使用 HTTPS。

## 3. 播放 API

模块方法从 `@/uni_modules/plv-media-player` 导入，接收带 `success`、`fail`、`complete` 的 options。会话命令通过 `sessionId` 指定目标，部分命令可传 `expectedMediaGeneration` 避免过期操作。命令成功表示请求被接受，准备状态和首帧由事件报告。

| 功能 | 模块 API | 用法 |
| --- | --- | --- |
| 会话与媒体 | `plvPlayerCreateSession`、`plvPlayerDestroySession`、`plvPlayerSetMedia`、`plvPlayerConfigureSession` | 创建返回 `sessionId`，设置媒体返回 `mediaGeneration`。通过会话配置设置自动播放、续播和解码等选项，具体值以能力快照为准。 |
| 播放控制 | `plvPlayerStart`、`plvPlayerPause`、`plvPlayerStop`、`plvPlayerSeekTo`、`plvPlayerForward`、`plvPlayerRewind` | `seconds` 为秒。Seek 使用绝对位置，快进和快退使用相对步长。 |
| 进度与状态 | `plvPlayerGetDuration`、`plvPlayerGetCurrentPosition`、`plvPlayerGetBufferPercentage`、`plvPlayerIsPlaying` | 时长和位置为秒，缓冲进度为 0–100。 |
| 音量与倍速 | `plvPlayerSetVolume`、`plvPlayerGetVolume`、`plvPlayerSetSpeed`、`plvPlayerGetSpeed` | 音量 0–1，`speed` 为播放倍率。音量结果的 `valueSource` 表示数值来源。 |
| 清晰度与线路 | `plvPlayerChangeLevel`、`plvPlayerGetCurrentLevel`、`plvPlayerGetLevelNum`、`plvPlayerChangeRoute`、`plvPlayerSetAudioOnly` | `level` 取 0 表示自动，1–3 表示具体档位。按当前媒体能力选择清晰度、线路或纯音频。 |
| 字幕 | `plvPlayerChangeSRT`、`plvPlayerSetOpenSRT`、`plvPlayerChangeSRTSingleMode` | 切换字幕、控制显示及单双轨模式，实际支持范围见能力查询。 |
| 画面与窗口 | `plvPlayerSetScalingMode`、`plvPlayerGetScalingMode`、`plvPlayerSnapshot`、`plvPlayerChangeToPortrait`、`plvPlayerChangeToLandscape`、`plvPlayerDisableScreenCAP` | 缩放、截图、方向和窗口防截屏依赖平台。截图返回尺寸，`path` 和 `bytes` 按平台可为空。 |
| 播放统计与解码 | `plvPlayerGetWatchTimeDuration`、`plvPlayerGetVideoContentPlayedTime`、`plvPlayerGetStayTimeDuration`、`plvPlayerGetMediaHardDecode` | 统计字段为秒。解码查询返回配置值。 |
| 事件与能力 | `plvPlayerSubscribe`、`plvPlayerUnsubscribe`、`plvPlayerGetCapabilities` | 用 `listenerId` 解除订阅。能力查询省略 `sessionId` 时返回平台快照，传入时包含当前媒体条件。 |
| Feed 预载 | `plvPlayerPrepareMedia`、`plvPlayerPromotePrepared` | 先在无宿主的独立会话准备 VID。收到 `play-status` 的 `prepared` 状态后，按 ID 和代次请求提升并挂载目标宿主。成功后销毁旧会话，失败则释放候选并重新加载目标。 |
| 应用配置与视频信息 | `plvConfigSetup`、`plvConfigSetViewer`、`plvConfigSetPlayerDefaults`、`plvConfigSetToken`、`plvConfigSetSubAccountConfig`、`plvConfigSetConfig`、`plvInfoGetVideoInfo`、`plvInfoGetFileSize` | 应用默认值用于后续会话。SDK 账号配置在创建会话前完成。Info 独立查询 VID，文件大小按指定档位返回字节数。 |
| 兼容入口 | `plvPlayerEnableBackgroundPlayback`、`plvPlayerShowMarquee`、`plvPlayerHideMarquee` | 当前三端调用均返回 `9010004`。 |

### 播放事件

| 事件 | 说明 |
| --- | --- |
| `view-init` | 宿主已绑定，可使用事件中的 `sessionId` 加载媒体。 |
| `play-status` | `detail.status` 报告准备、播放、暂停、缓冲、结束或停止等状态。 |
| `first-frame` | SDK 已渲染首帧，可隐藏封面。 |
| `position-change` | `detail.currentPosition` 和可用时的 `detail.duration` 用于更新进度。 |
| `seek-complete` | SDK 报告 seek 完成。iOS 依赖 SDK 的 seeking 状态变化，进度条可同时用位置事件更新。 |
| `play-error` | 播放期间的 SDK 错误，读取 `detail.error`。 |

事件携带 `sessionId`、`mediaGeneration` 和 `detail`。组件另外通过 `session-error` 通知会话或宿主绑定错误。命令错误从 `fail` 读取 `errCode` 和 `errMsg`，常见情况包括宿主未就绪（9010003）、能力不支持（9010004）和操作取消或过期（9010007）。

### 平台差异

| 能力 | Android | iOS | HarmonyOS |
| --- | --- | --- | --- |
| 媒体来源 | VID、URL，可传 URL headers | VID | VID、URL |
| 应用账号 | 主账号、子账号 | 主账号、加密配置 | 主账号、子账号 |
| 清晰度 | 档位列表、切换、当前档位 | 档位列表与切换请求 | 档位列表、切换、当前档位 |
| 字幕 | 单双轨 | 按媒体资源支持单双轨 | 单轨 |
| 方向与缩放 | 窗口方向、缩放 | iOS 16 起可请求绑定窗口的方向，支持缩放 | 返回 9010004 |
| 窗口防截屏 | 支持 | 返回 9010004 | 返回 9010004 |
| 截图 | 尺寸和路径或 URI | 尺寸、临时路径、JPEG 字节数 | 尺寸、JPEG 字节数 |

导入市场插件后，参数和回调字段可在插件目录内的 `utssdk/interface.uts` 和 `components/plv-player/commandOptions.uts` 查看。


## 播放器中心、可复用皮肤与下载

DemoX 提供 `pages/player-center/player-center.uvue` 与 `pages/download-center/download-center.uvue`。`components/plv-player-skin` 只接收状态并发出交互事件，`components/plv-media-view` 负责原生会话和媒体加载；在线播放与本地播放使用同一组件，默认静音。原有播放调试页和 Feed 保留。原生变更需要重新编译对应端插件和运行包，不能只更新 Demo 页面配合旧市场基座使用。

三端下载沿用兼容回调 API，调用顺序：

1. 业务服务按 VID 签发 token。
2. `plvConfigSetDownloadSetting({vid, token, viewerId, maxRunningCount: 3}, callback)`：viewerId 传申请凭证时的原文。下载凭证按 VID 存放在内存，由下载器的 SDK token 回调提供；不保存账号密钥。Android/HarmonyOS 支持 1–8 个并发任务，缺省 3。iOS 保留活跃播放器账号/观众冲突检查。
3. `plvDownloadAddDownloader({vid, level, downloadArr: [{vid, level}]}, callback)`；level 为 1/2/3，使用当前媒体实际提供的清晰度。Demo 按 VID 展示任务，相同 VID 的不同清晰度需先删除再添加，完成任务重复添加会提示已完成。
4. `plvDownloadStartDownloader({vid}, callback)` / `plvDownloadStopDownloader({vid}, callback)`；继续任务前刷新凭证并重新调用 add 取得 SDK 原任务，然后 start，保留本地已下载内容。SDK 重新准备时可能暂时将进度回报为 0，随后按已有文件恢复进度。失败任务可以按相同流程重试。
5. `plvDownloadGetDownloadList(null, callback)` 等待 SDK 初始化及数据库恢复后返回任务。HarmonyOS 还等待已恢复任务的本地状态/清晰度，超时返回错误并允许重试；`plvDownloadIsVideoExist` 同样等待恢复。`downloadList` 字段含 vid、title、duration（秒）、level、fileSize（字节）、progress（0–100）、bytesPerSeconds、status、errMsg；cover 可由 Demo 本地元数据补齐。status 为 preparing / ready / downloading / stopped / finished / failed / unknown。页面只在可见时每秒查询，离页停止查询；读取超时可重试。任务准备阶段无实际清晰度时，Demo 使用保存的请求清晰度，以便失败或重启后继续。
6. `plvDownloadDeleteVideo({vid}, callback)` 删除任务及本地资源，界面先确认。无任务的 start/stop 和初始化失败返回错误，避免界面显示虚假成功。

已下载视频通过 `setMedia({source: {kind: 'local', vid, viewer: {viewerId}}})` 加载，再 `start()`。三端均接入 local 源，不请求业务 token；仅能选择 SDK 中已完成的任务，不支持任意文件路径。清晰度切换在本地播放界面禁用。

- Android/HarmonyOS 在启动后先调用 `plvDownloadGetDownloadList` 等待 SDK 任务恢复，再加载 local。vid 必须非空，token/url/headers 不允许提供；level 必须为 0–3 整数，缺省/0 选择已完成档位，1–3 精确匹配。可选 viewerId 传原始业务 ID 并匹配任务观众；viewerName/param3–5 覆盖不受支持，返回 9010004。参数非法返回 9010001，找不到匹配档位/观众的完成任务返回 9010008。上述校验失败不改变媒体代次。从已恢复的 SDK 下载器取得原媒体资源与下载目录，由 SDK 读取本地加密视频；未完成或不存在的任务返回 9010008。文件被外部移除或损坏时由 SDK 报播放错误，不保证修复损坏文件。local 不支持预加载。
- iOS 使用 SDK requestPriorityCache 读取完整加密媒体信息（有网时刷新元数据，无网或请求失败时使用 SDK 数据库缓存），设置已下载清晰度并优先播放本地文件，首帧额外校验 SDK localPlayback。iOS 原有能力快照中的 download.offline 保留 deferred 标记；兼容下载 API 和 local 源已接入，按实际验证范围使用。Android/HarmonyOS 的 download.offline 已更新为 supported。

Android API 34 与 HarmonyOS 7.0 模拟器已验证进度、暂停、重启恢复、续传、完成、删除和无网络访问条件下的本地首帧。iOS 继续沿用原验证范围，不据此推断 iOS 进行中续传或断网通过。后台持续下载、锁屏下载、进程退出后继续下载和重启自动开始不在本次承诺范围，重启恢复任务后由用户继续；模拟器结果不替代全机型和真机验收。
