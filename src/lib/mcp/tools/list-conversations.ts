import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_conversations",
  title: "Listar conversas",
  description: "Lista as conversas do usuário autenticado na IA Factel.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de conversas."),
    include_archived: z.boolean().default(false).describe("Incluir conversas arquivadas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, include_archived }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("conversations")
      .select("id,title,is_archived,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (!include_archived) query = query.eq("is_archived", false);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { conversations: data ?? [] },
    };
  },
});
