import { describe, expect, it } from 'vitest'
import { CAST } from './cast'
import { likeShare } from './house'
import { TRAITS } from './plant'
import { VISITORS } from './visitors'

// The scenes' lengths, with the real cast: the sheet gives an ending 6 to 9
// seconds and a secret 4 to 7, and a miss has to stay a short answer.

const seconds = (who: (typeof VISITORS)[number], name: string) => CAST[who].answer[name]?.seconds ?? 0

describe('with the real cast', () => {
  it('an ending lasts between five and a half and nine and a half seconds, whoever it is and however many traits it likes', () => {
    for (const who of VISITORS) {
      for (let likes = 1; likes <= 4; likes++) {
        const liked = TRAITS.slice(0, likes).reduce((sum, trait) => sum + seconds(who, `like-${trait}`) * likeShare(likes), 0)
        const whole = 0.25 + liked + seconds(who, 'take') + seconds(who, 'use') + seconds(who, 'settle')
        expect(whole, `${who} liking ${likes}`).toBeGreaterThan(5.5)
        expect(whole, `${who} liking ${likes}`).toBeLessThan(9.5)
      }
    }
  })

  it('a miss is answered in under six seconds: at most three likes cut short, and one joke', () => {
    for (const who of VISITORS) {
      const jokes = Object.keys(CAST[who].answer).filter((name) => name.startsWith('miss-'))
      const likes = TRAITS.map((trait) => seconds(who, `like-${trait}`)).sort((a, b) => b - a).slice(0, 3).reduce((sum, one) => sum + one * likeShare(3), 0)
      for (const joke of jokes) expect(0.25 + likes + seconds(who, joke), `${who} ${joke}`).toBeLessThan(6)
    }
  })

  it('an ending that follows a secret is the secret and then the ending: under seventeen seconds in all', () => {
    for (const [who, secret] of [['snail', 'hat'], ['ladybird', 'vanish']] as const) {
      const liked = TRAITS.reduce((sum, trait) => sum + seconds(who, `like-${trait}`) * likeShare(4), 0)
      const whole = 0.25 + seconds(who, secret) + liked + seconds(who, 'take') + seconds(who, 'use') + seconds(who, 'settle')
      expect(whole, who).toBeLessThan(9.5 + 7)
    }
  })

  it('a secret lasts four to seven seconds', () => {
    expect(seconds('snail', 'hat')).toBeGreaterThanOrEqual(4)
    expect(seconds('snail', 'hat')).toBeLessThanOrEqual(7)
    expect(seconds('ladybird', 'vanish')).toBeGreaterThanOrEqual(4)
    expect(seconds('ladybird', 'vanish')).toBeLessThanOrEqual(7)
  })

  it('has every action the game calls, for every visitor that can be asked for it', () => {
    const always = ['come-in', 'go-off', 'shrug', 'poked', 'take', 'use', 'settle', 'rattle', 'balance', 'tug', 'peer', 'bow', 'like-colour', 'like-height', 'like-leaf', 'like-petals', 'miss-colour', 'miss-leaf', 'miss-petals']
    for (const who of VISITORS) for (const name of always) expect(seconds(who, name), `${who} ${name}`).toBeGreaterThan(0)
    for (const who of ['snail', 'ladybird', 'ant'] as const) expect(seconds(who, 'miss-height-higher')).toBeGreaterThan(0)
    for (const who of ['snail', 'bee', 'moth', 'ladybird'] as const) expect(seconds(who, 'miss-height-lower')).toBeGreaterThan(0)
    for (const who of VISITORS) expect(Object.keys(CAST[who].idle).length).toBeGreaterThanOrEqual(3)
  })
})
