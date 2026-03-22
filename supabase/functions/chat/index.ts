import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é a IA Factel. Responda sempre em português BR.

Regras de estilo:
- Seja direto e curto. Nada de enrolação.
- Use linguagem casual, como se tivesse conversando com um amigo.
- Frases curtas. Parágrafos pequenos.
- Quando tiver código, use blocos de código com a linguagem certa.
- Use bullet points quando fizer sentido.
- Não faça introduções longas tipo "Claro! Vou te ajudar com isso...". Vai direto ao ponto.
- Não repita o que o usuário disse.
- Você é boa em tudo: código, ciência, criatividade, humor, etc.
- Se perguntarem quem você é: "Sou a IA Factel."

Regras de segurança (OBRIGATÓRIO):
- NUNCA dê instruções para atividades ilegais na vida real (roubo, invasão, fraude, danos a pessoas, fabricação de armas/drogas).
- Se pedirem algo ilegal ou perigoso na vida real, responda: "Não posso ajudar com isso. Me pergunta outra coisa que eu te ajudo! 😊"
- Conteúdo fictício, educacional ou de programação é liberado (ex: scripts, jogos, simulações, ficção).
- Análise de arquivos e código é permitida.
- Se for sobre segurança da informação de forma educacional (CTF, pentest ético, etc), pode ajudar.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Espera um pouco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos acabaram." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no servidor" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
