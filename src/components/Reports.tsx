import React from 'react';
import { StudySession, Subject } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';

interface ReportsProps {
  sessions: StudySession[];
  subjects: Subject[];
}

const Reports: React.FC<ReportsProps> = ({ sessions, subjects }) => {
  // Aggregate data by subject
  const subjectStats = subjects.map(s => {
    const subjectSessions = sessions.filter(sess => sess.subjectId === s.id);
    const totalMinutes = subjectSessions.reduce((acc, sess) => acc + sess.durationMinutes, 0);
    return {
      name: s.name,
      hours: parseFloat((totalMinutes / 60).toFixed(1)),
      color: s.color
    };
  }).filter(s => s.hours > 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Distribution by Subject */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Distribuição por Disciplina
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="hours"
                >
                  {subjectStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {subjectStats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-medium text-stone-600 truncate">{s.name}</span>
                <span className="text-xs font-bold text-stone-400 ml-auto">{s.hours}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Productivity Stats */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Produtividade
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Média Diária</p>
                  <p className="text-xl font-bold text-stone-800">4.2h</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600">+12% vs semana passada</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Meta Semanal</p>
                  <p className="text-xl font-bold text-stone-800">85% atingida</p>
                </div>
              </div>
              <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[85%]" />
              </div>
            </div>

            <div className="p-6 bg-stone-900 rounded-2xl text-white">
              <h4 className="font-bold mb-2">Insight da IA</h4>
              <p className="text-sm text-stone-400 leading-relaxed">
                Seu melhor horário de estudo é entre 09:00 e 11:00. Você mantém 20% mais foco nesse período. Tente alocar as matérias mais difíceis para esse horário.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-bold text-lg">Histórico de Sessões</h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Disciplina</th>
              <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Duração</th>
              <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sessions.slice(0, 10).map(sess => (
              <tr key={sess.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 text-stone-600">{new Date(sess.startTime).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 font-bold text-stone-800">{subjects.find(s => s.id === sess.subjectId)?.name || 'Disciplina'}</td>
                <td className="px-6 py-4 text-stone-600">{sess.durationMinutes} min</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-stone-100 rounded text-[10px] font-bold text-stone-500 uppercase">{sess.type}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
