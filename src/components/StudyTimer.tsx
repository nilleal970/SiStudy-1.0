import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Save, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudyTimerProps {
  subjects: Subject[];
}

const StudyTimer: React.FC<StudyTimerProps> = ({ subjects }) => {
  const [mode, setMode] = useState<'study' | 'break'>('study');
  const [type, setType] = useState<'timer' | 'pomodoro'>('timer');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [customTime, setCustomTime] = useState(25);
  const [isActive, setIsActive] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }
    const topicsQuery = query(
      collection(db, 'topics'),
      where('subjectId', '==', selectedSubjectId),
      where('userId', '==', auth.currentUser?.uid)
    );
    getDocs(topicsQuery).then(snapshot => {
      setTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    });
  }, [selectedSubjectId]);
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (type === 'pomodoro') {
          if (timeLeft > 0) {
            setTimeLeft((prev) => prev - 1);
          } else {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (mode === 'study') {
              alert('Tempo de estudo concluído! Hora de uma pausa.');
              setMode('break');
              setTimeLeft(5 * 60);
            } else {
              alert('Pausa concluída! Vamos voltar aos estudos?');
              setMode('study');
              setTimeLeft(customTime * 60);
            }
          }
        } else {
          // Timer mode: count up
          setTimeLeft((prev) => prev + 1);
        }
        
        if (mode === 'study') setTotalSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, type, customTime]);

  const toggleTimer = () => {
    if (!isActive && !startTime) {
      setStartTime(new Date());
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(type === 'pomodoro' ? customTime * 60 : 0);
    setTotalSeconds(0);
    setStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveSession = async () => {
    if (!selectedSubjectId || totalSeconds < 10 || !auth.currentUser) {
      alert('Selecione uma disciplina e estude pelo menos 10 segundos.');
      return;
    }

    try {
      await addDoc(collection(db, 'sessions'), {
        userId: auth.currentUser.uid,
        subjectId: selectedSubjectId,
        topicId: selectedTopicId || null,
        durationMinutes: Math.round(totalSeconds / 60),
        startTime: startTime?.toISOString(),
        endTime: new Date().toISOString(),
        type: type
      });
      setToast('Sessão de estudo salva com sucesso!');
      resetTimer();
    } catch (error) {
      console.error('Error saving session:', error);
      setToast('Erro ao salvar sessão.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg font-bold z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Timer Display */}
        <div className="flex flex-col items-center">
          <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="stroke-stone-200 fill-none"
                strokeWidth="8"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="45%"
                className={`fill-none transition-colors duration-500 ${mode === 'study' ? 'stroke-emerald-500' : 'stroke-blue-500'}`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="100 100"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: type === 'pomodoro' ? (timeLeft / (25 * 60)) * 100 : 0 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-6xl md:text-8xl font-black tracking-tighter text-stone-900">
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-stone-400 mt-2">
                {mode === 'study' ? 'Foco Total' : 'Descanso'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-12">
            <button 
              onClick={resetTimer}
              className="p-4 bg-stone-100 text-stone-600 rounded-2xl hover:bg-stone-200 transition-all active:scale-90"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button 
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${
                isActive ? 'bg-stone-900' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isActive ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
            </button>
            <button 
              onClick={() => setMode(mode === 'study' ? 'break' : 'study')}
              className="p-4 bg-stone-100 text-stone-600 rounded-2xl hover:bg-stone-200 transition-all active:scale-90"
            >
              {mode === 'study' ? <Coffee className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Controls & Settings */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Timer className="w-5 h-5 text-emerald-600" /> Configurações
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Modo de Estudo</label>
                <div className="flex p-1 bg-stone-100 rounded-xl">
                  <button 
                    onClick={() => { setType('timer'); setTimeLeft(0); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'timer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                  >
                    Cronômetro
                  </button>
                  <button 
                    onClick={() => { setType('pomodoro'); setTimeLeft(customTime * 60); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'pomodoro' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                  >
                    Pomodoro
                  </button>
                </div>
              </div>

              {type === 'pomodoro' && (
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Tempo (minutos)</label>
                  <input 
                    type="number"
                    value={customTime}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setCustomTime(val);
                      if (!isActive) setTimeLeft(val * 60);
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Disciplina Atual</label>
                <select 
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium mb-3"
                >
                  <option value="">Selecione uma disciplina...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select 
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  disabled={!selectedSubjectId}
                >
                  <option value="">Selecione um assunto (opcional)...</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSaveSession}
                  disabled={totalSeconds < 10}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Save className="w-5 h-5" /> Salvar Sessão
                </button>
                <p className="text-center text-xs text-stone-400 mt-3">
                  {totalSeconds > 0 ? `Tempo acumulado: ${totalSeconds >= 60 ? Math.floor(totalSeconds / 60) + ' min' : totalSeconds + ' seg'}` : 'Inicie o timer para registrar seu tempo.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 mb-2">Dica de Produtividade</h4>
            <p className="text-sm text-emerald-700 leading-relaxed">
              O método Pomodoro ajuda a manter o foco intenso por 25 minutos, seguidos de 5 minutos de descanso para recarregar o cérebro. Experimente!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyTimer;
