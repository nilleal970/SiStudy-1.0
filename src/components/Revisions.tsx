import React, { useState } from 'react';
import { Revision, Subject } from '../types';
import { Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight, BookOpen, Layers, Zap } from 'lucide-react';
import { format, isToday, isPast, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface RevisionsProps {
  revisions: Revision[];
  subjects: Subject[];
}

const Revisions: React.FC<RevisionsProps> = ({ revisions, subjects }) => {
  const [filterSubject, setFilterSubject] = useState<string | null>(null);

  const getSubject = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId);
  };

  const completeRevision = async (revision: Revision) => {
    try {
      await updateDoc(doc(db, 'revisions', revision.id), { completed: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `revisions/${revision.id}`);
    }

    const nextIntervals: Record<number, number> = {
      1: 7,
      7: 15,
      15: 30,
      30: 30
    };

    const currentInterval = revision.intervalDays ?? 1;
    let nextInterval = nextIntervals[currentInterval];
    
    // Se for maior que 30, continua de 30 em 30
    if (currentInterval >= 30) {
      nextInterval = 30;
    }

    if (nextInterval !== undefined) {
      const today = new Date();
      const nextDate = new Date(today.getTime() + nextInterval * 24 * 60 * 60 * 1000);
      
      try {
        await addDoc(collection(db, 'revisions'), {
          userId: revision.userId,
          subjectId: revision.subjectId,
          topicId: revision.topicId,
          topicName: revision.topicName || 'Assunto',
          scheduledDate: nextDate.toISOString().split('T')[0],
          completed: false,
          intervalDays: nextInterval
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'revisions');
      }
    }
  };

  const getCycleLabel = (interval: number) => {
    if (interval === 0) return 'Imediata';
    return `${interval} dias`;
  };

  const todayRevisions = revisions.filter(r => {
    const subject = getSubject(r.subjectId);
    return isToday(parseISO(r.scheduledDate)) && !subject?.paused;
  });
  const overdueRevisions = revisions.filter(r => {
    const subject = getSubject(r.subjectId);
    return isPast(parseISO(r.scheduledDate)) && !isToday(parseISO(r.scheduledDate)) && !subject?.paused;
  });
  const pendingRevisions = [...overdueRevisions, ...todayRevisions];
  
  const filteredPending = filterSubject 
    ? pendingRevisions.filter(r => r.subjectId === filterSubject)
    : pendingRevisions;

  // Group pending by subject for the sidebar
  const subjectStats = subjects.map(s => ({
    ...s,
    pendingCount: pendingRevisions.filter(r => r.subjectId === s.id).length
  })).filter(s => s.pendingCount > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar: Subject Overview */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <h3 className="text-sm font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Por Disciplina
          </h3>
          <div className="space-y-2">
            <button 
              onClick={() => setFilterSubject(null)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${!filterSubject ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
            >
              <span className="text-sm">Todas</span>
              <span className="text-xs bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">{pendingRevisions.length}</span>
            </button>
            {subjectStats.map(s => (
              <button 
                key={s.id}
                onClick={() => setFilterSubject(s.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${filterSubject === s.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm truncate">{s.name}</span>
                </div>
                <span className="text-xs bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">{s.pendingCount}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-lg shadow-emerald-200 dark:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" />
            <h3 className="font-bold">Dica de Revisão</h3>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed">
            Revisões curtas e frequentes são mais eficazes que uma única revisão longa. Tente revisar cada tópico em 10-15 minutos.
          </p>
        </div>
      </div>

      {/* Main Content: Study Queue */}
      <div className="lg:col-span-3 space-y-8">
        {/* Header Stats */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{overdueRevisions.length}</p>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Atrasadas</p>
            </div>
          </div>
          <div className="flex-1 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white">{todayRevisions.length}</p>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Para Hoje</p>
            </div>
          </div>
          <div className="flex-1 bg-stone-900 p-6 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{revisions.filter(r => r.completed).length}</p>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Concluídas</p>
            </div>
          </div>
        </div>

        {/* Queue List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold dark:text-white">Fila de Estudo</h3>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              {filteredPending.length} itens na fila
            </span>
          </div>

          {filteredPending.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 p-12 rounded-[2.5rem] border border-stone-200 dark:border-stone-800 text-center">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Tudo em dia!</h4>
              <p className="text-stone-500 dark:text-stone-400">Você não tem revisões pendentes {filterSubject ? 'nesta disciplina' : 'para hoje'}.</p>
              {filterSubject && (
                <button 
                  onClick={() => setFilterSubject(null)}
                  className="mt-4 text-emerald-600 font-bold hover:underline"
                >
                  Ver todas as disciplinas
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPending.map((rev, idx) => {
                  const subject = getSubject(rev.subjectId);
                  const isOverdue = isPast(parseISO(rev.scheduledDate)) && !isToday(parseISO(rev.scheduledDate));
                  
                  return (
                    <motion.div 
                      key={rev.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group relative bg-white dark:bg-stone-900 p-6 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 ${
                        isOverdue 
                          ? 'border-red-100 dark:border-red-900/30 hover:border-red-500' 
                          : 'border-stone-100 dark:border-stone-800 hover:border-emerald-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isOverdue ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                          }`}>
                            <BookOpen className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                                {subject?.name}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600">
                                  Atrasado
                                </span>
                              )}
                            </div>
                            <h4 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                              {rev.topicName || 'Assunto do Tópico'}
                            </h4>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                                <Calendar className="w-3.5 h-3.5" />
                                {isToday(parseISO(rev.scheduledDate)) ? 'Hoje' : format(parseISO(rev.scheduledDate), "dd 'de' MMM", { locale: ptBR })}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                                <Clock className="w-3.5 h-3.5" />
                                Ciclo: {getCycleLabel(rev.intervalDays)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => completeRevision(rev)}
                          className="w-12 h-12 rounded-2xl bg-stone-900 dark:bg-emerald-600 text-white flex items-center justify-center hover:scale-110 transition-all active:scale-95 shadow-lg"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Future Preview */}
        <div className="pt-4">
          <h3 className="text-sm font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-4">Próximos Dias</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(dayOffset => {
              const date = addDays(new Date(), dayOffset);
              const dateStr = format(date, 'yyyy-MM-dd');
              const count = revisions.filter(r => r.scheduledDate === dateStr).length;
              
              return (
                <div key={dayOffset} className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">{format(date, 'EEEE', { locale: ptBR })}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold dark:text-white">{format(date, 'dd/MM')}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'}`}>
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revisions;
