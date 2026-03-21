import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Copy, Check, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { streamChat, type Msg } from "@/lib/chat-stream";
import factelAvatar from "@/assets/factel-avatar.png";

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

const CodeBlock = ({ children, className }: { children: string; className?: string }) => {
  const lang = className?.replace("language-", "") || "";
  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/60 border-b border-border text-xs text-muted-foreground">
          {lang}
        </div>
      )}
      <CopyButton text={children} />
      <pre className="!bg-muted/30 !m-0 !rounded-none p-4 overflow-x-auto text-sm">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

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
        onError: (err) => {
          setIsLoading(false);
          toast({ title: "Erro", description: err, variant: "destructive" });
        },
      });
    } catch {
      setIsLoading(false);
      toast({ title: "Erro", description: "Falha na conexão.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const newChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar - minimal */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={factelAvatar} alt="Factel" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">F</AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">IA Factel</span>
        </div>
        <Button variant="ghost" size="sm" onClick={newChat} className="text-muted-foreground text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Novo chat
        </Button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] gap-3">
              <Avatar className="h-14 w-14 mb-2">
                <AvatarImage src={factelAvatar} alt="Factel" />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">F</AvatarFallback>
              </Avatar>
              <p className="text-lg font-medium">No que posso te ajudar?</p>
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {["Escreva um código Python", "Me explica quantum computing", "Cria uma história"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-3 py-2 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                      <AvatarImage src={factelAvatar} alt="Factel" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">F</AvatarFallback>
                    </Avatar>
                  )}
                  {msg.role === "user" ? (
                    <div className="bg-muted rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 text-sm leading-relaxed">
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-4 prose-headings:mb-2 prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0 prose-code:text-primary prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }) {
                              const isBlock = className?.startsWith("language-");
                              if (isBlock) {
                                return <CodeBlock className={className}>{String(children).replace(/\n$/, "")}</CodeBlock>;
                              }
                              return <code className="px-1 py-0.5 rounded bg-muted text-xs" {...props}>{children}</code>;
                            },
                            pre({ children }) {
                              return <>{children}</>;
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {isLoading && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 rounded-sm" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-background p-3">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Manda a pergunta..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-muted/40 px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
