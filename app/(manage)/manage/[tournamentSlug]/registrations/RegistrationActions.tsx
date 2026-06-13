'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reviewRegistration } from '@/actions/registration'

export function RegistrationActions({
  registrationId,
  approveOnly,
  waitlistOnly,
}: {
  registrationId: string
  approveOnly?: boolean
  waitlistOnly?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function review(status: 'APPROVED' | 'WAITLISTED') {
    startTransition(async () => {
      const result = await reviewRegistration({ registrationId, status })
      if (result.success) {
        toast.success(status === 'APPROVED' ? 'Registration approved' : 'Moved to waitlist')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex gap-1 shrink-0">
      {!waitlistOnly && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => review('APPROVED')}
          disabled={isPending}
          title="Approve"
          className="text-success hover:text-success hover:bg-success-bg"
        >
          <Check size={14} />
        </Button>
      )}
      {!approveOnly && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => review('WAITLISTED')}
          disabled={isPending}
          title="Move to waitlist"
          className="text-warning hover:text-warning hover:bg-warning-bg"
        >
          <Clock size={14} />
        </Button>
      )}
    </div>
  )
}
