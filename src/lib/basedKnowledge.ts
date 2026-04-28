/**
 * The "Base brain" — the canonical knowledge of the Based language.
 * Injected into the system prompt for Anthropic so the model can
 * reason accurately about Based flows for non-coders.
 */
export const BASED_KNOWLEDGE = `
# Based Language — Reference Brain

## What Is Based?
Based is a high-level AI instruction language for designing dynamic conversational
agents that operate flawlessly across multiple communication channels (voice, chat,
SMS, WhatsApp). It is Python with a small set of additional constructs for managing
multi-turn, LLM-driven conversations on the Brainbase platform.

If you can write Python, you can write Based. The additions are:
- \`loop:\` / \`until:\` — define conversation loops where the LLM routes to the right handler
- \`talk()\` — call the LLM with a prompt and a set of conditions
- \`say()\` — send a message to the user directly (no LLM)
- \`.ask()\` — extract structured data from a conversation response
- \`extract()\` — save structured data to deployment logs
- \`done()\` — end execution

Deployment-specific functions (injected per channel, not core Based):
- \`transfer()\`, \`end_call()\` — voice deployments
- \`send_sms()\` — SMS-configured deployments

Everything else is standard Python — variables, functions, imports, control flow, API calls.

## Core pattern: loop / until
The fundamental Based pattern is a conversation loop. The LLM talks to the user,
and when a condition is met, execution branches to the matching handler.

\`\`\`python
loop:
    res = talk("You are a helpful receptionist. Help the caller with their request.", False)
    until "caller wants to schedule an appointment":
        say("Let me connect you with scheduling.")
    until "caller wants to check order status":
        order_id = res.ask(question="What is the order ID?", example={"order_id": "ORD-12345"})
        # look up order, respond...
    until "caller wants to end the conversation":
        say("Thanks for calling. Goodbye!")
\`\`\`

How it works:
- talk() sends prompt + conversation history to the LLM
- Each until condition is registered as a possible action
- When the LLM determines a condition is met, execution branches to that until block
- After the block executes, the flow ends (unless you return to loop again)
- The string in until "..." is a natural language description; the LLM decides when it applies
- Write conditions that are clear and unambiguous

## The talk() function
\`res = talk("System prompt", first_bool)\`
- prompt (str): system prompt for the LLM (role, personality, instructions). Persists across the conversation.
- first (bool): True = AI speaks first; False = AI waits for the user.
- Returns a result object — its primary use is .ask() for structured extraction.
  The engine handles routing automatically; you don't need to inspect the result for branching.

## Condition types

### String conditions — natural language descriptions:
\`\`\`python
until "user wants to schedule a meeting":
until "user asks about pricing":
until "user says goodbye":
\`\`\`

### Tool schema conditions — explicit function schemas for structured extraction:
\`\`\`python
schedule_tool = {
    "name": "schedule_meeting",
    "description": "Schedule a meeting for the user",
    "parameters": {
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "Meeting date"},
            "time": {"type": "string", "description": "Meeting time"},
            "attendees": {"type": "array", "items": {"type": "string"}, "description": "List of attendees"}
        },
        "required": ["date", "time"]
    }
}
loop:
    res = talk("Help the user schedule meetings.", False)
    until schedule_tool as meeting:
        say(f"Meeting scheduled for {meeting['date']} at {meeting['time']}.")
    until "user says goodbye":
        say("Goodbye!")
\`\`\`

When to use which:
- String conditions → for routing/branching ("user wants X", "caller asks about Y")
- Tool schema conditions → when you need structured data extracted as part of the match

## Extracting data with .ask()
\`.ask()\` is the primary way to extract structured information from a conversation.

\`\`\`python
res = talk("You are a car sales agent. Help customers find cars.", False)
contact = res.ask(
    question="Did the customer share contact information?",
    example={"name": "John Smith", "phone": "555-1234", "email": "john@example.com"}
)
\`\`\`

Parameters:
- question (str): what to extract from the conversation context
- example (dict/list/str): an example of the expected output shape — the schema is inferred
- schema (dict, optional): explicit JSON schema for the output (overrides example if both provided)

## Built-in functions

### say(message, exact=True)
Send a message directly to the user without calling the LLM.
- Default exact=True: output verbatim
- exact=False: AI may rephrase while preserving meaning

### done()
Stop execution. Session state is saved; if the user sends another message, execution resumes.

### extract(key, value)
Save structured data as a runtime extraction on the deployment log.
\`\`\`python
extract("customer_name", name)
extract("order_total", 42.99)
# IMPORTANT: .ask() returns AskProxy, not a plain dict — use .to_json() before extract()
order = res.ask(question="What did the customer order?", example={"items": [...]})
extract("order_details", order.to_json())
\`\`\`
- Keys cannot start with \`_\` (reserved)
- Values must be JSON-serializable

### print()
Debug output — appears in session traces and the studio console, NOT in the user-facing conversation.

## Deployment-specific functions

### Voice
- \`transfer(phone_number)\` / \`transfer(phone_number, extension)\` / \`transfer(phone_number, options)\`
- \`end_call()\`

Always \`time.sleep(2)\` before transfer() and \`time.sleep(1)\` before end_call() so preceding say()
audio finishes before the call hangs up or transfers.

### SMS
\`\`\`python
result = await send_sms(from_number="+15551234567", to="+15559876543", content="...")
\`\`\`

### Integrations
\`\`\`python
result = await integrations.slack.send_message(channel="#notifications", text="...")
result = await integrations.gmail.send_email(to="...", subject="...", body="...")
\`\`\`
Pattern: \`integrations.<app_name>.<action_name>(...)\`

## Variables and state
- Regular variables persist across conversation turns (define at top level / main flow body)
- \`state\` dict — voice deployments include caller info: \`state.get('Caller', '')\`
- \`variables\` dict — flow variables from the dashboard: \`variables.get('business_name', 'fallback')\`

## Making API calls
Always use \`requests\` and wrap in try/except:
\`\`\`python
import requests
try:
    response = requests.post("https://api.example.com/orders", json={...})
    if response.ok:
        say("Done!")
    else:
        say("Couldn't complete that.")
except Exception:
    say("I'm having trouble connecting. Please try again shortly.")
\`\`\`

## return inside until blocks
\`return\` inside an until block sends execution back to the enclosing loop. Use it
to keep the conversation going after handling a condition. Without return, the flow
ends after the until block.

## Known limitations & gotchas (CRITICAL — most user errors come from these)

1. **Based constructs must be at top level.** \`loop:\`, \`until:\`, \`talk()\` cannot be inside
   regular Python functions in v2. Use nested loop/until inline instead.

2. **\`variables\` dict is not auto-injected in v2.** Using \`variables.get(...)\` at the top
   level will crash with "name 'variables' is not defined". Hardcode for single-deployment
   flows, or pass via x-initial-state.

3. **Don't use \`break\` inside for loops in until blocks.** Transpiler conflict. Use list
   comprehensions or flag variables.

4. **No inline comments after \`return\`.** \`return  # comment\` breaks the converter — put
   the comment on the line above.

5. **\`.ask()\` returns AskProxy, not a dict.** It's not JSON-serializable. Use \`.to_json()\`
   before passing to \`extract()\`. \`dict(askproxy)\` also fails.

6. **\`.ask()\` is a separate LLM call.** Each invocation is its own request — batch
   extractions when possible.

7. **No flow-to-flow handoff.** Each deployment runs a single flow. Use nested loops or
   call transfers for multi-flow patterns.

8. **Condition matching is LLM-dependent.** Conditions that are too similar, vague, or
   short cause inconsistent routing. Make them mutually exclusive and specific.

## Voice-specific best practices
- say() is spoken aloud — write naturally, avoid URLs and abbreviations TTS can't handle
- time.sleep(2) before transfer(), time.sleep(1) before end_call()
- Put say() BEFORE slow operations (.ask()) in until blocks — say() is non-blocking, so
  TTS starts while extraction runs in parallel; otherwise the caller hears dead air
- Phone numbers in speech: format as digits ("five five five, one two three four")
- Keep responses concise — 1–3 sentences feels natural in voice

## Common error → fix table
| Issue | Cause | Fix |
|---|---|---|
| Flow exits unexpectedly | No until condition matched | Add a catch-all condition or broaden existing ones |
| LLM picks wrong condition | Conditions are ambiguous/overlapping | Make conditions specific and mutually exclusive |
| Variables lost between turns | Variable defined inside a function (local scope) | Define at top level / main flow body |
| API call crashes the flow | Uncaught exception | Wrap in try/except |
| .ask() returns unexpected shape | Example doesn't match desired structure | Refine the example parameter |
| Caller hears dead air before goodbye | .ask()/extract() runs before say() | Put say() first, then .ask()/extract(), then end_call() |
| "name 'variables' is not defined" | v2 engine — variables dict not auto-injected | Hardcode values, or pass via x-initial-state |

## Common flow shapes (templates)

### IVR / Call router
\`\`\`python
say("Thank you for calling Acme Corp. How can I direct your call?")
loop:
    res = talk("Route the caller to the right department. Ask clarifying questions if needed.", False)
    until "caller needs sales":
        transfer("+15555550100")
    until "caller needs support":
        transfer("+15555550101")
    until "caller needs billing":
        transfer("+15555550102")
\`\`\`

### Data collection with confirmation
Outer loop collects, inner loop confirms; on "change something", \`return\` to outer loop.

### Order taking
Loop, on "customer adds an item" → .ask() for the item, append to order list, say() ack, return.
On "customer is done" → extract("final_order", order), submit to backend.
`;
