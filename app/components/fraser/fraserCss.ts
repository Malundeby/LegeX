/**
 * Styles for the phrase panel. Kept as a string so the exact same CSS can be
 * injected into the floating (Document Picture-in-Picture) window, which does
 * not inherit the page's stylesheets. Everything is scoped under .fk.
 */
export const FRASER_CSS = `
.fk{--fk-bg:var(--card,#faf5ec);--fk-bg2:var(--result-bg,#f3e9da);--fk-bg3:var(--panel-2,#e7d9c6);--fk-fg:var(--text,#4a3527);--fk-head:var(--heading,#3c2a1f);--fk-muted:var(--muted,#7a5f4a);--fk-bd:var(--result-border,#e2cdb0);--fk-acc:var(--primary,#b5573f);--fk-accbg:var(--primary-bg,#f2e2da);--fk-fav:#c98a00;--fk-danger:#b42318;
  position:relative;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--fk-bg);color:var(--fk-fg);
  font:13.5px/1.45 "Nunito Sans",system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden;box-sizing:border-box}
.fk *,.fk *::before,.fk *::after{box-sizing:border-box}
.fk button,.fk input,.fk textarea,.fk select{font:inherit;color:inherit}
.fk-top{display:flex;gap:6px;align-items:center;padding:8px;border-bottom:1px solid var(--fk-bd);flex:none}
.fk-search{flex:1;min-width:0;height:32px;border:1px solid var(--fk-bd);border-radius:8px;padding:0 10px;background:#fff;outline:none}
.fk-search:focus{border-color:var(--fk-acc)}
.fk-btn{height:32px;min-width:32px;border:1px solid var(--fk-bd);border-radius:8px;background:var(--fk-bg);cursor:pointer;padding:0 10px;white-space:nowrap}
.fk-btn:hover{background:var(--fk-bg2)}
.fk-btn:disabled{opacity:.6;cursor:default}
.fk-primary{background:var(--fk-acc);border-color:var(--fk-acc);color:#fff!important}
.fk-primary:hover{background:var(--primary-dark,#9a4630)}
.fk-danger{color:var(--fk-danger)!important;border-color:var(--fk-danger)}
.fk-crumb{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:5px 10px;font-size:12px;color:var(--fk-muted);border-bottom:1px solid var(--fk-bd);min-height:30px;flex:none}
.fk-crumb button{border:0;background:none;padding:0;cursor:pointer;color:var(--fk-muted)}
.fk-crumb button:hover{color:var(--fk-acc)}
.fk-crumb b{color:var(--fk-head);font-weight:600}
.fk-crumb .fk-spacer{flex:1}
.fk-crumb a{color:var(--fk-acc)}
.fk-body{flex:1;display:flex;min-height:0}
.fk-col{width:165px;flex:none;overflow:auto;border-right:1px solid var(--fk-bd);padding:4px}
.fk-col.wide{flex:1;width:auto;border-right:0;padding:6px}
.fk-item{position:relative;display:flex;justify-content:space-between;align-items:center;gap:4px;padding:6px 8px;border-radius:7px;cursor:pointer;user-select:none}
.fk-item:hover{background:var(--fk-bg2)}
.fk-item.sel{background:var(--fk-accbg);color:var(--fk-acc)}
.fk-item .fk-name{flex:1;min-width:0;overflow-wrap:anywhere}
.fk-item .fk-n{font-size:11px;color:var(--fk-muted);flex:none}
.fk-item.special .fk-name{font-weight:600}
.fk-sep{height:1px;background:var(--fk-bd);margin:4px 6px}
.fk-ph{border:1px solid transparent;border-radius:9px;padding:7px 9px;cursor:pointer;margin-bottom:2px}
.fk-ph:hover{background:var(--fk-bg2);border-color:var(--fk-bd)}
.fk-ph-t{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;font-weight:600;color:var(--fk-head)}
.fk-ph-x{color:var(--fk-muted);font-size:12.5px;margin-top:2px;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fk-ph:hover .fk-ph-x{-webkit-line-clamp:unset;display:block}
.fk-ph-p{font-size:11px;color:var(--fk-muted);margin-bottom:2px}
.fk-acts{display:flex;gap:1px;flex:none;align-items:center}
.fk-ic{border:0;background:none;color:var(--fk-muted);cursor:pointer;padding:2px 5px;border-radius:5px;font-size:13px;line-height:1.2}
.fk-ic:hover{background:var(--fk-bd);color:var(--fk-head)}
.fk-ic.on{color:var(--fk-fav)}
.fk-ic.del:hover{color:var(--fk-danger)}
.fk-ic.confirm{color:#fff;background:var(--fk-danger);font-size:11px}
.fk-item{flex-wrap:wrap}
.fk-item .fk-acts{display:none}
.fk-item.sel .fk-acts{display:flex;order:3;width:100%;gap:2px;margin-top:3px}
.fk-add{display:block;width:100%;text-align:left;border:1px dashed var(--fk-bd);background:none;border-radius:7px;padding:6px 8px;margin-top:6px;color:var(--fk-muted);cursor:pointer;font-size:12.5px}
.fk-add:hover{color:var(--fk-acc);border-color:var(--fk-acc)}
.fk-empty{color:var(--fk-muted);padding:22px 14px;text-align:center}
.fk-hint{font-size:12px;color:var(--fk-muted);padding:6px 8px}
.fk-hint a{color:var(--fk-acc)}
.fk-toast{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);background:var(--fk-head);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;opacity:0;transition:opacity .15s;pointer-events:none;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;z-index:5}
.fk-toast.show{opacity:1}
.fk-mini-wrap{align-items:center;justify-content:center;background:var(--fk-bg)}
.fk-round{width:min(76px,calc(100vmin - 12px));height:min(76px,calc(100vmin - 12px));border-radius:50%;border:0;cursor:pointer;background:var(--fk-acc);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:0 4px 12px rgba(0,0,0,.18);font-size:20px;line-height:1;transition:transform .12s}
.fk-round small{font-size:10.5px;font-weight:700;letter-spacing:.02em}
.fk-round:hover{transform:scale(1.05)}
.fk-round:focus-visible{outline:3px solid var(--fk-accbg);outline-offset:2px}
.fk-titlebar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:none;width:100%;height:26px;padding:0 10px;border:0;border-bottom:1px solid var(--fk-bd);background:var(--fk-bg2);color:var(--fk-muted);font-size:12px;font-weight:700;cursor:pointer;text-align:left}
.fk-titlebar:hover{background:var(--fk-bg3);color:var(--fk-head)}
.fk-form{flex:1;padding:12px;display:flex;flex-direction:column;gap:6px;overflow:auto}
.fk-form label{font-size:12px;color:var(--fk-muted);font-weight:600;margin-top:4px}
.fk-form input,.fk-form textarea,.fk-form select{width:100%;border:1px solid var(--fk-bd);border-radius:8px;padding:7px 9px;background:#fff;outline:none}
.fk-form input:focus,.fk-form textarea:focus,.fk-form select:focus{border-color:var(--fk-acc)}
.fk-form textarea{resize:vertical}
.fk-form .fk-row{display:flex;gap:6px;justify-content:flex-end;margin-top:6px}
.fk-form .fk-warn{font-size:12px;background:#fff4e5;border:1px solid #f5c98a;color:#7a4a00;border-radius:8px;padding:6px 9px}
.fk-form .fk-err{font-size:12px;color:var(--fk-danger)}
.fk-form .fk-ctx{font-size:12px;color:var(--fk-muted)}
.fk-hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important}
`;
