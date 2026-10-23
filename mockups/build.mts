// Generates every mockup page plus the gallery:  npx tsx mockups/build.mts
import { mkdirSync, writeFileSync } from "node:fs";
import { nav, type Variant } from "./lib.mts";
import { SCREENS } from "./screens.mts";

const DIRECTIONS: { id: Variant; name: string; tagline: string }[] = [
  { id: "a", name: "A · Broadcast", tagline: "ESPN-style: dark title bar, tabs, dense tables, red accent. Information first." },
  { id: "b", name: "B · Clean Cards", tagline: "Yahoo-style: light, purple, big rounded cards, sidebar on desktop. Friendly and roomy." },
  { id: "c", name: "C · Arena", tagline: "Dark, high-contrast, huge scores, lime accent. Feels like game night." },
];

const OUT = new URL("./screens/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

function shell(v: Variant, title: string, active: string | null, body: string, overlay = "") {
  const n = nav(active ?? "");
  const hasNav = active !== null;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} · ${v.toUpperCase()}</title>
<link rel="stylesheet" href="../assets/base.css"><link rel="stylesheet" href="../assets/${v}.css"></head>
<body class="theme-${v}"><div class="app${hasNav ? "" : " no-nav"}">
${hasNav ? `<aside class="side"><div class="brand"><span class="logo">HL</span>Hoops League</div>${n.side}<div class="foot">Demo League · Week 3<br>Tejvir's Squad</div></aside>` : ""}
<header class="topbar"><div class="brand"><span class="logo">HL</span><span>Hoops League</span></div>${hasNav ? `<nav class="toptabs">${n.top}</nav>` : ""}<div class="who">Demo League · Wk 3</div></header>
<main class="main">${body}</main>
${hasNav ? `<nav class="bottomnav">${n.bottom}</nav>` : ""}
</div>${overlay}</body></html>`;
}

for (const s of SCREENS) {
  for (const d of DIRECTIONS) {
    writeFileSync(`${OUT}${s.id}-${d.id}.html`, shell(d.id, s.title, s.active, s.render(d.id), s.overlay?.(d.id) ?? ""));
  }
}

const gallery = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hoops League · Mockups</title>
<style>
:root{--bg:#0f1420;--card:#171e2e;--line:#27304a;--ink:#eef2fa;--muted:#8d97ad;--acc:#c6ff3d}
*{box-sizing:border-box;margin:0}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--ink);padding:24px}
header.top{max-width:1500px;margin:0 auto 24px;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between}
h1{font-size:28px;letter-spacing:-.02em}p.lead{color:var(--muted);max-width:760px;margin-top:6px;line-height:1.45}
.controls{display:flex;gap:8px;flex-wrap:wrap}button,.btn{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:13px}
button.on{background:var(--acc);color:#0b1200;border-color:var(--acc)}
.dirs{max-width:1500px;margin:0 auto 28px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.dir{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}.dir b{display:block;margin-bottom:4px}.dir span{color:var(--muted);font-size:13px;line-height:1.4}
.screen{max-width:1500px;margin:0 auto 40px}
.screen h2{font-size:20px}.screen p{color:var(--muted);font-size:13px;margin:2px 0 12px}
.row{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(var(--cw),max-content));align-items:start}
body[data-device=mobile]{--w:390;--h:844;--s:.62;--cw:250px}
body[data-device=desktop]{--w:1280;--h:800;--s:.4;--cw:520px}
.cell label{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;font-weight:800}
.frame{display:block;position:relative;width:calc(var(--w)*var(--s)*1px);height:calc(var(--h)*var(--s)*1px);border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
.frame iframe{position:absolute;left:0;top:0;width:calc(var(--w)*1px);height:calc(var(--h)*1px);border:0;transform:scale(var(--s));transform-origin:0 0;pointer-events:none}
.pick{margin-top:8px;display:flex;gap:6px;align-items:center}.pick button{padding:5px 10px;font-size:12px}
textarea{width:100%;margin-top:8px;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:8px;font:inherit;font-size:13px;min-height:54px}
#out{display:none;max-width:1500px;margin:0 auto 24px;background:var(--card);border:1px solid var(--acc);border-radius:14px;padding:14px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px}
</style></head><body data-device="mobile">
<header class="top"><div><h1>Hoops League mockups</h1><p class="lead">Three visual directions for every screen. Flip between phone and desktop, mark which you prefer per screen, add notes, then press <b>Copy my picks</b> and paste the result back into chat. See MOCKUP_PLAN.md for how we narrow this down.</p></div>
<div class="controls"><button id="m" class="on">Mobile</button><button id="d">Desktop</button><button id="copy" style="background:var(--acc);color:#0b1200;border-color:var(--acc)">Copy my picks</button></div></header>
<pre id="out"></pre>
<div class="dirs">${DIRECTIONS.map((d) => `<div class="dir"><b>${d.name}</b><span>${d.tagline}</span></div>`).join("")}</div>
${SCREENS.map(
  (s) => `<section class="screen" id="${s.id}"><h2>${s.title}</h2><p>${s.description}</p><div class="row">${DIRECTIONS.map(
    (d) => `<div class="cell"><label><span>${d.name}</span><a href="screens/${s.id}-${d.id}.html" target="_blank" style="color:var(--muted);font-weight:600;font-size:12px">open ↗</a></label><a class="frame" href="screens/${s.id}-${d.id}.html" target="_blank"><iframe loading="lazy" src="screens/${s.id}-${d.id}.html" title="${s.title} ${d.name}"></iframe></a></div>`,
  ).join("")}</div>
  <div class="pick" data-screen="${s.id}"><span style="font-size:13px;color:var(--muted)">I prefer:</span>${DIRECTIONS.map((d) => `<button data-v="${d.id}">${d.id.toUpperCase()}</button>`).join("")}<button data-v="mix">Mix</button><button data-v="none">None</button></div>
  <textarea data-note="${s.id}" placeholder="What do you like or want changed on this screen?"></textarea></section>`,
).join("")}
<script>
const KEY="hoops-mockup-picks";let st={};try{st=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch{}};
const body=document.body;
document.getElementById("m").onclick=()=>{body.dataset.device="mobile";m.className="on";d.className=""};
document.getElementById("d").onclick=()=>{body.dataset.device="desktop";d.className="on";m.className=""};
document.querySelectorAll(".pick").forEach(p=>{const id=p.dataset.screen;const paint=()=>p.querySelectorAll("button").forEach(b=>b.classList.toggle("on",(st[id]||{}).pick===b.dataset.v));
  p.querySelectorAll("button").forEach(b=>b.onclick=()=>{st[id]={...(st[id]||{}),pick:b.dataset.v};save();paint()});paint()});
document.querySelectorAll("textarea").forEach(t=>{const id=t.dataset.note;t.value=(st[id]||{}).note||"";t.oninput=()=>{st[id]={...(st[id]||{}),note:t.value};save()}});
document.getElementById("copy").onclick=()=>{const lines=[...document.querySelectorAll(".screen")].map(s=>{const r=st[s.id]||{};return "- "+s.querySelector("h2").textContent+": "+(r.pick?r.pick.toUpperCase():"(no pick)")+(r.note?" | "+r.note:"")});
  const text="MY MOCKUP PICKS\\n"+lines.join("\\n");const o=document.getElementById("out");o.style.display="block";o.textContent=text;navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})};
</script></body></html>`;
writeFileSync(new URL("./index.html", import.meta.url).pathname, gallery);
console.log(`wrote ${SCREENS.length * DIRECTIONS.length} screens + index.html`);
