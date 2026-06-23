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

    // Build messages array, prepending system prompt if present
    const messages = [];
    if (body.system) {
      messages.push({ role: "system", content: body.system });
    }
    if (body.messages) {
      messages.push(...body.messages);
    }

    const openRouterBody = {
      model: "poolside/laguna-xs.2:free",
      messages,
      max_tokens: body.max_tokens || 1000
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://3m-app.pages.dev",
        "X-Title": "3M App"
      },
      body: JSON.stringify(openRouterBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "OpenRouter error" }), {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Convert OpenRouter (OpenAI-style) response to Anthropic-style format
    const text = data.choices?.[0]?.message?.content || "";
    const anthropicStyle = {
      content: [{ type: "text", text }],
      model: data.model || "openrouter",
      role: "assistant"
    };

    return new Response(JSON.stringify(anthropicStyle), {
      status: 200,
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
  
