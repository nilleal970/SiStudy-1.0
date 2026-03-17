import React from 'react';
import { UserProfile, Subject, StudySession, Revision } from '../types';
import { 
  Clock, 
  Calendar, 
  Target, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  profile: UserProfile | null;
  subjects: Subject[];
  sessions: StudySession[];
  revisions: Revision[];
}

const Dashboard: React.FC<DashboardProps> = ({ profile, subjects, sessions, revisions }) => {
  // Calculate stats
  const today = new Date();
  const todaySessions = sessions.filter(s => isSameDay(new Date(s.startTime), today));
  const todayHours = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
  
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekSessions = sessions.filter(s => {
    const date = new Date(s.startTime);
    return date >= weekStart && date <= weekEnd;
  });
  const weekHours = weekSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;

  // Prepare chart data
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const chartData = daysInWeek.map(day => {
    const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
    const hours = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60;
    return {
      name: format(day, 'EEE', { locale: ptBR }),
      hours: parseFloat(hours.toFixed(1))
    };
  });

  const stats = [
    { label: 'Hoje', value: `${todayHours.toFixed(1)}h`, goal: `${profile?.dailyGoalHours || 4}h`, icon: Clock, color: 'bg-emerald-500' },
    { label: 'Esta Semana', value: `${weekHours.toFixed(1)}h`, goal: `${profile?.weeklyGoalHours || 24}h`, icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Revisões', value: revisions.length, goal: 'Pendentes', icon: Calendar, color: 'bg-orange-500' },
    { label: 'Progresso', value: `${subjects.length > 0 ? Math.round((subjects.reduce((acc, s) => acc + s.completedTopics, 0) / subjects.reduce((acc, s) => acc + s.totalTopics, 0)) * 100) || 0 : 0}%`, goal: 'Total Edital', icon: Target, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Motivation Card */}
      <div className="bg-stone-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-emerald-400 font-medium mb-2 flex items-center gap-2 text-sm md:text-base">
            <CheckCircle2 className="w-4 h-4" /> Insight da IA
          </h3>
          <p className="text-lg md:text-2xl font-medium max-w-2xl leading-relaxed">
            "Você já estudou {weekHours.toFixed(1)}h esta semana. Faltam apenas {(profile?.weeklyGoalHours || 24) - weekHours > 0 ? ((profile?.weeklyGoalHours || 24) - weekHours).toFixed(1) : 0}h para bater sua meta. Mantenha o foco em Direito Administrativo hoje!"
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-stone-900 dark:text-white">{stat.value}</span>
              <span className="text-stone-400 dark:text-stone-500 text-sm">/ {stat.goal}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold dark:text-white">Evolução de Estudos</h3>
            <select className="bg-stone-50 dark:bg-stone-800 border-none rounded-lg text-sm font-medium px-3 py-1 dark:text-stone-300">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                <Tooltip 
                  labelFormatter={(value) => `Dia: ${value}`}
                  formatter={(value) => [`${value}h`, 'Tempo']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white">
              <AlertCircle className="w-5 h-5 text-orange-500" /> Alertas
            </h3>
            <div className="space-y-4">
              {revisions.length > 0 ? (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Você tem {revisions.length} revisões pendentes para hoje.</p>
                  <button className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 hover:underline">
                    REVISAR AGORA <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Tudo em dia! Nenhuma revisão pendente.</p>
                </div>
              )}
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Sugerimos focar em Português: sua taxa de acertos caiu 15%.</p>
                <button className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                  VER DESEMPENHO <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-emerald-600 p-8 rounded-3xl text-white shadow-lg shadow-emerald-200">
            <h3 className="text-xl font-bold mb-2">Próximo Simulado</h3>
            <p className="text-emerald-100 text-sm mb-6">Recomendado pela IA com base no seu progresso atual.</p>
            <button className="w-full py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors">
              Iniciar Simulado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
