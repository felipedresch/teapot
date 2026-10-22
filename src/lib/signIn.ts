import type { useAuthActions } from '@convex-dev/auth/react'

type SignIn = ReturnType<typeof useAuthActions>['signIn']

// Nos previews das branches (scripts/cloudflare/preview-site.sh), o Google não
// conhece o Convex de cada preview: "Entrar" usa o login de teste que o seed
// cria (convex/dev/previewSeed.ts), e o Convex só aceita esse login em
// deployment de desenvolvimento. Fora dos previews, Google.
const PREVIEW_LOGIN = import.meta.env.VITE_PREVIEW_LOGIN === 'true'

export async function signInToApp(signIn: SignIn, redirectTo: string) {
  if (PREVIEW_LOGIN) {
    await signIn('password', {
      flow: 'signIn',
      email: 'preview@mywish.test',
      password: 'Preview-MyWish-2026',
    })
    return
  }
  await signIn('google', { redirectTo })
}
