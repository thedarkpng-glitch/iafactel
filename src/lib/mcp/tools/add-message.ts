import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_message",
  title: "Adicionar mensagem",
  description: "Adiciona uma mensagem a uma conversa existente do usuário autenticado.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("ID da conversa."),
    role: z.enum(["user", "assistant"]).describe("Autor da mensagem."),
    content: z.string().trim().min(1).max(8000).describe("Conteúdo da mensagem."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ conversation_id, role, content }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("messages")
      .insert({ conversation_id, role, content })
      .select("id,role,content,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { message: data },
    };
  },
});
