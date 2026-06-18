import { useState, useEffect } from "react";
import { X, Camera, RotateCcw, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onBotUpdated: () => void;
};

type UserInfo = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

const AdminPanel = ({ open, onClose, onBotUpdated }: Props) => {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"bot" | "users">("bot");
  const [botName, setBotName] = useState("IA Factel");
  const [botAvatarUrl, setBotAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);

  useEffect(() => {
    if (!open) return;
    setChecking(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      setChecking(false);
      if (admin) { loadBot(); loadUsers(); }
    })();
  }, [open]);

  const loadBot = async () => {
    const { data } = await supabase.from("bot_settings").select("*").limit(1).single();
    if (data) {
      setBotName(data.bot_name);
      setBotAvatarUrl(data.bot_avatar_url);
    }
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, username, avatar_url, created_at").order("created_at", { ascending: false });
    if (data) setUsers(data);
  };

  const uploadBotAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const path = `bot/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setBotAvatarUrl(publicUrl + "?t=" + Date.now());
    setUploading(false);
  };

  const save = async () => {
    const { error } = await supabase.from("bot_settings").update({
      bot_name: botName,
      bot_avatar_url: botAvatarUrl,
    }).not("id", "is", null);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Bot atualizado!" }); onBotUpdated(); }
  };

  const resetBot = async () => {
    const { error } = await supabase.from("bot_settings").update({
      bot_name: "IA Factel",
      bot_avatar_url: null,
    }).not("id", "is", null);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setBotName("IA Factel");
      setBotAvatarUrl(null);
      toast({ title: "Bot resetado! Recarregando..." });
      onBotUpdated();
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">🔒 Painel Admin</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {checking ? (
          <p className="text-xs text-muted-foreground">Verificando permissões...</p>
        ) : !isAdmin ? (
          <div className="space-y-2">
            <p className="text-sm">Você não tem permissão de administrador.</p>
            <p className="text-xs text-muted-foreground">Peça a um admin para conceder a role <code>admin</code> na tabela <code>user_roles</code> para o seu usuário.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex border-b border-border">
              <button onClick={() => setTab("bot")} className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === "bot" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>
                🤖 Bot
              </button>
              <button onClick={() => setTab("users")} className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${tab === "users" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>
                <Users className="h-3 w-3" /> Usuários
              </button>
            </div>

            {tab === "bot" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {botAvatarUrl ? (
                        <img src={botAvatarUrl} alt="Bot" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer">
                      <Camera className="h-3 w-3 text-primary-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={uploadBotAvatar} disabled={uploading} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Nome do bot</Label>
                    <Input value={botName} onChange={(e) => setBotName(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={save} className="flex-1 h-9 text-sm">Salvar</Button>
                  <Button onClick={resetBot} variant="destructive" className="h-9 text-sm gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                </div>

                <div className="border-t border-border pt-3">
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm gap-1"
                    onClick={() => { toast({ title: "Recarregando..." }); setTimeout(() => window.location.reload(), 500); }}
                  >
                    <RefreshCw className="h-3 w-3" /> Recarregar site
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{users.length} usuário(s) registrado(s)</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadUsers}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                      <div className="h-7 w-7 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-primary">{(u.username || "?").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.username || "Sem nome"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
