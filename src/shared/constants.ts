/** Dock ID for the Vite Scan settings panel entry. */
export const SCAN_DOCK_ID = 'vite-scan'
/** Dock ID for the Vite Scan action entry. */
export const SCAN_ACTION_ID = 'vite-scan:scan-action'

/** Default outline color for highlighted DOM updates. */
export const DEFAULT_HIGHLIGHT_COLOR = '#A78BFA'
/** Default glow color used by the pulse animation. */
export const DEFAULT_GLOW_COLOR = 'rgba(167, 139, 250, 0.50)'
/** Default outline width for highlighted elements. */
export const DEFAULT_OUTLINE_WIDTH_PX = 2
/** Default outline offset for highlighted elements. */
export const DEFAULT_OUTLINE_OFFSET_PX = 1
/** Default pulse animation duration. */
export const DEFAULT_PULSE_DURATION_MS = 420
/** Default pulse shadow spread distance. */
export const DEFAULT_PULSE_SPREAD_PX = 10

/** Global window key that stores the current scan session. */
export const SESSION_KEY = '__VITE_SCAN_SESSION__'
/** localStorage key for persisted scan settings/config values. */
export const CONFIG_STORAGE_KEY = '__vite_scan_client_config_v1__'
/** localStorage key indicating scan was actively running and should resume on refresh. */
export const ACTIVE_STORAGE_KEY = '__vite_scan_active_v1__'
/** DOM ID of the injected runtime style tag. */
export const STYLE_ID = '__vite_scan_overlay_styles__'
/** DOM ID of the canvas overlay element. */
export const CANVAS_ID = '__vite_scan_canvas__'
/** Attribute used to mark recently updated elements. */
export const HIT_ATTR = 'data-vite-scan-hit'

/** DOM ID for the settings panel root element. */
export const ROOT_ID = '__vite_scan_settings_root__'

/** Whether scan starts enabled by default. */
export const DEFAULT_ENABLED = true
/** Default icon used when scan is idle. */
export const DEFAULT_INACTIVE_ICON = 'ph:scan'
/** Default icon used while scan is active. */
export const DEFAULT_ACTIVE_ICON = 'ph:scan-duotone'
/** Default icon used when scan is disabled. */
export const DEFAULT_DISABLED_ICON = 'ph:prohibit-duotone'