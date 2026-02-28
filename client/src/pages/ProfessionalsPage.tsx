import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { CalendarDays, Users, BarChart3, LogOut, Plus, Pencil, Trash2, Layers2 } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#a855f7", "#d946ef", "#84cc16",
];

export default function ProfessionalsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const utils = trpc.useUtils();
  const { data: professionals = [], isLoading } = trpc.professionals.list.useQuery();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editingProf, setEditingProf] = useState<any>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);

  const [name, setName]             = useState("");
  const [color, setColor]           = useState(COLORS[0]);
  const [columnOrder, setColumnOrder] = useState(1);
  const [groupLabel, setGroupLabel] = useState("principal");

  const createProf = trpc.professionals.create.useMutation({
    onSuccess: () => { utils.professionals.list.invalidate(); toast.success("Profissional adicionado"); setModalOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateProf = trpc.professionals.update.useMutation({
    onSuccess: () => { utils.professionals.list.invalidate(); toast.success("Profissional atualizado"); setModalOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteProf = trpc.professionals.delete.useMutation({
    onSuccess: () => { utils.professionals.list.invalidate(); toast.success("Profissional removido"); setDeleteId(null); },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditingProf(null);
    setName("");
    setColor(COLORS[professionals.length % COLORS.length]);
    setColumnOrder(professionals.length + 1);
    setGroupLabel("principal");
    setModalOpen(true);
  }

  function openEdit(prof: any) {
    setEditingProf(prof);
    setName(prof.name);
    setColor(prof.color ?? COLORS[0]);
    setColumnOrder(prof.columnOrder);
    setGroupLabel((prof as any).groupLabel ?? "principal");
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório");
    if (editingProf) {
      updateProf.mutate({ id: editingProf.id, name: name.trim(), color, columnOrder, groupLabel } as any);
    } else {
      createProf.mutate({ name: name.trim(), color, columnOrder, groupLabel } as any);
    }
  }

  const principalProfs  = professionals.filter((p) => (p as any).groupLabel !== "secundario");
  const secondaryProfs  = professionals.filter((p) => (p as any).groupLabel === "secundario");

  function ProfRow({ prof }: { prof: typeof professionals[0] }) {
    const isSecondary = (prof as any).groupLabel === "secundario";
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/60 hover:bg-card transition-all duration-150 group"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: prof.color ?? "#6366f1" }}
        >
          {prof.columnOrder}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground/90">{prof.name}</div>
          <div className="text-[11px] text-muted-foreground">Coluna {prof.columnOrder}</div>
        </div>
        {isSecondary && (
          <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5">
            <Layers2 className="w-2.5 h-2.5 text-primary" />
            <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">Outra Frente</span>
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => openEdit(prof)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteId(prof.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/60 glass shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Agenda Visual</span>
        </div>
        <nav className="flex items-center gap-0.5">
          <Link href="/agenda">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-medium h-8 px-3 rounded-lg">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Agenda
            </Button>
          </Link>
          <Link href="/professionals">
            <Button variant="ghost" size="sm" className="text-primary text-xs font-medium h-8 px-3 rounded-lg">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Profissionais
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-medium h-8 px-3 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Relatórios
            </Button>
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:block font-medium">{user?.name}</span>
              {isAdmin && (
                <Badge className="text-[10px] bg-primary/15 text-primary border-primary/25 font-medium px-2 py-0.5 rounded-full">Admin</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => window.location.href = getLoginUrl()} className="h-8 px-3 text-xs rounded-lg">Entrar</Button>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Profissionais</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {professionals.length} profissional{professionals.length !== 1 ? "is" : ""} cadastrado{professionals.length !== 1 ? "s" : ""}
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="h-8 px-3 text-xs rounded-lg bg-primary hover:bg-primary/90 font-medium gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {/* Principal group */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Frente Principal</span>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[11px] text-muted-foreground">{principalProfs.length}</span>
                </div>
                <div className="space-y-1.5">
                  {principalProfs.map((prof) => <ProfRow key={prof.id} prof={prof} />)}
                </div>
              </div>

              {/* Secondary group */}
              {secondaryProfs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers2 className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Outra Frente</span>
                    <div className="flex-1 h-px bg-primary/20" />
                    <span className="text-[11px] text-primary/70">{secondaryProfs.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {secondaryProfs.map((prof) => <ProfRow key={prof.id} prof={prof} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && setModalOpen(false)}>
        <DialogContent className="max-w-sm bg-card border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingProf ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do profissional" className="bg-input border-border/60 rounded-lg h-9 text-sm" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Coluna</Label>
                <Input type="number" min={1} max={20} value={columnOrder} onChange={(e) => setColumnOrder(Number(e.target.value))} className="bg-input border-border/60 rounded-lg h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Frente</Label>
                <Select value={groupLabel} onValueChange={setGroupLabel}>
                  <SelectTrigger className="bg-input border-border/60 rounded-lg h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/60">
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="secundario">Outra Frente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Cor</Label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    className="w-7 h-7 rounded-full transition-all duration-150"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                    }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="rounded-lg h-8 text-xs">Cancelar</Button>
              <Button type="submit" size="sm" disabled={createProf.isPending || updateProf.isPending} className="rounded-lg h-8 text-xs">
                {editingProf ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              O profissional será desativado. Os blocos existentes serão mantidos no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg h-8 text-xs"
              onClick={() => deleteId && deleteProf.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
