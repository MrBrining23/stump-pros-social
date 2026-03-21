import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   STUMP PROS WV — Social Media Command Center
   Standalone deployment version (Vercel)
   ═══════════════════════════════════════════════════════════ */

// ── Styles ──
const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#141414", borderRadius: 12, padding: 24, width: "90vw", maxWidth: 520, border: "1px solid #222", color: "#e0e0e0", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontFamily: "'Archivo Black', sans-serif", margin: "0 0 16px", color: "#c8f06a", fontSize: 18 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "'DM Mono', monospace" },
  input: { width: "100%", padding: "9px 12px", background: "#0c0c0c", border: "1px solid #222", borderRadius: 7, color: "#e0e0e0", fontSize: 13, marginBottom: 12, fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", outline: "none" },
  btn: { padding: "8px 18px", background: "linear-gradient(135deg, #c8f06a, #a8d84a)", border: "none", borderRadius: 7, color: "#111", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  btn2: { padding: "8px 16px", background: "transparent", border: "1px solid #222", borderRadius: 7, color: "#777", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  sm: { padding: "5px 11px", borderRadius: 5, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: "#ccc" },
  tiny: { padding: "3px 8px", borderRadius: 4, border: "1px solid #222", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: "transparent" },
  chip: { padding: "7px 13px", borderRadius: 16, border: "1px solid #222", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};

// ── Constants ──
const PILLARS = ["Before/After", "Education", "Seasonal", "Equipment", "Social Proof", "Humor", "Urgency"];
const PILLAR_IDS = ["before_after", "education", "seasonal", "equipment", "social_proof", "humor", "urgency"];
const PILLAR_COLORS = ["#c8f06a", "#6af0c8", "#f0c850", "#a0a0ff", "#f0a06a", "#f06ab0", "#6ac8f0"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PLATFORMS = ["Facebook", "Instagram", "Google Business Profile"];
const PI = { Facebook: "f", Instagram: "◎", "Google Business Profile": "G" };
const PC = { Facebook: "#1877F2", Instagram: "#E4405F", "Google Business Profile": "#4285F4" };
const TIMES = ["8:00 AM", "12:30 PM", "5:30 PM"];
const CATS = [
  { id: "before_after", label: "Before & After", color: "#c8f06a" },
  { id: "equipment", label: "Equipment", color: "#a0a0ff" },
  { id: "finished", label: "Finished Yards", color: "#6af0c8" },
  { id: "process", label: "In Progress", color: "#f0c850" },
  { id: "misc", label: "Other", color: "#888" },
];

const ANTI = 'NEVER: "Did you know?" openers, 3+ emojis, corporate buzzwords, "we" (say "I"), "peace of mind", hashtags on FB/GBP, exclamation spam, preachy tone, same opener twice.';

function buildSysPrompt(examples, insights) {
  return 'You write social posts for "Stump Pros WV" — a one-man stump grinding business in WV run by Joshua.\n' +
    'Business: stumpproswv.com | 304-712-2005 | Vermeer SC70TX grinder | All of West Virginia\n' +
    'Voice: Real person, not a brand. "I" not "we". Friendly, confident, down-to-earth. Short punchy sentences.\n' +
    'Pillars: Before/After, Education, Seasonal, Equipment, Social Proof, Humor, Urgency — rotate.\n' +
    'Platform: FB=conversational 2-4 sentences no hashtags. IG=visual-first 5-8 hashtags. GBP=short pro local-SEO.\n' +
    ANTI + "\n" +
    (examples ? "\nEXAMPLE POSTS (match this voice):\n" + examples + "\n" : "") +
    (insights ? "\nRESEARCH:\n" + insights + "\n" : "") +
    "Every post must feel unique. Vary structure, openings, length, energy.";
}

// ── Helpers ──
function gid() { return Math.random().toString(36).substr(2, 9); }
function fmtDate(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function getWeekDates(start) {
  const d = new Date(start), day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
}

// ── localStorage helpers ──
function loadState(key, fallback) {
  try { const v = localStorage.getItem("spsm_" + key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveState(key, value) {
  try { localStorage.setItem("spsm_" + key, JSON.stringify(value)); } catch {}
}

// ── API call helper (goes to our serverless proxy) ──
async function callClaude(opts) {
  const resp = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!resp.ok) throw new Error("API call failed: " + resp.status);
  return resp.json();
}

function extractText(data) {
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
}

// ── Small Components ──
function Stat({ label, value, color }) {
  return (<div>
    <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: color || "#ccc", fontFamily: "'Archivo Black', sans-serif" }}>{value}</div>
  </div>);
}

function TabBtn({ active, onClick, label, sub, badge, badgeColor }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 48, background: active ? "#c8f06a" : "#141414", color: active ? "#111" : "#555" }}>
      <span>{label}</span>
      {sub && <span style={{ fontSize: 9, opacity: 0.6 }}>{sub}</span>}
      {badge && <span style={{ fontSize: 9, background: (badgeColor || "#f0c850") + "1a", color: badgeColor, padding: "0 4px", borderRadius: 6 }}>{badge}</span>}
    </button>
  );
}

function FilterChip({ active, color, label, onClick }) {
  return <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 14, border: "1px solid " + (active ? color : "#222"), background: active ? color + "18" : "transparent", color: active ? color : "#555", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>{label}</button>;
}

// ═══ Drive Setup ═══
function DriveSetup({ config, setConfig, onClose }) {
  const [apiKey, setApiKey] = useState(config.apiKey || "");
  const [folderId, setFolderId] = useState(config.folderId || "");
  return (
    <div style={S.overlay}><div style={S.modal}>
      <h2 style={S.modalTitle}>Connect Google Drive</h2>
      <div style={{ background: "#0c0c0c", borderRadius: 8, padding: 14, marginBottom: 16, border: "1px solid #1a1a1a", fontSize: 12, color: "#777", lineHeight: 1.8 }}>
        <strong style={{ color: "#c8f06a" }}>One-time setup (~5 min):</strong><br />
        1. Go to <span style={{ color: "#4285F4" }}>console.cloud.google.com</span><br />
        2. Create a project → "APIs & Services" → enable "Google Drive API"<br />
        3. "Credentials" → "API Key" → copy it<br />
        4. In Drive, create a folder (e.g. "Stump Pros Media")<br />
        5. Share folder → "Anyone with link" → Viewer<br />
        6. Copy folder ID from URL
      </div>
      <label style={S.label}>Google API Key</label>
      <input style={S.input} type="password" placeholder="AIza..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
      <label style={S.label}>Drive Folder ID</label>
      <input style={S.input} placeholder="1BxiMVs0XRA5nFMd..." value={folderId} onChange={e => setFolderId(e.target.value)} />
      <p style={{ fontSize: 11, color: "#555", margin: "-8px 0 14px" }}>From: drive.google.com/drive/folders/<span style={{ color: "#c8f06a" }}>THIS_PART</span></p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { const c = { apiKey, folderId }; setConfig(c); saveState("drive", c); onClose(); }} style={S.btn}>Save & Connect</button>
        <button onClick={onClose} style={S.btn2}>Cancel</button>
      </div>
    </div></div>
  );
}

// ═══ Media Library (Google Drive) ═══
function MediaLibrary({ selecting, onSelect, driveConfig, setDriveConfig }) {
  const [driveFiles, setDriveFiles] = useState([]);
  const [dLoading, setDLoading] = useState(false);
  const [dError, setDError] = useState("");
  const [dNext, setDNext] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [tagging, setTagging] = useState(false);
  const [tagProg, setTagProg] = useState("");

  // Load Drive files
  const loadDrive = async (pageToken, append) => {
    if (!driveConfig.apiKey || !driveConfig.folderId) return;
    setDLoading(true); setDError("");
    try {
      const q = "'" + driveConfig.folderId + "' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')";
      let url = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) + "&fields=nextPageToken,files(id,name,mimeType,thumbnailLink)&pageSize=50&orderBy=createdTime%20desc&key=" + driveConfig.apiKey;
      if (pageToken) url += "&pageToken=" + pageToken;
      const resp = await fetch(url);
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error?.message || "Drive API error"); }
      const data = await resp.json();

      const savedTags = loadState("mediaTags", {});
      const files = (data.files || []).map(f => ({
        id: f.id, name: f.name,
        thumb: f.thumbnailLink ? f.thumbnailLink.replace("=s220", "=s400") : null,
        isVideo: (f.mimeType || "").startsWith("video/"),
        category: savedTags[f.id] || "uncategorized",
        source: "drive", driveId: f.id,
      }));
      if (append) setDriveFiles(prev => [...prev, ...files]); else setDriveFiles(files);
      setDNext(data.nextPageToken || null);
    } catch (err) { setDError(err.message); }
    setDLoading(false);
  };

  useEffect(() => { if (driveConfig.apiKey && driveConfig.folderId) loadDrive(null, false); }, [driveConfig.apiKey, driveConfig.folderId]);

  // Save tags to localStorage
  const saveTags = (list) => {
    const tags = {};
    list.forEach(m => { if (m.driveId && m.category !== "uncategorized") tags[m.driveId] = m.category; });
    saveState("mediaTags", tags);
  };

  // Auto-tag with Claude Vision
  const autoTag = async () => {
    const unt = driveFiles.filter(m => m.category === "uncategorized" && m.thumb);
    if (!unt.length) return;
    setTagging(true);
    for (let i = 0; i < unt.length; i += 4) {
      const batch = unt.slice(i, i + 4);
      setTagProg("Analyzing " + (i + 1) + "-" + Math.min(i + 4, unt.length) + " of " + unt.length);
      try {
        const content = [];
        batch.forEach((m, j) => {
          if (m.thumb) content.push({ type: "image", source: { type: "url", url: m.thumb } });
          content.push({ type: "text", text: "Image " + (j + 1) + " (id: " + m.id + ")" });
        });
        content.push({ type: "text", text: 'Categorize each for a stump grinding business. Return ONLY JSON: [{"id":"...","category":"..."}]. Categories: before_after, equipment, finished, process, misc.' });
        const data = await callClaude({ messages: [{ role: "user", content }] });
        const tags = JSON.parse(extractText(data).replace(/```json|```/g, "").trim());
        setDriveFiles(prev => { const u = prev.map(m => { const t = tags.find(x => x.id === m.id); return t ? { ...m, category: t.category } : m; }); saveTags(u); return u; });
      } catch (e) { console.error("Tag error:", e); }
    }
    setTagging(false); setTagProg("");
  };

  const toggle = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkCat = cat => {
    setDriveFiles(prev => { const u = prev.map(m => selected.has(m.id) ? { ...m, category: cat } : m); saveTags(u); return u; });
    setSelected(new Set());
  };

  const filtered = filter === "all" ? driveFiles : filter === "uncategorized" ? driveFiles.filter(m => m.category === "uncategorized") : driveFiles.filter(m => m.category === filter);
  const uncatN = driveFiles.filter(m => m.category === "uncategorized").length;

  return (
    <div style={{ padding: "20px 24px" }}>
      {showSetup && <DriveSetup config={driveConfig} setConfig={setDriveConfig} onClose={() => setShowSetup(false)} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: "#e0e0e0", margin: "0 0 4px" }}>{selecting ? "Select Photo for Post" : "Media Library"}</h2>
          <p style={{ color: "#555", fontSize: 12, margin: 0 }}>
            {driveFiles.length > 0 ? driveFiles.length + " photos" + (uncatN > 0 ? " · " + uncatN + " untagged" : "") : "Connect Google Drive to get started"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {uncatN > 0 && !selecting && <button onClick={autoTag} disabled={tagging} style={{ ...S.btn, opacity: tagging ? 0.5 : 1, background: "linear-gradient(135deg, #a0a0ff, #8080dd)" }}>{tagging ? "Tagging..." : "Auto-Tag " + uncatN}</button>}
          {driveConfig.apiKey && <button onClick={() => setShowSetup(true)} style={{ ...S.tiny, color: "#4285F4" }}>Drive Settings</button>}
          {driveConfig.apiKey && <button onClick={() => loadDrive(null, false)} disabled={dLoading} style={{ ...S.tiny, color: "#6af0c8" }}>{dLoading ? "Loading..." : "Refresh"}</button>}
          {dNext && <button onClick={() => loadDrive(dNext, true)} disabled={dLoading} style={S.btn2}>{dLoading ? "Loading..." : "Load More"}</button>}
        </div>
      </div>

      {tagProg && <div style={{ fontSize: 12, color: "#a0a0ff", fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>{tagProg}</div>}
      {dError && <div style={{ padding: "8px 12px", background: "#f06a6a12", border: "1px solid #f06a6a30", borderRadius: 6, color: "#f06a6a", fontSize: 12, marginBottom: 12 }}>{dError}</div>}

      {/* Not connected */}
      {!driveConfig.apiKey && !selecting && (
        <div style={{ border: "2px dashed #262626", borderRadius: 12, padding: 40, textAlign: "center", background: "#0c0c0c", marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>☁️</div>
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: "#e0e0e0", margin: "0 0 8px" }}>Connect Google Drive</h3>
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 20px", maxWidth: 400, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Your photos stay in Google Drive — the app just browses them. No storage limits, no uploads to manage.
          </p>
          <button onClick={() => setShowSetup(true)} style={S.btn}>Connect Google Drive</button>

          <div style={{ marginTop: 24, padding: "14px 18px", background: "#111", borderRadius: 10, border: "1px solid #1a1a1a", fontSize: 12, color: "#666", maxWidth: 420, marginLeft: "auto", marginRight: "auto", lineHeight: 1.8, textAlign: "left" }}>
            <strong style={{ color: "#c8f06a" }}>How to get your photos here:</strong><br />
            1. On your iPhone, install the <strong style={{ color: "#ccc" }}>Google Photos</strong> app<br />
            2. Select your stump grinding photos → upload to Google Photos<br />
            3. On a computer, go to photos.google.com → select the uploaded photos<br />
            4. Move them into a Google Drive folder<br />
            5. Connect that folder here<br />
            <br />
            <strong style={{ color: "#6af0c8" }}>Or even easier:</strong> Install <strong style={{ color: "#ccc" }}>Google Drive</strong> app on your iPhone, open it, tap +, tap "Upload", select your stump photos → they go straight to your Drive folder.
          </div>
        </div>
      )}

      {/* Connected but loading */}
      {driveConfig.apiKey && dLoading && driveFiles.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#555" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
        Loading photos from Drive...
      </div>}

      {/* Connected but empty folder */}
      {driveConfig.apiKey && !dLoading && driveFiles.length === 0 && !dError && (
        <div style={{ border: "1px solid #1a1a1a", borderRadius: 12, padding: 32, textAlign: "center", background: "#0c0c0c" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: "#ccc", margin: "0 0 8px" }}>Your Drive folder is empty</h3>
          <p style={{ color: "#555", fontSize: 13, margin: "0 0 16px", maxWidth: 380, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Add photos to your Google Drive folder and hit Refresh. The fastest way from your iPhone is the Google Drive app → tap + → Upload.
          </p>
          <button onClick={() => loadDrive(null, false)} style={S.btn2}>Refresh</button>
        </div>
      )}

      {/* Filters */}
      {driveFiles.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          <FilterChip active={filter === "all"} color="#888" label={"All (" + driveFiles.length + ")"} onClick={() => setFilter("all")} />
          <FilterChip active={filter === "uncategorized"} color="#f0c850" label={"Untagged (" + uncatN + ")"} onClick={() => setFilter("uncategorized")} />
          {CATS.map(c => { const n = driveFiles.filter(m => m.category === c.id).length; return n > 0 ? <FilterChip key={c.id} active={filter === c.id} color={c.color} label={c.label + " (" + n + ")"} onClick={() => setFilter(c.id)} /> : null; })}
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && !selecting && <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#141414", borderRadius: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#c8f06a", fontWeight: 600 }}>{selected.size} selected</span>
        {CATS.map(c => <button key={c.id} onClick={() => bulkCat(c.id)} style={{ ...S.tiny, color: c.color, borderColor: c.color + "44" }}>{c.label}</button>)}
        <button onClick={() => setSelected(new Set())} style={{ ...S.tiny, color: "#888" }}>Clear</button>
      </div>}

      {/* Photo Grid */}
      {filtered.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {filtered.map(m => {
          const cat = CATS.find(c => c.id === m.category); const isSel = selected.has(m.id);
          const driveUrl = m.driveId ? "https://drive.google.com/uc?export=view&id=" + m.driveId : null;
          return (
            <div key={m.id} onClick={() => selecting ? onSelect({ ...m, driveUrl }) : toggle(m.id)}
              style={{ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", border: isSel ? "2px solid #c8f06a" : "2px solid transparent", aspectRatio: "1", background: "#111" }}>
              {m.thumb ? <img src={m.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 24 }}>{m.isVideo ? "🎬" : "🖼"}</div>}
              {m.isVideo && <div style={{ position: "absolute", top: 6, left: 6, background: "#000a", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#fff" }}>▶</div>}
              {cat && m.category !== "uncategorized" && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, #000c)", padding: "16px 6px 5px", fontSize: 10, color: cat.color, fontWeight: 600 }}>{cat.label}</div>}
              {m.category === "uncategorized" && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, #000c)", padding: "16px 6px 5px", fontSize: 10, color: "#f0c850", fontWeight: 600 }}>Untagged</div>}
              {isSel && <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 12, background: "#c8f06a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#111", fontWeight: 700 }}>✓</div>}
            </div>
          );
        })}
      </div>}

      {/* Load more */}
      {dNext && filtered.length > 0 && <div style={{ textAlign: "center", padding: 16 }}><button onClick={() => loadDrive(dNext, true)} disabled={dLoading} style={{ ...S.btn2, color: "#4285F4" }}>{dLoading ? "Loading..." : "Load More from Drive"}</button></div>}
    </div>
  );
}

// ═══ Research ═══
function ResearchPanel({ insights, setInsights }) {
  const [busy, setBusy] = useState(false);
  const [which, setWhich] = useState(null);
  const [results, setResults] = useState([]);

  const run = async (type) => {
    setBusy(true); setWhich(type);
    const qs = {
      own_page: 'Search "Stump Pros WV" Facebook page and stumpproswv.com. Analyze posts/voice. Return JSON: {"findings":"...","top_patterns":["..."],"suggestions":["..."]}. ONLY JSON.',
      competitors: 'Search successful stump grinding companies on Facebook/Instagram. Return JSON: {"companies_found":[{"name":"","what_works":""}],"top_content_patterns":["..."],"best_hooks":["..."]}. ONLY JSON.',
      trends: 'Search latest 2025-2026 social media advice for local service businesses. Return JSON: {"facebook_tips":["..."],"instagram_tips":["..."],"gbp_tips":["..."]}. ONLY JSON.',
    };
    try {
      const data = await callClaude({ messages: [{ role: "user", content: qs[type] }], tools: [{ type: "web_search_20250305", name: "web_search" }] });
      const txt = extractText(data);
      let parsed; try { parsed = JSON.parse(txt.replace(/```json|```/g, "").trim()); } catch { parsed = { raw: txt }; }
      setResults(prev => [...prev, { type, data: parsed }]);
      const ins = type === "own_page" ? "OWN PAGE: " + (parsed.findings || "") : type === "competitors" ? "COMPETITORS: " + (parsed.top_content_patterns || []).join("; ") : "TRENDS: " + (parsed.facebook_tips || []).join("; ");
      setInsights(prev => { const v = prev ? prev + "\n" + ins : ins; saveState("insights", v); return v; });
    } catch (e) { console.error(e); }
    setBusy(false); setWhich(null);
  };

  return (
    <div style={{ padding: "20px 24px" }}>
      <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: "#e0e0e0", margin: "0 0 16px" }}>Research & Learn</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[{ t: "own_page", i: "📊", l: "Analyze My Page", d: "Your FB page", c: "#1877F2" }, { t: "competitors", i: "🔍", l: "Scout Competitors", d: "Top stump companies", c: "#c8f06a" }, { t: "trends", i: "📈", l: "Industry Trends", d: "Latest tactics", c: "#6af0c8" }].map(r => (
          <button key={r.t} onClick={() => run(r.t)} disabled={busy && which === r.t} style={{ background: "#111", border: "1px solid " + (busy && which === r.t ? r.c : "#1a1a1a"), borderRadius: 10, padding: 16, textAlign: "left", cursor: busy ? "wait" : "pointer" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{busy && which === r.t ? "⏳" : r.i}</div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: r.c, marginBottom: 4 }}>{r.l}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{busy && which === r.t ? "Searching..." : r.d}</div>
          </button>
        ))}
      </div>
      {results.map((r, i) => (
        <div key={i} style={{ background: "#111", borderRadius: 8, padding: 16, marginBottom: 12, border: "1px solid #1a1a1a" }}>
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: "#c8f06a", margin: "0 0 10px" }}>{r.type === "own_page" ? "📊 Your Page" : r.type === "competitors" ? "🔍 Competitors" : "📈 Trends"}</h3>
          <div style={{ fontSize: 12, color: "#999", lineHeight: 1.7 }}>
            {r.data.raw ? <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.data.raw}</p> : <div>
              {r.data.findings && <p style={{ margin: "0 0 8px" }}>{r.data.findings}</p>}
              {(r.data.top_patterns || r.data.top_content_patterns || r.data.facebook_tips || []).map((p, j) => <div key={j}>• {p}</div>)}
              {(r.data.best_hooks || []).map((h, j) => <div key={j} style={{ color: "#c8f06a" }}>"{h}"</div>)}
              {(r.data.suggestions || []).map((s, j) => <div key={j} style={{ color: "#6af0c8" }}>→ {s}</div>)}
            </div>}
          </div>
        </div>
      ))}
      {insights && <div style={{ background: "#0c0c0c", borderRadius: 8, padding: 14, border: "1px solid #1a1a1a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#6af0c8" }}>Saved Insights</span><button onClick={() => { setInsights(""); saveState("insights", ""); }} style={{ ...S.tiny, color: "#555" }}>Clear</button></div>
        <p style={{ color: "#555", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{insights}</p>
      </div>}
    </div>
  );
}

// ═══ Post Card ═══
function PostCard({ post, onApprove, onReject, onEdit, onSaveEdit, onCancel, onRegen, onPhoto, onRmPhoto }) {
  const [et, setEt] = useState(post.content);
  useEffect(() => setEt(post.content), [post.content]);
  const sc = { pending: "#f0c850", approved: "#c8f06a", rejected: "#f06a6a", pushed: "#6af0c8", editing: "#a0a0ff" };
  const pi = PILLAR_IDS.indexOf(post.pillar);
  return (
    <div style={{ background: "#141414", borderRadius: 8, padding: 12, borderLeft: "3px solid " + (sc[post.status] || "#333") }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 5, background: PC[post.platform] + "22", color: PC[post.platform], fontSize: 12, fontWeight: 700 }}>{PI[post.platform]}</span>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "'DM Mono', monospace" }}>{post.time}</span>
          {pi >= 0 && <span style={{ fontSize: 10, color: PILLAR_COLORS[pi], padding: "1px 6px", background: PILLAR_COLORS[pi] + "14", borderRadius: 10 }}>{PILLARS[pi]}</span>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: sc[post.status], padding: "2px 8px", background: sc[post.status] + "14", borderRadius: 12 }}>{post.status}</span>
      </div>
      {post.photo && <div style={{ position: "relative", marginBottom: 8, borderRadius: 6, overflow: "hidden" }}>
        <img src={post.photo.thumb} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} />
        {post.photo.description && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, #000c)", padding: "12px 8px 5px", fontSize: 10, color: "#ccc" }}>{post.photo.description}</div>}
        {post.status !== "pushed" && <button onClick={() => onRmPhoto(post.id)} style={{ position: "absolute", top: 4, right: 4, background: "#000b", border: "none", borderRadius: 4, color: "#f06a6a", fontSize: 12, cursor: "pointer", padding: "2px 6px" }}>✕</button>}
      </div>}
      {!post.photo && <div style={{ padding: "6px 10px", background: "#f06a6a10", border: "1px dashed #f06a6a33", borderRadius: 6, marginBottom: 8, fontSize: 11, color: "#f06a6a", cursor: "pointer" }} onClick={() => onPhoto(post.id)}>
        📸 Tap to add photo from Drive
      </div>}
      {post.status === "editing" ? <div>
        <textarea value={et} onChange={e => setEt(e.target.value)} style={{ width: "100%", minHeight: 100, background: "#0c0c0c", border: "1px solid #222", borderRadius: 7, color: "#e0e0e0", padding: 10, fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}><button onClick={() => onSaveEdit(post.id, et)} style={{ ...S.sm, background: "#c8f06a", color: "#111" }}>Save</button><button onClick={() => onCancel(post.id)} style={{ ...S.sm, background: "#222" }}>Cancel</button></div>
      </div> : <p style={{ fontSize: 13, lineHeight: 1.65, color: "#bbb", margin: "0 0 10px", whiteSpace: "pre-wrap" }}>{post.content}</p>}
      {post.status === "pending" && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => onApprove(post.id)} style={{ ...S.sm, background: "#c8f06a", color: "#111" }}>✓ Approve</button>
        <button onClick={() => onPhoto(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#6af0c8" }}>{post.photo ? "📸 Swap" : "📸 Add"}</button>
        <button onClick={() => onEdit(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#a0a0ff" }}>✎</button>
        <button onClick={() => onRegen(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#f0c850" }}>↻</button>
        <button onClick={() => onReject(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#f06a6a" }}>✕</button>
      </div>}
      {post.status === "approved" && <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onPhoto(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#6af0c8" }}>📸</button>
        <button onClick={() => onEdit(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#a0a0ff" }}>✎</button>
        <button onClick={() => onReject(post.id)} style={{ ...S.sm, background: "#1a1a1a", color: "#f06a6a" }}>✕</button>
      </div>}
    </div>
  );
}

// ═══ MAIN APP ═══
export default function App() {
  const [tab, setTab] = useState("generate");
  const [settings, setSettings] = useState(() => loadState("settings", {
    bufferToken: "",
    platforms: [...PLATFORMS],
    fbPerDay: 3,   // Facebook posts per day
    igPerDay: 3,   // Instagram posts per day
    gbpPerWeek: 4, // Google Business Profile posts per week
  }));
  const [driveConfig, setDriveConfig] = useState(() => loadState("drive", { apiKey: "", folderId: "" }));
  const [showSettings, setShowSettings] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [posts, setPosts] = useState(() => loadState("posts", []));
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [weekStart, setWeekStart] = useState(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; });
  const [genProg, setGenProg] = useState("");
  const [error, setError] = useState("");
  const [pushRes, setPushRes] = useState("");
  const [insights, setInsights] = useState(() => loadState("insights", ""));
  const [examples, setExamples] = useState(() => loadState("examples", []));
  const [exText, setExText] = useState("");
  const [selPhotoFor, setSelPhotoFor] = useState(null);

  // Auto-save posts to localStorage whenever they change
  useEffect(() => {
    if (posts.length > 0) saveState("posts", posts);
  }, [posts]);

  const wd = getWeekDates(weekStart);

  // Photo-first generation:
  // 1. Load photos from Drive
  // 2. AI picks best photos for the week
  // 3. AI writes posts tailored to each photo
  const generate = useCallback(async () => {
    setGenerating(true); setError(""); setGenProg("Building schedule...");

    // Build the week's schedule
    const fbTimes = ["8:00 AM", "12:30 PM", "5:30 PM", "7:00 PM"];
    const igTimes = ["9:00 AM", "1:00 PM", "6:00 PM", "8:00 PM"];
    const gbpDays = [0, 2, 4, 6].slice(0, settings.gbpPerWeek);

    const schedule = [];
    for (let di = 0; di < 7; di++) {
      let pi = di * 5;
      if (settings.platforms.includes("Facebook")) {
        for (let i = 0; i < settings.fbPerDay; i++) {
          schedule.push({ day: DAYS[di], date: wd[di], platform: "Facebook", time: fbTimes[i] || ((8 + i * 3) + ":00 AM"), pillar: PILLARS[pi % PILLARS.length], pid: PILLAR_IDS[pi % PILLAR_IDS.length] });
          pi++;
        }
      }
      if (settings.platforms.includes("Instagram")) {
        for (let i = 0; i < settings.igPerDay; i++) {
          schedule.push({ day: DAYS[di], date: wd[di], platform: "Instagram", time: igTimes[i] || ((9 + i * 3) + ":00 AM"), pillar: PILLARS[pi % PILLARS.length], pid: PILLAR_IDS[pi % PILLAR_IDS.length] });
          pi++;
        }
      }
      if (settings.platforms.includes("Google Business Profile") && gbpDays.includes(di)) {
        schedule.push({ day: DAYS[di], date: wd[di], platform: "Google Business Profile", time: "10:00 AM", pillar: PILLARS[pi % PILLARS.length], pid: PILLAR_IDS[pi % PILLAR_IDS.length] });
      }
    }

    const totalPosts = schedule.length;
    if (!totalPosts) { setError("No platforms selected."); setGenerating(false); return; }
    if (!driveConfig.apiKey || !driveConfig.folderId) { setError("Connect Google Drive first (Media tab)."); setGenerating(false); return; }

    try {
      // Load photos from Drive
      setGenProg("Loading photos from Drive...");
      const driveQ = "'" + driveConfig.folderId + "' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')";
      const driveResp = await fetch("https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(driveQ) + "&fields=files(id,name,mimeType,thumbnailLink)&pageSize=100&orderBy=createdTime%20desc&key=" + driveConfig.apiKey);
      if (!driveResp.ok) throw new Error("Failed to load Drive photos");
      const driveData = await driveResp.json();
      const photos = (driveData.files || []).map(f => ({
        id: f.id, name: f.name,
        thumb: f.thumbnailLink ? f.thumbnailLink.replace("=s220", "=s400") : null,
        isVideo: (f.mimeType || "").startsWith("video/"),
        driveId: f.id,
        driveUrl: "https://drive.google.com/uc?export=view&id=" + f.id,
      })).filter(p => p.thumb);

      if (photos.length < 5) { setError("Need at least 5 photos in Drive. Found " + photos.length + "."); setGenerating(false); return; }

      // AI picks and scores photos in batches
      setGenProg("AI analyzing " + photos.length + " photos...");
      const allScored = [];
      const batchSize = 16;

      for (let b = 0; b < photos.length && allScored.length < totalPosts * 2; b += batchSize) {
        const batch = photos.slice(b, b + batchSize);
        setGenProg("Analyzing photos " + (b + 1) + "-" + Math.min(b + batchSize, photos.length) + "...");

        const content = [];
        batch.forEach((p, i) => {
          content.push({ type: "image", source: { type: "url", url: p.thumb } });
          content.push({ type: "text", text: "Photo " + (b + i + 1) + " (id:" + p.id + ")" });
        });
        content.push({ type: "text", text: 'Rate each photo 1-10 for social media engagement for a stump grinding business. Consider: visual impact, before/after drama, equipment appeal, clean results.\nReturn ONLY JSON: [{"id":"...","score":N,"desc":"what is in the photo"}]' });

        try {
          const data = await callClaude({ messages: [{ role: "user", content }], max_tokens: 1000 });
          const scored = JSON.parse(extractText(data).replace(/```json|```/g, "").trim());
          scored.forEach(s => {
            const photo = batch.find(p => p.id === s.id);
            if (photo) allScored.push({ ...photo, score: s.score || 5, description: s.desc || photo.name });
          });
        } catch (e) { console.error("Score batch failed:", e); }
      }

      // Sort best first, pick enough for the week
      allScored.sort((a, b) => b.score - a.score);
      const picked = allScored.slice(0, totalPosts);
      // Fill remaining slots if not enough scored
      if (picked.length < totalPosts) {
        const usedIds = new Set(picked.map(p => p.id));
        photos.filter(p => !usedIds.has(p.id)).slice(0, totalPosts - picked.length)
          .forEach(p => picked.push({ ...p, score: 5, description: p.name }));
      }

      // Assign photos to schedule slots
      schedule.forEach((slot, i) => { slot.photo = picked[i] || picked[0]; });

      // Write posts per day, tailored to each photo
      const all = [];
      const sys = buildSysPrompt(examples.length ? examples.join("\n---\n") : null, insights || null);

      const dayGroups = {};
      schedule.forEach(s => { if (!dayGroups[s.day]) dayGroups[s.day] = []; dayGroups[s.day].push(s); });

      for (const day of DAYS) {
        const slots = dayGroups[day];
        if (!slots || !slots.length) continue;
        setGenProg("Writing " + day + "... (" + all.length + "/" + totalPosts + ")");

        const existing = all.map(p => "[" + p.pillar + "] " + p.content.substring(0, 50)).join("\n");
        const prompt = "Generate exactly " + slots.length + " posts for " + day + ", " + fmtDate(slots[0].date) + ".\n\n" +
          "IMPORTANT: Each post has a specific photo. Write the post to match the photo. Reference what you see naturally.\n\n" +
          slots.map((s, i) => "Post " + (i + 1) + ": " + s.platform + " at " + s.time + " — Pillar: " + s.pillar + "\n  Photo shows: " + (s.photo.description || s.photo.name) + (s.photo.isVideo ? " (VIDEO)" : "")).join("\n\n") +
          (existing ? "\n\nALREADY WRITTEN (vary themes):\n" + existing : "") +
          '\n\nReturn ONLY JSON: [{"platform":"...","time":"...","pillar":"...","content":"..."}]';

        try {
          const data = await callClaude({ system: sys, messages: [{ role: "user", content: prompt }] });
          const dp = JSON.parse(extractText(data).replace(/```json|```/g, "").trim());
          dp.forEach((p, i) => {
            const slot = slots[i]; if (!slot) return;
            all.push({
              id: gid(), day, date: slot.date.toISOString(),
              platform: p.platform || slot.platform, time: p.time || slot.time,
              pillar: p.pillar || slot.pid, content: p.content, status: "pending",
              photo: slot.photo ? { id: slot.photo.id, thumb: slot.photo.thumb, driveUrl: slot.photo.driveUrl, driveId: slot.photo.driveId, description: slot.photo.description } : null,
            });
          });
        } catch (e) { console.error("Day gen failed:", e); }
      }

      setPosts(all); setGenProg("");
    } catch (e) { setError("Generation failed: " + e.message); }
    setGenerating(false);
  }, [wd, settings, examples, insights, driveConfig]);

  // Regenerate single post
  const regen = async (id) => {
    const p = posts.find(x => x.id === id); if (!p) return;
    setPosts(prev => prev.map(x => x.id === id ? { ...x, content: "Regenerating..." } : x));
    try {
      const sys = buildSysPrompt(examples.length ? examples.join("\n---\n") : null, insights || null);
      const data = await callClaude({ system: sys, messages: [{ role: "user", content: "Generate 1 " + p.platform + " post, pillar: " + p.pillar + ". Don't repeat: " + p.content + '\nReturn: {"content":"..."}' }] });
      const res = JSON.parse(extractText(data).replace(/```json|```/g, "").trim());
      setPosts(prev => prev.map(x => x.id === id ? { ...x, content: res.content, status: "pending" } : x));
    } catch { setPosts(prev => prev.map(x => x.id === id ? { ...x, content: "[Failed]" } : x)); }
  };

  // Push to Buffer via new GraphQL API proxy
  const pushToBuffer = async () => {
    const ap = posts.filter(p => p.status === "approved");
    if (!ap.length) { setPushRes("No approved posts."); return; }
    if (!settings.bufferToken) { setPushRes("Add Buffer API key in Settings. Get it from publish.buffer.com/settings/api"); return; }
    setPushing(true); setPushRes("Connecting to Buffer...");

    // Fetch channels (new API calls them channels, not profiles)
    let channels = [];
    try {
      const resp = await fetch("/api/buffer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "channels", token: settings.bufferToken }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      channels = data.channels || [];
    } catch (e) {
      setPushing(false);
      setPushRes("Failed to connect to Buffer: " + e.message + "\n\nMake sure you're using a new API key from publish.buffer.com/settings/api (old access tokens won't work).");
      return;
    }

    if (!channels.length) {
      setPushing(false);
      setPushRes("No channels found in Buffer. Connect your social accounts in Buffer's dashboard first.");
      return;
    }

    console.log("Buffer channels:", channels.map(c => c.service + " — " + c.name));

    // Map our platform names to Buffer service names
    const serviceMap = {
      "Facebook": "facebook",
      "Instagram": "instagram",
      "Google Business Profile": "googlebusiness",
    };
    let ok = 0, fail = 0, failedNames = [];

    for (let i = 0; i < ap.length; i++) {
      const post = ap[i];
      setPushRes("Pushing " + (i + 1) + "/" + ap.length + "...");

      try {
        const targetService = serviceMap[post.platform];
        const channel = channels.find(c =>
          c.service === targetService ||
          c.service.toLowerCase().includes(targetService) ||
          (c.name || "").toLowerCase().includes(targetService)
        );
        if (!channel) {
          fail++;
          failedNames.push(post.platform + " (no channel — available: " + channels.map(c => c.service + ":" + c.name).join(", ") + ")");
          continue;
        }

        const pd = new Date(post.date);
        const pts = post.time.split(" "), tp = pts[0].split(":");
        let hr = parseInt(tp[0]);
        if (pts[1] === "PM" && hr !== 12) hr += 12;
        if (pts[1] === "AM" && hr === 12) hr = 0;
        pd.setHours(hr, parseInt(tp[1]), 0, 0);

        const body = {
          action: "create",
          token: settings.bufferToken,
          text: post.content,
          channelId: channel.id,
          dueAt: pd.toISOString(),
          service: channel.service,
        };
        if (post.photo && post.photo.driveUrl) body.imageUrl = post.photo.driveUrl;

        const res = await fetch("/api/buffer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const resData = await res.json();

        if (resData.success) {
          ok++;
          setPosts(prev => {
            const updated = prev.map(p => p.id === post.id ? { ...p, status: "pushed" } : p);
            saveState("posts", updated);
            return updated;
          });
        } else {
          fail++;
          failedNames.push(post.platform + " " + post.time + ": " + (resData.error || "Unknown error"));
        }
      } catch (e) {
        fail++;
        failedNames.push(post.platform + " " + post.time + ": " + e.message);
      }
    }

    setPushing(false);
    let msg = ok > 0 ? "Pushed " + ok + " of " + ap.length + " to Buffer!" : "Pushed 0 of " + ap.length + ".";
    if (fail) msg += " " + fail + " failed — posts are saved, try again.";
    if (failedNames.length) msg += "\n" + failedNames.join("\n");
    setPushRes(msg);
  };

  // Clear all posts (with confirmation)
  const clearPosts = () => {
    if (posts.length === 0) return;
    const pushed = posts.filter(p => p.status === "pushed").length;
    const msg = pushed > 0
      ? "Clear all posts? (" + pushed + " already pushed, " + (posts.length - pushed) + " others)"
      : "Clear all " + posts.length + " posts?";
    if (window.confirm(msg)) {
      setPosts([]);
      saveState("posts", []);
    }
  };

  const up = (id, u) => setPosts(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  const dpf = d => posts.filter(p => p.day === d);
  const ac = posts.filter(p => p.status === "approved").length;
  const pc = posts.filter(p => p.status === "pending").length;
  const puc = posts.filter(p => p.status === "pushed").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#e0e0e0", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Settings Modal */}
      {showSettings && <div style={S.overlay}><div style={S.modal}>
        <h2 style={S.modalTitle}>Settings</h2>
        <label style={S.label}>Buffer API Key</label>
        <input style={S.input} type="password" placeholder="Get from publish.buffer.com/settings/api" value={settings.bufferToken} onChange={e => setSettings(s => ({ ...s, bufferToken: e.target.value }))} />
        <label style={S.label}>Platforms</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {PLATFORMS.map(p => { const a = settings.platforms.includes(p); return <button key={p} onClick={() => setSettings(s => ({ ...s, platforms: a ? s.platforms.filter(x => x !== p) : [...s.platforms, p] }))} style={{ ...S.chip, background: a ? PC[p] + "22" : "#1a1a1a", color: a ? PC[p] : "#555", border: "1px solid " + (a ? PC[p] + "55" : "#222") }}>{PI[p]} {p}</button>; })}
        </div>
        {settings.platforms.includes("Facebook") && <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Facebook Posts Per Day</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 3, 4].map(n => <button key={n} onClick={() => setSettings(s => ({ ...s, fbPerDay: n }))} style={{ ...S.chip, background: settings.fbPerDay === n ? "#1877F2" + "33" : "#1a1a1a", color: settings.fbPerDay === n ? "#1877F2" : "#888" }}>{n}</button>)}
          </div>
        </div>}
        {settings.platforms.includes("Instagram") && <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Instagram Posts Per Day</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 3, 4].map(n => <button key={n} onClick={() => setSettings(s => ({ ...s, igPerDay: n }))} style={{ ...S.chip, background: settings.igPerDay === n ? "#E4405F" + "33" : "#1a1a1a", color: settings.igPerDay === n ? "#E4405F" : "#888" }}>{n}</button>)}
          </div>
        </div>}
        {settings.platforms.includes("Google Business Profile") && <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Google Business Profile Per Week</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 3, 4, 5].map(n => <button key={n} onClick={() => setSettings(s => ({ ...s, gbpPerWeek: n }))} style={{ ...S.chip, background: settings.gbpPerWeek === n ? "#4285F4" + "33" : "#1a1a1a", color: settings.gbpPerWeek === n ? "#4285F4" : "#888" }}>{n}/wk</button>)}
          </div>
        </div>}
        <button onClick={() => { saveState("settings", settings); setShowSettings(false); }} style={S.btn}>Save</button>
      </div></div>}

      {/* Examples Modal */}
      {showExamples && <div style={S.overlay}><div style={{ ...S.modal, maxWidth: 560 }}>
        <h2 style={S.modalTitle}>Example Posts (Your Voice)</h2>
        <textarea value={exText} onChange={e => setExText(e.target.value)} placeholder="Paste posts you've written. Separate with --- lines." style={{ width: "100%", minHeight: 200, background: "#0c0c0c", border: "1px solid #222", borderRadius: 7, color: "#e0e0e0", padding: 12, fontSize: 13, resize: "vertical", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => { const ex = exText.split(/\n---\n/).map(s => s.trim()).filter(Boolean); setExamples(ex); saveState("examples", ex); setShowExamples(false); }} style={S.btn}>Save</button>
          <button onClick={() => setShowExamples(false)} style={S.btn2}>Cancel</button>
        </div>
      </div></div>}

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #181818", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, margin: 0, background: "linear-gradient(135deg, #c8f06a, #6af0c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>STUMP PROS WV</h1>
          <p style={{ margin: "2px 0 0", color: "#444", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>Social Media Command Center</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setExText(examples.join("\n\n---\n\n")); setShowExamples(true); }} style={{ ...S.btn2, fontSize: 11, borderColor: examples.length ? "#c8f06a55" : "#222", color: examples.length ? "#c8f06a" : "#666" }}>📝 Voice ({examples.length})</button>
          <button onClick={() => setShowSettings(true)} style={{ ...S.btn2, fontSize: 11 }}>⚙</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #181818" }}>
        {[{ id: "generate", l: "⚡ Generate", b: posts.length }, { id: "media", l: "📸 Media" }, { id: "research", l: "🔍 Research" }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "media") setSelPhotoFor(null); }}
            style={{ padding: "11px 20px", background: tab === t.id ? "#111" : "transparent", border: "none", borderBottom: tab === t.id ? "2px solid #c8f06a" : "2px solid transparent", color: tab === t.id ? "#c8f06a" : "#555", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
            {t.l}{t.b ? <span style={{ fontSize: 10, background: "#c8f06a22", color: "#c8f06a", padding: "1px 6px", borderRadius: 8 }}>{t.b}</span> : null}
          </button>
        ))}
      </div>

      {tab === "media" && <MediaLibrary selecting={!!selPhotoFor} onSelect={m => { if (selPhotoFor) { setPosts(prev => prev.map(p => p.id === selPhotoFor ? { ...p, photo: m } : p)); setSelPhotoFor(null); setTab("generate"); } }} driveConfig={driveConfig} setDriveConfig={setDriveConfig} />}
      {tab === "research" && <ResearchPanel insights={insights} setInsights={setInsights} />}
      {tab === "generate" && <div>
        {/* Week Nav */}
        <div style={{ padding: "12px 24px", display: "flex", gap: 14, flexWrap: "wrap", borderBottom: "1px solid #141414", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} style={{ ...S.tiny, color: "#888", fontSize: 14, padding: "4px 8px" }}>◀</button>
            <div><div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>Week of</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ccc", fontFamily: "'Archivo Black', sans-serif" }}>{fmtDate(wd[0])} – {fmtDate(wd[6])}</div></div>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} style={{ ...S.tiny, color: "#888", fontSize: 14, padding: "4px 8px" }}>▶</button>
            <button onClick={() => { const t = new Date(); t.setHours(0, 0, 0, 0); setWeekStart(t); }} style={{ ...S.tiny, color: "#c8f06a", borderColor: "#c8f06a44" }}>Today</button>
            <input type="date" onChange={e => { if (e.target.value) setWeekStart(new Date(e.target.value + "T00:00:00")); }} style={{ background: "#0c0c0c", border: "1px solid #222", borderRadius: 4, color: "#888", fontSize: 10, padding: "3px 6px", fontFamily: "'DM Mono', monospace" }} />
          </div>
          <Stat label="Total" value={posts.length} /><Stat label="Pending" value={pc} color="#f0c850" /><Stat label="Approved" value={ac} color="#c8f06a" /><Stat label="Pushed" value={puc} color="#6af0c8" />
        </div>

        {/* Actions */}
        <div style={{ padding: "14px 24px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={generate} disabled={generating} style={{ ...S.btn, opacity: generating ? 0.5 : 1, minWidth: 180 }}>{generating ? "⏳ Generating..." : "⚡ Generate This Week"}</button>
          {pc > 0 && <button onClick={() => setPosts(p => p.map(x => x.status === "pending" ? { ...x, status: "approved" } : x))} style={{ ...S.btn2, borderColor: "#c8f06a55", color: "#c8f06a" }}>✓ Approve All ({pc})</button>}
          {ac > 0 && <button onClick={pushToBuffer} disabled={pushing} style={{ ...S.btn, background: "linear-gradient(135deg, #6af0c8, #4ecdc4)", opacity: pushing ? 0.5 : 1 }}>{pushing ? "Pushing..." : "🚀 Push " + ac}</button>}
          {genProg && <span style={{ fontSize: 11, color: "#c8f06a", fontFamily: "'DM Mono', monospace" }}>{genProg}</span>}
          {posts.length > 0 && !generating && !pushing && <button onClick={clearPosts} style={{ ...S.tiny, color: "#f06a6a", borderColor: "#f06a6a33", marginLeft: "auto" }}>Clear All</button>}
        </div>

        {error && <div style={{ margin: "0 24px 6px", padding: "9px 14px", background: "#f06a6a12", border: "1px solid #f06a6a30", borderRadius: 7, color: "#f06a6a", fontSize: 12 }}>{error}</div>}
        {pushRes && <div style={{ margin: "0 24px 6px", padding: "9px 14px", background: pushRes.includes("failed") ? "#f0c85012" : "#6af0c812", border: "1px solid " + (pushRes.includes("failed") ? "#f0c85030" : "#6af0c830"), borderRadius: 7, color: pushRes.includes("failed") ? "#f0c850" : "#6af0c8", fontSize: 12, whiteSpace: "pre-wrap" }}>{pushRes}</div>}

        {posts.length > 0 && <div style={{ padding: "0 24px 28px" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: 14, overflowX: "auto" }}>
            <TabBtn active={selectedDay === null} onClick={() => setSelectedDay(null)} label="All" />
            {DAYS.map((d, i) => { const dp = dpf(d), done = dp.filter(p => p.status === "approved" || p.status === "pushed").length; return <TabBtn key={d} active={selectedDay === d} onClick={() => setSelectedDay(d)} label={d.slice(0, 3)} sub={fmtDate(wd[i])} badge={dp.length ? done + "/" + dp.length : null} badgeColor={done === dp.length && dp.length ? "#c8f06a" : "#f0c850"} />; })}
          </div>
          {(selectedDay ? [selectedDay] : DAYS).map(d => {
            const dp = dpf(d).filter(p => p.status !== "rejected"); if (!dp.length) return null;
            return <div key={d} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}><h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, margin: 0, color: "#ccc" }}>{d}</h3><span style={{ fontSize: 11, color: "#444", fontFamily: "'DM Mono', monospace" }}>{fmtDate(wd[DAYS.indexOf(d)])}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 8 }}>
                {dp.map(p => <PostCard key={p.id} post={p} onApprove={id => up(id, { status: "approved" })} onReject={id => up(id, { status: "rejected" })} onEdit={id => up(id, { status: "editing" })} onSaveEdit={(id, t) => up(id, { content: t, status: "pending" })} onCancel={id => up(id, { status: "pending" })} onRegen={regen} onPhoto={id => { setSelPhotoFor(id); setTab("media"); }} onRmPhoto={id => up(id, { photo: null })} />)}
              </div></div>;
          })}
        </div>}

        {posts.length === 0 && !generating && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🪵</div>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: "#ccc", margin: "0 0 8px" }}>Ready to grow your visibility</h2>
          <p style={{ color: "#444", fontSize: 13, maxWidth: 400, lineHeight: 1.6 }}>Generate a full week of posts, attach photos, approve, and push to Buffer.</p>
          <div style={{ marginTop: 18, padding: "14px 18px", background: "#111", borderRadius: 10, border: "1px solid #1a1a1a", fontSize: 12, color: "#555", maxWidth: 400, lineHeight: 1.8, textAlign: "left" }}>
            <strong style={{ color: "#c8f06a" }}>Get started:</strong><br />1. 📸 Connect Google Drive in Media tab<br />2. 🔍 Run research scans<br />3. 📝 Add example posts<br />4. ⚡ Generate → approve → push
          </div>
        </div>}
      </div>}
    </div>
  );
}
