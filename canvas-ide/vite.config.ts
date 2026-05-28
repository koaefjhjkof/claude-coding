import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'

// ─── Shared helper ────────────────────────────────────────────────────────────
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
  })
}

function jsonOk(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function jsonErr(res: ServerResponse, msg: string, status = 500) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: msg }))
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json|svg|xml|html)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

function extractJson(text: string): string {
  const cleaned = stripFences(text)

  // Find the first { or [ — whichever comes first is the top-level structure
  let start = -1
  let openChar = ''
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' || cleaned[i] === '[') { start = i; openChar = cleaned[i]; break }
  }
  if (start === -1) return cleaned

  // Walk the string tracking bracket depth (skipping string literals) to find the matching close
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (esc)          { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"')   { inStr = !inStr; continue }
    if (inStr)        continue
    if (ch === openChar)  depth++
    else if (ch === closeChar) { depth--; if (depth === 0) return cleaned.slice(start, i + 1) }
  }
  return cleaned.slice(start)   // unclosed — return remainder, let JSON.parse report the error
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'ai-middleware',
      configureServer(server) {

        // ── /api/interpret-action ─────────────────────────────────────────────
        server.middlewares.use('/api/interpret-action', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          try {
            const { apiKey, description, elementType, screens, currentScreenId } = JSON.parse(await readBody(req))

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
  move(x,y)                   → void
  resize(w,h)                 → void
  remove()                    → void
  hide() / show()             → void
  setText(s)                  → void
  toast(msg)                  → void
  toggle()                    → void
  createElement(type,props?,x?,y?,w?,h?) → void
  wait(ms)                    → Promise
  getState(key,default?)      → any
  setState(key,val)           → void
  random(min,max)             → number
  interval(fn,ms)             → id
  stop(id)                    → void

━━ CONTEXT ━━
Current element type: ${elementType}
Screens:
${screenList}
Current screen id: ${currentScreenId}

Return ONLY one valid JSON object. No markdown, no explanation.`

            const message = await client.messages.create({
              model: 'claude-haiku-4-5',
              max_tokens: 512,
              system: systemPrompt,
              messages: [{ role: 'user', content: description }],
            })

            const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
            const jsonStr = extractJson(rawText)
            const action = JSON.parse(jsonStr)
            jsonOk(res, { action })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            jsonOk(res, { action: { type: 'toast', message: `AI error: ${msg}` } })
          }
        })

        // ── /api/generate-element ─────────────────────────────────────────────
        server.middlewares.use('/api/generate-element', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          try {
            const { apiKey, description, imageData } = JSON.parse(await readBody(req))

            const Anthropic = (await import('@anthropic-ai/sdk')).default
            const client = new Anthropic({ apiKey })

            const systemPrompt = `You are a UI component designer. Generate a self-contained SVG for the described GUI element.

Rules:
- Return ONLY the raw SVG markup — no explanation, no markdown, no code fences
- Root <svg> must have width="100%" height="100%" and an appropriate viewBox
- Use clean, modern mobile/web app design: rounded corners (rx="8"+), subtle shadows, nice gradients
- Typography: font-family="Inter, system-ui, sans-serif"
- Colors: #6366f1 indigo · #10b981 green · #3b82f6 blue · #f59e0b amber · #ef4444 red · #1f2937 dark · #ffffff white
- Make it polished — shadows, gradients, proper spacing`

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
            const svg = stripFences(rawText)
            jsonOk(res, { svg })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            jsonErr(res, msg)
          }
        })

        // ── /api/auto-design ──────────────────────────────────────────────────
        server.middlewares.use('/api/auto-design', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          try {
            const { apiKey, description, primaryColor, clearFirst } = JSON.parse(await readBody(req))

            const Anthropic = (await import('@anthropic-ai/sdk')).default
            const client = new Anthropic({ apiKey })

            const systemPrompt = `You are an expert mobile UI designer. Given an app description, generate a complete, polished set of UI elements for a single mobile screen (375×720px canvas, 0,0 = top-left).

Return ONLY a raw JSON array — no markdown, no explanation, no code fences.

Each element must follow this exact shape:
{
  "type": string,      // one of the types below
  "x": number,         // left position in px
  "y": number,         // top position in px
  "width": number,     // width in px
  "height": number,    // height in px
  "props": { ... }     // props object (see per-type guidance below)
}

Available types and their key props:
- button:     label, variant ("primary"|"secondary"|"ghost"), bgColor, textColor, borderRadius
- heading:    text, fontSize (20-36), fontWeight ("600"|"700"|"800"), textColor
- text:       text, fontSize (12-16), textColor
- input:      placeholder, borderRadius
- searchbar:  placeholder, borderRadius
- card:       bgColor ("#fff"), shadow (true), borderRadius, padding
- image:      src (""), borderRadius
- avatar:     initials ("AB"), bgColor
- badge:      label, badgeColor
- toggle:     label, checked (false)
- checkbox:   label, checked (false)
- slider:     label, value (0-100)
- progress:   label, value (0-100)
- rating:     value (1-5)
- list:       items ("Item 1\\nItem 2\\nItem 3"), fontSize
- tabbar:     tabs ("Home,Search,Profile"), activeTab (0)
- divider:    bgColor ("#e5e7eb")
- alert:      alertVariant ("info"|"success"|"warning"|"error"), text
- chart:      chartType ("bar"|"line"|"pie"), chartData ("40,65,55,80"), chartLabels ("Mon,Tue,Wed,Thu"), label
- icon:       iconName ("home"|"search"|"user"|"settings"|"heart"|"star"|"bell"|"mail"|"arrow-right"), bgColor
- dropdown:   placeholder, dropdownItems ("Option 1,Option 2,Option 3")
- map:        mapLocation ("New York"), mapZoom (13), borderRadius
- video:      videoUrl (""), label, borderRadius

Design rules:
- Canvas: 375px wide, 720px tall. Use 16px side margins (content width = 343px).
- Start content at y=48 (leave room for status bar).
- Use a tabbar at bottom (y=640, height=64) for multi-section apps.
- Space elements 12-20px apart vertically.
- Primary color: ${primaryColor ?? '#6366f1'}
- Use the primary color for key action buttons and highlights.
- Create 8-16 elements for a rich, complete screen.
- Make it look like a real, polished production app.
- Do NOT overlap elements.`

            const message = await client.messages.create({
              model: 'claude-opus-4-7',
              max_tokens: 8192,
              system: systemPrompt,
              messages: [{ role: 'user', content: description }],
            })

            const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
            const jsonStr = extractJson(rawText)
            const elements = JSON.parse(jsonStr)
            if (!Array.isArray(elements)) throw new Error('Expected JSON array')
            jsonOk(res, { elements, clearFirst: !!clearFirst })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            jsonErr(res, msg)
          }
        })

        // ── /api/make-it-work ─────────────────────────────────────────────
        server.middlewares.use('/api/make-it-work', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          try {
            const { apiKey, description, elements, screens } = JSON.parse(await readBody(req))

            const Anthropic = (await import('@anthropic-ai/sdk')).default
            const client = new Anthropic({ apiKey })

            const screenList = (screens as { id: string; name: string }[])
              .map((s, i) => `  ${i + 1}. id="${s.id}" name="${s.name}"`)
              .join('\n')

            const systemPrompt = `You are an expert mobile app developer. Given a description and UI elements, make the app fully functional by:
1. Adding database bindings (boundTable, boundDisplayField, listSelectable, inputField, formTable, buttonAction)
2. Adding flows for navigation and user interactions
3. Suggesting the minimal set of database tables needed

App canvas: 375×720px. Available triggers: "tap", "hold", "swipe-left", "swipe-right".

Return ONLY this exact JSON shape — no markdown, no explanation:
{
  "elements": [
    {
      "id": "...(preserve exactly)",
      "props": { ...all original props plus any new/updated fields... },
      "flows": [
        { "id": "f1", "trigger": "tap", "description": "short user-friendly label", "action": "description of what to do OR navigate to Screen Name" }
      ]
    }
  ],
  "tables": [
    {
      "name": "snake_case",
      "label": "Human Label",
      "fields": [
        { "name": "field_name", "label": "Field Label", "type": "text|number|boolean|date|email|url", "required": true }
      ]
    }
  ]
}

Rules:
- ONLY include elements that need changes — omit elements that need no flows or binding changes.
- For list elements: add boundTable, boundDisplayField (first meaningful text field), boundSubField (optional secondary), listSelectable: true if tapping a row makes sense.
- For input elements: add inputField matching the relevant table field name.
- For submit/save buttons: add formTable (the table to write to) and buttonAction: "submit-form".
- For delete buttons: add buttonAction: "delete-row".
- For edit/update buttons: add buttonAction: "update-row".
- For navigation buttons: add a flow { trigger: "tap", action: "navigate to [screen name]" }.
- Keep flows simple and purposeful — 1-2 flows per element max.
- Suggest only tables that are genuinely needed given the app description.
- Field types: use "email" for email fields, "number" for numeric fields, "boolean" for yes/no, "date" for dates, "text" otherwise.

Current screens:
${screenList}`

            const message = await client.messages.create({
              model: 'claude-opus-4-7',
              max_tokens: 8192,
              thinking: { type: 'adaptive' },
              system: systemPrompt,
              messages: [{
                role: 'user',
                content: `App description: "${description}"\n\nElements:\n${JSON.stringify(elements, null, 2)}`,
              }],
            })

            const rawText = message.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
            const jsonStr = extractJson(rawText)
            const result = JSON.parse(jsonStr)
            if (!result.elements || !Array.isArray(result.elements)) throw new Error('Expected elements array')
            jsonOk(res, result)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            jsonErr(res, msg)
          }
        })

        // ── /api/make-pretty ──────────────────────────────────────────────────
        server.middlewares.use('/api/make-pretty', async (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
          try {
            const { apiKey, elements, styles, deviceWidth, deviceHeight } = JSON.parse(await readBody(req))

            if (!elements || elements.length === 0) {
              jsonErr(res, 'No elements to improve', 400); return
            }

            const Anthropic = (await import('@anthropic-ai/sdk')).default
            const client = new Anthropic({ apiKey })

            const systemPrompt = `You are a professional mobile UI designer. Given a list of UI elements on a ${deviceWidth}×${deviceHeight}px canvas, improve their layout and visual design to look polished, aligned, and professional.

Return ONLY a raw JSON array — no markdown, no explanation, no code fences.

Each object in the array must have this shape (preserve the "id" field exactly):
{ "id": "...", "x": N, "y": N, "width": N, "height": N, "props": { ...updated props... } }

Rules:
- ALWAYS preserve the "id" field exactly as-is from the input.
- Align elements: left edges should align to a 16px grid, centered elements should be truly centered (x = (${deviceWidth} - width) / 2).
- Consistent vertical spacing: 12-16px gaps between elements.
- Group related elements (labels above inputs, headings before content).
- Improve colors: use the primary color (${styles?.primaryColor ?? '#6366f1'}) for buttons and highlights.
- Keep the same element types — do not change "type" fields.
- Stay within bounds: x >= 0, y >= 0, x + width <= ${deviceWidth}, y + height <= ${deviceHeight}.
- Tab bars go at the bottom: y = ${deviceHeight - 64}, height = 64.
- Return ALL elements from the input (same count).`

            const message = await client.messages.create({
              model: 'claude-opus-4-7',
              max_tokens: 8192,
              system: systemPrompt,
              messages: [{
                role: 'user',
                content: `Improve this layout:\n${JSON.stringify(elements, null, 2)}`,
              }],
            })

            const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
            const jsonStr = extractJson(rawText)
            const updated = JSON.parse(jsonStr)
            if (!Array.isArray(updated)) throw new Error('Expected JSON array')
            jsonOk(res, { elements: updated })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            jsonErr(res, msg)
          }
        })
      },
    },
  ],
})
