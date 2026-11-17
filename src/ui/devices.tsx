import { useEffect, useRef, useState } from 'react'
import { Modal } from './common'
import { toast } from 'sonner'

function pref(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
let audio: AudioContext | undefined
async function beep() {
  try {
    audio ??= new AudioContext()
    await audio.resume()
    const oscillator = audio.createOscillator()
    const volume = audio.createGain()
    const time = audio.currentTime
    volume.gain.setValueAtTime(0.08, time)
    volume.gain.exponentialRampToValueAtTime(0.001, time + 0.19)
    oscillator.frequency.value = 650
    oscillator.connect(volume).connect(audio.destination)
    oscillator.start(time)
    oscillator.stop(time + 0.2)
  } catch {
    /* Audio is optional. */
  }
}
export function feedback(tierUp = false) {
  if (pref('vibe:sound')) void beep()
  if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(30)
  if (tierUp && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void import('canvas-confetti')
      .then(({ default: confetti }) =>
        confetti({
          particleCount: 64,
          spread: 65,
          origin: { y: 0.55 },
          colors: ['#0f6b4b', '#fce38a', '#128a5e'],
          disableForReducedMotion: true,
        }),
      )
      .catch(() => {})
  }
}
export function useWedge(onScan: (code: string) => void) {
  const scan = useRef(onScan)
  useEffect(() => {
    scan.current = onScan
  }, [onScan])
  useEffect(() => {
    let buffer = '',
      last = 0
    function key(e: KeyboardEvent) {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        document.querySelector('dialog[open]')
      )
        return
      const el = e.target
      if (
        el instanceof HTMLElement &&
        (el.matches('input, textarea, select') || el.isContentEditable)
      )
        return
      const time = performance.now()
      if (e.key === 'Enter') {
        if (time - last < 70 && buffer.length >= 3) {
          e.preventDefault()
          scan.current(buffer)
        }
        buffer = ''
        return
      }
      if (e.key.length !== 1) return
      buffer = time - last > 40 ? e.key : buffer + e.key
      last = time
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
}
export function useWakeLock(
  awake: boolean,
  setAwake: (value: boolean) => void,
) {
  const wake = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    let ended = false
    async function request() {
      if (
        !awake ||
        document.hidden ||
        !navigator.wakeLock ||
        (wake.current && !wake.current.released)
      )
        return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (ended) await lock.release()
        else wake.current = lock
      } catch {
        if (!ended) setAwake(false)
      }
    }
    function refresh() {
      void request()
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      ended = true
      document.removeEventListener('visibilitychange', refresh)
      void wake.current?.release()
      wake.current = null
    }
  }, [awake, setAwake])
}
export function DevicePanel({
  close,
  last,
  awake,
  setAwake,
}: {
  close: () => void
  last: string
  awake: boolean
  setAwake: (value: boolean) => void
}) {
  const [sound, setSound] = useState(() => pref('vibe:sound'))
  return (
    <Modal title="Thiết bị tại quầy" close={close}>
      <div className="stack">
        <p>
          Camera ·{' '}
          {'mediaDevices' in navigator
            ? 'Có hỗ trợ, cần cấp quyền khi quét'
            : 'Không khả dụng'}
        </p>
        <p>Máy quét USB/Bluetooth · Chế độ bàn phím, gửi Enter sau mã.</p>
        {last && <p>Lần quét gần nhất · {last}</p>}
        <label className="check">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              setSound(e.target.checked)
              try {
                localStorage.setItem('vibe:sound', e.target.checked ? '1' : '0')
              } catch {
                /* Preference is optional. */
              }
            }}
          />{' '}
          Âm báo giao dịch
        </label>
        <div className="actions">
          <button className="secondary" onClick={() => void beep()}>
            Thử âm báo
          </button>
          <button
            className="secondary"
            disabled={!navigator.vibrate}
            onClick={() => navigator.vibrate?.(80)}
          >
            Thử rung
          </button>
          <button
            className="secondary"
            disabled={!document.fullscreenEnabled}
            onClick={() =>
              void (
                document.fullscreenElement
                  ? document.exitFullscreen()
                  : document.documentElement.requestFullscreen()
              ).catch(() => toast.error('Không thể đổi chế độ toàn màn hình'))
            }
          >
            Toàn màn hình
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            disabled={!navigator.wakeLock}
            checked={awake}
            onChange={(e) => setAwake(e.target.checked)}
          />{' '}
          Giữ sáng màn hình khi ở Quầy
        </label>
      </div>
    </Modal>
  )
}
