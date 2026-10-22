import Google from '@auth/core/providers/google'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import { isDevelopmentDeployment } from './lib/deployment'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // O login por senha só existe em deployment de desenvolvimento: é o login de
  // teste dos previews (convex/dev/previewSeed.ts, src/lib/signIn.ts).
  providers: isDevelopmentDeployment() ? [Google, Password] : [Google],
})
