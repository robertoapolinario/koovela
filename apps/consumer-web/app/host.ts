/** app.koovela.com (e app.staging., app.koovela.localhost) → shell; o resto → páginas públicas. */
export const isAppHost = (request: Request): boolean => /^app\./.test(new URL(request.url).hostname);
