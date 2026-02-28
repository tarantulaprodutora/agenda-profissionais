import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface BlockModalProps {
  open: boolean;
  onClose: () => void;
  editingBlock?: any;
  defaultData?: { professionalId: number; startTime: string; endTime: string } | null;
  professionals: Array<{ id: number; name: string; color?: string | null }>;
  activityTypes: Array<{ id: number; name: string; color: string }>;
  selectedDate: string;
  onSuccess: () => void;
}

const SNAP = 30;
const HOUR_START = 7;
const HOUR_END = 23;

function generateTimeOptions() {
  const opts: string[] = [];
  for (let min = HOUR_START * 60; min <= HOUR_END * 60; min += SNAP) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return opts;
}

const TIME_OPTIONS = generateTimeOptions();

function formatHours(min: number) {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function BlockModal({
  open,
  onClose,
  editingBlock,
  defaultData,
  professionals,
  activityTypes,
  selectedDate,
  onSuccess,
}: BlockModalProps) {
  const isEditing = !!editingBlock;

  const [professionalId, setProfessionalId] = useState<string>("");
  const [activityTypeId, setActivityTypeId] = useState<string>("");
  const [requesterId, setRequesterId] = useState<string>("");
  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");

  // Inline add requester
  const [addingRequester, setAddingRequester] = useState(false);
  const [newRequesterName, setNewRequesterName] = useState("");

  const utils = trpc.useUtils();
  const { data: requesters = [] } = trpc.requesters.list.useQuery();

  const createRequester = trpc.requesters.create.useMutation({
    onSuccess: () => {
      utils.requesters.list.invalidate();
      setNewRequesterName("");
      setAddingRequester(false);
      toast.success("Solicitante adicionado");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open) return;
    if (editingBlock) {
      setProfessionalId(String(editingBlock.professionalId));
      setActivityTypeId(editingBlock.activityTypeId ? String(editingBlock.activityTypeId) : "");
      setRequesterId(editingBlock.requesterId ? String(editingBlock.requesterId) : "");
      setJobNumber(editingBlock.jobNumber ?? "");
      setJobName(editingBlock.jobName ?? "");
      setStartTime(editingBlock.startTime);
      setEndTime(editingBlock.endTime);
      setDescription(editingBlock.description ?? "");
    } else if (defaultData) {
      setProfessionalId(String(defaultData.professionalId));
      setStartTime(defaultData.startTime);
      setEndTime(defaultData.endTime);
      setActivityTypeId("");
      setRequesterId("");
      setJobNumber("");
      setJobName("");
      setDescription("");
    } else {
      setProfessionalId(professionals[0] ? String(professionals[0].id) : "");
      setStartTime("09:00");
      setEndTime("10:00");
      setActivityTypeId("");
      setRequesterId("");
      setJobNumber("");
      setJobName("");
      setDescription("");
    }
    setAddingRequester(false);
    setNewRequesterName("");
  }, [editingBlock, defaultData, open]);

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(startTime);
  const endMin = toMin(endTime);
  const totalMin = endMin > startMin ? endMin - startMin : 0;

  const OT1_START = 7 * 60, OT1_END = 10 * 60;
  const OT2_START = 19 * 60, OT2_END = 23 * 60;
  const ot1 = Math.max(0, Math.min(endMin, OT1_END) - Math.max(startMin, OT1_START));
  const ot2 = Math.max(0, Math.min(endMin, OT2_END) - Math.max(startMin, OT2_START));
  const overtimeMin = ot1 + ot2;
  const normalMin = Math.max(0, totalMin - overtimeMin);

  const createBlock = trpc.blocks.create.useMutation({
    onSuccess: () => {
      toast.success("Bloco criado com sucesso");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateBlock = trpc.blocks.update.useMutation({
    onSuccess: () => {
      toast.success("Bloco atualizado");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBlock = trpc.blocks.delete.useMutation({
    onSuccess: () => {
      toast.success("Bloco removido");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalId) return toast.error("Selecione um profissional");
    if (!jobNumber.trim()) return toast.error("Número do Job é obrigatório");
    if (!jobName.trim()) return toast.error("Nome do Job é obrigatório");
    if (!requesterId) return toast.error("Selecione um Solicitante");
    if (endMin <= startMin) return toast.error("Horário de fim deve ser após o início");

    const payload = {
      professionalId: Number(professionalId),
      activityTypeId: activityTypeId ? Number(activityTypeId) : undefined,
      requesterId: Number(requesterId),
      jobNumber: jobNumber.trim(),
      jobName: jobName.trim(),
      date: selectedDate,
      startTime,
      endTime,
      description: description || undefined,
    };

    if (isEditing) {
      updateBlock.mutate({ id: editingBlock.id, ...payload });
    } else {
      createBlock.mutate(payload);
    }
  }

  const selectedType = activityTypes.find((t) => String(t.id) === activityTypeId);
  const effectiveColor = selectedType?.color || "#6366f1";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: effectiveColor }} />
            {isEditing ? "Editar Bloco" : "Novo Bloco"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Number */}
          <div className="space-y-1.5">
            <Label>
              Número do Job <span className="text-red-400">*</span>
            </Label>
            <Input
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              placeholder="Ex: JOB-2024-001"
              className="bg-input border-border"
              required
            />
          </div>

          {/* Job Name */}
          <div className="space-y-1.5">
            <Label>
              Nome do Job <span className="text-red-400">*</span>
            </Label>
            <Input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="Ex: Campanha Verão 2024"
              className="bg-input border-border"
              required
            />
          </div>

          {/* Requester */}
          <div className="space-y-1.5">
            <Label>
              Solicitante <span className="text-red-400">*</span>
            </Label>
            {addingRequester ? (
              <div className="flex gap-2">
                <Input
                  value={newRequesterName}
                  onChange={(e) => setNewRequesterName(e.target.value)}
                  placeholder="Nome do solicitante..."
                  className="bg-input border-border flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newRequesterName.trim()) createRequester.mutate({ name: newRequesterName.trim() });
                    }
                    if (e.key === "Escape") setAddingRequester(false);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (newRequesterName.trim()) createRequester.mutate({ name: newRequesterName.trim() });
                  }}
                  disabled={createRequester.isPending || !newRequesterName.trim()}
                >
                  {createRequester.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "OK"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingRequester(false)}>
                  ✕
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={requesterId} onValueChange={setRequesterId}>
                  <SelectTrigger className="bg-input border-border flex-1">
                    <SelectValue placeholder="Selecione o solicitante..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {requesters.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAddingRequester(true)}
                  title="Adicionar novo solicitante"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Professional */}
          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? "#6366f1" }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Type */}
          <div className="space-y-1.5">
            <Label>Tipo de Atividade</Label>
            <Select value={activityTypeId} onValueChange={setActivityTypeId}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {activityTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-input border-border/60 rounded-lg h-9 text-sm font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/60 rounded-xl max-h-48">
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="bg-input border-border/60 rounded-lg h-9 text-sm font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/60 rounded-xl max-h-48">
                  {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                    <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration preview */}
          {totalMin > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{formatHours(totalMin)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-muted-foreground">Normal:</span>
                <span className="font-semibold text-green-400">{formatHours(normalMin)}</span>
              </div>
              {overtimeMin > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-muted-foreground">Extra:</span>
                  <span className="font-semibold text-red-400">{formatHours(overtimeMin)}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da atividade..."
              className="bg-input border-border resize-none h-20 text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteBlock.mutate({ id: editingBlock.id })}
                disabled={deleteBlock.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createBlock.isPending || updateBlock.isPending}
              >
                {isEditing ? "Salvar" : "Criar Bloco"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
