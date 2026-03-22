import { useState, useEffect } from "react";
import { X, Camera, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const THEME_PRESETS = [
  { name: "Cyber", bg: "240 10% 6%", primary: "165 80% 50%" },
  { name: "Midnight", bg: "222 47% 6%", primary: "210 100% 60%" },
  { name: "Roxo", bg: "270 20% 6%", primary: "270 80% 65%" },
  { name: "Verde", bg: "150 15% 5%", primary: "140 70% 45%" },
  { name: "Vermelho", bg: "0 15% 6%", primary: "0 75% 55%" },
  { name: "Laranja", bg: "25 15% 6%", primary: "25 90% 55%" },
  { name: "Rosa", bg: "330 15% 6%", primary: "330 80% 60%" },
  { name: "Azul", bg: "210 20% 6%", primary: "200 80% 55%" },
];

// Username validation: no spaces, no special badges, 3-20 chars, alphanumeric + underscore
function validateUsername(val: string): string | null {
  if (val.length < 3) return "Mínimo 3 caracteres";
  if (val.length > 20) return "Máximo 20 caracteres";
  if (/\s/.test(val)) return "Sem espaços!";
  if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Só letras, números e _";
  const banned = ["admin", "moderador", "criador", "creator", "mod", "staff", "owner", "dono", "fundador"];
  if (banned.some(b => val.toLowerCase().includes(b))) return "Nome reservado";
  return null;
}

export function applyTheme(idx: number, customBg?: string | null, customPrimary?: string | null) {
  const t = THEME_PRESETS[idx] || THEME_PRESETS[0];
  const r = document.documentElement.style;
  const bg = customBg || t.bg;
  const primary = customPrimary || t.primary;
  const hue = bg.split(" ")[0];
  r.setProperty("--background", bg);
  r.setProperty("--card", `${hue} 8% 10%`);
  r.setProperty("--muted", `${hue} 6% 16%`);
  r.setProperty("--primary", primary);
  r.setProperty("--border", `${hue} 6% 18%`);
  r.setProperty("--input", `${hue} 6% 18%`);
  r.setProperty("--ring", primary);
}

type Props = {
  open: boolean;
  onClose: () => void;
};

const SettingsPanel = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [customBg, setCustomBg] = useState("");
  const [customPrimary, setCustomPrimary] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setUsername(data.username || "");
        setThemeIdx(data.theme_index || 0);
        setCustomBg(data.custom_bg_color || "");
        setCustomPrimary(data.custom_primary_color || "");
        setAvatarUrl(data.avatar_url);
        applyTheme(data.theme_index || 0, data.custom_bg_color, data.custom_primary_color);
      }
    });
  }, [user]);

  useEffect(() => {
    if (open) applyTheme(themeIdx, customBg || null, customPrimary || null);
  }, [themeIdx, customBg, customPrimary, open]);

  const handleUsernameChange = (val: string) => {
    const clean = val.replace(/\s/g, ""); // strip spaces immediately
    setUsername(clean);
    setUsernameError(clean ? validateUsername(clean) : null);
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(publicUrl + "?t=" + Date.now());
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    if (username) {
      const err = validateUsername(username);
      if (err) { setUsernameError(err); toast({ title: err, variant: "destructive" }); return; }
    }
    const { error } = await supabase.from("profiles").update({
      username,
      theme_index: themeIdx,
      custom_bg_color: customBg || null,
      custom_primary_color: customPrimary || null,
      avatar_url: avatarUrl,
    }).eq("user_id", user.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Salvo!" }); onClose(); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Personalização</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer">
              <Camera className="h-3 w-3 text-primary-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Seu nome</Label>
            <Input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="username"
              className={`h-8 text-sm ${usernameError ? "border-destructive" : ""}`}
            />
            {usernameError && <p className="text-[10px] text-destructive mt-0.5">{usernameError}</p>}
          </div>
        </div>

        {/* Theme presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tema</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {THEME_PRESETS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => { setThemeIdx(i); setCustomBg(""); setCustomPrimary(""); }}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] transition-all ${
                  i === themeIdx && !customBg ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: `hsl(${t.primary})` }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom colors */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Cor personalizada</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Fundo</Label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={customBg ? hslToHex(customBg) : hslToHex(THEME_PRESETS[themeIdx].bg)}
                  onChange={(e) => setCustomBg(hexToHsl(e.target.value))}
                  className="h-8 w-8 rounded cursor-pointer border border-border bg-transparent"
                />
                <span className="text-[10px] text-muted-foreground">{customBg ? "Custom" : "Padrão"}</span>
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Destaque</Label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={customPrimary ? hslToHex(customPrimary) : hslToHex(THEME_PRESETS[themeIdx].primary)}
                  onChange={(e) => setCustomPrimary(hexToHsl(e.target.value))}
                  className="h-8 w-8 rounded cursor-pointer border border-border bg-transparent"
                />
                <span className="text-[10px] text-muted-foreground">{customPrimary ? "Custom" : "Padrão"}</span>
              </div>
            </div>
          </div>
          {(customBg || customPrimary) && (
            <button onClick={() => { setCustomBg(""); setCustomPrimary(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">
              Resetar cores
            </button>
          )}
        </div>

        <Button onClick={save} className="w-full h-9 text-sm">Salvar</Button>
      </div>
    </div>
  );
};

function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/%/g, "").split(" ").map(Number);
  if (parts.length < 3) return "#000000";
  const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export { THEME_PRESETS };
export default SettingsPanel;
