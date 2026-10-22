import { expect, it } from 'vitest'
import { canonicalRedirect } from '../src/lib/canonical'
it('redirects www to the canonical host and preserves the path and query', () => {
  const response = canonicalRedirect(
    new Request('https://www.mywish.com.br/blog?utm_source=google'),
  )
  expect(response?.status).toBe(308)
  expect(response?.headers.get('location')).toBe(
    'https://mywish.com.br/blog?utm_source=google',
  )
})
it('removes a trailing slash without changing the query', () => {
  const response = canonicalRedirect(
    new Request('https://mywish.com.br/blog/?p=1'),
  )
  expect(response?.status).toBe(308)
  expect(response?.headers.get('location')).toBe('/blog?p=1')
})
it('keeps paths with repeated leading slashes on the same host', () => {
  const response = canonicalRedirect(
    new Request('https://mywish.com.br//example.com/?p=1'),
  )
  expect(response?.status).toBe(308)
  expect(response?.headers.get('location')).toBe('/example.com?p=1')
})
it('lets canonical requests through to the app', () => {
  expect(
    canonicalRedirect(new Request('https://mywish.com.br/blog?p=1')),
  ).toBeUndefined()
})
