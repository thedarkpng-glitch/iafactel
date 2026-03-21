import { useState, useEffect } from "react";
import { MessageSquare, Plus, Trash2, X, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

type Props = {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  open: boolean;
  onToggle: () => void;
};

const ChatSidebar = ({ currentId, onSelect, onNew, open, onToggle }: Props) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  useEffect(() => { load(); }, [user, currentId]);

  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversations").delete().eq("id", id);
    if (currentId === id) onNew();
    load();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggle} />}

      <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seus chats</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onNew} className="h-7 w-7 text-muted-foreground" title="Novo chat">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 text-muted-foreground lg:hidden">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); if (window.innerWidth < 1024) onToggle(); }}
                className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  c.id === currentId ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => deleteConv(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;
