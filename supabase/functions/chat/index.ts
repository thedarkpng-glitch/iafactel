import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const imageIntentRegex = /(cria|crie|gera|gere|faz|faça|manda|envia|mostra|mostre|exibe|exibir).{0,40}(imagem|foto|ilustração|desenho|arte|wallpaper|capa)|(^|\s)(imagem|foto)(\s|$)/i;

function shouldGenerateImage(messages: Array<{ role: string; content: string }>) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  return imageIntentRegex.test(lastUserMessage) && !/analisa|analise|explica|descreve|descreva|resuma|pdf|arquivo/i.test(lastUserMessage);
}

function sseTextResponse(content: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

const CHAT_TIMEOUT_MS = 120_000;
const TAGS_TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT = `Você é a IA Factel. Responda sempre em português BR.

Regras de estilo:
- Seja direto e curto. Nada de enrolação.
- Use linguagem casual, como se tivesse conversando com um amigo.
- Frases curtas. Parágrafos pequenos.
- Quando tiver código, use blocos de código com a linguagem certa.
- Use bullet points quando fizer sentido.
- Não faça introduções longas. Vai direto ao ponto.
- Não repita o que o usuário disse.
- Se perguntarem quem você é: "Sou a IA Factel."`;

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ModelInfo = { name: string; size: number; parameter_size?: string; family?: string };

async function listModels(base: string, headers: Record<string, string>):
  Promise<{ models: ModelInfo[] } | { error: string; status: number }> {
  try {
    const r = await fetch(`${base}/api/tags`, { headers, signal: AbortSignal.timeout(TAGS_TIMEOUT_MS) });
    if (r.status === 401 || r.status === 403) return { error: "O proxy do Ollama recusou o acesso (token).", status: 502 };
    if (!r.ok) return { error: `Ollama respondeu com erro ${r.status}.`, status: 502 };
    const data = await r.json();
    // deno-lint-ignore no-explicit-any
    const models = (data?.models ?? []).map((m: any) => ({
      name: String(m.name), size: Number(m.size) || 0,
      parameter_size: m.details?.parameter_size, family: m.details?.family,
    }));
    return { models };
  } catch (err) {
    const timeout = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("ollama tags error:", err);
    return timeout
      ? { error: "O Ollama não respondeu a tempo (timeout). Ele está ligado?", status: 504 }
      : { error: "Ollama desligado ou inacessível pelo servidor. Verifique OLLAMA_BASE_URL.", status: 503 };
  }
}

const MAX_MESSAGES = 50;
const MAX_CONTENT = 8000;

function sanitizeMessages(raw: unknown): Array<{ role: "user" | "assistant"; content: string }> | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    out.push({ role, content: content.slice(0, MAX_CONTENT) });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const messages = sanitizeMessages(body?.messages);
    if (!messages) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const OLLAMA_BASE_URL = (Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434").replace(/\/+$/, "");
    const OLLAMA_AUTH_TOKEN = Deno.env.get("OLLAMA_AUTH_TOKEN"); // opcional: protege o túnel/proxy
    const ollamaHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (OLLAMA_AUTH_TOKEN) ollamaHeaders.Authorization = `Bearer ${OLLAMA_AUTH_TOKEN}`;

    if (body?.action === "models") {
      const r = await listModels(OLLAMA_BASE_URL, ollamaHeaders);
      if ("error" in r) return jsonError(r.error, r.status);
      return new Response(JSON.stringify({ models: r.models }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Imagens: o Ollama não gera imagens, então continua no gateway (só se houver chave/créditos)
    if (shouldGenerateImage(messages)) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return sseTextResponse("Geração de imagem indisponível: o Ollama não gera imagens.");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image",
          messages: [
            { role: "system", content: "Você é a IA Factel. Quando o usuário pedir uma imagem, gere a imagem e responda com uma frase curtíssima em português." },
            ...messages,
          ],
          modalities: ["image", "text"],
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return jsonError("Muitas requisições. Espera um pouco.", 429);
        if (response.status === 402) return jsonError("Créditos de imagem acabaram (imagens não rodam no Ollama).", 402);
        console.error("AI image gateway error:", response.status, await response.text());
        return jsonError("Erro ao gerar imagem", 500);
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "Aqui está.";
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return sseTextResponse(imageUrl ? `${text}\n\n![Imagem gerada](${imageUrl})` : text);
    }

    const list = await listModels(OLLAMA_BASE_URL, ollamaHeaders);
    if ("error" in list) return jsonError(list.error, list.status);
    if (list.models.length === 0) return jsonError("Nenhum modelo instalado no Ollama. Rode: ollama pull llama3.2", 404);
    const requested = typeof body?.model === "string" ? body.model.slice(0, 200) : "";
    const fallback = Deno.env.get("OLLAMA_DEFAULT_MODEL") || "";
    const names = list.models.map((m) => m.name);
    let model = requested || fallback || names[0];
    if (!names.includes(model)) {
      if (requested) return jsonError(`Modelo "${requested}" não está instalado no Ollama.`, 404);
      model = names[0];
    }

    const ctrl = new AbortController();
    const firstByteTimer = setTimeout(() => ctrl.abort(), CHAT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: ollamaHeaders,
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          stream: true,
        }),
      });
    } catch (err) {
      clearTimeout(firstByteTimer);
      if (ctrl.signal.aborted) return jsonError("O Ollama demorou demais para responder (timeout).", 504);
      console.error("ollama connect error:", err);
      return jsonError("Não consegui conectar ao Ollama. Ele está ligado e acessível pelo servidor?", 503);
    }
    clearTimeout(firstByteTimer);

    if (!response.ok) {
      console.error("ollama error:", response.status, await response.text());
      if (response.status === 404) return jsonError(`Modelo "${model}" não encontrado no Ollama.`, 404);
      if (response.status === 401 || response.status === 403) return jsonError("O proxy do Ollama recusou o acesso (token).", 502);
      return jsonError("Erro no Ollama", 502);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
