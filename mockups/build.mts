// Generates every mockup page plus the gallery:  npx tsx mockups/build.mts
import { mkdirSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { SUBNAV, TABS, type Variant } from "./lib.mts";
import { SCREENS, type Screen } from "./screens.mts";

const DIRECTIONS: { id: Variant; name: string; tagline: string }[] = [
  { id: "clean", name: "Clean", tagline: "White surfaces, hairline dividers, Inter, dark names, accent only on the active tab and main buttons." },
];
const SWATCHES = ["#0c8312", "#166534", "#059669", "#0f766e", "#1d4ed8", "#6d28d9", "#c2410c", "#c8102e", "#334155"];

const OUT = new URL("./screens/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(OUT + f);

const tabHref: Record<string, string> = { roster: "roster", matchup: "matchup", players: "players", league: "standings" };

function shell(v: Variant, s: Screen) {
  const link = (id: string) => `${id}-${v}.html`;
  const header =
    s.full
      ? ""
      : `<header class="hdr"><span class="logo">HL</span><div class="ttl">${s.tab === "none" ? "Hoops League" : `Demo League<small>Tejvir's Squad · 2-1 · 2nd of 4</small>`}</div>${s.tab === "none" ? "" : `<div class="right"><span>Week 3</span></div>`}</header>`;
  const tabs = s.tab === "none" ? "" : `<nav class="tabs" aria-label="League">${TABS.map((t) => `<a href="${link(tabHref[t.id])}" class="${t.id === s.tab ? "on" : ""}">${t.label}</a>`).join("")}</nav>`;
  const sub = s.sub ? `<nav class="subnav" aria-label="League sections">${SUBNAV.map((n) => `<a href="${link(n.id)}" class="${n.id === s.sub ? "on" : ""}">${n.label}</a>`).join("")}</nav>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${s.title} · ${v.toUpperCase()}</title>
<link rel="stylesheet" href="../assets/base.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"><link rel="stylesheet" href="../assets/refined.css"></head>
<body class="theme-${v} refined">${header}${tabs}${sub}<main>${s.render()}</main>${s.overlay?.() ?? ""}<script src="../assets/accent.js"></script></body></html>`;
}

for (const s of SCREENS) for (const d of DIRECTIONS) writeFileSync(`${OUT}${s.id}-${d.id}.html`, shell(d.id, s));

const gallery = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hoops League · Mockups</title>
<style>
:root{--bg:#f2f3f5;--card:#fff;--line:#dddddd;--ink:#1a1a1a;--muted:#6b6f76;--accent:#0c8312;--accent-ink:#fff}
*{box-sizing:border-box;margin:0}body{font-family:Roboto,"Helvetica Neue",Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
header.top{background:#fff;border-bottom:1px solid var(--line);padding:18px 24px;position:sticky;top:0;z-index:30}
.in{max-width:1500px;margin:0 auto;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
h1{font-size:22px;font-weight:600}p.lead{color:var(--muted);font-size:14px;max-width:700px;margin-top:4px;line-height:1.4}
.controls{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
button,.btn{background:#fff;color:var(--ink);border:1.5px solid #c9cdd3;border-radius:999px;padding:7px 16px;font-weight:500;cursor:pointer;font-size:13px;font-family:inherit}
button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.sw{width:26px;height:26px;border-radius:50%;padding:0;border:2px solid #fff;box-shadow:0 0 0 1.5px #c9cdd3}.sw.on{box-shadow:0 0 0 2.5px var(--ink);background-clip:padding-box}
.acc{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
main{max-width:1500px;margin:0 auto;padding:24px}
.dirs{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:28px}
.dir{background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px;font-size:13px;color:var(--muted);line-height:1.4}.dir b{display:block;color:var(--ink);margin-bottom:4px;font-size:14px}
.screen{margin-bottom:44px}.screen h2{font-size:19px;font-weight:600}.screen p{color:var(--muted);font-size:13px;margin:2px 0 12px}
.row{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(var(--cw),max-content));align-items:start}
body[data-device=mobile]{--w:390;--h:844;--s:.62;--cw:250px}body[data-device=desktop]{--w:1280;--h:800;--s:.4;--cw:520px}
.cell label{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;font-weight:600}.cell label a{color:var(--muted);font-weight:400;font-size:12px}
.frame{display:block;position:relative;width:calc(var(--w)*var(--s)*1px);height:calc(var(--h)*var(--s)*1px);border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}
.frame iframe{position:absolute;left:0;top:0;width:calc(var(--w)*1px);height:calc(var(--h)*1px);border:0;transform:scale(var(--s));transform-origin:0 0;pointer-events:none}
.pick{margin-top:10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pick span{font-size:13px;color:var(--muted)}.pick button{padding:4px 12px;font-size:12px}
textarea{width:100%;max-width:640px;margin-top:8px;background:#fff;border:1px solid #c9cdd3;border-radius:8px;padding:8px;font:inherit;font-size:13px;min-height:54px}
#out{display:none;max-width:1500px;margin:0 auto 24px;background:#fff;border:2px solid var(--accent);border-radius:10px;padding:14px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px}
</style></head><body data-device="mobile">
<header class="top"><div class="in"><div><h1>Hoops League mockups · Clean</h1><p class="lead">Clean look, every screen. Flip phone and desktop, change the accent color, mark a preference per screen, then press <b>Copy my picks</b> and paste it into chat.</p></div>
<div class="controls"><div class="acc">Accent <span style="display:flex;gap:6px">${SWATCHES.map((h) => `<button class="sw" data-hex="${h}" style="background:${h}" aria-label="${h}"></button>`).join("")}</span><input type="color" value="#0c8312" aria-label="Custom accent" style="width:34px;height:28px;border:1px solid #c9cdd3;border-radius:6px;background:#fff"></div>
<button id="m" class="on">Phone</button><button id="d">Desktop</button><button id="copy" class="on">Copy my picks</button></div></div></header>
<main><pre id="out"></pre>
<div class="dirs">${DIRECTIONS.map((d) => `<div class="dir"><b>${d.name}</b>${d.tagline}</div>`).join("")}</div>
${SCREENS.map((s) => `<section class="screen" id="${s.id}"><h2>${s.title}</h2><p>${s.description}</p><div class="row">${DIRECTIONS.map((d) => `<div class="cell"><label><span>${d.name}</span><a href="screens/${s.id}-${d.id}.html" target="_blank">open ↗</a></label><a class="frame" href="screens/${s.id}-${d.id}.html" target="_blank"><iframe loading="lazy" src="screens/${s.id}-${d.id}.html" title="${s.title} ${d.name}"></iframe></a></div>`).join("")}</div>
<div class="pick" data-screen="${s.id}"><span>I prefer:</span>${DIRECTIONS.map((d) => `<button data-v="${d.id}">${d.id.toUpperCase()}</button>`).join("")}<button data-v="mix">Mix</button><button data-v="none">None</button></div>
<textarea data-note="${s.id}" placeholder="What do you like or want changed on this screen?"></textarea></section>`).join("")}
</main>
<script src="assets/accent.js"></script>
<script>
const KEY="hoops-mockup-picks";let st={};try{st=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch{}};const body=document.body;
document.getElementById("m").onclick=()=>{body.dataset.device="mobile";m.className="on";d.className=""};
document.getElementById("d").onclick=()=>{body.dataset.device="desktop";d.className="on";m.className=""};
document.querySelectorAll("iframe").forEach(f=>f.addEventListener("load",()=>{try{const h=HL.get();if(h)HL.apply(f.contentDocument,h)}catch{}}));
document.querySelectorAll(".pick").forEach(p=>{const id=p.dataset.screen;const paint=()=>p.querySelectorAll("button").forEach(b=>b.classList.toggle("on",(st[id]||{}).pick===b.dataset.v));
 p.querySelectorAll("button").forEach(b=>b.onclick=()=>{st[id]={...(st[id]||{}),pick:b.dataset.v};save();paint()});paint()});
document.querySelectorAll("textarea").forEach(t=>{const id=t.dataset.note;t.value=(st[id]||{}).note||"";t.oninput=()=>{st[id]={...(st[id]||{}),note:t.value};save()}});
document.getElementById("copy").onclick=()=>{const lines=[...document.querySelectorAll(".screen")].map(s=>{const r=st[s.id]||{};return "- "+s.querySelector("h2").textContent+": "+(r.pick?r.pick.toUpperCase():"(no pick)")+(r.note?" | "+r.note:"")});
 const text="MY MOCKUP PICKS (accent "+(HL.get()||"#0c8312")+")\\n"+lines.join("\\n");const o=document.getElementById("out");o.style.display="block";o.textContent=text;navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{})};
</script></body></html>`;
writeFileSync(new URL("./index.html", import.meta.url).pathname, gallery);
console.log(`wrote ${SCREENS.length * DIRECTIONS.length} screens + index.html`);
