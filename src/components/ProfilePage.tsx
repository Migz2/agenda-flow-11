import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Shield, BarChart3, CheckCircle, ListTodo, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAllTasks, useCompletedTasksHistory } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

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
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Conta</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Perfil</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card neu-raised rounded-2xl p-6 mb-6"
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
    </div>
  );
}
