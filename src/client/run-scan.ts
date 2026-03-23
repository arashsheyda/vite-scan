import { runScanAction } from './scan-runtime'
import { runSettingsPanel } from './settings-ui'
import { getModeFromImportMetaUrl, getRuntimeConfig } from './config'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

/**
 * Client entrypoint for both action mode and panel-render mode.
 */
export default async function runViteScan(context: DockClientScriptContext): Promise<void> {
  const mode = getModeFromImportMetaUrl()

  if (mode === 'panel') {
    await runSettingsPanel(context)
    return
  }

  const config = await getRuntimeConfig(context)
  await context.rpc.callOptional('vite-scan:update-config', config)
  await runScanAction(context, config)
}
