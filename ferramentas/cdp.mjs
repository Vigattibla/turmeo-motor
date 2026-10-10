// Roteiro de teste no Chrome headless via CDP (sem puppeteer).
// uso: node ferramentas/cdp.mjs roteiro.json [saida/]
// passos: {"ir":url} {"js":"expr"} {"esperar":ms} {"clicar":[x,y]} {"arrastar":[x1,y1,x2,y2]}
//         (clicar/arrastar aceitam string JS que devolve as coordenadas)
//         {"tecla":"Delete"|"z", "mod":2} {"digitar":"txt"} {"print":"nome"} {"tela":[w,h]}
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [, , arq, saida = 'provas'] = process.argv
const passos = JSON.parse(readFileSync(arq, 'utf8'))
mkdirSync(saida, { recursive: true })
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const porta = 9300 + Math.floor(Math.random() * 500)
const perfil = join(tmpdir(), 'cdp-' + porta)
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, '--window-size=1440,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const dormir = ms => new Promise(r => setTimeout(r, ms))

let alvo
for (let i = 0; i < 50 && !alvo; i++) {
  await dormir(200)
  try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find(t => t.type === 'page') } catch { /* subindo */ }
}
if (!alvo) { console.error('chrome não subiu'); ch.kill(); process.exit(1) }
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let n = 0; const pend = new Map(); const erros = []
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(m.params.args.map(a => a.value ?? a.description).join(' '))
})
const env = (method, params = {}) => new Promise(r => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
await env('Runtime.enable'); await env('Page.enable')
await env('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
const mouse = (type, x, y, buttons = 1) => env('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1 })

// coordenadas podem vir de uma expressão JS (string) avaliada na página
const coords = async v => typeof v === 'string' ? (await env('Runtime.evaluate', { expression: v, returnByValue: true })).result.result.value : v

for (const p of passos) {
  if (typeof p.clicar === 'string') p.clicar = await coords(p.clicar)
  if (typeof p.arrastar === 'string') p.arrastar = await coords(p.arrastar)
  if (p.ir) { await env('Page.navigate', { url: p.ir }); await dormir(p.espera ?? 1500) }
  else if (p.tela) await env('Emulation.setDeviceMetricsOverride', { width: p.tela[0], height: p.tela[1], deviceScaleFactor: 1, mobile: false })
  else if (p.js) {
    const r = await env('Runtime.evaluate', { expression: p.js, awaitPromise: true, returnByValue: true })
    const v = r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description
    if (v !== undefined) console.log('js>', typeof v === 'string' ? v : JSON.stringify(v))
  }
  else if (p.esperar) await dormir(p.esperar)
  else if (p.clicar) { const [x, y] = p.clicar; await mouse('mouseMoved', x, y, 0); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y, 0); await dormir(120) }
  else if (p.arrastar) {
    const [x1, y1, x2, y2] = p.arrastar
    await mouse('mouseMoved', x1, y1, 0); await mouse('mousePressed', x1, y1)
    for (let i = 1; i <= 8; i++) await mouse('mouseMoved', x1 + (x2 - x1) * i / 8, y1 + (y2 - y1) * i / 8)
    await mouse('mouseReleased', x2, y2, 0); await dormir(150)
  }
  else if (p.tecla) {
    const k = p.tecla, cod = k.length === 1 ? 'Key' + k.toUpperCase() : k
    await env('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: cod, modifiers: p.mod ?? 0, windowsVirtualKeyCode: k.length === 1 ? k.toUpperCase().charCodeAt(0) : ({ Delete: 46, Escape: 27, Enter: 13, ArrowRight: 39, ArrowLeft: 37 })[k] ?? 0 })
    await env('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: cod, modifiers: p.mod ?? 0 }); await dormir(120)
  }
  else if (p.digitar) { await env('Input.insertText', { text: p.digitar }); await dormir(120) }
  else if (p.print) {
    await dormir(250)
    const r = await env('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(saida, p.print + '.png'), Buffer.from(r.result.data, 'base64')); console.log('print>', p.print)
  }
}
if (erros.length) console.log('ERROS>', erros.slice(0, 10).join('\n'))
ws.close(); ch.kill(); await dormir(300)
try { rmSync(perfil, { recursive: true, force: true }) } catch { /* lock do windows */ }
