import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_URL = 'https://hls.videocc.net/service/v1/token'
const MAX_VIDS = 40

loadEnvFile(path.join(here, '.env'))

const userId = process.env.PLV_USERID ?? ''
const secret = process.env.PLV_SECRET ?? ''
const port = positiveInt(process.env.PLV_PORT, 8787)
const defaultExpires = positiveInt(process.env.PLV_EXPIRES, 21600)
const defaultDisposable = (process.env.PLV_DISPOSABLE ?? 'false') === 'true'

if (userId.length === 0 || secret.length === 0) {
  console.error('缺少 PLV_USERID 或 PLV_SECRET。请放在环境变量或本目录 .env，不要写入客户端。')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const from = clientHost(req)
  if (req.method === 'GET' && url.pathname === '/health') {
    console.log(`GET /health from ${from}`)
    sendJson(res, 200, { ok: true })
    return
  }
  if (req.method === 'GET' && url.pathname === '/play-token') {
    console.log(`GET /play-token from ${from}`)
    handlePlayToken(url, res)
    return
  }
  console.log(`${req.method} ${url.pathname} from ${from} -> 404`)
  sendJson(res, 404, { message: 'not found' })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`play-token-server listening on 0.0.0.0:${port}`)
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const addr of nets[name] ?? []) {
      if (addr.family === 'IPv4' && addr.internal === false) {
        console.log(`  ${name}  http://${addr.address}:${port}`)
      }
    }
  }
})

function handlePlayToken(url, res) {
  const viewerId = (url.searchParams.get('viewerId') ?? '').trim()
  if (viewerId.length === 0) {
    sendJson(res, 400, { message: 'viewerId required' })
    return
  }
  const vids = collectVids(url)
  if (vids.length === 0) {
    sendJson(res, 400, { message: 'vid or vids required' })
    return
  }
  if (vids.length > MAX_VIDS) {
    sendJson(res, 400, { message: `at most ${MAX_VIDS} vids` })
    return
  }
  const expires = clampExpires(url.searchParams.get('expires'))
  const disposable = url.searchParams.has('disposable')
    ? url.searchParams.get('disposable') === 'true'
    : defaultDisposable

  mapPool(vids, 4, (vid) => issueToken(vid, viewerId, expires, disposable))
    .then((settled) => {
      const items = []
      const errors = []
      for (let i = 0; i < settled.length; i++) {
        const row = settled[i]
        if (row.ok) {
          items.push(row.value)
          console.log(`issued vid=${row.value.vid} viewerId=${row.value.viewerId} token=${maskToken(row.value.token)}`)
        } else {
          errors.push({ vid: vids[i], message: row.message })
          console.log(`issue failed vid=${vids[i]} message=${row.message}`)
        }
      }
      if (vids.length === 1) {
        if (items.length === 1) {
          sendJson(res, 200, items[0])
          return
        }
        sendJson(res, 502, { message: errors[0]?.message ?? 'token failed', vid: vids[0] })
        return
      }
      const status = items.length > 0 ? 200 : 502
      sendJson(res, status, { viewerId: urlSafeBase64(viewerId), items, errors })
    })
    .catch((error) => {
      sendJson(res, 500, { message: error instanceof Error ? error.message : 'token failed' })
    })
}

async function issueToken(videoId, viewerId, expires, disposable) {
  // Playsafe binds the token to this exact string. Native Android posts URL-safe
  // Base64 and then plays with the echoed viewerId. Return that same string.
  const postedViewerId = urlSafeBase64(viewerId)
  const params = {
    userid: userId,
    videoId,
    ts: String(Date.now()),
    viewerId: postedViewerId,
    expires: String(expires),
    disposable: disposable ? 'true' : 'false',
  }
  params.sign = signMd5(params, secret)
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const payload = await response.json()
  const data = payload?.data
  const token = typeof data?.token === 'string' ? data.token : ''
  if (payload?.code !== 200 || token.length === 0) {
    const message = typeof payload?.message === 'string' && payload.message.length > 0
      ? payload.message
      : 'token failed'
    throw new Error(message)
  }
  const echoedViewerId = typeof data.viewerId === 'string' && data.viewerId.length > 0
    ? data.viewerId
    : postedViewerId
  return {
    vid: typeof data.videoId === 'string' && data.videoId.length > 0 ? data.videoId : videoId,
    token,
    viewerId: echoedViewerId,
    expiredTime: data.expiredTime ?? 0,
  }
}

function signMd5(params, secretKey) {
  const concat = Object.keys(params)
    .filter((key) => params[key] != null && String(params[key]).length > 0)
    .sort()
    .map((key) => key + params[key])
    .join('')
  return crypto.createHash('md5').update(secretKey + concat + secretKey, 'utf8').digest('hex').toUpperCase()
}

function urlSafeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_')
}

function collectVids(url) {
  const vids = []
  const single = (url.searchParams.get('vid') ?? '').trim()
  if (single.length > 0) vids.push(single)
  const many = url.searchParams.get('vids') ?? ''
  for (const part of many.split(',')) {
    const vid = part.trim()
    if (vid.length > 0 && vids.includes(vid) === false) vids.push(vid)
  }
  return vids
}

function clampExpires(raw) {
  if (raw == null || raw.length === 0) return Math.min(defaultExpires, 86400)
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return Math.min(defaultExpires, 86400)
  return Math.min(Math.floor(value), 86400)
}

function clientHost(req) {
  const raw = req.socket?.remoteAddress ?? ''
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw
}

function maskToken(token) {
  if (token.length <= 16) return '***'
  return `${token.slice(0, 8)}...${token.slice(-8)}`
}

function positiveInt(raw, fallback) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.floor(value)
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(text)
}

async function mapPool(items, limit, worker) {
  const out = new Array(items.length)
  let next = 0
  const runners = []
  const size = Math.min(limit, items.length)
  for (let i = 0; i < size; i++) {
    runners.push(run())
  }
  await Promise.all(runners)
  return out

  async function run() {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        out[index] = { ok: true, value: await worker(items[index]) }
      } catch (error) {
        out[index] = {
          ok: false,
          message: error instanceof Error ? error.message : 'token failed',
        }
      }
    }
  }
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value
    }
  }
}
