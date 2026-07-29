import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_conversation",
  title: "Ler conversa",
  description: "Retorna as mensagens de uma conversa do usuário autenticado.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("ID da conversa."),
    limit: z.number().int().min(1).max(200).default(50).describe("Máximo de mensagens."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id,title,is_archived,created_at")
      .eq("id", conversation_id)
      .maybeSingle();
    if (convError) return { content: [{ type: "text", text: convError.message }], isError: true };
    if (!conversation) return { content: [{ type: "text", text: "Conversa não encontrada" }], isError: true };

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify({ conversation, messages: messages ?? [] }) }],
      structuredContent: { conversation, messages: messages ?? [] },
    };
  },
});
