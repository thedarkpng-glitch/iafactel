import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Copy, Check, Plus, ThumbsUp, ThumbsDown, Settings, Shield, LogOut, Menu, Mic, MicOff, Paperclip, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type Msg } from "@/lib/chat-stream";
import SettingsPanel, { applyTheme } from "@/components/SettingsPanel";
import AdminPanel from "@/components/AdminPanel";
import ChatSidebar from "@/components/ChatSidebar";
import factelAvatar from "@/assets/factel-avatar.png";

const SUGGESTIONS = [
  "Faz um script em Python",
  "Explica isso pra mim",
  "Me dá uma ideia de projeto",
  "Cria uma landing page",
  "Faz uma função JavaScript",
  "Explica como funciona API",
  "Me ajuda com CSS",
  "Escreve um texto criativo",
];

const CopyBtn = ({ text }: { text: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }} className="p-1 rounded hover:bg-[hsl(var(--muted))] text-muted-foreground hover:text-foreground transition-colors">
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

// Rotating suggestions
function getRandomSuggestions(n: number) {
  const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const Index = () => {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username: string | null; avatar_url: string | null }>({ username: null, avatar_url: null });
  const [botSettings, setBotSettings] = useState<{ bot_name: string; bot_avatar_url: string | null }>({ bot_name: "IA Factel", bot_avatar_url: null });
  const [isListening, setIsListening] = useState(false);
  const [suggestions] = useState(() => getRandomSuggestions(4));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) {
      setProfile({ username: data.username, avatar_url: data.avatar_url });
      applyTheme(data.theme_index || 0, data.custom_bg_color, data.custom_primary_color);
    }
  };

  const loadBotSettings = async () => {
    const { data } = await supabase.from("bot_settings").select("*").limit(1).single();
    if (data) setBotSettings({ bot_name: data.bot_name, bot_avatar_url: data.bot_avatar_url });
  };

  const loadConversation = useCallback(async (id: string) => {
    setConversationId(id);
    const { data } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Msg[]);
  }, []);

  const newChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => { loadProfile(); loadBotSettings(); }, [user]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Speech-to-text
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Navegador não suporta reconhecimento de voz", variant: "destructive" });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => { setIsListening(false); };
    recognition.onend = () => { setIsListening(false); };

    recognition.start();
    setIsListening(true);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const msg = `[Imagem enviada: ${file.name}]\n\n![imagem](${base64})`;
        setInput(msg);
      };
      reader.readAsDataURL(file);
    } else {
      // For text/code files, read as text
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
        return;
      }
      const text = await file.text();
      const truncated = text.slice(0, 8000);
      setInput(`Analise este arquivo "${file.name}":\n\n\`\`\`\n${truncated}\n\`\`\``);
    }
    e.target.value = "";
  };

  const botAvatar = botSettings.bot_avatar_url || factelAvatar;

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("messages").insert({ conversation_id: convId, role, content });
  };

  const send = async () => {
    const t = input.trim();
    if (!t || isLoading || !user) return;
    
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: Msg = { role: "user", content: t };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsLoading(true);

    let convId = conversationId;
    if (!convId) {
      const title = t.length > 40 ? t.slice(0, 40) + "..." : t;
      const { data } = await supabase.from("conversations").insert({ user_id: user.id, title }).select("id").single();
      if (data) { convId = data.id; setConversationId(data.id); }
      else { setIsLoading(false); return; }
    }

    await saveMessage(convId, "user", t);

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
        onDone: async () => {
          setIsLoading(false);
          if (buf && convId) {
            await saveMessage(convId, "assistant", buf);
            await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          }
        },
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

  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex h-screen">
      <ChatSidebar
        currentId={conversationId}
        onSelect={loadConversation}
        onNew={newChat}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-7 w-7 text-muted-foreground lg:hidden">
              <Menu className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{botSettings.bot_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={newChat} className="text-xs text-muted-foreground gap-1 h-7">
              <Plus className="h-3 w-3" /> Novo
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="h-7 w-7 text-muted-foreground" title="Personalizar">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAdmin(true)} className="h-7 w-7 text-muted-foreground" title="Admin">
              <Shield className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 text-muted-foreground" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-2">
                <img src={botAvatar} alt="Bot" className="h-10 w-10 rounded-full object-cover" />
                <p className="text-base font-medium">
                  {profile.username ? `E aí, ${profile.username}!` : "No que posso ajudar?"}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-md">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} className="px-3 py-2.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-left">
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
                      <img src={botAvatar} alt="Bot" className="h-6 w-6 mt-1 shrink-0 rounded-full object-cover" />
                    )}
                    {msg.role === "user" ? (
                      <div className="flex items-start gap-2 flex-row-reverse">
                        <div className="h-6 w-6 mt-1 shrink-0 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-semibold text-primary">{initials}</span>
                          )}
                        </div>
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
                              img: ({ src, alt }) => (
                                <img src={src} alt={alt || ""} className="max-w-full rounded-lg my-2" />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {isLoading && i === messages.length - 1 && msg.content && (
                            <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded-sm ml-0.5 align-middle" />
                          )}
                        </div>
                        {!(isLoading && i === messages.length - 1) && <MsgActions content={msg.content} />}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === "user") && (
                  <div className="flex gap-2.5">
                    <img src={botAvatar} alt="Bot" className="h-6 w-6 mt-1 shrink-0 rounded-full object-cover" />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>Digitando</span>
                      <span className="typing-dots"><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
                    </div>
                  </div>
                )}
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
              className="w-full resize-none rounded-xl border border-border bg-muted/30 pl-11 pr-20 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {/* Left: file attach */}
            <div className="absolute left-2 bottom-2 flex items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Enviar arquivo"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.py,.js,.ts,.json,.csv,.md,.html,.css,.exe,.zip"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {/* Right: mic + send */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                onClick={toggleListening}
                className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors ${
                  isListening ? "bg-destructive text-destructive-foreground animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={isListening ? "Parar de ouvir" : "Ditar"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <Button onClick={send} disabled={!input.trim() || isLoading} size="icon" className="h-7 w-7 rounded-lg">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <SettingsPanel open={showSettings} onClose={() => { setShowSettings(false); loadProfile(); }} />
        <AdminPanel open={showAdmin} onClose={() => setShowAdmin(false)} onBotUpdated={loadBotSettings} />
      </div>
    </div>
  );
};

export default Index;
