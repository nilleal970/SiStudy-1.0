import React, { useState, useEffect } from 'react';
import { BookOpen, ListTodo, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Subject } from '../types';

interface EstudosProps {
  subjects: Subject[];
  editalData: any;
  setEditalData: (data: any) => void;
  handleTabChange: (tab: string) => void;
}

const Estudos: React.FC<EstudosProps> = ({ subjects, editalData, setEditalData, handleTabChange }) => {
  const [savedEditais, setSavedEditais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!auth.currentUser) return;
      
      const q = query(collection(db, 'editais'), where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setSavedEditais(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    loadData();
  }, []);

  const openEdital = (data: any) => {
    setEditalData(data);
    handleTabChange('edital');
  };

  const handleAction = (action: 'estudar' | 'revisar', assunto: string) => {
    alert(`${action === 'estudar' ? 'Iniciando estudo' : 'Iniciando revisão'} do tópico: ${assunto}`);
  };

  return (
    <div className="space-y-12">
      {/* Editais Section */}
      <section>
        <h3 className="text-2xl font-black text-stone-900 mb-6 flex items-center gap-3">
          <ListTodo className="w-8 h-8 text-emerald-600" /> Meus Editais
        </h3>
        {savedEditais.length === 0 ? (
          <p className="text-stone-500">Nenhum edital salvo ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedEditais.map((edital) => (
              <div key={edital.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <h4 className="font-bold text-lg text-stone-900">{edital.concurso}</h4>
                <p className="text-sm text-stone-500 mb-4">{edital.cargo}</p>
                <button 
                  onClick={() => openEdital(edital.data)}
                  className="text-emerald-600 font-bold text-sm flex items-center gap-2 hover:text-emerald-700"
                >
                  Abrir Edital <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Conteúdos Section */}
      <section>
        <h3 className="text-2xl font-black text-stone-900 mb-6 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" /> Conteúdos Gerais
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-stone-50 border-b border-stone-100">
                <h4 className="font-bold text-lg text-stone-800">{subject.name}</h4>
              </div>
              <div className="p-6 space-y-4">
                {/* Aqui você listaria os tópicos do subject */}
                <p className="text-sm text-stone-500">Tópicos desta disciplina...</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Estudos;
