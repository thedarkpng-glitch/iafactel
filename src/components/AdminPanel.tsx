import { useState, useEffect } from "react";
import { X, Camera, RotateCcw, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "factel2025admin";

type Props = {
  open: boolean;
  onClose: () => void;
  onBotUpdated: () => void;
};

const AdminPanel = ({ open, onClose, onBotUpdated }: Props) => {
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [botName, setBotName] = useState("IA Factel");
  const [botAvatarUrl, setBotAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && authenticated) loadBot();
  }, [open, authenticated]);

  const loadBot = async () => {
    const { data } = await supabase.from("bot_settings").select("*").limit(1).single();
    if (data) {
      setBotName(data.bot_name);
      setBotAvatarUrl(data.bot_avatar_url);
    }
  };

  const tryAuth = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPassword("");
    } else {
      toast({ title: "Senha incorreta", variant: "destructive" });
    }
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
    }).not("id", "is", null); // update all rows (there's only 1)

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Bot atualizado!" }); onBotUpdated(); onClose(); }
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
      toast({ title: "Bot resetado!" });
      onBotUpdated();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { onClose(); setAuthenticated(false); }}>
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">🔒 Admin</h2>
          <button onClick={() => { onClose(); setAuthenticated(false); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {!authenticated ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Digite a senha de admin</p>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryAuth()}
              placeholder="Senha..."
              className="h-9 text-sm"
            />
            <Button onClick={tryAuth} className="w-full h-9 text-sm">Entrar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bot avatar */}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
