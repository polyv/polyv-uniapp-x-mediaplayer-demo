# 保利威 MediaPlayer uni-app x Demo · 2.7.6

这是插件市场配套的独立 Demo，用 HBuilderX 打开本目录，项目类型为 uni-app x。独立 Demo 不包含 `uni_modules/plv-media-player/`，运行前需安装配套插件。

## 安装插件

在 DCloud 插件市场打开保利威 MediaPlayer 播放器，点击「使用 HBuilderX 导入插件」并选择本 Demo 工程。这个 Demo 对应插件 2.7.6。 [插件市场](https://ext.dcloud.net.cn/plugin?id=30682)

导入后，HBuilderX 会在 `uni_modules/plv-media-player/` 安装组件、`utssdk` 和依赖配置。已安装插件可在 HBuilderX 中右键插件目录选择「从插件市场更新」。 [集成指南](./docs/INTEGRATION.md) [SDK 与构建依赖](./docs/DEPENDENCIES.md)

## 运行

1. 使用自己的 DCloud AppID、包名 / Bundle ID 及签名。Android / iOS 制作自定义调试基座，HarmonyOS 通过 HBuilderX 构建 HAP。
2. 业务服务返回播放 vid、token 和 viewerId，进入「播放凭证」页配置，然后进入「播放」。客户端不保存账号密钥。普通播放页可点画面切换控件，从「更多」调整倍速、清晰度或音频；「放大」切换页内播放布局。
3. 播放凭证可从配套业务服务获取，也可手动填写。 [业务服务示例](./server/play-token/README.md)
4. 「播放器中心」提供列表选片和独立播控皮肤。「下载中心」展示三端下载状态，支持暂停、继续、删除、重启恢复和播放已完成的下载。 [皮肤说明](./components/plv-player-skin/README.md)
5. Feed 中的演示 vid 和封面需要相应账号可播放的内容。使用自己的账号时，替换 `pages/ext-feed/ext-feed.uvue` 的数据列表。

发布包不带本机证书、签名密码、`.env`、`.hbuilderx`、构建缓存或已安装基座。HarmonyOS 接入方按自己的签名配置构建，不复制开发者的 build-profile。

iOS 访问局域网业务服务需要本地网络权限；HTTP 服务还需配置适当 ATS 策略。根目录 Info.plist 和 manifest.json 已包含本地网络用途说明。生产服务优先使用 HTTPS。

HBuilderX 配置要求 4.61+；Android SDK 2.8.3，iOS SDK 2.7.5，HarmonyOS SDK 2.7.7。

项目仓库：[polyv-uniapp-x-mediaplayer-demo](https://github.com/polyv/polyv-uniapp-x-mediaplayer-demo)。版本记录见 [CHANGELOG](./CHANGELOG.md)。
