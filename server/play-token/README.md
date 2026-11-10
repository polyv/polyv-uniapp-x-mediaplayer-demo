# 播放凭证业务服务示例

这是**客户业务后台**的本地示例，不是播放器 SDK 的一部分。App 只拿 `vid` + `token` + `viewerId`。`userid` / `secretKey` 只留在这台服务上，用来按保利威 Playsafe 规则向 `https://hls.videocc.net/service/v1/token` 换播放凭证。

正式环境请换成客户自己的后端，并对来源加 **IP 白名单**（点播后台加密设置，或这层服务自己的访问控制）。不要把 secretKey 放进 Demo、文档或 git。

## 启动

需要 Node.js 18 或更高版本，没有第三方依赖。业务服务目录在源码仓库为 `scripts/play-token-server/`，配套发布 Demo 为 `server/play-token/`。

```bash
cd <业务服务目录>
cp .env.example .env
# 在 .env 填写 PLV_USERID 和 PLV_SECRET，不要提交 .env
npm start
```

也可以不写文件，直接用环境变量：

```bash
PLV_USERID=... PLV_SECRET=... npm start
```

进程监听 `0.0.0.0`（默认端口 `8787`），启动时打印本机局域网地址。手机和电脑要在同一网络，Demo 配置页填写例如 `http://192.168.1.10:8787`。

iOS 使用 HTTP 业务服务时，需要由接入方按实际应用配置适当的 ATS 策略，生产服务优先使用 HTTPS。访问局域网 IP 还需要 `NSLocalNetworkUsageDescription`，否则系统不弹权限、请求到不了这台服务。Demo 工程根目录的 `Info.plist` 写了这句说明，打进基座后手机上要点允许本地网络。

| 变量 | 说明 |
| --- | --- |
| `PLV_USERID` | 点播账号 userid |
| `PLV_SECRET` | 点播 secretKey，只存在服务端 |
| `PLV_PORT` | 监听端口，默认 `8787` |
| `PLV_EXPIRES` | token 有效秒数，默认 `21600`，最长 `86400` |
| `PLV_DISPOSABLE` | `true` 时 token 只用一次，默认 `false` |

## 接口

`GET /health` → `{ "ok": true }`

`GET /play-token?vid=<vid>&viewerId=<原文>`

向保利威签发时，`viewerId` 会做 URL 安全 Base64（保留 `=`），`ts` 为 13 位毫秒。响应的 `viewerId` 是编码值。三端在 `PlvMediaSource.viewer.viewerId` 中都使用申请凭证时填写的原始值，由插件适配各平台的 SDK。

```json
{
  "vid": "e97dbe3e648aefc2eb6f68b96db9db6c_e",
  "token": "<play token>",
  "viewerId": "<URL-safe Base64 of the request viewerId>",
  "expiredTime": 1793949361781
}
```

多个 vid（短视频流一次预取）：

`GET /play-token?vids=<vid1>,<vid2>,<vid3>&viewerId=<原文>`

```json
{
  "viewerId": "<URL-safe Base64 of the request viewerId>",
  "items": [],
  "errors": []
}
```

单次最多 40 个 vid。查询参数 `expires`（秒）和 `disposable=true|false` 可覆盖本次请求的默认值。

日志里的 token 只打印首尾各 8 位。服务不会打印 secretKey。
