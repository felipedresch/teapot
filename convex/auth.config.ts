export default {
  providers: [
    {
      // Dominío usado pelo cliente para falar com o backend (Convex Auth)
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}

