import { ROOT_ID } from '../shared/constants'

/**
 * Pre-computed panel CSS using CSS nesting to minimize selector repetition.
 * Uses a single `#${ROOT_ID}` wrapper instead of ~40 prefixed selectors.
 * Runtime whitespace stripping keeps the injected CSS compact.
 */
export const PANEL_CSS = `#${ROOT_ID}{
color-scheme:light dark;container-type:inline-size;
--vs-bg:#0c0e14;--vs-bg-card:#12141e;--vs-bg-input:#181c28;--vs-border:#232840;--vs-border-subtle:#1c2035;--vs-muted:#8892a8;--vs-text:#e8ecf4;--vs-gradient-start:#41D1FF;--vs-gradient-end:#BD34FE;--vs-accent:#9b6dff;
padding:16px;color:var(--vs-text);font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.5;
@media(prefers-color-scheme:light){
--vs-bg:#f5f7fa;--vs-bg-card:#ffffff;--vs-bg-input:#f0f2f7;--vs-border:#dde1ea;--vs-border-subtle:#e8ecf2;--vs-muted:#6b7588;--vs-text:#0f172a;--vs-accent:#7c3aed;
}
:root.dark &,.dark &{
--vs-bg:#0c0e14;--vs-bg-card:#12141e;--vs-bg-input:#181c28;--vs-border:#232840;--vs-border-subtle:#1c2035;--vs-muted:#8892a8;--vs-text:#e8ecf4;--vs-accent:#9b6dff;
}
.vs-card{position:relative;border-radius:14px;background:var(--vs-bg-card);padding:1px;overflow:hidden}
.vs-card::before{content:'';position:absolute;inset:0;border-radius:14px;padding:1px;background:linear-gradient(135deg,var(--vs-gradient-start),var(--vs-gradient-end));-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;opacity:0.45}
.vs-card-inner{background:var(--vs-bg-card);border-radius:13px;padding:20px}
.vs-header{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.vs-logo{flex-shrink:0;display:flex;align-items:center}
.vs-title{margin:0;font-size:16px;font-weight:700;background:linear-gradient(135deg,var(--vs-gradient-start),var(--vs-gradient-end));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.vs-sub{margin:0 0 16px;color:var(--vs-muted);font-size:12px}
.vs-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:var(--vs-bg-input);border:1px solid var(--vs-border-subtle);margin-bottom:16px}
.vs-toggle-label{font-size:13px;font-weight:500;color:var(--vs-text)}
.vs-toggle{position:relative;width:40px;height:22px;appearance:none;-webkit-appearance:none;background:var(--vs-border);border-radius:999px;cursor:pointer;transition:background 0.2s;border:none;outline:none;flex-shrink:0}
.vs-toggle::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.vs-toggle:checked{background:linear-gradient(135deg,var(--vs-gradient-start),var(--vs-gradient-end))}
.vs-toggle:checked::after{transform:translateX(18px)}
.vs-toggle:focus-visible{box-shadow:0 0 0 2px var(--vs-bg-card),0 0 0 4px var(--vs-accent)}
.vs-section{margin-bottom:16px}
.vs-section:last-child{margin-bottom:0}
.vs-section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--vs-muted);margin:0 0 8px 2px}
.vs-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.vs-field{display:flex;flex-direction:column;gap:4px}
.vs-field.full{grid-column:1 / -1}
.vs-field label{font-size:11px;font-weight:500;color:var(--vs-muted);padding-left:2px}
input[type="text"],input[type="number"]{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid var(--vs-border-subtle);background:var(--vs-bg-input);color:var(--vs-text);padding:7px 10px;font-size:12px;font-family:inherit;transition:border-color 0.15s,box-shadow 0.15s}
input[type="text"]:hover,input[type="number"]:hover{border-color:var(--vs-border)}
input[type="text"]:focus,input[type="number"]:focus{outline:none;border-color:var(--vs-accent);box-shadow:0 0 0 3px color-mix(in oklab,var(--vs-accent) 20%,transparent)}
.vs-presets{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.vs-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--vs-border-subtle);border-radius:999px;padding:4px 10px 4px 6px;font-size:11px;font-weight:500;cursor:pointer;color:var(--vs-muted);user-select:none;transition:all 0.15s;background:var(--vs-bg-input)}
.vs-chip:hover{color:var(--vs-text);border-color:var(--vs-accent);background:color-mix(in oklab,var(--vs-accent) 8%,var(--vs-bg-input))}
.vs-chip-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.vs-divider{height:1px;background:var(--vs-border-subtle);margin:16px 0;border:none}
.vs-status{display:flex;align-items:center;gap:6px;margin-top:16px;font-size:11px;color:var(--vs-muted)}
.vs-status-dot{width:6px;height:6px;border-radius:50%;background:var(--vs-muted);flex-shrink:0}
.vs-status-dot.active{background:#34d399;box-shadow:0 0 6px rgba(52,211,153,0.5)}
.vs-status-dot.disabled{background:#f87171}
@container(max-width:400px){.vs-fields{grid-template-columns:1fr}}
}`
