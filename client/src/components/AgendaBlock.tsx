import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { useState, useRef } from "react";

const HOUR_START = 7;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 36;

// Overtime windows in minutes from midnight
const OT1_START = 7 * 60;   // 07:00
const OT1_END   = 10 * 60;  // 10:00
const OT2_START = 19 * 60;  // 19:00
const OT2_END   = 23 * 60;  // 23:00

interface AgendaBlockProps {
  block: {
    id: number;
    startTime: string;
    endTime: string;
    description?: string | null;
    jobNumber?: string | null;
    jobName?: string | null;
    durationTotalMin: number;
    durationNormalMin: number;
    durationOvertimeMin: number;
  };
  actType?: { name: string; color: string } | undefined;
  requesterName?: string;
  color: string;
  top: number;
  height: number;
  isAdmin: boolean;
  onBlockClick: (e: React.MouseEvent, block: any) => void;
  onDragStart: (e: React.MouseEvent, block: any) => void;
  onResizeStart: (e: React.MouseEvent, block: any) => void;
  onDelete: (id: number) => void;
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Compute the overtime segments (as % offsets within the block height)
 * that should receive the red hatching overlay.
 */
function getOvertimeSegments(
  startTime: string,
  endTime: string,
  blockHeightPx: number
): Array<{ topPx: number; heightPx: number }> {
  const startMin = toMin(startTime);
  const endMin   = toMin(endTime);
  const totalMin = endMin - startMin;
  if (totalMin <= 0) return [];

  const segments: Array<{ topPx: number; heightPx: number }> = [];

  for (const [otStart, otEnd] of [[OT1_START, OT1_END], [OT2_START, OT2_END]]) {
    const overlapStart = Math.max(startMin, otStart);
    const overlapEnd   = Math.min(endMin,   otEnd);
    if (overlapEnd <= overlapStart) continue;

    const offsetMin = overlapStart - startMin;
    const durationMin = overlapEnd - overlapStart;

    const topPx    = (offsetMin / totalMin) * blockHeightPx;
    const heightPx = (durationMin / totalMin) * blockHeightPx;
    segments.push({ topPx, heightPx });
  }

  return segments;
}

export default function AgendaBlock({
  block,
  actType,
  requesterName,
  color,
  top,
  height,
  isAdmin,
  onBlockClick,
  onDragStart,
  onResizeStart,
  onDelete,
}: AgendaBlockProps) {
  const [hovered, setHovered] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Detectar modo dark
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  
  // Convert hex to rgba for background — more refined opacity
  // Aumentar opacidade APENAS no modo DARK para melhor legibilidade
  const bgColor     = isDarkMode ? color + "D9" : color + "26"; // 85% no dark, 15% no light
  const borderColor = isDarkMode ? color + "E6" : color + "88"; // 90% no dark, 53% no light

  const showContent = height >= 28;
  const showFull    = height >= 52;

  const overtimeSegments = getOvertimeSegments(block.startTime, block.endTime, height);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          id={`block-${block.id}`}
          className="absolute left-1 right-1 rounded-lg select-none overflow-hidden"
          style={{
            top: `${top}px`,
            height: `${height}px`,
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderLeftWidth: "3px",
            borderLeftColor: color,
            zIndex: 2,
            cursor: isAdmin ? "grab" : "default",
            boxShadow: isDarkMode ? `0 1px 3px rgba(0,0,0,0.2)` : `0 1px 3px rgba(0,0,0,0.1)`,
            opacity: 1,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}

          onMouseDown={(e) => {
            if (e.button === 0) {
              const target = e.target as HTMLElement;
              if (!target.closest("[data-resize]") && !target.closest("[data-delete]")) {
                // Store mouse position for click detection
                mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
                
                // Set a timeout to detect if this is a drag or just a click
                clickTimeoutRef.current = setTimeout(() => {
                  onDragStart(e, block);
                }, 200);
              }
            }
          }}
          onMouseUp={(e) => {
            if (clickTimeoutRef.current) {
              clearTimeout(clickTimeoutRef.current);
              clickTimeoutRef.current = null;
              
              // Check if mouse moved significantly (drag) or stayed in place (click)
              const mouseUpPos = { x: e.clientX, y: e.clientY };
              const distance = Math.sqrt(
                Math.pow(mouseUpPos.x - (mouseDownPosRef.current?.x || 0), 2) +
                Math.pow(mouseUpPos.y - (mouseDownPosRef.current?.y || 0), 2)
              );
              
              // If distance is small, treat as click (edit)
              if (distance < 5) {
                onBlockClick(e, block);
              }
            }
          }}
          onMouseMove={(e) => {
            // If mouse moves significantly, clear the click timeout and start drag
            if (clickTimeoutRef.current && mouseDownPosRef.current) {
              const distance = Math.sqrt(
                Math.pow(e.clientX - mouseDownPosRef.current.x, 2) +
                Math.pow(e.clientY - mouseDownPosRef.current.y, 2)
              );
              if (distance > 10) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                onDragStart(e, block);
              }
            }
          }}
        >
          {/* ── Overtime hatching overlays ── */}
          {overtimeSegments.map((seg, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${seg.topPx}px`,
                height: `${seg.heightPx}px`,
                // Diagonal red stripe pattern
                background: `repeating-linear-gradient(
                  -45deg,
                  rgba(239,68,68,0.22) 0px,
                  rgba(239,68,68,0.22) 3px,
                  transparent 3px,
                  transparent 9px
                )`,
                borderTop: i === 0 && seg.topPx > 0 ? "1px dashed rgba(239,68,68,0.5)" : undefined,
                borderBottom: "1px dashed rgba(239,68,68,0.5)",
                zIndex: 3,
              }}
            />
          ))}

          {/* ── Block content ── */}
          {showContent && (
            <div className="relative px-1.5 py-0.5 h-full flex flex-col justify-between overflow-hidden z-4">
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  {block.jobNumber && (
                    <div className="text-[9px] font-mono dark:text-foreground/50 dark:text-white text-white truncate leading-tight">
                      {block.jobNumber}
                    </div>
                  )}
                  {actType && (
                    <div
                      className="text-[10px] font-semibold truncate leading-tight"
                      style={{ color: !isDarkMode ? color : "white" }}
                    >
                      {actType.name}
                    </div>
                  )}
                  {showFull && block.jobName && (
                    <div className="text-[10px] dark:text-foreground/70 dark:text-white/90 text-white truncate leading-tight mt-0.5">
                      {block.jobName}
                    </div>
                  )}
                  {showFull && requesterName && (
                    <div className="text-[10px] font-medium truncate leading-tight mt-0.5" style={{ color: !isDarkMode ? color + "cc" : "white" }}>
                      → {requesterName}
                    </div>
                  )}
                </div>
                {isAdmin && hovered && (
                  <button
                    data-delete
                    className="shrink-0 w-4 h-4 rounded flex items-center justify-center hover:bg-destructive/20 text-destructive/70 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(block.id);
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {showFull && (
                <div className="text-[10px] dark:text-foreground/50 dark:text-white/90 text-white font-mono">
                  {block.startTime}–{block.endTime}
                </div>
              )}
            </div>
          )}

          {/* Resize handle */}
          <div
            data-resize
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-center justify-center z-10"
            style={{ backgroundColor: "transparent" }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, block);
            }}
          >
            <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: color, opacity: 0 }} />
          </div>
        </div>
      </TooltipTrigger>

      <TooltipContent side="right" className="text-xs max-w-64 p-3">
        <div className="space-y-1.5">
          {/* Requester — highlighted at top */}
          {requesterName && (
            <div className="flex items-center gap-1.5 pb-1.5 border-b border-border/50">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-semibold text-foreground">{requesterName}</span>
            </div>
          )}
          {block.jobNumber && (
            <div className="font-mono text-[10px] text-muted-foreground tracking-wide">{block.jobNumber}</div>
          )}
          {block.jobName && (
            <div className="font-semibold text-foreground leading-snug">{block.jobName}</div>
          )}
          {actType && (
            <div className="font-medium" style={{ color }}>{actType.name}</div>
          )}
          <div className="text-muted-foreground font-mono">{block.startTime} – {block.endTime}</div>
          {block.description && (
            <div className="text-foreground/75 text-[11px] leading-snug border-t border-border/40 pt-1.5 mt-1">{block.description}</div>
          )}
          <div className="border-t border-border/40 pt-1.5 mt-1 space-y-0.5">
            <div>Total: <span className="font-medium">{formatHours(block.durationTotalMin)}</span></div>
            <div>Normal: <span className="text-green-400 font-medium">{formatHours(block.durationNormalMin)}</span></div>
            {block.durationOvertimeMin > 0 && (
              <div>Extra: <span className="text-red-400 font-medium">{formatHours(block.durationOvertimeMin)}</span></div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
