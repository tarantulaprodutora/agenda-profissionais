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
import { CalendarDays, Users, BarChart3, LogOut, Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { format, subDays } from "date-fns";
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
      const ws = wb.addWorksheet(`Relatório ${MONTHS[month - 1]} ${year}`);

      ws.columns = [
        { header: "Profissional", key: "prof", width: 25 },
        { header: "Total (h)", key: "total", width: 12 },
        { header: "Normal (h)", key: "normal", width: 12 },
        { header: "Extra (h)", key: "extra", width: 12 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
      headerRow.alignment = { horizontal: "center" };

      for (const s of reportData.summary) {
        ws.addRow({
          prof: s.professionalName,
          total: formatHours(s.totalMin),
          normal: formatHours(s.normalMin),
          extra: formatHours(s.overtimeMin),
        });
      }

      const totalRow = ws.addRow({
        prof: "TOTAL",
        total: formatHours(reportData.summary.reduce((a, s) => a + s.totalMin, 0)),
        normal: formatHours(reportData.summary.reduce((a, s) => a + s.normalMin, 0)),
        extra: formatHours(reportData.summary.reduce((a, s) => a + s.overtimeMin, 0)),
      });
      totalRow.font = { bold: true };
      totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1E2E" } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado com sucesso");
    } catch (e) {
      toast.error("Erro ao exportar Excel");
    }
  }

  async function exportPDF() {
    if (!reportData) return;
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241);
      doc.text("Agenda Visual de Profissionais", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Relatório Mensal — ${MONTHS[month - 1]} ${year}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 38);

      autoTable(doc, {
        startY: 48,
        head: [["Profissional", "Total", "Normal", "Extra"]],
        body: reportData.summary.map((s) => [
          s.professionalName,
          formatHours(s.totalMin),
          formatHours(s.normalMin),
          formatHours(s.overtimeMin),
        ]),
        foot: [[
          "TOTAL",
          formatHours(reportData.summary.reduce((a, s) => a + s.totalMin, 0)),
          formatHours(reportData.summary.reduce((a, s) => a + s.normalMin, 0)),
          formatHours(reportData.summary.reduce((a, s) => a + s.overtimeMin, 0)),
        ]],
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [30, 30, 46], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        styles: { fontSize: 10 },
      });

      doc.save(`relatorio-${year}-${String(month).padStart(2, "0")}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch (e) {
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
              <h1 className="text-xl font-bold">Relatórios</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Horas normais e extras por profissional</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={!reportData || isLoading}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-400" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={!reportData || isLoading}>
                <FileText className="w-4 h-4 mr-1.5 text-red-400" /> PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-36 bg-input border-border h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="custom">Período</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" && (
              <>
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
              </>
            )}

            {reportType === "custom" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Período:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[280px] justify-start text-left font-normal h-8 text-sm bg-input border-border"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {startDate && endDate ? (
                        <>
                          {format(startDate, "dd/MM/yy")} - {format(endDate, "dd/MM/yy")}
                        </>
                      ) : (
                        <span>Selecione o período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: startDate, to: endDate }}
                      onSelect={(range) => {
                        setStartDate(range?.from);
                        setEndDate(range?.to);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

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

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Atividade:</span>
              <Select value={selectedActivityId} onValueChange={setSelectedActivityId}>
                <SelectTrigger className="w-44 bg-input border-border h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">Todas</SelectItem>
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
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
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
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

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Profissional</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                      <th className="px-4 py-3 text-right font-semibold">Normal</th>
                      <th className="px-4 py-3 text-right font-semibold">Extra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.summary.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-card/50">
                        <td className="px-4 py-3">{row.professionalName}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatHours(row.totalMin)}</td>
                        <td className="px-4 py-3 text-right text-blue-400">{formatHours(row.normalMin)}</td>
                        <td className="px-4 py-3 text-right text-orange-400">{formatHours(row.overtimeMin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
