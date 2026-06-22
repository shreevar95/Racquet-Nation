'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTournament, updateTournamentFull } from '@/actions/tournament'
import type { CreateTournamentInput } from '@/types/tournament'
import { Step1Basics } from './Step1Basics'
import { Step2Structure } from './Step2Structure'
import { Step3Format } from './Step3Format'
import { Step4Registration } from './Step4Registration'
import { Step5Standings } from './Step5Standings'
import { Step6Review } from './Step6Review'

const STEPS = [
  { label: 'Basics',       description: 'Name, sport, venue, dates' },
  { label: 'Structure',    description: 'Teams, groups, players' },
  { label: 'Match Format', description: 'Scoring and game rules' },
  { label: 'Registration', description: 'Who can sign up' },
  { label: 'Standings',    description: 'Points and tiebreakers' },
  { label: 'Review',       description: 'Confirm and save' },
]

const DEFAULT_VALUES: CreateTournamentInput = {
  name: '',
  sportId: '',
  startDate: '',
  endDate: '',
  startTime: null,
  endTime: null,
  venue: '',
  venueAddress: null,
  timezone: 'Asia/Kolkata',
  description: null,
  visibility: 'PUBLIC',
  registrationCode: null,
  numTeams: 8,
  playersPerTeam: 4,
  numGroups: 2,
  matchFormat: {
    matchType: 'DOUBLES',
    gamesPerMatch: 4,
    playersPerSide: 2,
    tiebreakEnabled: true,
    tiebreakFormat: 'SINGLE_GAME',
    tournamentStructure: 'GROUP_STAGE_ONLY',
    knockoutType: 'ROUND_ROBIN',
    knockoutGamesPerMatch: 3,
    knockoutPointsToWin: undefined,
    teamsAdvancePerGroup: 2,
  },
  scoringConfig: {
    pointsToWin: 21,
    winMargin: 2,
    scoringMethod: 'RALLY',
    serviceRules: 'ONE_SERVE',
    doublesService: 'BOTH_SERVE',
  },
  registrationConfig: {
    requirePhone: false,
    requireDateOfBirth: false,
    requireGender: false,
    requireRating: false,
    customFields: [],
  },
  standingsConfig: {
    criteria: [
      { field: 'matchWins', order: 1, direction: 'DESC' },
      { field: 'gameDifferential', order: 2, direction: 'DESC' },
      { field: 'headToHead', order: 3, direction: 'DESC' },
    ],
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
  },
  tiebreakConfig: {
    pointsToWin: 11,
    winMargin: 2,
  },
  logoUrl: null,
  bannerUrl: null,
  primaryColor: null,
  secondaryColor: null,
}

interface Props {
  sports: { id: string; name: string; slug: string }[]
  mode?: 'create' | 'edit'
  tournamentId?: string
  tournamentSlug?: string
  initialData?: CreateTournamentInput
}

export function TournamentWizard({ sports, mode = 'create', tournamentId, tournamentSlug, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<CreateTournamentInput>(initialData ?? DEFAULT_VALUES)
  const [isPending, startTransition] = useTransition()

  function update(patch: Partial<CreateTournamentInput>) {
    setData((d) => ({ ...d, ...patch }))
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleSubmit() {
    startTransition(async () => {
      if (mode === 'edit' && tournamentId) {
        const result = await updateTournamentFull(tournamentId, data)
        if (!result.success) {
          toast.error(result.error)
        } else {
          toast.success('Tournament updated successfully')
          router.push(`/manage/${tournamentSlug}`)
        }
      } else {
        const result = await createTournament(data)
        if (result && !result.success) {
          toast.error(result.error)
        }
        // On success, createTournament redirects — nothing else needed here
      }
    })
  }

  const stepProps = { data, update, onNext: next }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={[
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                i === step
                  ? 'bg-brand-500 text-white'
                  : i < step
                    ? 'bg-surface-overlay text-text-secondary cursor-pointer hover:bg-surface-raised'
                    : 'bg-surface-overlay text-text-muted cursor-not-allowed opacity-50',
              ].join(' ')}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-px mx-0.5 ${i < step ? 'bg-brand-500' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step heading */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          {STEPS[step].label}
        </h2>
        <p className="text-sm text-text-secondary">{STEPS[step].description}</p>
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-surface-raised p-4 md:p-6">
        {step === 0 && <Step1Basics sports={sports} {...stepProps} />}
        {step === 1 && <Step2Structure {...stepProps} />}
        {step === 2 && <Step3Format {...stepProps} />}
        {step === 3 && <Step4Registration {...stepProps} />}
        {step === 4 && <Step5Standings {...stepProps} />}
        {step === 5 && <Step6Review data={data} mode={mode} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={prev} disabled={step === 0}>
          <ChevronLeft size={16} /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={isPending}>
            {mode === 'edit' ? 'Save Changes' : 'Create Tournament'}
          </Button>
        )}
      </div>
    </div>
  )
}
