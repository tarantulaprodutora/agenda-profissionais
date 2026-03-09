import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { CalendarDays, Users, BarChart3, LogOut, Download, FileSpreadsheet, FileText, Filter, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function formatHours(min: number) {
  if (min <= 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ReportsPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reportType, setReportType] = useState("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(now, 7));
  const [endDate, setEndDate] = useState<Date | undefined>(now);
  const [selectedProfId, setSelectedProfId] = useState<string>("all");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("all");
  const [expandedProf, setExpandedProf] = useState<number | null>(null);

  const { data: professionals = [] } = trpc.professionals.list.useQuery();
  const { data: activities = [] } = trpc.activityTypes.list.useQuery();
  const { data: reportData, isLoading } = trpc.reports.monthly.useQuery(
    {
      year,
      month,
      professionalId: selectedProfId !== "all" ? Number(selectedProfId) : undefined,
    },
    { enabled: isAdmin }
  );

  const years = useMemo(() => {
    const y = [];
    for (let i = now.getFullYear() - 2; i <= now.getFullYear() + 1; i++) y.push(i);
    return y;
  }, []);

  async function exportExcel() {
    if (!reportData) return;
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Relatório Detalhado ${MONTHS[month - 1]} ${year}`);

      ws.columns = [
        { header: "Data", key: "date", width: 12 },
        { header: "Profissional", key: "prof", width: 20 },
        { header: "Início", key: "start", width: 10 },
        { header: "Fim", key: "end", width: 10 },
        { header: "Job #", key: "jobNum", width: 15 },
        { header: "Job Name", key: "jobName", width: 30 },
        { header: "Atividade", key: "activity", width: 15 },
        { header: "Total (h)", key: "total", width: 10 },
        { header: "Normal (h)", key: "normal", width: 10 },
        { header: "Extra (h)", key: "extra", width: 10 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
      headerRow.alignment = { horizontal: "center" };

      for (const s of reportData.summary) {
        // Add a header row for the professional
        const profRow = ws.addRow({ prof: s.professionalName.toUpperCase() });
        profRow.font = { bold: true };
        profRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

        for (const entry of s.entries) {
          const activity = activities.find(a => a.id === entry.activityTypeId)?.name || "-";
          ws.addRow({
            date: format(parseISO(entry.date), "dd/MM/yyyy"),
            prof: s.professionalName,
            start: entry.startTime,
            end: entry.endTime,
            jobNum: entry.jobNumber,
            jobName: entry.jobName,
            activity: activity,
            total: formatHours(entry.durationTotalMin),
            normal: formatHours(entry.durationNormalMin),
            extra: formatHours(entry.durationOvertimeMin),
          });
        }

        // Add subtotal for professional
        const subtotalRow = ws.addRow({
          jobName: `SUBTOTAL ${s.professionalName}`,
          total: formatHours(s.totalMin),
          normal: formatHours(s.normalMin),
          extra: formatHours(s.overtimeMin),
        });
        subtotalRow.font = { bold: true, italic: true };
        ws.addRow({}); // Empty spacer row
      }

      const totalRow = ws.addRow({
        jobName: "TOTAL GERAL",
        total: formatHours(reportData.summary.reduce((a, s) => a + s.totalMin, 0)),
        normal: formatHours(reportData.summary.reduce((a, s) => a + s.normalMin, 0)),
        extra: formatHours(reportData.summary.reduce((a, s) => a + s.overtimeMin, 0)),
      });
      totalRow.font = { bold: true };
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1E2E" } };
      totalRow.getCell('total').font = { color: { argb: "FFFFFFFF" }, bold: true };
      totalRow.getCell('normal').font = { color: { argb: "FFFFFFFF" }, bold: true };
      totalRow.getCell('extra').font = { color: { argb: "FFFFFFFF" }, bold: true };
      totalRow.getCell('jobName').font = { color: { argb: "FFFFFFFF" }, bold: true };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-detalhado-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar Excel");
    }
  }

  async function exportPDF() {
    if (!reportData) return;
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241);
      doc.text("Agenda Visual de Profissionais - Relatório Detalhado", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${MONTHS[month - 1]} ${year}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

      const tableBody: any[] = [];
      for (const s of reportData.summary) {
        // Professional Header
        tableBody.push([
          { content: s.professionalName, colSpan: 10, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }
        ]);

        for (const entry of s.entries) {
          const activity = activities.find(a => a.id === entry.activityTypeId)?.name || "-";
          tableBody.push([
            format(parseISO(entry.date), "dd/MM/yy"),
            entry.startTime,
            entry.endTime,
            entry.jobNumber,
            entry.jobName,
            activity,
            formatHours(entry.durationTotalMin),
            formatHours(entry.durationNormalMin),
            formatHours(entry.durationOvertimeMin),
          ]);
        }

        // Subtotal
        tableBody.push([
          { content: `Subtotal ${s.professionalName}`, colSpan: 6, styles: { fontStyle: 'italic', halign: 'right' } },
          { content: formatHours(s.totalMin), styles: { fontStyle: 'bold' } },
          { content: formatHours(s.normalMin), styles: { fontStyle: 'bold' } },
          { content: formatHours(s.overtimeMin), styles: { fontStyle: 'bold' } },
        ]);
      }

      autoTable(doc, {
        startY: 48,
        head: [["Data", "Início", "Fim", "Job #", "Job Name", "Atividade", "Total", "Normal", "Extra"]],
        body: tableBody,
        foot: [[
          { content: "TOTAL GERAL", colSpan: 6, styles: { halign: 'right' } },
          formatHours(reportData.summary.reduce((a, s) => a + s.totalMin, 0)),
          formatHours(reportData.summary.reduce((a, s) => a + s.normalMin, 0)),
          formatHours(reportData.summary.reduce((a, s) => a + s.overtimeMin, 0)),
        ]],
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [30, 30, 46], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8 },
        columnStyles: {
          4: { cellWidth: 60 }, // Job Name width
        }
      });

      doc.save(`relatorio-detalhado-${year}-${String(month).padStart(2, "0")}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar PDF");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground text-sm mb-4">Apenas administradores podem acessar os relatórios.</p>
          <Link href="/agenda"><Button variant="outline" size="sm">Voltar à Agenda</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-base tracking-tight">Agenda Visual</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/agenda"><Button variant="ghost" size="sm"><CalendarDays className="w-4 h-4 mr-1.5" /> Agenda</Button></Link>
          <Link href="/professionals"><Button variant="ghost" size="sm"><Users className="w-4 h-4 mr-1.5" /> Profissionais</Button></Link>
          <Link href="/reports"><Button variant="ghost" size="sm" className="text-primary"><BarChart3 className="w-4 h-4 mr-1.5" /> Relatórios</Button></Link>
          {isAdmin && (
            <Link href="/admin"><Button variant="ghost" size="sm"><Settings className="w-4 h-4 mr-1.5" /> Administração</Button></Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">Admin</Badge>
              <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
            </>
          ) : (
            <Button size="sm" onClick={() => window.location.href = getLoginUrl()}>Entrar</Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold">Relatórios Detalhados</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Horas e detalhes dos jobs por profissional</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={!reportData || isLoading}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-400" /> Excel Detalhado
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={!reportData || isLoading}>
                <FileText className="w-4 h-4 mr-1.5 text-red-400" /> PDF Detalhado
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mês:</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36 bg-input border-border h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ano:</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24 bg-input border-border h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Profissional:</span>
              <Select value={selectedProfId} onValueChange={setSelectedProfId}>
                <SelectTrigger className="w-44 bg-input border-border h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todos</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando relatório...</div>
          ) : !reportData || reportData.summary.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum dado encontrado para o período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Total Geral</p>
                  <p className="text-2xl font-bold">{formatHours(reportData.summary.reduce((a, s) => a + s.totalMin, 0))}</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Horas Normais</p>
                  <p className="text-2xl font-bold text-blue-400">{formatHours(reportData.summary.reduce((a, s) => a + s.normalMin, 0))}</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Horas Extras</p>
                  <p className="text-2xl font-bold text-orange-400">{formatHours(reportData.summary.reduce((a, s) => a + s.overtimeMin, 0))}</p>
                </div>
              </div>

              <div className="space-y-4">
                {reportData.summary.map((s) => (
                  <div key={s.professionalId} className="border border-border rounded-lg overflow-hidden bg-card">
                    <button 
                      onClick={() => setExpandedProf(expandedProf === s.professionalId ? null : s.professionalId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{s.professionalName}</span>
                        <div className="flex gap-3 text-sm">
                          <span className="text-muted-foreground">Total: <b className="text-foreground">{formatHours(s.totalMin)}</b></span>
                          <span className="text-muted-foreground">Normal: <b className="text-blue-400">{formatHours(s.normalMin)}</b></span>
                          <span className="text-muted-foreground">Extra: <b className="text-orange-400">{formatHours(s.overtimeMin)}</b></span>
                        </div>
                      </div>
                      {expandedProf === s.professionalId ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedProf === s.professionalId && (
                      <div className="border-t border-border overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                              <th className="px-4 py-2 text-left">Data</th>
                              <th className="px-4 py-2 text-left">Horário</th>
                              <th className="px-4 py-2 text-left">Job #</th>
                              <th className="px-4 py-2 text-left">Job Name</th>
                              <th className="px-4 py-2 text-left">Atividade</th>
                              <th className="px-4 py-2 text-right">Total</th>
                              <th className="px-4 py-2 text-right">Normal</th>
                              <th className="px-4 py-2 text-right">Extra</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {s.entries.map((entry, idx) => (
                              <tr key={idx} className="hover:bg-accent/30">
                                <td className="px-4 py-2 whitespace-nowrap">{format(parseISO(entry.date), "dd/MM/yy")}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{entry.startTime} - {entry.endTime}</td>
                                <td className="px-4 py-2 font-mono">{entry.jobNumber}</td>
                                <td className="px-4 py-2 font-medium">{entry.jobName}</td>
                                <td className="px-4 py-2">{activities.find(a => a.id === entry.activityTypeId)?.name || "-"}</td>
                                <td className="px-4 py-2 text-right">{formatHours(entry.durationTotalMin)}</td>
                                <td className="px-4 py-2 text-right text-blue-400">{formatHours(entry.durationNormalMin)}</td>
                                <td className="px-4 py-2 text-right text-orange-400">{formatHours(entry.durationOvertimeMin)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
