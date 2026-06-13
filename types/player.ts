import { z } from 'zod'

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  yearsPlaying: z.coerce.number().int().min(0).max(50).optional().nullable(),
  selfRating: z.coerce.number().min(1).max(5).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  emergencyContact: z.string().max(200).optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
