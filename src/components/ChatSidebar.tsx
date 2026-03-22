import { useState, useEffect, useRef } from "react";
import { MessageSquare, Plus, X, MoreHorizontal, Trash2, Pencil, Archive, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
  is_archived: boolean;
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
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at, is_archived")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  useEffect(() => { load(); }, [user, currentId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const deleteConv = async (id: string) => {
    setMenuOpen(null);
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    if (currentId === id) onNew();
    load();
  };

  const startRename = (c: Conversation) => {
    setMenuOpen(null);
    setRenaming(c.id);
    setRenameValue(c.title);
  };

  const confirmRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    await supabase.from("conversations").update({ title: renameValue.trim() }).eq("id", renaming);
    setRenaming(null);
    load();
  };

  const toggleArchive = async (c: Conversation) => {
    setMenuOpen(null);
    await supabase.from("conversations").update({ is_archived: !c.is_archived }).eq("id", c.id);
    load();
  };

  const active = conversations.filter(c => !c.is_archived);
  const archived = conversations.filter(c => c.is_archived);
  const displayed = showArchived ? archived : active;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggle} />}

      <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}>
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setShowArchived(false)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${!showArchived ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Chats ({active.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${showArchived ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Star className="h-3 w-3" /> Arquivados ({archived.length})
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {displayed.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {showArchived ? "Nenhum chat arquivado" : "Nenhuma conversa ainda"}
            </p>
          ) : (
            displayed.map((c) => (
              <div key={c.id} className="relative group">
                {renaming === c.id ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenaming(null); }}
                      autoFocus
                      className="h-7 text-xs"
                    />
                    <Button size="icon" className="h-7 w-7 shrink-0" onClick={confirmRename}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { onSelect(c.id); if (window.innerWidth < 1024) onToggle(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      c.id === currentId ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground transition-all"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </button>
                )}

                {/* Context menu */}
                {menuOpen === c.id && (
                  <div ref={menuRef} className="absolute right-2 top-9 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                    <button
                      onClick={() => startRename(c)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Renomear
                    </button>
                    <button
                      onClick={() => toggleArchive(c)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <Archive className="h-3 w-3" /> {c.is_archived ? "Desarquivar" : "Arquivar"}
                    </button>
                    <button
                      onClick={() => deleteConv(c.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;
