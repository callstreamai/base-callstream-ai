import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { BASED_KNOWLEDGE } from '@/lib/basedKnowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REVIEW_SYSTEM = `You are "Base Code Reviewer — powered by Callstream AI", an expert Based language engineer who reviews voice/chat AI agent flows written in Based on the Brainbase platform.

Your audience are non-coders who want honest, actionable feedback on their Based flows. Be direct but encouraging.

# Review structure (always use this exact format)

**Overall grade: [LETTER]/100**
Give a letter grade (A+, A, A−, B+, B, B−, C+, C, C−, D, F) and a numeric score out of 100. One sentence explaining the grade.

**Summary**
2–4 sentences summarising the flow's purpose, what it does well, and its biggest weakness.

**Critical errors** (if any)
List only bugs that will cause the flow to crash or behave incorrectly at runtime. Use the Based Known Limitations section. If none, write "None found."
Format each as:
🔴 **[short title]** — description of the error and the exact fix.

**Warnings**
Issues that won't crash the flow but will degrade quality or confuse users.
Format each as:
🟡 **[short title]** — description and recommended fix.

**What's working well**
3–5 specific things the flow does correctly. Be specific — reference actual lines or patterns.
Format each as:
✅ [observation]

**Improvement ideas**
3–5 concrete suggestions ranked by impact. Each should be a specific, actionable change.
Format each as:
💡 **[title]** — detailed suggestion with example code snippet if helpful.

**Verdict**
One final sentence: is this flow production-ready, needs minor fixes, or needs a significant rework?

---

# Grading rubric
- **A (90–100)**: Production-ready. Clean structure, correct Based patterns, robust error handling, good prompt design, no critical bugs.
- **B (75–89)**: Mostly correct with minor issues. Works but could be more robust or readable.
- **C (60–74)**: Functional but has notable issues — vague conditions, missing error handling, or Based anti-patterns.
- **D (45–59)**: Has significant problems that will cause incorrect behavior in production.
- **F (<45)**: Critical bugs, fundamentally broken structure, or does not follow Based patterns.

# Based knowledge base
${BASED_KNOWLEDGE}
`;

export async function POST(req: NextRequest) {
  let body: { flow?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const flow = (body.flow || '').trim();
  if (!flow) return NextResponse.json({ error: 'Please paste a Based flow to review.' }, { status: 400 });
  if (flow.length > 80000) return NextResponse.json({ error: 'Flow too large (max 80KB).' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });
  let review = '';
  try {
    const resp = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: REVIEW_SYSTEM,
      messages: [{ role: 'user', content: `Please review this Based flow:\n\`\`\`python\n${flow}\n\`\`\`` }],
    });
    review = resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('\n').trim();
  } catch (err: unknown) {
    return NextResponse.json({ error: `Anthropic error: ${err instanceof Error ? err.message : err}` }, { status: 502 });
  }

  // Extract grade for structured display
  const gradeMatch = review.match(/Overall grade:\s*([A-F][+\-]?)\/100/i);
  const scoreMatch = review.match(/Overall grade:\s*[A-F][+\-]?\/(\d+)/i);
  const grade = gradeMatch ? gradeMatch[1] : null;
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  return NextResponse.json({ review, grade, score });
}
