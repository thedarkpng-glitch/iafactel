import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConversations from "./tools/list-conversations";
import getConversation from "./tools/get-conversation";
import createConversation from "./tools/create-conversation";
import addMessage from "./tools/add-message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "factel-the-all-knowing-ai",
  title: "Factel: The All-Knowing AI",
  version: "0.1.0",
  instructions:
    "Ferramentas da IA Factel. Liste conversas do usuário, leia mensagens, crie novas conversas e adicione mensagens. Tudo age como o usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listConversations, getConversation, createConversation, addMessage],
});
