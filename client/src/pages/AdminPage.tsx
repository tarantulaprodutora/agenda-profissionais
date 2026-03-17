import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, CheckCircle, XCircle, Pencil, Plus, UserPlus, Search } from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "visualizador";
  approved: boolean;
  createdAt: string;
}

interface Requester {
  id: number;
  name: string;
  active: boolean;
}

interface Professional {
  id: number;
  name: string;
  color: string;
  columnOrder: number;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number } | null>(null);

  // Form states
  const [newRequesterName, setNewRequesterName] = useState("");
  const [editingRequester, setEditingRequester] = useState<Requester | null>(null);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Search/filter states
  const [searchUsers, setSearchUsers] = useState("");
  const [searchRequesters, setSearchRequesters] = useState("");
  const [searchProfessionals, setSearchProfessionals] = useState("");

  // New user form states
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "visualizador">("visualizador");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, requestersRes, professionalsRes] = await Promise.all([
        fetch("/api/auth/users"),
        fetch("/api/trpc/requesters.list"),
        fetch("/api/trpc/professionals.list"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (requestersRes.ok) {
        const data = await requestersRes.json();
        const list = data.result?.data?.json || data.result?.data || [];
        setRequesters(Array.isArray(list) ? list : []);
      }

      if (professionalsRes.ok) {
        const data = await professionalsRes.json();
        const list = data.result?.data?.json || data.result?.data || [];
        setProfessionals(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // ─── User Management ─────────────────────────────────────────────────────────

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Erro ao criar usuário");
        return;
      }

      toast.success("Usuário criado com sucesso!");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("visualizador");
      setShowNewUserForm(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao criar usuário");
    }
  };

  const handleApproveUser = async (userId: number) => {
    try {
      const response = await fetch("/api/auth/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        toast.error("Erro ao aprovar usuário");
        return;
      }

      toast.success("Usuário aprovado!");
      loadData();
    } catch (error) {
      toast.error("Erro ao aprovar usuário");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Erro ao deletar usuário");
        setDeleteConfirm(null);
        return;
      }

      toast.success("Usuário deletado!");
      loadData();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Erro ao deletar usuário");
    }
  };

  const handleChangeRole = async (userId: number, newRole: "admin" | "visualizador") => {
    try {
      const response = await fetch("/api/auth/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Erro ao mudar role");
        loadData(); // Reload to revert the UI
        return;
      }

      toast.success("Role alterado!");
      loadData();
    } catch (error) {
      toast.error("Erro ao mudar role");
    }
  };

  // ─── Requester Management ────────────────────────────────────────────────────

  const handleAddRequester = async () => {
    if (!newRequesterName.trim()) {
      toast.error("Nome do solicitante é obrigatório");
      return;
    }

    try {
      const response = await fetch("/api/trpc/requesters.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { name: newRequesterName } }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error?.json?.message || "Erro ao adicionar solicitante");
        return;
      }

      toast.success("Solicitante adicionado!");
      setNewRequesterName("");
      loadData();
    } catch (error) {
      toast.error("Erro ao adicionar solicitante");
    }
  };

  const handleUpdateRequester = async () => {
    if (!editingRequester || !editingRequester.name.trim()) {
      toast.error("Nome do solicitante é obrigatório");
      return;
    }

    try {
      const response = await fetch("/api/trpc/requesters.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { id: editingRequester.id, name: editingRequester.name } }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error?.json?.message || "Erro ao atualizar solicitante");
        return;
      }

      toast.success("Solicitante atualizado!");
      setEditingRequester(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar solicitante");
    }
  };

  const handleDeleteRequester = async (requesterId: number) => {
    try {
      const response = await fetch("/api/trpc/requesters.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { id: requesterId } }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error?.json?.message || "Erro ao deletar solicitante");
        return;
      }

      toast.success("Solicitante deletado!");
      loadData();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Erro ao deletar solicitante");
    }
  };

  // ─── Professional Management ─────────────────────────────────────────────────

  const handleUpdateProfessional = async () => {
    if (!editingProf) return;

    try {
      const response = await fetch("/api/trpc/professionals.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            id: editingProf.id,
            name: editingProf.name,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error?.json?.message || "Erro ao atualizar profissional");
        return;
      }

      toast.success("Profissional atualizado!");
      setEditingProf(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar profissional");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Administração</h1>
            <p className="text-slate-400">Gerencie usuários, solicitantes e profissionais</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="text-slate-300 border-slate-600 hover:bg-slate-700"
            >
              Voltar à Agenda
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                fetch("/api/auth/logout", { method: "POST" }).then(() => {
                  window.location.href = "/login";
                });
              }}
              className="text-slate-400 hover:text-white"
            >
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="users" className="text-slate-300">
              Usuários
            </TabsTrigger>
            <TabsTrigger value="requesters" className="text-slate-300">
              Solicitantes
            </TabsTrigger>
            <TabsTrigger value="professionals" className="text-slate-300">
              Profissionais
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ Users Tab ═══════════════════ */}
          <TabsContent value="users" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Gerenciamento de Usuários</h2>
                <Button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>

              {/* New User Form */}
              {showNewUserForm && (
                <div className="bg-slate-700 rounded-lg p-4 mb-4 border border-slate-600">
                  <h3 className="text-lg font-medium text-white mb-3">Criar Novo Usuário</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <Input
                      placeholder="Nome completo"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
                    />
                    <Input
                      placeholder="Senha"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
                    />
                    <Select
                      value={newUserRole}
                      onValueChange={(value) => setNewUserRole(value as "admin" | "visualizador")}
                    >
                      <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="visualizador" className="text-white">
                          Visualizador (somente leitura)
                        </SelectItem>
                        <SelectItem value="admin" className="text-white">
                          Admin (acesso total)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateUser} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Criar Usuário
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewUserForm(false);
                        setNewUserName("");
                        setNewUserEmail("");
                        setNewUserPassword("");
                        setNewUserRole("visualizador");
                      }}
                      className="text-slate-300 border-slate-500"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Users */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                />
              </div>

              {/* Pending Users Section */}
              {(() => {
                const pendingUsers = users.filter((u) => !u.approved && u.name.toLowerCase().includes(searchUsers.toLowerCase()));
                if (pendingUsers.length === 0) return null;
                return (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-yellow-400 mb-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Aguardando Aprovação ({pendingUsers.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between bg-yellow-900/20 border border-yellow-700/40 p-4 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-slate-400 text-sm">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveUser(user.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "user", id: user.id })}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Approved Users List */}
              <h3 className="text-lg font-medium text-white mb-3">Usuários Ativos</h3>
              <div className="space-y-2">
                {(() => {
                  const approvedFiltered = users.filter((u) => u.approved && u.name.toLowerCase().includes(searchUsers.toLowerCase()));
                  if (approvedFiltered.length === 0) return <p className="text-slate-400">Nenhum usuário encontrado</p>;
                  return approvedFiltered.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-slate-700 p-4 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!user.approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveUser(user.id)}
                            className="text-green-400 border-green-400 hover:bg-green-400/10"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                        )}

                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleChangeRole(user.id, value as "admin" | "visualizador")
                          }
                        >
                          <SelectTrigger className="w-36 bg-slate-600 border-slate-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="admin" className="text-white">
                              Admin
                            </SelectItem>
                            <SelectItem value="visualizador" className="text-white">
                              Visualizador
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirm({ type: "user", id: user.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>
                  ));
                })()}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════ Requesters Tab ═══════════════════ */}
          <TabsContent value="requesters" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Adicionar Solicitante</h2>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Nome do solicitante"
                  value={newRequesterName}
                  onChange={(e) => setNewRequesterName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRequester();
                  }}
                />
                <Button onClick={handleAddRequester} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Solicitantes</h2>
                <span className="text-sm text-slate-400">{requesters.length} total</span>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar solicitantes..."
                  value={searchRequesters}
                  onChange={(e) => setSearchRequesters(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                />
              </div>
              <div className="space-y-2">
                {(() => {
                  const filtered = requesters.filter((r) => r.name.toLowerCase().includes(searchRequesters.toLowerCase()));
                  if (filtered.length === 0) return <p className="text-slate-400">Nenhum solicitante encontrado</p>;
                  return filtered.map((requester) => (
                    <div
                      key={requester.id}
                      className="flex items-center justify-between bg-slate-700 p-4 rounded-lg"
                    >
                      <div className="flex-1">
                        {editingRequester?.id === requester.id ? (
                          <Input
                            value={editingRequester.name}
                            onChange={(e) =>
                              setEditingRequester({ ...editingRequester, name: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateRequester();
                              if (e.key === "Escape") setEditingRequester(null);
                            }}
                            className="bg-slate-600 border-slate-500 text-white"
                            autoFocus
                          />
                        ) : (
                          <p className="text-white font-medium">{requester.name}</p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {editingRequester?.id === requester.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleUpdateRequester}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRequester(null)}
                              className="text-slate-300 border-slate-500"
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRequester(requester)}
                              className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteConfirm({ type: "requester", id: requester.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════ Professionals Tab ═══════════════════ */}
          <TabsContent value="professionals" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Editar Profissionais</h2>
                <span className="text-sm text-slate-400">{professionals.length} total</span>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar profissionais..."
                  value={searchProfessionals}
                  onChange={(e) => setSearchProfessionals(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
                />
              </div>
              <div className="space-y-2">
                {(() => {
                  const filtered = professionals.filter((p) => p.name.toLowerCase().includes(searchProfessionals.toLowerCase()));
                  if (filtered.length === 0) return <p className="text-slate-400">Nenhum profissional encontrado</p>;
                  return filtered.map((prof) => (
                    <div
                      key={prof.id}
                      className="flex items-center justify-between bg-slate-700 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: prof.color }}
                        />
                        {editingProf?.id === prof.id ? (
                          <Input
                            value={editingProf.name}
                            onChange={(e) =>
                              setEditingProf({ ...editingProf, name: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateProfessional();
                              if (e.key === "Escape") setEditingProf(null);
                            }}
                            className="bg-slate-600 border-slate-500 text-white"
                            autoFocus
                          />
                        ) : (
                          <p className="text-white font-medium">{prof.name}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {editingProf?.id === prof.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleUpdateProfessional}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingProf(null)}
                              className="text-slate-300 border-slate-500"
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingProf(prof)}
                            className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Tem certeza que deseja deletar este item? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirm?.type === "user") {
                  handleDeleteUser(deleteConfirm.id);
                } else if (deleteConfirm?.type === "requester") {
                  handleDeleteRequester(deleteConfirm.id);
                }
              }}
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
