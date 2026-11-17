import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Download, ScanLine } from 'lucide-react'
import { ErrorText, Modal } from './common'

export function QrImage({
  value,
  size = 280,
}: {
  value: string
  size?: number
}) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    void import('qrcode')
      .then(({ toDataURL }) =>
        toDataURL(value, {
          width: Math.max(280, size),
          margin: 4,
          errorCorrectionLevel: 'M',
        }),
      )
      .then((src) => {
        if (active) setUrl(src)
      })
      .catch(() => {
        if (active) setUrl('')
      })
    return () => {
      active = false
    }
  }, [value, size])
  return url ? (
    <img
      className="qr-image"
      alt={'QR ' + value}
      src={url}
      width={size}
      height={size}
    />
  ) : (
    <span
      className="qr-placeholder"
      style={{ width: size, height: size }}
      aria-label="Đang tạo QR"
    />
  )
}
export function QrButton({
  value,
  label = 'Mã của tôi',
}: {
  value: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  async function save() {
    const { toDataURL } = await import('qrcode')
    const a = document.createElement('a')
    a.href = await toDataURL(value, {
      width: 512,
      margin: 4,
      errorCorrectionLevel: 'M',
    })
    a.download = value + '.png'
    a.click()
  }
  return (
    <>
      <button
        className="card-qr"
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <QrImage value={value} size={70} />
      </button>
      {open && (
        <Modal title={label} close={() => setOpen(false)}>
          <div className="qr-center">
            <QrImage value={value} />
            <strong>{value}</strong>
            <p>Đưa mã này cho nhân viên quầy.</p>
            <button className="secondary" onClick={() => void save()}>
              <Download size={17} /> Tải PNG
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
type Detector = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
async function decode(
  image: CanvasImageSource,
  width: number,
  height: number,
  max = 1024,
) {
  const ratio = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * ratio))
  canvas.height = Math.max(1, Math.round(height * ratio))
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const { default: jsQR } = await import('jsqr')
  return jsQR(pixels.data, canvas.width, canvas.height, {
    inversionAttempts: 'dontInvert',
  })?.data
}
export function decodeQrImage(image: HTMLImageElement) {
  return decode(image, image.naturalWidth, image.naturalHeight)
}
export function QrScanner({
  onDetect,
  onClose,
}: {
  onDetect: (s: string) => boolean
  onClose: () => void
}) {
  const [camera, setCamera] = useState(false)
  const [issue, setIssue] = useState('')
  const [manual, setManual] = useState('')
  const [reading, setReading] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onDetect)
  const active = useRef(true)
  useEffect(() => {
    callback.current = onDetect
  }, [onDetect])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!camera) return
    const el = video.current
    if (!el) return
    let stopped = false,
      stream: MediaStream | undefined,
      frame = 0,
      last = 0
    function stop() {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
      el!.srcObject = null
    }
    function visibility() {
      if (document.hidden) {
        stop()
        setCamera(false)
      }
    }
    document.addEventListener('visibilitychange', visibility)
    async function start() {
      if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setIssue('Camera cần HTTPS hoặc localhost. Bạn có thể chọn ảnh QR.')
        setCamera(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        el!.srcObject = stream
        await el!.play()
        const Native = (window as Window & { BarcodeDetector?: Detector })
          .BarcodeDetector
        let detector: InstanceType<Detector> | undefined
        try {
          detector = Native ? new Native({ formats: ['qr_code'] }) : undefined
        } catch {
          /* Fall back to jsQR. */
        }
        async function tick(time: number) {
          if (stopped) return
          if (time - last > 100 && el!.videoWidth) {
            last = time
            let value: string | undefined
            try {
              if (detector) value = (await detector.detect(el!))[0]?.rawValue
              if (!value)
                value = await decode(el!, el!.videoWidth, el!.videoHeight, 640)
            } catch {
              /* Continue after a dropped frame. */
            }
            if (stopped) return
            if (value) {
              if (!callback.current(value))
                setIssue('Mã QR không khớp với dữ liệu hiện tại.')
              stop()
              setCamera(false)
              return
            }
          }
          frame = requestAnimationFrame(tick)
        }
        if (!stopped) frame = requestAnimationFrame(tick)
      } catch (error) {
        if (stopped) return
        const name = error instanceof DOMException ? error.name : ''
        setIssue(
          name === 'NotAllowedError'
            ? 'Hãy cấp quyền camera trong cài đặt trang hoặc chọn ảnh QR.'
            : name === 'NotFoundError'
              ? 'Thiết bị không có camera khả dụng.'
              : name === 'NotReadableError'
                ? 'Camera đang bận. Hãy đóng ứng dụng đang dùng camera.'
                : 'Không thể mở camera. Hãy thử chọn ảnh QR.',
        )
        setCamera(false)
      }
    }
    void start()
    return () => {
      stop()
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [camera])
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!callback.current(manual))
      setIssue('Không tìm thấy mã này trong dữ liệu hiện tại.')
  }
  async function fromFile(file: File) {
    const url = URL.createObjectURL(file)
    setReading(true)
    setIssue('')
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const result = await decodeQrImage(img)
      if (active.current && (!result || !callback.current(result)))
        setIssue(
          result
            ? 'Mã QR không khớp với dữ liệu hiện tại.'
            : 'Không đọc được QR. Hãy chọn ảnh rõ và đủ sáng.',
        )
    } catch {
      if (active.current) setIssue('Không thể mở ảnh QR.')
    } finally {
      URL.revokeObjectURL(url)
      if (active.current) setReading(false)
    }
  }
  return (
    <Modal title="Quét mã QR" close={onClose}>
      <div className="stack">
        {camera ? (
          <div className="scan-frame">
            <video ref={video} playsInline muted autoPlay />
            <span>Đưa mã vào khung</span>
          </div>
        ) : (
          <button
            className="primary"
            onClick={() => {
              setIssue('')
              setCamera(true)
            }}
          >
            <Camera size={18} /> Mở camera
          </button>
        )}
        {camera && (
          <button className="secondary" onClick={() => setCamera(false)}>
            Tắt camera
          </button>
        )}
        <label>
          Chọn ảnh QR
          <input
            type="file"
            accept="image/*"
            disabled={reading}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = ''
              if (file) {
                setCamera(false)
                void fromFile(file)
              }
            }}
          />
        </label>
        <form className="stack compact" onSubmit={submit}>
          <label>
            Nhập mã thủ công
            <div className="input-group">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                required
              />
              <button className="secondary">
                <ScanLine size={17} /> Tra cứu
              </button>
            </div>
          </label>
        </form>
        <ErrorText>{issue}</ErrorText>
        {reading && <p role="status">Đang đọc ảnh QR…</p>}
      </div>
    </Modal>
  )
}
