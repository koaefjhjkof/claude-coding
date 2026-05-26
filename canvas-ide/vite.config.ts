import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'ai-middleware',
      configureServer(server) {
        server.middlewares.use('/api/interpret-action', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') {
            res.writeHead(405); res.end(); return
          }

          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', async () => {
            try {
              const { apiKey, description, elementType, screens, currentScreenId } = JSON.parse(body)

              const Anthropic = (await import('@anthropic-ai/sdk')).default
              const client = new Anthropic({ apiKey })

              const screenList = (screens as { id: string; name: string }[])
                .map((s, i) => `  - id="${s.id}" name="${s.name}" index=${i + 1}`)
                .join('\n')

              const systemPrompt = `You are an action interpreter for a visual app builder. Return a single JSON action object for the given behavior description. Canvas is ~375×720px (phone), 0,0 = top-left.

━━ SIMPLE ACTIONS ━━
{"type":"navigate","screenId":string}
{"type":"style","props":{...}}   props: bgColor textColor borderRadius fontSize fontWeight opacity shadow — AND content props: text label placeholder checked value items
{"type":"animate","animation":string,"duration":ms,"repeat":n|"infinite"}
  animations: spin(600) shake(500) bounce(700) pulse(600) wiggle(500) flash(500)
              tada(800) rubber-band(700) jello(900) heartbeat(1200) flip(800)
              swing(700) slide-in(400) fade-in(400) fade-out(400) glow(800)
{"type":"hide"} {"type":"show"} {"type":"toggle-checked"}
{"type":"set-text","text":string}
{"type":"toast","message":string}
{"type":"move","x":number,"y":number}
{"type":"resize","width":number,"height":number}
{"type":"remove"}
{"type":"create-element","elementType":string,"props":{},"x":n,"y":n,"width":n,"height":n}
  elementType: button text heading input card badge alert progress image avatar
               toggle checkbox slider list divider rating searchbar tabbar

━━ CODE ACTION — prefer this for anything with logic, state, sequencing, or creativity ━━
{"type":"run-code","code":"...async JS body..."}

Helpers available inside code:
  animate(name,ms=600,rep=1)  → Promise  (await to sequence)
  style({...props})           → void     (any prop: bgColor, text, label, opacity…)
  navigate(nameOrId)          → void
  move(x,y)                   → void     reposition in px
  resize(w,h)                 → void     resize in px
  remove()                    → void     delete element
  hide() / show()             → void
  setText(s)                  → void
  toast(msg)                  → void
  toggle()                    → void
  createElement(type,props?,x?,y?,w?,h?) → void
  wait(ms)                    → Promise  (await wait(1000) pauses 1s)
  getState(key,default?)      → any      persistent across taps (counts, flags, etc.)
  setState(key,val)           → void
  random(min,max)             → number   random float
  interval(fn,ms)             → id       repeating timer; auto-stops on screen change
  stop(id)                    → void     cancel interval

━━ RICH EXAMPLES ━━
"spin then turn green"
  → {"type":"run-code","code":"await animate('spin'); style({bgColor:'#10b981'})"}
"count taps and display the number"
  → {"type":"run-code","code":"const n=getState('n',0)+1; setState('n',n); setText('Tapped '+n+'×')"}
"turn green after 3 taps"
  → {"type":"run-code","code":"const n=getState('n',0)+1; setState('n',n); if(n>=3){style({bgColor:'#10b981'}); setText('Done!')}"}
"toggle between red and blue each tap"
  → {"type":"run-code","code":"const r=getState('r',false); setState('r',!r); style({bgColor:r?'#3b82f6':'#ef4444'})"}
"random colour on every tap"
  → {"type":"run-code","code":"const c=['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6']; style({bgColor:c[Math.floor(random(0,c.length))]})"}
"grow 10% each tap, max 2×"
  → {"type":"run-code","code":"const s=Math.min(getState('s',1)+0.1,2); setState('s',s); resize(Math.round(160*s),Math.round(48*s))"}
"pulse every second"
  → {"type":"run-code","code":"interval(()=>animate('pulse',600,1),1000)"}
"loading for 2s then show Done"
  → {"type":"run-code","code":"const id=interval(()=>animate('pulse',400,1),500); await wait(2000); stop(id); style({bgColor:'#10b981'}); setText('Done!')"}
"shake then add a 'Well done!' text in blue"
  → {"type":"run-code","code":"await animate('shake'); createElement('text',{text:'Well done!',textColor:'#3b82f6'},40,360)"}
"add a 'Well done!' text in blue"
  → {"type":"create-element","elementType":"text","props":{"text":"Well done!","textColor":"#3b82f6"}}
"add a success alert"
  → {"type":"create-element","elementType":"alert","props":{"alertVariant":"success","text":"Success!"}}
"move to the top centre"
  → {"type":"move","x":107,"y":30}
"keep spinning"
  → {"type":"animate","animation":"spin","repeat":"infinite"}
"bounce then go to next screen"
  → {"type":"run-code","code":"await animate('bounce'); navigate('${screens[1]?.name ?? 'Screen 2'}')"}
"disappear after 2 seconds"
  → {"type":"run-code","code":"await wait(2000); hide()"}
"flash red 3 times then restore"
  → {"type":"run-code","code":"const old=getState('bg',''); style({bgColor:'#ef4444'}); await animate('flash',500,3); style({bgColor:old})"}
"increment a counter badge next to me"
  → {"type":"run-code","code":"const n=getState('c',0)+1; setState('c',n); createElement('badge',{label:String(n),badgeColor:'#6366f1'},220,0)"}

━━ CONTEXT ━━
Current element type: ${elementType}
Screens: ${screenList}
Current screen id: ${currentScreenId}
Colors (hex only): #ef4444 red · #10b981 green · #3b82f6 blue · #f59e0b amber · #8b5cf6 purple · #ec4899 pink · #ffffff white · #111827 black

Return ONLY one valid JSON object. No markdown, no explanation.
If truly impossible (camera, mic, GPS, real network), return {"type":"toast","message":"...friendly explanation..."}.`

              const message = await client.messages.create({
                model: 'claude-haiku-4-5',
                max_tokens: 512,
                system: systemPrompt,
                messages: [{ role: 'user', content: description }],
              })

              const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
              // Strip markdown code fences the model sometimes adds despite instructions
              const stripped = rawText
                .replace(/^```(?:json)?\s*/im, '')
                .replace(/\s*```\s*$/m, '')
                .trim()
              // Pull out the first JSON object in case there's surrounding explanation
              const jsonMatch = stripped.match(/\{[\s\S]*\}/)
              const jsonStr = jsonMatch ? jsonMatch[0] : stripped
              const action = JSON.parse(jsonStr)

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ action }))
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ action: { type: 'toast', message: `AI error: ${msg}` } }))
            }
          })
        })

        // ── /api/generate-element ─────────────────────────────────────────────
        server.middlewares.use('/api/generate-element', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }

          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', async () => {
            try {
              const { apiKey, description, imageData } = JSON.parse(body)

              const Anthropic = (await import('@anthropic-ai/sdk')).default
              const client = new Anthropic({ apiKey })

              const systemPrompt = `You are a UI component designer. Generate a self-contained SVG for the described GUI element.

Rules:
- Return ONLY the raw SVG markup — no explanation, no markdown, no code fences
- Root <svg> must have width="100%" height="100%" and an appropriate viewBox (e.g. "0 0 300 100" for wide, "0 0 200 200" for square)
- Use clean, modern mobile/web app design: rounded corners (rx="8"+), subtle shadows via filter, nice gradients
- Typography: font-family="Inter, system-ui, sans-serif"
- Colors: #6366f1 indigo · #10b981 green · #3b82f6 blue · #f59e0b amber · #ef4444 red · #1f2937 dark · #ffffff white · #f9fafb light-gray
- Make it polished — shadows, gradients, proper spacing
- Adapt viewBox aspect ratio to what makes sense for the element

Examples of good elements: a card with avatar + name + button, a stat tile with large number + label + sparkline, a toggle with custom thumb, a search bar with gradient background, a notification badge with icon.`

              type MessageParam = { role: 'user'; content: string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } }> }
              const messages: MessageParam[] = imageData
                ? [{
                    role: 'user',
                    content: [
                      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } },
                      { type: 'text', text: description ? `Create a polished SVG UI component based on this sketch. Additional context: ${description}` : 'Create a polished SVG UI component that faithfully recreates what is sketched here.' },
                    ],
                  }]
                : [{ role: 'user', content: `Create an SVG UI component: ${description}` }]

              const message = await client.messages.create({
                model: 'claude-haiku-4-5',
                max_tokens: 4096,
                system: systemPrompt,
                messages,
              })

              const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
              const svg = rawText
                .replace(/^```(?:svg|xml|html)?\s*/im, '')
                .replace(/\s*```\s*$/m, '')
                .trim()

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ svg }))
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: msg }))
            }
          })
        })
      },
    },
  ],
})
