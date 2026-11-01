/**
 * 统一的 API 访问层。
 *
 * - PyTauri 桌面端：window.__TAURI__.pytauri.pyInvoke（withGlobalTauri = true）
 * - 浏览器开发模式：回退到 Flask 的 /api/*（vite 代理到 localhost:5000）
 *
 * 所有函数返回与旧版 Flask 一致的数据结构，组件无需区分运行环境。
 */

const getPyInvoke = () => {
  if (typeof window === 'undefined') return null
  const tauri = window.__TAURI__
  if (!tauri || !tauri.pytauri) return null
  return tauri.pytauri.pyInvoke
}

export const isTauri = () => getPyInvoke() !== null

const invokeOrError = async (command, args) => {
  try {
    return await getPyInvoke()(command, args)
  } catch (e) {
    // Python 侧抛出的错误（InvokeException）会以字符串 reject
    return { error: typeof e === 'string' ? e : (e && e.message) || String(e) }
  }
}

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return response.json()
}

export async function getSettings() {
  if (isTauri()) return invokeOrError('get_settings')
  const response = await fetch('/api/settings')
  return response.json()
}

export async function saveSettings(settings) {
  if (isTauri()) return invokeOrError('save_settings', settings)
  return postJson('/api/settings', settings)
}

export async function getStatus() {
  if (isTauri()) return invokeOrError('get_status')
  const response = await fetch('/api/status')
  return response.json()
}

export async function setTitle(title) {
  if (!isTauri()) return
  await invokeOrError('set_title', { title })
}

export async function scanLogDir(directory) {
  if (isTauri()) return invokeOrError('scan_log_dir', { directory })
  return postJson('/api/log/scan', { directory })
}

export async function parseLogFiles({ directory, pattern, fieldMapping, maxLines }) {
  if (isTauri()) {
    return invokeOrError('parse_log_files', { directory, pattern, fieldMapping, maxLines })
  }
  const payload = { directory, pattern, fieldMapping }
  if (maxLines) payload.maxLines = maxLines
  return postJson('/api/log/parse', payload)
}

/**
 * 导出文本文件。
 * PyTauri 下：前端弹原生保存对话框（返回字符串路径）→ Python 命令写盘。
 * 浏览器下退化为 Blob 下载。
 */
export async function saveFileAs(content, filename, mimeType) {
  if (isTauri()) {
    const dialog = window.__TAURI__.dialog
    if (!dialog || !dialog.save) return { error: '当前环境不支持保存对话框' }

    const isJson = mimeType.includes('json')
    const filters = [{
      name: isJson ? 'POS JSON' : 'POS CSV',
      extensions: isJson ? ['pos.json'] : ['pos.csv']
    }]

    let path
    try {
      path = await dialog.save({ defaultPath: filename, filters })
    } catch (e) {
      return { error: typeof e === 'string' ? e : (e && e.message) || String(e) }
    }
    if (!path) return { status: 'cancelled' }

    const result = await invokeOrError('write_text_file', { path, content })
    if (result && result.error) return result
    return { status: 'ok', path }
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return { status: 'ok' }
}
