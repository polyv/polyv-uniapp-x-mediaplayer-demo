# SDK 与构建依赖（2.7.5）

自有桥接源码随 HBuilderX 编译；官方 SDK 按各端 config.json 解析，不随源码包复制。

| 平台 | 直接依赖 |
| --- | --- |
| Android | Maven `net.polyv.android:media-player-full:2.7.5`、`net.polyv.android:media-player-sdk-addon-download:2.7.5`；公开库见 app-android/config.json |
| iOS | CocoaPods `PolyvMediaPlayerSDK` 2.7.3、`PLVFDB` 1.0.5、`SSZipArchive` 2.1.5 |
| HarmonyOS | `@polyvharmony/media-player-sdk`、`media-player-core-ijk`、`media-player-sdk-addon-cache-down` 2.7.5；HTTPDNS API/local/ali 1.1.2 |

Android 仓库在 project.repositories 声明；Room 使用 AndroidX 配置，不额外引入旧 Room 或支持库。iOS 使用 `https://gitee.com/polyv_ef/plvspecs.git` 和 CocoaPods 官方源，最低 iOS 15.0、arm64 真机。保留 `utssdk/app-ios/Libs/plvProfileRuntime`，它补齐 HTTPDNS 的 `___llvm_profile_runtime` 符号。本次环境解析到传递依赖 PLVIJKPlayer 0.15.6。

Android / iOS 改原生源码或依赖后重打基座；HarmonyOS 重建 HAP。勿加入旧自有桥接 AAR/HAR、Weex 库或重复的 SDK。

应用标识、签名和证书由接入方配置。Android 插件声明网络、网络/Wi-Fi 状态及读写存储权限；存储权限按系统版本及下载/截图功能适配。HarmonyOS 请求 INTERNET、GET_NETWORK_INFO。iOS Demo 访问局域网业务服务需要本地网络用途说明和授权。
