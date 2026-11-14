import { describe, expect, it } from 'vitest'
import { detectBlogOccasion } from '../src/components/BlogOccasionCta'

describe('detectBlogOccasion', () => {
  it('reconhece o post de ideias de aniversário citado pelo Copilot', () => {
    expect(
      detectBlogOccasion({
        slug: 'presentes-aniversario-50-ideias-idades',
        title: '50 ideias de presentes de aniversário para todas as idades',
      }),
    ).toBe('aniversario')
  })
  it('prioriza slug e título sobre palavras-chave', () => {
    expect(
      detectBlogOccasion({
        slug: 'quais-presentes-colocar-na-lista-de-cha-de-panela',
        title: 'Quais presentes colocar na lista de chá de panela',
        keywords: ['casamento', 'aniversário'],
      }),
    ).toBe('cha-de-panela')
    expect(
      detectBlogOccasion({
        slug: 'como-organizar-uma-lista-de-presentes-de-casa-nova-sem-itens-repetidos',
        title: 'Como organizar uma lista de casa nova',
      }),
    ).toBe('casa-nova')
  })
  it('usa as palavras-chave quando slug e título são genéricos', () => {
    expect(
      detectBlogOccasion({
        slug: 'lista-de-presentes-online-ou-tradicional',
        title: 'Lista de presentes online ou tradicional?',
        keywords: ['lista de casamento'],
      }),
    ).toBe('casamento')
  })
  it('devolve null para posts sem ocasião', () => {
    expect(
      detectBlogOccasion({
        slug: 'como-compartilhar-sua-lista-de-presentes-no-whatsapp-com-elegancia',
        title: 'Como compartilhar sua lista no WhatsApp',
      }),
    ).toBeNull()
  })
})
