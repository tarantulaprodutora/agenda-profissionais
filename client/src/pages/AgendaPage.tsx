import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, CalendarDays, Users, BarChart3,
  LogOut, LogIn, Plus, Clock, Layers2, Sun, Moon, Settings,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import BlockModal from "@/components/BlockModal";
import AgendaBlock from "@/components/AgendaBlock";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

const HOUR_START = 7;
const HOUR_END = 23;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES; // 32 slots
const SLOT_HEIGHT = 36; // px per 30-min slot
const TIME_AXIS_WIDTH = 60; // px for the time labels column
const SEPARATOR_WIDTH = 32; // px for the group separator column
const MIN_COL_WIDTH = 72; // minimum px per column to keep text readable
const MAX_COL_WIDTH = 160; // maximum px per column

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0 && m === 0) return "—";
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function AgendaPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [newBlockData, setNewBlockData] = useState<{ professionalId: number; startTime: string; endTime: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(148);
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const { data: professionals = [] } = trpc.professionals.list.useQuery();
  const { data: activityTypes = [] } = trpc.activityTypes.list.useQuery();
  const { data: requesters = [] } = trpc.requesters.list.useQuery();
  const { data: blocks = [] } = trpc.blocks.byDate.useQuery({ date: selectedDate });

  // Dynamically compute column width to fit all professionals on screen
  const computeColWidth = useCallback(() => {
    if (!containerRef.current) return;
    const totalWidth = containerRef.current.clientWidth;
    const profCount = professionals.length || 13;
    const hasSecGroup = professionals.some((p: any) => p.groupLabel === "secundario");
    const separatorW = hasSecGroup ? SEPARATOR_WIDTH : 0;
    const available = totalWidth - TIME_AXIS_WIDTH - separatorW;
    const computed = Math.floor(available / profCount);
    setColWidth(Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, computed)));
  }, [professionals]);

  useEffect(() => {
    computeColWidth();
    const observer = new ResizeObserver(computeColWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [computeColWidth]);

  const utils = trpc.useUtils();

  const deleteBlock = trpc.blocks.delete.useMutation({
    onSuccess: () => { utils.blocks.byDate.invalidate({ date: selectedDate }); toast.success("Bloco removido"); },
    onError: (e) => toast.error(e.message),
  });

  const updateBlock = trpc.blocks.update.useMutation({
    onSuccess: () => utils.blocks.byDate.invalidate({ date: selectedDate }),
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = user?.role === "admin";

  const DRAG_THRESHOLD = 5; // pixels

  const goToday = () => setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  const goPrev  = () => setSelectedDate((d) => format(subDays(parseISO(d), 1), "yyyy-MM-dd"));
  const goNext  = () => setSelectedDate((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));

  const formattedDate = format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  // Time labels
  const timeLabels: string[] = [];
  for (let slot = 0; slot <= TOTAL_SLOTS; slot++) {
    const totalMin = HOUR_START * 60 + slot * SLOT_MINUTES;
    timeLabels.push(minutesToTime(totalMin));
  }

  function blockStyle(startTime: string, endTime: string) {
    const startMin = toMinutes(startTime) - HOUR_START * 60;
    const endMin   = toMinutes(endTime)   - HOUR_START * 60;
    const top    = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
    const height = ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT;
    return { top, height };
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, professionalId: number) {
    // Apenas abrir o modal com double-click
    if (e.detail !== 2) return; // e.detail === 2 significa double-click

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const slotIndex = Math.floor(y / SLOT_HEIGHT);
    const startMin = snapToSlot(HOUR_START * 60 + slotIndex * SLOT_MINUTES);
    const endMin   = startMin + 60;
    setNewBlockData({
      professionalId,
      startTime: minutesToTime(Math.min(startMin, HOUR_END * 60 - 60)),
      endTime:   minutesToTime(Math.min(endMin,   HOUR_END * 60)),
    });
    setEditingBlock(null);
    setModalOpen(true);
  }

  function handleBlockClick(e: React.MouseEvent, block: any) {
    e.stopPropagation();
    setEditingBlock(block);
    setNewBlockData(null);
    setModalOpen(true);
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  const dragState = useRef<{
    blockId: number; startTime: string; endTime: string;
    startY: number; duration: number;
  } | null>(null);

  function handleDragStart(e: React.MouseEvent, block: any) {
    e.preventDefault(); e.stopPropagation();
    const startMin = toMinutes(block.startTime);
    const endMin   = toMinutes(block.endTime);
    dragState.current = { blockId: block.id, startTime: block.startTime, endTime: block.endTime, startY: e.clientY, duration: endMin - startMin };

    const onMove = (me: MouseEvent) => {
      if (!dragState.current) return;
      const dy = me.clientY - dragState.current.startY;
      const delta = Math.round(dy / SLOT_HEIGHT);
      const newStart = snapToSlot(toMinutes(dragState.current.startTime) + delta * SLOT_MINUTES);
      const clamped  = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - dragState.current.duration, newStart));
      const el = document.getElementById(`block-${dragState.current.blockId}`);
      if (el) { el.style.top = `${((clamped - HOUR_START * 60) / SLOT_MINUTES) * SLOT_HEIGHT}px`; el.style.opacity = "0.65"; }
    };

    const onUp = (me: MouseEvent) => {
      if (!dragState.current) return;
      const dy = me.clientY - dragState.current.startY;
      const delta = Math.round(dy / SLOT_HEIGHT);
      const newStart = snapToSlot(toMinutes(dragState.current.startTime) + delta * SLOT_MINUTES);
      const clamped  = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - dragState.current.duration, newStart));
      const clampedEnd = clamped + dragState.current.duration;
      if (clamped !== toMinutes(dragState.current.startTime)) {
        updateBlock.mutate({ id: dragState.current.blockId, startTime: minutesToTime(clamped), endTime: minutesToTime(clampedEnd) });
      } else {
        const el = document.getElementById(`block-${dragState.current.blockId}`);
        if (el) el.style.opacity = "1";
      }
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeState = useRef<{
    blockId: number; startTime: string; startY: number; originalEndMin: number;
  } | null>(null);

  function handleResizeStart(e: React.MouseEvent, block: any) {
    e.preventDefault(); e.stopPropagation();
    resizeState.current = { blockId: block.id, startTime: block.startTime, startY: e.clientY, originalEndMin: toMinutes(block.endTime) };

    const onMove = (me: MouseEvent) => {
      if (!resizeState.current) return;
      const dy = me.clientY - resizeState.current.startY;
      const delta = Math.round(dy / SLOT_HEIGHT);
      const newEnd = snapToSlot(resizeState.current.originalEndMin + delta * SLOT_MINUTES);
      const startMin = toMinutes(resizeState.current.startTime);
      const clamped = Math.max(startMin + SLOT_MINUTES, Math.min(HOUR_END * 60, newEnd));
      const el = document.getElementById(`block-${resizeState.current.blockId}`);
      if (el) el.style.height = `${((clamped - startMin) / SLOT_MINUTES) * SLOT_HEIGHT}px`;
    };

    const onUp = (me: MouseEvent) => {
      if (!resizeState.current) return;
      const dy = me.clientY - resizeState.current.startY;
      const delta = Math.round(dy / SLOT_HEIGHT);
      const newEnd = snapToSlot(resizeState.current.originalEndMin + delta * SLOT_MINUTES);
      const startMin = toMinutes(resizeState.current.startTime);
      const clamped = Math.max(startMin + SLOT_MINUTES, Math.min(HOUR_END * 60, newEnd));
      if (clamped !== resizeState.current.originalEndMin) {
        updateBlock.mutate({ id: resizeState.current.blockId, endTime: minutesToTime(clamped) });
      }
      resizeState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function getDailySummary(professionalId: number) {
    const profBlocks = blocks.filter((b) => b.professionalId === professionalId);
    return profBlocks.reduce(
      (acc, b) => ({ totalMin: acc.totalMin + b.durationTotalMin, normalMin: acc.normalMin + b.durationNormalMin, overtimeMin: acc.overtimeMin + b.durationOvertimeMin }),
      { totalMin: 0, normalMin: 0, overtimeMin: 0 }
    );
  }

  // Split professionals into groups
  const principalProfs  = professionals.filter((p) => (p as any).groupLabel !== "secundario");
  const secondaryProfs  = professionals.filter((p) => (p as any).groupLabel === "secundario");
  const hasSecondary    = secondaryProfs.length > 0;

  // Render a single professional column (header cell)
  function renderHeaderCell(prof: typeof professionals[0]) {
    const summary = getDailySummary(prof.id);
    return (
      <div
        key={prof.id}
        className="flex flex-col items-center justify-center px-2 py-2.5 dark:border-border/80 dark:last:border-r-0 border-r border-border/50 last:border-r-0"
        style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: prof.color ?? "#6366f1" }} />
          <span className="text-[11px] font-semibold tracking-tight truncate max-w-[110px] text-foreground/90">
            {prof.name}
          </span>
        </div>
        {summary.totalMin > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatHours(summary.totalMin)}
                </span>
                {summary.overtimeMin > 0 && (
                  <span className="text-[10px] text-red-400 font-medium">
                    +{formatHours(summary.overtimeMin)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs space-y-0.5">
              <div>Normal: <span className="text-green-400 font-medium">{formatHours(summary.normalMin)}</span></div>
              <div>Extra: <span className="text-red-400 font-medium">{formatHours(summary.overtimeMin)}</span></div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  // Render a single professional column (body)
  function renderBodyColumn(prof: typeof professionals[0]) {
    const profBlocks = blocks.filter((b) => b.professionalId === prof.id);
    return (
      <div
        key={prof.id}
        className="relative dark:border-border/70 dark:last:border-r-0 border-r border-border/40 last:border-r-0 cursor-crosshair"
        style={{ minWidth: `${colWidth}px`, width: `${colWidth}px`, height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}
        onClick={(e) => handleColumnClick(e, prof.id)}
      >
        {/* Slot rows with overtime shading */}
        {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
          const slotStartMin = HOUR_START * 60 + slotIdx * SLOT_MINUTES;
          const slotEndMin   = slotStartMin + SLOT_MINUTES;
          const isHour = slotIdx % 2 === 0;
          const isOt =
            (slotStartMin >= 7 * 60 && slotEndMin <= 10 * 60) ||
            (slotStartMin >= 19 * 60 && slotEndMin <= 23 * 60);
          return (
            <div
              key={slotIdx}
              className="absolute w-full"
              style={{
                top: `${slotIdx * SLOT_HEIGHT}px`,
                height: `${SLOT_HEIGHT}px`,
                borderBottom: isHour
                  ? "1px solid oklch(0.25 0.007 264 / 0.7)"
                  : "1px solid oklch(0.20 0.007 264 / 0.4)",
                backgroundColor: isOt ? "rgba(239,68,68,0.045)" : undefined,
                backgroundImage: isOt
                  ? `repeating-linear-gradient(-45deg, rgba(239,68,68,0.09) 0px, rgba(239,68,68,0.09) 2px, transparent 2px, transparent 10px)`
                  : undefined,
              }}
            />
          );
        })}

        {/* Activity blocks */}
        {profBlocks.map((block) => {
          const { top, height } = blockStyle(block.startTime, block.endTime);
          const actType   = activityTypes.find((t) => t.id === block.activityTypeId);
          const color     = block.color ?? actType?.color ?? "#6366f1";
          const requester = requesters.find((r) => r.id === (block as any).requesterId);
          return (
            <AgendaBlock
              key={block.id}
              block={block}
              actType={actType}
              requesterName={requester?.name}
              color={color}
              top={top}
              height={height}
              isAdmin={isAdmin}
              onBlockClick={handleBlockClick}
              onDragStart={handleDragStart}
              onResizeStart={handleResizeStart}
              onDelete={(id) => deleteBlock.mutate({ id })}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Top Navigation ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/60 glass shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo-tarantula.png" alt="Tarantula" className="h-7 object-contain dark:invert" />
        </div>

        <nav className="flex items-center gap-0.5">
          <Link href="/agenda">
            <Button variant="ghost" size="sm" className="text-primary text-xs font-medium h-8 px-3 rounded-lg">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Agenda
            </Button>
          </Link>
          <Link href="/professionals">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-medium h-8 px-3 rounded-lg">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Profissionais
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-medium h-8 px-3 rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Relatórios
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-medium h-8 px-3 rounded-lg">
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Administração
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          {isAuthenticated ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:block font-medium">{user?.name}</span>
              {isAdmin && (
                <Badge className="text-[10px] bg-primary/15 text-primary border-primary/25 font-medium px-2 py-0.5 rounded-full">
                  Admin
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => window.location.href = getLoginUrl()} className="h-8 px-3 text-xs rounded-lg">
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Entrar
            </Button>
          )}
        </div>
      </header>

      {/* ── Date Navigation ── */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-border/50 bg-card/30 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <Button variant="ghost" size="sm" onClick={goPrev} className="h-7 w-7 p-0 rounded-md hover:bg-background/60">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goNext} className="h-7 w-7 p-0 rounded-md hover:bg-background/60">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost" size="sm" onClick={goToday}
            className={`h-7 px-2.5 text-[11px] font-medium rounded-md ${isToday ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
          >
            Hoje
          </Button>
          <span className="text-sm font-medium capitalize text-foreground/80 ml-1 tracking-tight">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* ── Agenda Grid ── */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" ref={gridRef}>
        <div className="min-w-full" ref={containerRef}>

          {/* ── Logo Row ── */}
          <div className="sticky top-0 z-[11] flex border-b border-border/30" style={{ paddingLeft: "60px", background: "oklch(0.13 0.005 264 / 0.95)", backdropFilter: "blur(12px)" }}>
            {/* BTG logo — centered over principal group */}
            <div
              className="flex items-center justify-center py-2"
              style={{ width: `${principalProfs.length * colWidth}px`, minWidth: `${principalProfs.length * colWidth}px` }}
            >
              <img src="/logo-btg.png" alt="BTG" className="h-8 object-contain opacity-80" />
            </div>

            {/* Separator space */}
            {hasSecondary && (
              <div
                className="shrink-0"
                style={{ width: `${Math.max(24, Math.round(colWidth * 0.25))}px`, minWidth: `${Math.max(24, Math.round(colWidth * 0.25))}px`, background: "oklch(0.07 0.005 264)" }}
              />
            )}

            {/* Pan logo — centered over secondary group */}
            {hasSecondary && (
              <div
                className="flex items-center justify-center py-2"
                style={{ width: `${secondaryProfs.length * colWidth}px`, minWidth: `${secondaryProfs.length * colWidth}px` }}
              >
                <img src="/logo-pan.png" alt="Pan" className="h-5 object-contain opacity-80" />
              </div>
            )}
          </div>

          {/* ── Column Header ── */}
          <div className="sticky top-[36px] z-10 flex border-b border-border/60 glass" style={{ paddingLeft: "60px" }}>
            {/* Principal group */}
            {principalProfs.map(renderHeaderCell)}

            {/* Group separator header — responsive gap */}
            {hasSecondary && (
              <div
                className="shrink-0 flex flex-col items-center justify-center border-x border-border/60"
                style={{ width: `${Math.max(24, Math.round(colWidth * 0.25))}px`, minWidth: `${Math.max(24, Math.round(colWidth * 0.25))}px`, background: "oklch(0.07 0.005 264)" }}
              >
                <div className="flex flex-col items-center gap-1">
                  {/* Separação visual mantida, sem texto ou ícone */}
                </div>
              </div>
            )}

            {/* Secondary professionals */}
            {secondaryProfs.map(renderHeaderCell)}
          </div>

          {/* ── Grid Body ── */}
          <div className="flex">
            {/* Time axis */}
            <div
              className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm border-r border-border/50 shrink-0"
              style={{ width: "60px", minWidth: "60px" }}
            >
              {timeLabels.slice(0, -1).map((label, i) => {
                const isHour = i % 2 === 0;
                return (
                  <div
                    key={label}
                    className="flex items-start justify-end pr-2.5"
                    style={{
                      height: `${SLOT_HEIGHT}px`,
                      borderBottom: isHour
                        ? "1px solid oklch(0.25 0.007 264 / 0.7)"
                        : "1px solid oklch(0.20 0.007 264 / 0.4)",
                    }}
                  >
                    {isHour && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono -translate-y-1.5 tabular-nums">
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Principal columns */}
            {principalProfs.map(renderBodyColumn)}

            {/* Group separator column — responsive gap */}
            {hasSecondary && (
              <div
                className="shrink-0 border-x border-border/60"
                style={{
                  width: `${Math.max(24, Math.round(colWidth * 0.25))}px`,
                  minWidth: `${Math.max(24, Math.round(colWidth * 0.25))}px`,
                  height: `${TOTAL_SLOTS * SLOT_HEIGHT}px`,
                  background: "oklch(0.07 0.005 264)",
                }}
              />
            )}

            {/* Secondary columns */}
            {secondaryProfs.map(renderBodyColumn)}
          </div>
        </div>
      </div>

      {/* ── Block Modal ── */}
      {modalOpen && (
        <BlockModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingBlock(null); setNewBlockData(null); }}
          editingBlock={editingBlock}
          defaultData={newBlockData}
          professionals={professionals}
          activityTypes={activityTypes}
          selectedDate={selectedDate}
          onSuccess={() => {
            utils.blocks.byDate.invalidate({ date: selectedDate });
            setModalOpen(false);
            setEditingBlock(null);
            setNewBlockData(null);
          }}
        />
      )}
    </div>
  );
}
