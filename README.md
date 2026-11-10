# 保利威 MediaPlayer uni-app x Demo · 2.7.5

本仓库为插件市场配套的独立 Demo，用 HBuilderX 打开本目录，项目类型为 uni-app x。GitHub Demo 不包含 `uni_modules/plv-media-player/`，运行前需从插件市场导入插件。

## 安装插件

打开 [保利威 MediaPlayer 播放器（uni-app x）](https://ext.dcloud.net.cn/plugin?name=plv-media-player#detail) 的市场详情页，点击「使用 HBuilderX 导入插件」，选择本 Demo 工程。本 Demo 对应插件版本 2.7.5；仅下载或打开 Demo 不会自动安装插件。

导入后会生成完整的 `uni_modules/plv-media-player/`，包括组件、`utssdk` 和依赖配置。接入示例、播放凭证和播放 API 可直接查看 [集成指南](./docs/INTEGRATION.md)。各平台 SDK 版本见 [依赖说明](./docs/DEPENDENCIES.md)。已安装插件可在 HBuilderX 中右键插件目录选择「从插件市场更新」。该目录已加入 Git 忽略规则，无需提交到 Demo 仓库。

## 运行

1. 使用自己的 DCloud AppID、包名 / Bundle ID 及签名。Android / iOS 制作自定义调试基座，HarmonyOS 通过 HBuilderX 构建 HAP。
2. 业务服务返回播放 vid、token 和 viewerId，进入「播放凭证」页配置，然后进入「播放」。客户端不保存账号密钥。
3. 配套服务示例见 [播放凭证业务服务](./server/play-token/README.md)。也可手动填写播放 token。
4. Feed 中的演示 vid 和封面需要相应账号可播放的内容。使用自己的账号时，替换 `pages/ext-feed/ext-feed.uvue` 的数据列表。

发布包不带本机证书、签名密码、`.env`、`.hbuilderx`、构建缓存或已安装基座。HarmonyOS 接入方按自己的签名配置构建，不复制开发者的 build-profile。

iOS 访问局域网业务服务需要本地网络权限；HTTP 服务还需配置适当 ATS 策略。根目录 Info.plist 和 manifest.json 已包含本地网络用途说明。生产服务优先使用 HTTPS。

HBuilderX 配置要求 4.61+，本次 iOS 实测 5.23；Android / HarmonyOS SDK 2.7.5，iOS SDK 2.7.3。

项目仓库：[polyv-uniapp-x-mediaplayer-demo](https://github.com/polyv/polyv-uniapp-x-mediaplayer-demo)。版本记录见 [CHANGELOG](./CHANGELOG.md)。
