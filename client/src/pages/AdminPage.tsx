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
import { Trash2, CheckCircle, XCircle } from "lucide-react";

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
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

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
        setUsers(data.users);
      }

      if (requestersRes.ok) {
        const data = await requestersRes.json();
        setRequesters(data.result?.data || []);
      }

      if (professionalsRes.ok) {
        const data = await professionalsRes.json();
        setProfessionals(data.result?.data || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
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
        toast.error("Erro ao deletar usuário");
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
        toast.error("Erro ao mudar role");
        return;
      }

      toast.success("Role alterado!");
      loadData();
    } catch (error) {
      toast.error("Erro ao mudar role");
    }
  };

  const handleAddRequester = async () => {
    if (!newRequesterName.trim()) {
      toast.error("Nome do solicitante é obrigatório");
      return;
    }

    try {
      const response = await fetch("/api/trpc/requesters.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRequesterName }),
      });

      if (!response.ok) {
        toast.error("Erro ao adicionar solicitante");
        return;
      }

      toast.success("Solicitante adicionado!");
      setNewRequesterName("");
      loadData();
    } catch (error) {
      toast.error("Erro ao adicionar solicitante");
    }
  };

  const handleDeleteRequester = async (requesterId: number) => {
    try {
      const response = await fetch("/api/trpc/requesters.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requesterId }),
      });

      if (!response.ok) {
        toast.error("Erro ao deletar solicitante");
        return;
      }

      toast.success("Solicitante deletado!");
      loadData();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error("Erro ao deletar solicitante");
    }
  };

  const handleUpdateProfessional = async () => {
    if (!editingProf) return;

    try {
      const response = await fetch("/api/trpc/professionals.update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProf.id,
          name: editingProf.name,
        }),
      });

      if (!response.ok) {
        toast.error("Erro ao atualizar profissional");
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Administração</h1>
          <p className="text-slate-400">Gerencie usuários, solicitantes e profissionais</p>
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

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Gerenciamento de Usuários</h2>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-slate-400">Nenhum usuário encontrado</p>
                ) : (
                  users.map((user) => (
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
                          <SelectTrigger className="w-32 bg-slate-600 border-slate-500 text-white">
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

                      {!user.approved && (
                        <div className="ml-4 flex items-center gap-1 text-yellow-400">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm">Pendente</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Requesters Tab */}
          <TabsContent value="requesters" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Adicionar Solicitante</h2>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Nome do solicitante"
                  value={newRequesterName}
                  onChange={(e) => setNewRequesterName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddRequester();
                  }}
                />
                <Button onClick={handleAddRequester} className="bg-blue-600 hover:bg-blue-700">
                  Adicionar
                </Button>
              </div>

              <h2 className="text-xl font-semibold text-white mb-4">Solicitantes</h2>
              <div className="space-y-2">
                {requesters.length === 0 ? (
                  <p className="text-slate-400">Nenhum solicitante encontrado</p>
                ) : (
                  requesters.map((requester) => (
                    <div
                      key={requester.id}
                      className="flex items-center justify-between bg-slate-700 p-4 rounded-lg"
                    >
                      <p className="text-white font-medium">{requester.name}</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirm({ type: "requester", id: requester.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Professionals Tab */}
          <TabsContent value="professionals" className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Editar Profissionais</h2>
              <div className="space-y-2">
                {professionals.length === 0 ? (
                  <p className="text-slate-400">Nenhum profissional encontrado</p>
                ) : (
                  professionals.map((prof) => (
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
                            className="bg-slate-600 border-slate-500 text-white"
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
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingProf(prof)}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
