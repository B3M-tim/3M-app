const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "poolside/laguna-m.1:free",
  "cohere/north-mini-code:free",
  "openrouter/owl-alpha"
];

export async function onRequestPost(context) {
  const apiKey = context.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const body = await context.request.json();

    const messages = [];
    if (body.system) {
      messages.push({ role: "system", content: body.system });
    }
    if (body.messages) {
      messages.push(...body.messages);
    }

    // Try each model in order until one works
    let lastError = "";
    for (const model of FREE_MODELS) {
      try {
        const openRouterBody = {
          model,
          messages,
          max_tokens: body.max_tokens || 1000
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://3m-app.pages.dev",
            "X-Title": "3M App"
          },
          body: JSON.stringify(openRouterBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const rawText = await response.text();
        let data;
        try { data = JSON.parse(rawText); } catch(e) { continue; }

        if (data.error || !response.ok) {
          lastError = data.error?.message || "Unknown error";
          continue; // try next model
        }

        const text = data.choices?.[0]?.message?.content || "";
        if (!text) { continue; } // empty response, try next

        return new Response(JSON.stringify({
          content: [{ type: "text", text }],
          model: data.model || model,
          role: "assistant"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch(e) {
        lastError = e.message;
        continue;
      }
    }

    // All models failed
    return new Response(JSON.stringify({ error: lastError || "All models unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
      }
        
