import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Copy, Check, Plus, ThumbsUp, ThumbsDown, Settings, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { streamChat, type Msg } from "@/lib/chat-stream";
import factelAvatar from "@/assets/factel-avatar.png";

const THEME_PRESETS = [
  { name: "Cyber", bg: "240 10% 6%", card: "240 8% 10%", muted: "240 6% 16%", primary: "165 80% 50%", border: "240 6% 18%" },
  { name: "Midnight", bg: "222 47% 6%", card: "222 47% 9%", muted: "222 30% 15%", primary: "210 100% 60%", border: "222 30% 15%" },
  { name: "Roxo", bg: "270 20% 6%", card: "270 15% 10%", muted: "270 10% 16%", primary: "270 80% 65%", border: "270 10% 18%" },
  { name: "Verde", bg: "150 15% 5%", card: "150 10% 9%", muted: "150 8% 15%", primary: "140 70% 45%", border: "150 8% 17%" },
  { name: "Vermelho", bg: "0 15% 6%", card: "0 10% 10%", muted: "0 8% 16%", primary: "0 75% 55%", border: "0 8% 18%" },
  { name: "Laranja", bg: "25 15% 6%", card: "25 10% 10%", muted: "25 8% 16%", primary: "25 90% 55%", border: "25 8% 18%" },
];

type UserPrefs = { username: string; themeIndex: number };

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem("factel-prefs");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { username: "", themeIndex: 0 };
}

function savePrefs(p: UserPrefs) {
  localStorage.setItem("factel-prefs", JSON.stringify(p));
}

function applyTheme(idx: number) {
  const t = THEME_PRESETS[idx] || THEME_PRESETS[0];
  const r = document.documentElement.style;
  r.setProperty("--background", t.bg);
  r.setProperty("--card", t.card);
  r.setProperty("--card-foreground", "220 15% 90%");
  r.setProperty("--muted", t.muted);
  r.setProperty("--primary", t.primary);
  r.setProperty("--border", t.border);
  r.setProperty("--input", t.border);
  r.setProperty("--ring", t.primary);
}

const CopyBtn = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="p-1 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground transition-colors"
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

const CodeBlock = ({ children, lang }: { children: string; lang: string }) => (
  <div className="my-3 rounded-lg overflow-hidden border border-border bg-[hsl(var(--muted)/0.3)]">
    <div className="flex items-center justify-between px-3 py-1.5 bg-[hsl(var(--muted)/0.5)] border-b border-border">
      <span className="text-xs text-muted-foreground">{lang || "code"}</span>
      <CopyBtn text={children} />
    </div>
    <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed"><code>{children}</code></pre>
  </div>
);

const MsgActions = ({ content }: { content: string }) => (
  <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
    <CopyBtn text={content} />
    <button className="p-1 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground transition-colors"><ThumbsUp className="h-3.5 w-3.5" /></button>
    <button className="p-1 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground transition-colors"><ThumbsDown className="h-3.5 w-3.5" /></button>
  </div>
);

const SettingsPanel = ({ prefs, onSave, onClose }: { prefs: UserPrefs; onSave: (p: UserPrefs) => void; onClose: () => void }) => {
  const [username, setUsername] = useState(prefs.username);
  const [themeIdx, setThemeIdx] = useState(prefs.themeIndex);

  useEffect(() => { applyTheme(themeIdx); }, [themeIdx]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Personalização</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Seu nome</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Como quer ser chamado?" className="h-9 text-sm" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_PRESETS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setThemeIdx(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                  i === themeIdx ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: `hsl(${t.primary})` }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-9 text-sm"
          onClick={() => { onSave({ username, themeIndex: themeIdx }); onClose(); }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
};

const Index = () => {
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => { applyTheme(prefs.themeIndex); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleSavePrefs = (p: UserPrefs) => {
    setPrefs(p);
    savePrefs(p);
    applyTheme(p.themeIndex);
  };

  const send = async () => {
    const t = input.trim();
    if (!t || isLoading) return;
    const userMsg: Msg = { role: "user", content: t };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsLoading(true);

    let buf = "";
    const update = (chunk: string) => {
      buf += chunk;
      setMessages((p) => {
        const last = p[p.length - 1];
        if (last?.role === "assistant") return p.map((m, i) => (i === p.length - 1 ? { ...m, content: buf } : m));
        return [...p, { role: "assistant", content: buf }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: update,
        onDone: () => setIsLoading(false),
        onError: (e) => { setIsLoading(false); toast({ title: "Erro", description: e, variant: "destructive" }); },
      });
    } catch {
      setIsLoading(false);
      toast({ title: "Erro", description: "Falha na conexão.", variant: "destructive" });
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const initials = prefs.username ? prefs.username.slice(0, 2).toUpperCase() : "";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
        <span className="text-sm font-semibold">IA Factel</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-xs text-muted-foreground gap-1 h-7">
            <Plus className="h-3 w-3" /> Novo
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="h-7 w-7 text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-2">
              <Avatar className="h-10 w-10 mb-1">
                <AvatarImage src={factelAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">F</AvatarFallback>
              </Avatar>
              <p className="text-base font-medium">
                {prefs.username ? `E aí, ${prefs.username}! No que posso ajudar?` : "No que posso ajudar?"}
              </p>
              <div className="flex gap-2 flex-wrap justify-center mt-3">
                {["Faz um script em Python", "Explica isso pra mim", "Me dá uma ideia de projeto"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`group ${msg.role === "user" ? "flex justify-end" : "flex gap-2.5"}`}>
                  {msg.role === "assistant" && (
                    <Avatar className="h-6 w-6 mt-1 shrink-0">
                      <AvatarImage src={factelAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">F</AvatarFallback>
                    </Avatar>
                  )}
                  {msg.role === "user" ? (
                    <div className="flex items-start gap-2 flex-row-reverse">
                      {initials && (
                        <div className="h-6 w-6 mt-1 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-primary">{initials}</span>
                        </div>
                      )}
                      <div className="bg-muted rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[75%] text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-[1.7] prose prose-invert prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0 prose-code:text-primary prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const match = className?.match(/language-(\w+)/);
                              if (match) return <CodeBlock lang={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>;
                              return <code className="px-1 py-0.5 rounded bg-muted text-[13px]" {...props}>{children}</code>;
                            },
                            pre: ({ children }) => <>{children}</>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {isLoading && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded-sm ml-0.5 align-middle" />
                        )}
                      </div>
                      {!(isLoading && i === messages.length - 1) && <MsgActions content={msg.content} />}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="max-w-2xl mx-auto relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Manda a pergunta..."
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <Button onClick={send} disabled={!input.trim() || isLoading} size="icon" className="absolute right-2 bottom-2 h-7 w-7 rounded-lg">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showSettings && <SettingsPanel prefs={prefs} onSave={handleSavePrefs} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default Index;
