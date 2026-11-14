// Formato que a interface recebe: o mesmo de
// api.productSuggestions.listProductSuggestions.
export type SuggestionSlot = 'budget' | 'popular' | 'gift'

export type SuggestionProduct = {
  slot: SuggestionSlot
  itemId: string
  name: string
  imageUrl: string
  price: number
  rating?: number
  sales?: number
  productLink: string
}

export type SuggestionIdeaView = {
  ideaId: string
  label: string
  category?: string
  products: SuggestionProduct[]
}
