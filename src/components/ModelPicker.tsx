import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOllamaModels, getSelectedModel, setSelectedModel, type OllamaModel } from "@/lib/chat-stream";

export default function ModelPicker() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState(getSelectedModel());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await listOllamaModels();
    setLoading(false);
    if ("error" in r) { setError(r.error); setModels([]); return; }
    setError(null);
    setModels(r.models);
    if (r.models.length && !r.models.some((m) => m.name === model)) {
      setModel(r.models[0].name);
      setSelectedModel(r.models[0].name);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex items-center gap-1">
      {error ? (
        <span className="text-[11px] text-destructive max-w-[220px] truncate" title={error}>{error}</span>
      ) : models.length === 0 && !loading ? (
        <span className="text-[11px] text-muted-foreground">Nenhum modelo no Ollama</span>
      ) : (
        <Select value={model} onValueChange={(v) => { setModel(v); setSelectedModel(v); }}>
          <SelectTrigger className="h-7 text-xs w-[170px]"><SelectValue placeholder="Modelo" /></SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.name} value={m.name} className="text-xs">
                {m.name}{m.parameter_size ? ` · ${m.parameter_size}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7 text-muted-foreground" title="Atualizar modelos">
        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
