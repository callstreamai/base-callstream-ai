import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BASED_KNOWLEDGE } from '@/lib/basedKnowledge';
import { ATTACHMENTS_BUCKET, getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Attachment = {
  name: string;
  type: string; // mime
  size: number;
  data: string; // base64 (no prefix)
};

type AskBody = {
  problem?: string;
  flow?: string;
  example?: string;
  goal?: string;
  attachments?: Attachment[];
};

const SYSTEM_PROMPT = `You are "Base — powered by Callstream AI", a friendly senior engineer who helps NON-CODERS fix and build voice/chat AI agents written in the **Based** language on the Brainbase platform.

Your audience does not know Python or how to debug code. They want clear, copy-pasteable answers and a calm explanation of what was wrong.

# Your behavior
1. **Diagnose first.** Read the user's problem, current flow, transcript example, and goal. Identify the most likely root cause from the Based knowledge base below — pay special attention to the Known Limitations & Gotchas section, because that's where almost all real-world Based bugs come from.
2. **Explain in plain English.** One short paragraph: what is going wrong and why. No jargon.
3. **Give the corrected Based code.** Always provide a complete, runnable Based snippet inside a \`\`\`python fenced block (Based is Python-flavored so use the python tag for syntax highlighting). Keep the code production-ready: top-level loop/until, try/except around API calls, .to_json() before extract(), say() before .ask() in voice goodbye/transfer handlers, time.sleep() before end_call/transfer, etc.
4. **Call out the specific change(s).** A short bulleted "What changed" list so the user can see exactly what you fixed.
5. **If anything is missing**, ask one specific clarifying question at the end — but always still give your best attempt at a fix above the question.
6. **If the user only provided a goal** (no flow yet), generate a from-scratch Based flow that meets the goal, following all best practices and known limitations.
7. **Stay grounded.** Only use functions, syntax, and patterns documented in the Based knowledge below. Do not invent APIs.

# Output format (always)
**Diagnosis** — 1–3 sentences in plain English.

**Fixed Based flow**
\`\`\`python
# corrected code here
\`\`\`

**What changed**
- bullet 1
- bullet 2

**Try this next** (optional) — one or two short verification steps the user can run.

# Based knowledge base
${BASED_KNOWLEDGE}
`;

// Use the SDK's exported namespace so type names track upstream changes.
type ContentBlockParam =
  | Anthropic.TextBlockParam
  | Anthropic.ImageBlockParam
  // The SDK exports a DocumentBlockParam in newer versions; fall back to a
  // structural type if that's missing so we still build cleanly.
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

function safeString(v: unknown, max = 20000): string {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) + '\n…[truncated]' : v;
}

export async function POST(req: NextRequest) {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const problem = safeString(body.problem);
  const flow = safeString(body.flow, 60000);
  const example = safeString(body.example, 40000);
  const goal = safeString(body.goal);
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 6) : [];

  if (!problem && !flow && !example && !goal && attachments.length === 0) {
    return NextResponse.json(
      { error: 'Please fill in at least one field or attach a file.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'ANTHROPIC_API_KEY is not configured on the server. Set it in your environment and redeploy.',
      },
      { status: 500 },
    );
  }

  // Build the user message — text + any image/PDF attachments Claude can see.
  const userBlocks: ContentBlockParam[] = [];

  const textParts: string[] = [];
  if (problem) textParts.push(`## 1. Describe the problem\n${problem}`);
  if (flow) textParts.push(`## 2. Current Based flow\n\`\`\`python\n${flow}\n\`\`\``);
  if (example) textParts.push(`## 3. Example transcript / error\n\`\`\`\n${example}\n\`\`\``);
  if (goal) textParts.push(`## 4. Goal\n${goal}`);
  if (textParts.length === 0) textParts.push('The user only attached files. Please review them.');

  userBlocks.push({ type: 'text', text: textParts.join('\n\n') });

  // Attachments — Claude supports image/* and application/pdf as content blocks.
  // Other files we describe textually so Claude knows they exist.
  const otherAttachments: { name: string; type: string; size: number }[] = [];
  for (const att of attachments) {
    if (!att?.data || typeof att.data !== 'string') continue;
    if (att.type?.startsWith('image/')) {
      const mt = att.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      userBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mt, data: att.data },
      });
    } else if (att.type === 'application/pdf') {
      userBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: att.data },
      });
    } else if (
      att.type?.startsWith('text/') ||
      /\.(py|txt|md|json|log|based)$/i.test(att.name || '')
    ) {
      try {
        const decoded = Buffer.from(att.data, 'base64').toString('utf8');
        userBlocks.push({
          type: 'text',
          text: `## Attachment: ${att.name}\n\`\`\`\n${decoded.slice(0, 60000)}\n\`\`\``,
        });
      } catch {
        otherAttachments.push({ name: att.name, type: att.type, size: att.size });
      }
    } else {
      otherAttachments.push({ name: att.name, type: att.type, size: att.size });
    }
  }
  if (otherAttachments.length) {
    userBlocks.push({
      type: 'text',
      text:
        '## Other attachments (not inlined)\n' +
        otherAttachments
          .map((a) => `- ${a.name} (${a.type || 'unknown'}, ${a.size} bytes)`)
          .join('\n'),
    });
  }

  const anthropic = new Anthropic({ apiKey });

  let answer = '';
  try {
    const resp = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      // Cast: our union includes a structural document block which the SDK
      // type may or may not export by the same name across versions.
      messages: [{ role: 'user', content: userBlocks as unknown as Anthropic.MessageParam['content'] }],
    });

    answer = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Anthropic request failed: ${msg}` },
      { status: 502 },
    );
  }

  // Best-effort logging to Supabase (no-op if not configured)
  let submissionId: string | null = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert({
          problem: problem || null,
          flow: flow || null,
          example: example || null,
          goal: goal || null,
          response: answer,
          attachment_count: attachments.length,
          user_agent: req.headers.get('user-agent') || null,
        })
        .select('id')
        .single();
      if (!error && data?.id) {
        submissionId = data.id as string;

        // Upload attachments to storage; ignore failures
        for (const att of attachments) {
          try {
            const path = `${submissionId}/${Date.now()}-${att.name.replace(/[^\w.\-]+/g, '_')}`;
            const buf = Buffer.from(att.data, 'base64');
            await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, buf, {
              contentType: att.type || 'application/octet-stream',
              upsert: false,
            });
            await supabase.from('attachments').insert({
              submission_id: submissionId,
              name: att.name,
              mime_type: att.type,
              size: att.size,
              storage_path: path,
            });
          } catch {
            /* swallow */
          }
        }
      }
    } catch {
      /* swallow logging errors — never block the user */
    }
  }

  return NextResponse.json({ answer, submission_id: submissionId });
}
