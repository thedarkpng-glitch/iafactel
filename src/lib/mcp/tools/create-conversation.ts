import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_conversation",
  title: "Criar conversa",
  description: "Cria uma nova conversa para o usuário autenticado.",
  inputSchema: {
    title: z.string().trim().min(1).max(120).describe("Título da conversa."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("conversations")
      .insert({ user_id: ctx.getUserId()!, title })
      .select("id,title,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { conversation: data },
    };
  },
});
