'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { subscribeToPush, unsubscribeFromPush } from '@/actions/push'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function PushNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    setPermission(Notification.permission)
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    })
  }, [])

  if (!supported) return null

  async function enable() {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { toast.error('Notification permission denied'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { toast.error('Push not configured'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const result = await subscribeToPush({ endpoint: json.endpoint, keys: json.keys })
      if (!result.success) throw new Error(result.error)

      setSubscribed(true)
      toast.success('Notifications enabled!')
    } catch {
      toast.error('Could not enable notifications')
    } finally {
      setLoading(false)
    }
  }

  async function disable() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await unsubscribeFromPush(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast.success('Notifications disabled')
    } catch {
      toast.error('Could not disable notifications')
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <BellOff size={14} />
        Notifications blocked — allow in browser settings
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={subscribed ? disable : enable}
      disabled={loading}
      className={`gap-2 text-sm border border-border ${subscribed ? 'text-brand-400 border-brand-500/40' : 'text-text-secondary'}`}
    >
      {subscribed ? <Bell size={15} /> : <BellOff size={15} />}
      {subscribed ? 'Notifications on' : 'Enable notifications'}
    </Button>
  )
}
