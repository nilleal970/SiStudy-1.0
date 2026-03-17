import React, { useState, useEffect } from 'react';
import { Subject, Topic } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Plus, Search, Book, MoreVertical, Trash2, Edit2, CheckCircle, Circle, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';

interface ContentsProps {
  subjects: Subject[];
}

const Contents: React.FC<ContentsProps> = ({ subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!selectedSubject || !auth.currentUser) return;

    const topicsQuery = query(
      collection(db, 'topics'), 
      where('subjectId', '==', selectedSubject.id),
      where('userId', '==', auth.currentUser.uid)
    );
    
    const unsub = onSnapshot(topicsQuery, (snapshot) => {
      setTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    });

    return () => unsub();
  }, [selectedSubject]);

  const handleAddSubject = async () => {
    if (!newSubjectName || !auth.currentUser) return;
    await addDoc(collection(db, 'subjects'), {
      userId: auth.currentUser.uid,
      name: newSubjectName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      totalTopics: 0,
      completedTopics: 0
    });
    setNewSubjectName('');
    setIsAddingSubject(false);
  };

  const handleAddTopic = async () => {
    if (!newTopicName || !selectedSubject || !auth.currentUser) return;
    await addDoc(collection(db, 'topics'), {
      userId: auth.currentUser.uid,
      subjectId: selectedSubject.id,
      name: newTopicName,
      status: 'not_started',
      importance: 3
    });
    
    // Update subject total topics
    await updateDoc(doc(db, 'subjects', selectedSubject.id), {
      totalTopics: selectedSubject.totalTopics + 1
    });

    setNewTopicName('');
    setIsAddingTopic(false);
  };

  const toggleTopicStatus = async (topic: Topic) => {
    const nextStatus: Record<string, any> = {
      'not_started': 'studying',
      'studying': 'completed',
      'completed': 'not_started',
      'reviewed': 'completed', // Fallback for legacy data
      'mastered': 'not_started' // Fallback for legacy data
    };
    
    const newStatus = nextStatus[topic.status] || 'not_started';
    try {
      await updateDoc(doc(db, 'topics', topic.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `topics/${topic.id}`);
    }

    // Create a revision if moving to completed
    if (newStatus === 'completed') {
      const tomorrow = addDays(new Date(), 1);
      const dateStr = format(tomorrow, 'yyyy-MM-dd');

      // Check if a revision for this topic already exists for this date
      const q = query(
        collection(db, 'revisions'), 
        where('topicId', '==', topic.id),
        where('scheduledDate', '==', dateStr),
        where('completed', '==', false),
        where('userId', '==', auth.currentUser?.uid)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revisions');
      }

      if (snapshot && snapshot.empty) {
        try {
          await addDoc(collection(db, 'revisions'), {
            userId: auth.currentUser?.uid,
            subjectId: topic.subjectId,
            topicId: topic.id,
            topicName: topic.name,
            scheduledDate: dateStr,
            completed: false,
            intervalDays: 1
          });
          setToast(`Revisão agendada para ${format(tomorrow, 'dd/MM')}`);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'revisions');
        }
      }
    }

    // Update subject completed count
    if (newStatus === 'completed' && topic.status !== 'completed') {
      await updateDoc(doc(db, 'subjects', topic.subjectId), {
        completedTopics: selectedSubject!.completedTopics + 1
      });
    } else if (topic.status === 'completed' && newStatus !== 'completed') {
      await updateDoc(doc(db, 'subjects', topic.subjectId), {
        completedTopics: Math.max(0, selectedSubject!.completedTopics - 1)
      });
    }
  };

  const toggleSubjectPause = async (e: React.MouseEvent, subject: Subject) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'subjects', subject.id), {
      paused: !subject.paused
    });
  };

  const statusLabels: Record<string, string> = {
    'not_started': 'Não Iniciado',
    'studying': 'Estudando',
    'completed': 'Concluído',
    'reviewed': 'Concluído', // Legacy
    'mastered': 'Não Iniciado' // Legacy
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
      {/* Subjects List */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col h-[400px] lg:h-[calc(100vh-250px)]">
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h3 className="font-bold text-lg dark:text-white">Disciplinas</h3>
          <button 
            onClick={() => setIsAddingSubject(true)}
            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isAddingSubject && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 mb-4">
              <input 
                autoFocus
                type="text" 
                placeholder="Nome da disciplina..."
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 mb-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              />
              <div className="flex gap-2">
                <button onClick={handleAddSubject} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Salvar</button>
                <button onClick={() => setIsAddingSubject(false)} className="flex-1 py-2 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-bold">Cancelar</button>
              </div>
            </div>
          )}

          {subjects.map((subject) => (
            <div key={subject.id} className="relative group/subject">
              <button
                onClick={() => setSelectedSubject(subject)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  selectedSubject?.id === subject.id 
                    ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-600 shadow-lg' 
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-100 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-600'
                } ${subject.paused ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                    <span className="font-bold truncate max-w-[120px]">{subject.name}</span>
                    {subject.paused && (
                      <span className="text-[8px] font-black bg-stone-200 dark:bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Pausado</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedSubject?.id === subject.id ? 'text-stone-400 dark:text-emerald-100' : 'text-stone-300 dark:text-stone-600'}`}>
                    {subject.completedTopics}/{subject.totalTopics}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${(subject.completedTopics / subject.totalTopics) * 100 || 0}%` }} 
                  />
                </div>
              </button>
              <button 
                onClick={(e) => toggleSubjectPause(e, subject)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl opacity-0 group-hover/subject:opacity-100 transition-all ${
                  subject.paused ? 'bg-emerald-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-600'
                }`}
                title={subject.paused ? "Retomar Estudos" : "Pausar Estudos"}
              >
                {subject.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col h-[500px] lg:h-[calc(100vh-250px)]">
        {selectedSubject ? (
          <>
            <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
                <h3 className="font-bold text-xl dark:text-white">{selectedSubject.name}</h3>
              </div>
              <button 
                onClick={() => setIsAddingTopic(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm"
              >
                <Plus className="w-4 h-4" /> Novo Assunto
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {isAddingTopic && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-stone-200 dark:border-stone-700 mb-6"
                  >
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Nome do assunto (ex: Crase, Concordância Verbal)..."
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl px-6 py-3 mb-4 outline-none focus:ring-2 focus:ring-emerald-500 text-lg dark:text-white"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                    />
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setIsAddingTopic(false)} className="px-6 py-2 text-stone-500 dark:text-stone-400 font-bold">Cancelar</button>
                      <button onClick={handleAddTopic} className="px-8 py-2 bg-stone-900 dark:bg-emerald-600 text-white rounded-xl font-bold">Adicionar</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {topics.length === 0 && !isAddingTopic ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-600">
                  <Book className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-medium">Nenhum assunto cadastrado ainda.</p>
                </div>
              ) : (
                topics.map((topic) => (
                  <div 
                    key={topic.id}
                    className="group flex items-center justify-between p-5 rounded-2xl border border-stone-100 dark:border-stone-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTopicStatus(topic)}
                        className="transition-transform active:scale-90"
                      >
                        {topic.status === 'completed' || topic.status === 'reviewed' ? (
                          <CheckCircle className="w-7 h-7 text-emerald-500" />
                        ) : (
                          <Circle className={`w-7 h-7 ${topic.status === 'not_started' || topic.status === 'mastered' ? 'text-stone-200 dark:text-stone-800' : 'text-emerald-300 dark:text-emerald-700'}`} />
                        )}
                      </button>
                      <div>
                        <h4 className={`font-bold text-lg ${topic.status === 'completed' || topic.status === 'reviewed' ? 'text-stone-400 dark:text-stone-600 line-through' : 'text-stone-800 dark:text-stone-200'}`}>
                          {topic.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            topic.status === 'not_started' ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400' :
                            topic.status === 'studying' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {statusLabels[topic.status]}
                          </span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-1 h-3 rounded-full ${i < topic.importance ? 'bg-stone-300 dark:bg-stone-600' : 'bg-stone-100 dark:bg-stone-800'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"><Edit2 className="w-4 h-4" /></button>
                      <button 
                        onClick={() => deleteDoc(doc(db, 'topics', topic.id))}
                        className="p-2 text-stone-400 hover:text-red-500"
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-600 p-12 text-center">
            <div className="w-24 h-24 bg-stone-50 dark:bg-stone-800 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Selecione uma disciplina</h3>
            <p className="max-w-xs">Escolha uma disciplina ao lado para gerenciar seus assuntos e progresso de estudo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contents;
