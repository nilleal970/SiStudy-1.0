import React, { useState, useEffect } from 'react';
import { Subject, Topic } from '../types';
import { GoogleGenAI } from "@google/genai";
import { ClipboardList, Brain, Sparkles, Play, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';

interface SimuladosProps {
  subjects: Subject[];
}

const Simulados: React.FC<SimuladosProps> = ({ subjects }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<any>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [simuladoMode, setSimuladoMode] = useState<'specific' | 'mixed' | 'general'>('specific');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedBanca, setSelectedBanca] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(5);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'topics'), where('userId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    });
    return () => unsub();
  }, []);

  const generateSimulado = async () => {
    if (!selectedBanca) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let promptContext = '';
      if (simuladoMode === 'general') {
        promptContext = `todas as disciplinas estudadas: ${subjects.map(s => s.name).join(', ')}`;
      } else if (simuladoMode === 'mixed') {
        const subNames = subjects.filter(s => selectedSubjectIds.includes(s.id)).map(s => s.name).join(', ');
        const topNames = topics.filter(t => selectedTopicIds.includes(t.id)).map(t => t.name).join(', ');
        promptContext = `as seguintes disciplinas: ${subNames}${topNames ? ` e assuntos: ${topNames}` : ''}`;
      } else {
        const subName = subjects.find(s => s.id === selectedSubjectIds[0])?.name;
        const topName = topics.find(t => t.id === selectedTopicIds[0])?.name;
        promptContext = `a disciplina ${subName}${topName ? ` e assunto ${topName}` : ''}`;
      }

      const prompt = `Gere um simulado de concurso com ${numQuestions} questões de múltipla escolha sobre ${promptContext}, focando no estilo da banca ${selectedBanca}. 
      Retorne no formato JSON: [{ "question": "texto", "options": ["a", "b", "c", "d"], "correctIndex": 0, "subject": "disciplina", "explanation": "explicação" }]`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '[]');
      setQuestions(data);
      setExamStarted(true);
    } catch (error) {
      console.error('Error generating simulado:', error);
      setQuestions([
        {
          question: "Qual o prazo para a administração pública anular seus próprios atos, quando eivados de vícios que os tornem ilegais?",
          options: ["2 anos", "5 anos", "10 anos", "A qualquer tempo"],
          correctIndex: 1,
          subject: "Direito Administrativo",
          explanation: "Conforme a Lei 9.784/99, o prazo decadencial é de 5 anos."
        }
      ]);
      setExamStarted(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
  };

  const finishExam = () => {
    const correctCount = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
    setResults({
      score: (correctCount / questions.length) * 100,
      correct: correctCount,
      total: questions.length
    });
  };

  if (results) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl border border-stone-200 shadow-xl"
        >
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${results.score >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
            {results.score >= 70 ? <CheckCircle2 className="w-12 h-12" /> : <History className="w-12 h-12" />}
          </div>
          <h2 className="text-4xl font-black text-stone-900 mb-2">{results.score}%</h2>
          <p className="text-stone-500 mb-8">Você acertou {results.correct} de {results.total} questões.</p>
          
          <div className="grid grid-cols-1 gap-4 text-left mb-8">
            {questions.map((q, i) => (
              <div key={i} className="p-4 rounded-xl border border-stone-100 bg-stone-50">
                <div className="flex items-start gap-3">
                  {answers[i] === q.correctIndex ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1" /> : <XCircle className="w-5 h-5 text-red-500 mt-1" />}
                  <div>
                    <p className="font-bold text-stone-800 mb-2">{q.question}</p>
                    <p className="text-sm text-stone-500 italic">Sua resposta: {q.options[answers[i]]}</p>
                    <p className="text-sm text-emerald-600 font-bold">Correta: {q.options[q.correctIndex]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => { setResults(null); setExamStarted(false); setAnswers({}); setCurrentQuestionIndex(0); }}
            className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
          >
            Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  if (examStarted) {
    const q = questions[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-widest">
              Questão {currentQuestionIndex + 1}/{questions.length}
            </span>
            <span className="text-stone-400 font-medium text-sm">{q.subject}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">14:52</span>
          </div>
        </div>

        <motion.div 
          key={currentQuestionIndex}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm mb-8"
        >
          <h3 className="text-xl font-bold text-stone-900 mb-8 leading-relaxed">{q.question}</h3>
          <div className="space-y-3">
            {q.options.map((option: string, i: number) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 ${
                  answers[currentQuestionIndex] === i 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' 
                    : 'bg-white border-stone-100 hover:border-stone-300 text-stone-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm ${
                  answers[currentQuestionIndex] === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 text-stone-400'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                {option}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex justify-between items-center">
          <button 
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            className="px-6 py-3 text-stone-500 font-bold disabled:opacity-30"
          >
            Anterior
          </button>
          
          {currentQuestionIndex === questions.length - 1 ? (
            <button 
              onClick={finishExam}
              className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
            >
              Finalizar Simulado
            </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              Próxima
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
            <ClipboardList className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-stone-900 mb-4 leading-tight">Simulados Inteligentes com IA</h2>
          <p className="text-stone-500 text-lg mb-8 leading-relaxed">
            Nossa IA gera questões baseadas no seu progresso, focando nos seus pontos fracos e seguindo o estilo das principais bancas examinadoras.
          </p>
          
          <div className="space-y-4 mb-8">
            <select 
              value={simuladoMode} 
              onChange={(e) => { 
                setSimuladoMode(e.target.value as any);
                setSelectedSubjectIds([]);
                setSelectedTopicIds([]);
              }}
              className="w-full p-4 rounded-2xl border border-stone-200 bg-white"
            >
              <option value="specific">Simulado por Disciplina</option>
              <option value="mixed">Simulado Mesclado</option>
              <option value="general">Simulado Geral</option>
            </select>

            {simuladoMode !== 'general' && (
              <select 
                multiple={simuladoMode === 'mixed'}
                value={simuladoMode === 'specific' ? selectedSubjectIds[0] || '' : selectedSubjectIds}
                onChange={(e) => {
                  if (simuladoMode === 'specific') {
                    setSelectedSubjectIds([e.target.value]);
                    setSelectedTopicIds([]);
                  } else {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedSubjectIds(options);
                  }
                }}
                className="w-full p-4 rounded-2xl border border-stone-200 bg-white"
              >
                <option value="">Selecione a(s) disciplina(s)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            
            {simuladoMode !== 'general' && (
              <select 
                multiple={simuladoMode === 'mixed'}
                value={simuladoMode === 'specific' ? selectedTopicIds[0] || '' : selectedTopicIds}
                onChange={(e) => {
                  if (simuladoMode === 'specific') {
                    setSelectedTopicIds([e.target.value]);
                  } else {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedTopicIds(options);
                  }
                }}
                disabled={selectedSubjectIds.length === 0}
                className="w-full p-4 rounded-2xl border border-stone-200 bg-white disabled:opacity-50"
              >
                <option value="">Selecione o(s) assunto(s)</option>
                {topics.filter(t => selectedSubjectIds.includes(t.subjectId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            <input 
              type="text" 
              placeholder="Banca (ex: Cebraspe, FGV)"
              value={selectedBanca}
              onChange={(e) => setSelectedBanca(e.target.value)}
              className="w-full p-4 rounded-2xl border border-stone-200 bg-white"
            />

            <input 
              type="number" 
              placeholder="Quantidade de questões"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full p-4 rounded-2xl border border-stone-200 bg-white"
              min={1}
              max={50}
            />
          </div>

          <button 
            onClick={generateSimulado}
            disabled={isGenerating || !selectedBanca || (simuladoMode !== 'general' && selectedSubjectIds.length === 0)}
            className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Gerando Simulado...
              </>
            ) : (
              <>
                <Play className="w-6 h-6" /> Gerar Novo Simulado
              </>
            )}
          </button>
          {(simuladoMode !== 'general' && selectedSubjectIds.length === 0) && (
            <p className="text-xs text-red-500 mt-3 font-bold uppercase tracking-widest">Selecione disciplina(s)!</p>
          )}
        </div>

        <div className="relative">
          <div className="bg-white p-8 rounded-[40px] border border-stone-200 shadow-2xl relative z-10">
            <h3 className="font-bold text-xl mb-6">Últimos Resultados</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-stone-400">#{i}</div>
                    <div>
                      <p className="font-bold text-stone-800">Simulado Geral</p>
                      <p className="text-xs text-stone-400">14 Mar 2024 • 20 questões</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">85%</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Aprovado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default Simulados;
