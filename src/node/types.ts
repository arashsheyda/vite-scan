import type { ViteScanRuntimeConfig } from '../shared/types'

export type { ViteScanClientConfig, ViteScanRuntimeConfig } from '../shared/types'

/** Optional plugin options provided in vite.config.ts. */
export interface ViteScanPluginOptions {
  /** Dock icon when idle (Iconify name). */
  inactiveIcon?: string
  /** Dock icon while a scan is active (Iconify name). */
  activeIcon?: string
}

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'vite-scan:set-active': (active: boolean) => void
    'vite-scan:get-config': () => ViteScanRuntimeConfig
    'vite-scan:is-active': () => boolean
    'vite-scan:update-config': (patch: Partial<ViteScanRuntimeConfig>) => ViteScanRuntimeConfig
  }
}
