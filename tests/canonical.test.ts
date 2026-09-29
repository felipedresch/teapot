import { expect, it } from 'vitest'
import handler from '../server/middleware/canonical'
it('redirects www to the canonical host and preserves the path and query', async () => {
  const response = await handler.fetch(
    new Request('https://www.mywish.com.br/blog?utm_source=google'),
  )
  expect(response.status).toBe(308)
  expect(response.headers.get('location')).toBe(
    'https://mywish.com.br/blog?utm_source=google',
  )
})
it('removes a trailing slash without changing the query', async () => {
  const response = await handler.fetch(
    new Request('https://mywish.com.br/blog/?p=1'),
  )
  expect(response.status).toBe(308)
  expect(response.headers.get('location')).toBe('/blog?p=1')
})
