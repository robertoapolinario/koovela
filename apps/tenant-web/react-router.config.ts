import type { Config } from '@react-router/dev/config';

/** SPA estática (servida pelo nginx no host de aplicação). */
export default { appDirectory: 'app', ssr: false } satisfies Config;
