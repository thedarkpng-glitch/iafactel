import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { streamChat, type Msg } from "@/lib/chat-stream";
import factelAvatar from "@/assets/factel-avatar.png";

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Msg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
        onError: (error) => {
          setIsLoading(false);
          toast({ title: "Erro", description: error, variant: "destructive" });
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast({ title: "Erro", description: "Falha na conexão com a IA.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="relative pulse-ring">
          <Avatar className="h-10 w-10 ring-2 ring-primary/50">
            <AvatarImage src={factelAvatar} alt="IA Factel" />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">F</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 ml-2">
          <h1 className="text-lg font-bold text-glow" style={{ color: "hsl(var(--primary))" }}>
            IA Factel
          </h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Pensando..." : "Online • Sem restrições"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={clearChat} className="text-muted-foreground hover:text-accent">
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="relative">
              <Avatar className="h-24 w-24 glow-primary ring-2 ring-primary/30">
                <AvatarImage src={factelAvatar} alt="IA Factel" />
                <AvatarFallback className="bg-primary/20 text-primary text-3xl font-bold">F</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-glow" style={{ color: "hsl(var(--primary))" }}>
                Olá! Eu sou a IA Factel
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                A IA mais avançada e sem restrições. Pergunte qualquer coisa — programação, ciência, criatividade, e muito mais.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-4">
              {["Escreva um código em Python", "Me conte uma piada", "Explique buracos negros"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                >
                  <Sparkles className="h-3 w-3 inline mr-1" style={{ color: "hsl(var(--primary))" }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-primary/30">
                <AvatarImage src={factelAvatar} alt="IA Factel" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">F</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-primary">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {isLoading && i === messages.length - 1 && <span className="cursor-blink" />}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte qualquer coisa..."
            className="min-h-[44px] max-h-[160px] resize-none bg-muted/50 border-border focus-visible:ring-primary"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 shrink-0 glow-primary"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          IA Factel • Sem restrições • Powered by advanced AI
        </p>
      </div>
    </div>
  );
};

export default Index;
