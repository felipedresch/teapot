import { cn } from '../lib/utils'

type BrandWordmarkProps = {
  className?: string
  casing?: 'lower' | 'title'
}

export default function BrandWordmark({
  className,
  casing = 'lower',
}: BrandWordmarkProps) {
  const myText = casing === 'title' ? 'My' : 'my'
  const wishText = casing === 'title' ? 'Wish' : 'wish'

  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <span className="text-expresso">{myText}</span>
      <span className="text-primary">{wishText}</span>
    </span>
  )
}
