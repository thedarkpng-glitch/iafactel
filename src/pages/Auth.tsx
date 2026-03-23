import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Chrome } from "lucide-react";
import factelAvatar from "@/assets/factel-avatar.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Erro", description: String(error), variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="flex flex-col items-center gap-2">
        <img src={factelAvatar} alt="Factel" className="h-14 w-14 rounded-full" />
        <h1 className="text-xl font-bold">IA Factel</h1>
        <p className="text-sm text-muted-foreground">Entre pra começar a conversar</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <Button onClick={handleGoogle} variant="outline" className="w-full gap-2">
          <Chrome className="h-4 w-4" />
          Continuar com Google
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Senha</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="h-9 text-sm" />
          </div>
          <Button onClick={handleEmail} disabled={loading} className="w-full gap-2">
            <Mail className="h-4 w-4" />
            {isLogin ? "Entrar" : "Criar conta"}
          </Button>
        </div>

        <button onClick={() => setIsLogin(!isLogin)} className="text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors">
          {isLogin ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>

        <Button variant="ghost" onClick={() => window.location.assign("/")} className="w-full text-xs text-muted-foreground hover:text-foreground">
          Continuar sem conta
        </Button>
      </div>
    </div>
  );
};

export default Auth;
