# 可复用播放器皮肤

`plv-player-skin.uvue` 是纯展示组件，不创建原生播放器，不请求 token，也不管理下载任务。宿主提供绝对定位容器和状态；组件通过事件发出用户操作。

```html
<plv-player-skin
  :title="title" :playing="playing" :position="position" :duration="duration"
  :fullscreen="fullscreen" :controllable="ready" :message="hint"
  :speed="speed" :quality="quality" :can-speed="canSpeed" :can-quality="canQuality"
  :allow-download="!offline" :bottom-inset="bottomInset" :side-inset="sideInset"
  @play="togglePlayback" @seek="seekTo" @back="back" @fullscreen="toggleFullscreen"
  @speed="chooseSpeed" @quality="chooseQuality" @download="download" @retry="retry"
/>
```

时间与 seek 参数单位为秒；`fullscreen` 由宿主更新，皮肤不自行旋转屏幕。`bottomInset` / `sideInset` 单位为 px。`message` 用于准备、缓冲和错误状态，点击发出 `retry`。无可用能力时不显示相应菜单。播放中 4 秒自动隐藏控件；拖动进度或打开菜单时保持显示。横屏提供锁定，退出全屏或切换标题时解锁。

需要完整播放能力时使用同级 `plv-media-view`：传入 `vid`、`title`、`offline`、`fullscreen`、`muted`（默认 true） 和安全区；监听 `back`、`fullscreen-change`、`download`（可下载清晰度数组）、`duration-change`（秒）、`error`（提示文字）。它复用插件 `plv-player`，统一处理凭证、会话、过期回调隔离及控件操作。页面 `onHide` 调用 `suspend()`，`onShow` 调用 `activate()`；卸载时子组件销毁原生会话。播放器中心中的在线播放和三端本地播放均使用该组件。

下载和离线源已接入三端原生适配；Android/HarmonyOS 已通过本次模拟器进度、暂停续传、删除和离线播放验证，iOS 沿用其原有验证范围。详情见插件 `INTEGRATION.md`。

全屏使用 uni-app x 的 UniElement.requestFullscreen / UniPage.exitFullscreen，保持同一播放器实例，进入横屏时隐藏系统导航。Demo 默认静音，媒体加载前确认 setVolume(0) 成功；需要声音的接入方可显式传入 muted=false。
