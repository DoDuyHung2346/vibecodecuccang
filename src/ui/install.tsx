import { useEffect, useState } from 'react'
import { Modal } from './common'
interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}
export function Install() {
  const [event, setEvent] = useState<InstallEvent>()
  const [help, setHelp] = useState(false)
  useEffect(() => {
    function receive(e: Event) {
      e.preventDefault()
      setEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', receive)
    return () => window.removeEventListener('beforeinstallprompt', receive)
  }, [])
  if (matchMedia('(display-mode: standalone)').matches) return null
  return (
    <>
      <button
        className="text-button"
        onClick={async () => {
          if (!event) {
            setHelp(true)
            return
          }
          try {
            await event.prompt()
            await event.userChoice
          } catch {
            setHelp(true)
          } finally {
            setEvent(undefined)
          }
        }}
      >
        Cài ứng dụng
      </button>
      {help && (
        <Modal title="Cài ứng dụng" close={() => setHelp(false)}>
          <p>
            Trên iPhone, mở Safari rồi chọn Chia sẻ → Thêm vào màn hình chính.
            Trên Android hoặc desktop, mở menu trình duyệt và tìm mục Cài đặt
            ứng dụng.
          </p>
          <p>
            Mở bản đã triển khai một lần khi có mạng để dùng lại khi offline.
          </p>
        </Modal>
      )}
    </>
  )
}
