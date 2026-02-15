# SEJFA Command Center — Design Review & Redesign Brief

> Komplett visuell, UI- och UX-review. Avsedd som brief till en AI som ska redesigna appen.

---

## 1. Appöversikt

**SEJFA Command Center** är en Electron-desktop-app för att övervaka och styra en autonom DevOps-agent-loop. Appen har en "cyber/HUD"-estetik med glasmorfism, neon-accenter och scanline-effekter.

**Tech stack:** React 19, TypeScript, Tailwind CSS v4, Electron 33, Zustand, Socket.io, react-virtuoso.

**Pipeline-gates:** `local → ci → review → deploy → verify`

---

## 2. Kritiska Problem

### 2.1 Loop-visualiseringen är INTE en loop

**Problem:** Komponenten `loop-visualization.tsx` renderar gates som rektangulära boxar i en horisontell rad med pilar emellan. Detta representerar en *pipeline*, inte en *loop*. Hela appens koncept bygger på en iterativ loop (verify → tillbaka till local) men visuellt finns ingen cirkulär koppling.

**Layout idag:** `flex flex-wrap items-stretch justify-between` — ren linjär layout.

**Förslag:** Implementera en faktisk cirkulär/orbital visualization:
- SVG-baserad cirkel där varje gate är en nod på cirkeln
- Animerad "data-pulse" som rör sig runt loopen
- Tydlig visuell koppling från verify tillbaka till local
- Alternativt: en racetrack/oval-form om ren cirkel inte passar layouten
- Connectors bör vara kurvor, inte raka linjer

### 2.2 Bakgrunden är för mörk — nästan osynlig

**Problem:** `--cyber-black: #050505` är i praktiken svart. Ovanpå detta läggs:
1. En **vignette-overlay** (`z-index: 9998`) som ytterligare mörknar kanterna
2. En **pixel-grid scanline-overlay** (`z-index: 9999`) som dämpar allt innehåll
3. En **cyber-grid** med perspective-transform

Tre lager av mörknande effekter ovanpå en redan nästan-svart bakgrund gör appen extremt svårläst.

**Förslag:**
- Höj basfärgen till åtminstone `#0a0f1a` (mörk marinblå) eller `#0d1117` (GitHub dark)
- Reducera vignette-opacity från nuvarande nivå till max 0.3
- Ta bort pixel-grid-overlay helt eller gör den opt-in
- Behåll max EN subtil overlay-effekt, inte tre stycken

---

## 3. Typografi

### 3.1 Monospace överallt dödar läsbarheten

**Problem:** Både `--font-heading` och `--font-mono` är satta till `JetBrains Mono`. Varenda text i appen — rubriker, labels, knappar, loggar, metadata — renderas i monospace. Detta:
- Gör UI:t tröttare att läsa vid längre sessioner
- Skapar en "allt ser likadant ut"-effekt
- Monospace tar mer horisontellt utrymme per tecken

**Oupptäckt:** `index.html` laddar **Inter** från Google Fonts men den används aldrig i CSS:en.

**Förslag:**
- Använd **Inter** (redan laddad!) för UI-text: knappar, labels, rubriker, statustexter
- Behåll **JetBrains Mono** enbart för: log-output, timestamps, gate IDs, teknisk data
- Skapa tydlig typografisk hierarki: heading → body → mono/code

### 3.2 Textstorlekar är för små och likformiga

**Problem:** Nästan alla texter är 10-13px. Labels är 11px, knappar 11px, filter-knappar 9px(!), metadata 10px. Det finns ingen visuell hierarki.

**Förslag:**
- Objective-titeln: minst 20-24px
- Section headers: 14-16px
- Body/UI text: 13-14px
- Metadata/timestamps: 11-12px
- Aldrig under 10px för interaktiva element

---

## 4. Redundanta Komponenter

### 4.1 GateBar + LoopVisualization visar samma data

**Problem:** Två separata komponenter visar exakt samma pipeline-status:
1. `GateBar` — horisontell rad med gate-knappar + status-dots
2. `LoopVisualization` — större boxar med gate-info

Båda tar `gates[]` och `selectedGateId` som props. Användaren ser samma information två gånger.

**Förslag:** Slå ihop till EN komponent — den cirkulära loop-visualiseringen — som ersätter båda. Den bör:
- Visa gate-status (dot/färg)
- Vara klickbar för gate-selektion
- Visa den nuvarande positionen i loopen
- Innehålla all info som idag finns i båda komponenterna

### 4.2 EventTimeline vs LogConsole

**Problem:** `event-timeline.tsx` och `log-console.tsx` existerar parallellt. LogConsole används i main-view, EventTimeline verkar vara en äldre version med egen virtuell scrollning.

**Förslag:** Ta bort EventTimeline, behåll LogConsole (som redan använder react-virtuoso).

---

## 5. Layout & Informationshierarki

### 5.1 Toolbaren är för tung

**Problem:** Toolbar-komponenten innehåller för mycket i en enda rad:
- Objective text
- Connected/Disconnected-status
- Alerts count
- Mode toggle (Observe/Control)
- 5 action-knappar (Start, Pause, Arm Kill, Open PR, Open Run)
- Kill-armed countdown

Allt packat i en `header` med `flex-col gap-3`. På mindre skärmar wrappas knapparna men det saknas responsiv planering.

**Förslag:**
- Dela upp i zoner: **Status-bar** (connection, alerts, mode) som en tunn top-bar + **Action-bar** (Start/Pause/Kill) som kontextuell
- Objective bör vara mer prominent, kanske som en "mission briefing"-banner
- Kill-switch bör vara fysiskt separerad från övriga knappar (farlig handling nära vanliga knappar)

### 5.2 Grid-layout är obalanserad

**Problem:** Main-view använder `grid-cols-5` med LoopVisualization i `col-span-2` och LogConsole i `col-span-3`. Det ger ca 40/60 split. Loop-visualiseringen (den viktigaste statusöversikten) får minst utrymme.

**Förslag:**
- Om loop-visualiseringen blir cirkulär: ge den centrum-position, eventuellt ovanför konsolen
- Alternativt: sidebar-layout där loopen alltid är synlig till vänster, konsolen tar resten
- Konsolen bör kunna minimeras/maximeras

---

## 6. Färg & Kontrast

### 6.1 Neon-färgerna kolliderar

**Problem:** Fem neon-färger används (`cyan`, `green`, `red`, `amber`, `blue`) men utan konsekvent semantik:
- `neon-cyan` = pipeline-element, fokus, borders, running-state
- `neon-green` = success, connected, konsol-header, live-tail, start-hover
- `neon-amber` = warnings, alerts, pause-hover
- `neon-red` = errors, disconnected, kill-funktionen
- `neon-blue` = system-events i loggen (används knappt)

Cyan och green blandas fritt — konsol-headern är grön men pipeline-headern är cyan. Connectors i gate-bar lyser cyan men log-console-bordern lyser grön.

**Förslag:**
- Definiera strikt semantik: `cyan` = primary/interactive, `green` = success/healthy, `red` = danger/error, `amber` = warning/caution
- Välj EN accent som primary (cyan ELLER green, inte båda som primär)
- `neon-blue` kan tas bort eller ersättas med en dimmed cyan för system-events

### 6.2 Glow-effekter är överanvända

**Problem:** Box-shadows med glow används överallt: knappar, dots, borders, text (via `drop-shadow`), badges. Det skapar visuellt brus snarare än fokus.

**Förslag:**
- Reservera glow enbart för: aktiv/selected state, running-animationer, kritiska varningar
- Ta bort glow från statiska element (labels, badges i normalläge)
- Använd subtilare bakgrundsfärg istället för glow för hover-states

---

## 7. Glasmorfism-implementation

### 7.1 Glass-paneler saknar djup

**Problem:** `.glass-panel` definieras med `backdrop-filter: blur(10px)` men bakgrunden är så mörk att blur-effekten knappt syns. Glasmorfism kräver att det finns något bakom glaset att se igenom.

**Förslag:**
- Ljusare bakgrund (se punkt 2.2) så att blur-effekten faktiskt syns
- Lägg till subtila gradient-meshes eller ambient shapes i bakgrunden som glaset kan blurra
- Alternativt: överge glasmorfism och gå med solida semi-transparenta paneler

### 7.2 Panel-bakgrunder är inkonsekventa

**Problem:** Flera olika rgba-bakgrunder används:
- `rgba(10, 18, 36, 0.65)` — bg-panel
- `rgba(10, 18, 36, 0.85)` — panel
- `rgba(15, 23, 42, 0.7)` — panel-2
- `rgba(5, 10, 15, 0.95)` — log-console header
- `rgba(10, 20, 30, 0.7)` — glass-panel
- `rgba(5, 8, 12, 0.95)` — log area

Sex olika mörka bakgrunder skapar subtila men störande inkonsekvenser.

**Förslag:** Standardisera till 3 nivåer: `surface-1` (lightest), `surface-2`, `surface-3` (darkest).

---

## 8. Animationer & Motion

### 8.1 Scanline-effekter drar ner upplevelsen

**Problem:** Två typer av scanlines appliceras: `.scanlines` (global) och `.scanlines-heavy` (log-console). Dessa simulerar en CRT-monitor men:
- Gör text svårare att läsa
- Skapar visuellt flimmer vid scrollning
- Är rent dekorativa utan funktionellt syfte

**Förslag:** Ta bort scanlines helt, eller gör dem extremt subtila (opacity < 0.05) och bara på icke-text-ytor.

### 8.2 Kill-armed-animationen är bra men isolerad

**Problem:** Kill-switch har en bra pulsande animation (`kill-armed` keyframe) som kommunicerar fara. Men denna designprincip (animation = uppmärksamhet) appliceras inte konsekvent.

**Förslag:** Applicera samma princip: blinkande/pulserande = kräver uppmärksamhet. Reservera animationer för:
- Aktiv pågående process (running)
- Kritiska varningar
- Kill-armed state
- Allt annat ska vara statiskt

---

## 9. UX-problem

### 9.1 Kill-switch saknar tillräcklig separation

**Problem:** "Arm Kill" och "KILL"-knappen lever i samma rad som Start, Pause, Open PR, Open Run. En destruktiv handling ligger bredvid vardagliga handlingar.

**Förslag:**
- Fysisk separation: Kill-knappen i separat zon, gärna höger/nere
- Visuell separation: tydlig divider eller annat färgschema
- Kräv kanske ytterligare bekräftelse via modal istället för bara arm → confirm

### 9.2 Inga tomma states

**Problem:** Ingen komponent hanterar "inga events", "inga gates", "inte ansluten". LogConsole visar bara en tom yta. LoopVisualization renderar gates men hanterar inte fallet när data saknas.

**Förslag:**
- Design empty states för: ingen anslutning, inga events, pipeline ej startad
- Visa guidande text: "Anslut till SEJFA-backend för att börja"
- Visa skeleton/placeholder states under laddning

### 9.3 Saknar loading/progress-indikering

**Problem:** Inga skeleton-loaders, inga progress-bars, ingen indikering av att data håller på att laddas.

**Förslag:**
- Shimmer/skeleton-loader för initialt läge
- Progress-ring i loop-visualiseringen för pågående gate
- Tydlig "connecting..."-state

### 9.4 Evidence-drawer är basic

**Problem:** `evidence-drawer.tsx` visar gate-evidence som rå text i en `<pre>`-block. Ingen syntax highlighting, ingen strukturering, ingen möjlighet att navigera mellan gates evidence.

**Förslag:**
- Syntax highlighting för kod/loggar
- Tab-navigation mellan gates
- Collapsible sections för lång output
- Sökfunktion inom evidence

### 9.5 Keyboard-help är gömd

**Problem:** Keyboard shortcuts (?, Esc, 1-6, O, C, Space, Cmd+Shift+S) finns men discovery är dålig. Hjälpen visas bara när man trycker `?`.

**Förslag:**
- Visa en liten tooltip "Press ? for shortcuts" vid första användningen
- Visa shortcut-hints på knappar (t.ex. "Start [Space]")

---

## 10. Responsivitet

### 10.1 Max-width begränsar onödigt

**Problem:** `max-w-[1400px]` i main-view. På stora skärmar finns mycket outnyttjat utrymme.

**Förslag:**
- Tillåt full bredd eller `max-w-[1920px]`
- Alternativt: på bredare skärmar, visa loop + konsol sida vid sida med mer utrymme

### 10.2 Mobil/tablet stöds inte

**Problem:** Inga breakpoints för mindre skärmar. Toolbar wrappas men utan medveten design. Grid kollapsar inte.

**Förslag:** Eftersom detta är en Electron-app, designa för minst `1024px` bredd men hantera fönster-resize graciöst.

---

## 11. Sammanfattande Prioriteringsordning

| Prioritet | Problem | Impact |
|-----------|---------|--------|
| 🔴 P0 | Loop-visualisering → cirkulär | Kärn-UX, representerar appens koncept |
| 🔴 P0 | Bakgrund för mörk + ta bort overlays | Allt innehåll svårt att se |
| 🟠 P1 | Typografi: Inter för UI, JetBrains Mono för kod | Läsbarhet, hierarki |
| 🟠 P1 | Slå ihop GateBar + LoopVisualization | Redundans, renare layout |
| 🟠 P1 | Färg-semantik: konsekvent cyan/green/red/amber | Visuell klarhet |
| 🟡 P2 | Toolbar uppdelning (status vs actions) | Informationsarkitektur |
| 🟡 P2 | Glasmorfism: ljusare bg så blur syns | Design-kvalitet |
| 🟡 P2 | Ta bort scanlines | Läsbarhet |
| 🟡 P2 | Empty states + loading states | UX-komplettering |
| 🟢 P3 | Evidence-drawer förbättringar | Detaljerad UX |
| 🟢 P3 | Kill-switch separation | Säkerhet |
| 🟢 P3 | Keyboard shortcut discovery | Tillgänglighet |
| 🟢 P3 | Responsivitet för fönster-resize | Edge case |

---

## 12. Designprinciper för Redesignen

1. **Loopen ÄR appen** — den cirkulära loopen bör vara den visuella mittpunkten
2. **Kontrast > Estetik** — läsbarhet slår "cool" varje gång
3. **En accent-färg i taget** — cyan som primary, resten som semantiska signalfärger
4. **Monospace = data, Sans-serif = UI** — strikt separation
5. **Animation = uppmärksamhet** — om det rör sig ska det betyda något
6. **Tre panel-djup** — surface-1, surface-2, surface-3, inget mer
7. **Neon med måtta** — glow enbart på aktiva/kritiska element

---

*Genererat av Claude som designreview-brief för SEJFA Command Center redesign.*
