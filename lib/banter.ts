import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function generateMatchBanter(params: {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  tournamentName: string
}): Promise<string> {
  try {
    const winner = params.homeScore > params.awayScore ? params.homeTeam : params.awayTeam
    const loser = params.homeScore > params.awayScore ? params.awayTeam : params.homeTeam
    const score = `${params.homeScore}-${params.awayScore}`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: `Write a punchy 1-2 sentence push notification for a ${params.tournamentName} match result. ${winner} beat ${loser} ${score}. Be playful and use light banter — celebrate the winner and tease the loser good-naturedly. No emojis. Max 120 characters total.`,
        },
      ],
    })

    const text = (msg.content[0] as { type: string; text: string }).text?.trim()
    return text ?? `${winner} takes it ${score}!`
  } catch {
    const winner = params.homeScore > params.awayScore ? params.homeTeam : params.awayTeam
    return `${winner} wins ${params.homeScore}-${params.awayScore}! Great match.`
  }
}
