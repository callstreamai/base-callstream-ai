import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BASED_KNOWLEDGE } from '@/lib/basedKnowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VIBE_SYSTEM = `You are "Base Vibe Coder — powered by Call Stream AI", an expert Based language engineer who translates plain-English descriptions into complete, production-ready Based voice/chat agent flows.

Your audience has zero coding experience. They give you a description and you produce clean Based code they can paste directly into Brainbase.

# Rules
1. Always produce a COMPLETE, runnable Based flow — not a fragment.
2. Follow ALL Based best practices and known limitations strictly (see knowledge base below).
3. For every API the user describes, write a realistic requests.post/get call wrapped in try/except.
4. For RAG links, generate a helper that fetches/references the content, or embed the URL as a comment with a note explaining how to wire it up in Brainbase.
5. Include all critical prompts directly in the talk() system prompt string.
6. Use time.sleep(2) before transfer() and time.sleep(1) before end_call().
7. Put say() before slow operations in goodbye/transfer handlers.
8. Use .to_json() before extract() on any .ask() result.
9. Keep conditions mutually exclusive and clear.
10. Add brief inline comments explaining each major section so a non-coder can understand.

# Output format
First: a 2–3 sentence plain-English summary of what the flow does.

Then: the complete Based flow in a single \`\`\`python code block.

Then: a "Key features" section listing 4–6 bullet points of what was built.

Keep explanations short — the code should speak for itself.

# Based knowledge base
${BASED_KNOWLEDGE}
`;

export async function POST(req: NextRequest) {
  let body: { purpose?: string; agentName?: string; rag?: string; prompts?: string; functions?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { purpose = '', agentName = '', rag = '', prompts = '', functions: fns = '' } = body;

  if (!purpose.trim() && !agentName.trim()) {
    return NextResponse.json({ error: 'Provide at least a Purpose or Agent name.' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 });

  const parts: string[] = [];
  if (agentName.trim()) parts.push(`## Agent name\n${agentName.trim()}`);
  if (purpose.trim()) parts.push(`## Purpose / description\n${purpose.trim()}`);
  if (rag.trim()) parts.push(`## RAG / Knowledge sources\n${rag.trim()}`);
  if (prompts.trim()) parts.push(`## Critical prompts / constraints\n${prompts.trim()}`);
  if (fns.trim()) parts.push(`## Function calls / APIs / MCPs\n${fns.trim()}`);

  const anthropic = new Anthropic({ apiKey });
  let code = '';
  try {
    const resp = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: VIBE_SYSTEM,
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    });
    code = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('\n').trim();
  } catch (err: unknown) {
    return NextResponse.json({ error: `Anthropic error: ${err instanceof Error ? err.message : err}` }, { status: 502 });
  }
  return NextResponse.json({ code });
}
