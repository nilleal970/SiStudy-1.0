import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { Revision, Subject } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface StudyCalendarProps {
  revisions: Revision[];
  subjects: Subject[];
}

const StudyCalendar: React.FC<StudyCalendarProps> = ({ revisions, subjects }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm">Calendário de Revisões Agendadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-400 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-stone-600 dark:text-stone-400 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows = [];
    let days = [];

    calendarDays.forEach((day, i) => {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const dayRevisions = revisions.filter(r => r.scheduledDate === formattedDate);

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[120px] p-2 border border-stone-100 dark:border-stone-800 transition-all ${
            !isSameMonth(day, monthStart) 
              ? 'bg-stone-50/50 dark:bg-stone-900/20 text-stone-300 dark:text-stone-700' 
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300'
          } ${isToday(day) ? 'ring-2 ring-inset ring-emerald-500/50' : ''}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-bold ${isToday(day) ? 'w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center' : ''}`}>
              {format(day, 'd')}
            </span>
            {dayRevisions.length > 0 && (
              <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                {dayRevisions.length}
              </span>
            )}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayRevisions.map((rev) => {
              const subject = subjects.find(s => s.id === rev.subjectId);
              const isPaused = subject?.paused;
              return (
                <div 
                  key={rev.id}
                  className={`text-[10px] p-1.5 rounded-lg border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex items-center gap-1.5 truncate ${isPaused ? 'opacity-40 grayscale' : ''}`}
                  title={isPaused ? `${subject?.name} (Pausado)` : subject?.name}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color || '#ccc' }} />
                  <span className="truncate font-medium">{rev.topicName || subject?.name || 'Disciplina'}</span>
                </div>
              );
            })}
          </div>
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div className="grid grid-cols-7" key={day.toString()}>
            {days}
          </div>
        );
        days = [];
      }
    });

    return <div className="rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">{rows}</div>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      {renderHeader()}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-sm">
        {renderDays()}
        {renderCells()}
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-6 p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700" />
          <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Outro Mês</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Total de revisões este mês: <span className="font-bold text-emerald-600">
              {revisions.filter(r => isSameMonth(parseISO(r.scheduledDate), currentMonth)).length}
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default StudyCalendar;
