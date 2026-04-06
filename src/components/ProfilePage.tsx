import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Shield, BarChart3, CheckCircle, ListTodo, TrendingUp, Palette, Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAllTasks, useCompletedTasksHistory, useCustomCategories } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card neu-flat rounded-2xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl neu-btn flex items-center justify-center" style={{ backgroundColor: `${color}26` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

function CategoryManager() {
  const { categories, addCategory, deleteCategory, updateCategory } = useCustomCategories();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#ff0080");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addCategory(newName.trim(), newColor);
    setNewName("");
    toast({ title: "Categoria criada!" });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    if (updateCategory) {
      await updateCategory(editingId, editName.trim(), editColor);
    }
    setEditingId(null);
    toast({ title: "Categoria atualizada!" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir "${name}"? As tarefas vinculadas perderão a categoria.`)) return;
    await deleteCategory(id);
    toast({ title: "Categoria excluída!" });
  };

  return (
    <div>
      <h4 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" /> Gerenciar Categorias
      </h4>

      {/* Add new */}
      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Nova categoria</Label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome"
            className="bg-secondary border-0 neu-pressed mt-1 rounded-xl"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
        </div>
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-10 h-10 rounded-xl border-0 cursor-pointer"
        />
        <Button onClick={handleAdd} size="sm" className="bg-primary text-primary-foreground rounded-xl neu-btn">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 p-3 rounded-xl neu-flat">
            {editingId === cat.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0"
                />
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-secondary border-0 neu-pressed rounded-xl h-8 text-sm"
                  onKeyDown={e => e.key === "Enter" && handleSaveEdit()}
                />
                <Button size="sm" onClick={handleSaveEdit} className="h-8 text-xs bg-primary text-primary-foreground rounded-lg">
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 text-xs rounded-lg">
                  ✕
                </Button>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 text-sm text-foreground">{cat.name}</span>
                <button
                  onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma categoria criada ainda.</p>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const { tasks: allTasks } = useAllTasks();
  const completedTasks = useCompletedTasksHistory();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const totalTasks = allTasks.length;
  const totalCompleted = completedTasks.length;
  const totalPending = allTasks.filter(t => !t.completed).length;
  const rate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Sua senha foi alterada com sucesso." });
      setNewPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto pt-20">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Conta</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Perfil</h2>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="neu-flat rounded-xl p-1">
          <TabsTrigger value="account" className="rounded-lg text-xs data-[state=active]:neu-pressed">Conta</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg text-xs data-[state=active]:neu-pressed">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card neu-raised rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 neu-flat flex items-center justify-center glow-pink">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-foreground">
                  {user?.user_metadata?.full_name || "Usuário"}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user?.email}
                </p>
              </div>
            </div>

            <div className="border-t border-border/30 pt-4">
              <h4 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" /> Alterar Senha
              </h4>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Nova senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="bg-secondary border-0 neu-pressed mt-1 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={loading || !newPassword}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl neu-btn"
                >
                  {loading ? "..." : "Salvar"}
                </Button>
              </div>
            </div>
          </motion.div>

          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Resumo de Performance</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ListTodo} label="Total de Tarefas" value={String(totalTasks)} color="hsl(var(--neon-blue))" />
            <StatCard icon={CheckCircle} label="Concluídas" value={String(totalCompleted)} color="hsl(var(--neon-green))" />
            <StatCard icon={BarChart3} label="Pendentes" value={String(totalPending)} color="hsl(var(--neon-orange))" />
            <StatCard icon={TrendingUp} label="Taxa de Conclusão" value={`${rate}%`} color="hsl(var(--primary))" />
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card neu-raised rounded-2xl p-6"
          >
            <CategoryManager />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
