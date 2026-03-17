import React, { useState, useRef, useEffect } from 'react';
import { ListTodo, FileText, Sparkles, Search, CheckCircle2, Circle, ArrowRight, Info, Download, Save, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface EditalVerticalProps {
  editalData: any;
  setEditalData: (data: any) => void;
  handleTabChange: (tab: string) => void;
}

const EditalVertical: React.FC<EditalVerticalProps> = ({ editalData, setEditalData, handleTabChange }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedEditais, setSavedEditais] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSavedEditais = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, 'editais'), where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setSavedEditais(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    loadSavedEditais();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editalData) {
        e.preventDefault();
        e.returnValue = 'Os dados do edital verticalizado serão perdidos se você sair sem baixar o PDF. Deseja continuar?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editalData]);

  const saveEdital = async () => {
    if (!editalData || !auth.currentUser) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'editais'), {
        userId: auth.currentUser.uid,
        concurso: editalData.concurso,
        cargo: editalData.cargo,
        data: editalData,
        createdAt: new Date().toISOString()
      });
      alert("Edital salvo com sucesso!");
      // Refresh list
      const q = query(collection(db, 'editais'), where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setSavedEditais(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Erro ao salvar edital:", error);
      alert("Erro ao salvar o edital.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        // Timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: A análise do edital demorou muito. Tente um arquivo menor ou verifique a conexão.")), 60000)
        );

        const generatePromise = ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              {
                text: `Analise este edital e extraia as seguintes informações: 
                - Concurso, Órgão, Banca, Cargo, Vagas, Salário, Jornada de Trabalho, Lotação, Posse.
                - Principais datas (Inscrições, Isenção, Pagamento, Prova).
                - Etapas e provas do concurso.
                - Conteúdo programático por disciplina e assuntos.
                Se alguma informação não for fornecida, coloque "Não fornecida".
                Retorne um JSON estruturado.`
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                concurso: { type: Type.STRING },
                orgao: { type: Type.STRING },
                banca: { type: Type.STRING },
                cargo: { type: Type.STRING },
                vagas: { type: Type.STRING },
                salario: { type: Type.STRING },
                jornada: { type: Type.STRING },
                lotacao: { type: Type.STRING },
                posse: { type: Type.STRING },
                etapas: { type: Type.ARRAY, items: { type: Type.STRING } },
                datas: {
                  type: Type.OBJECT,
                  properties: {
                    inscricoes: { type: Type.STRING },
                    isencao: { type: Type.STRING },
                    pagamento: { type: Type.STRING },
                    prova: { type: Type.STRING }
                  }
                },
                disciplinas: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nome: { type: Type.STRING },
                      assuntos: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  }
                }
              }
            }
          }
        });

        const response = await Promise.race([generatePromise, timeoutPromise]) as any;
        
        console.log("Resposta da IA recebida");
        const data = JSON.parse(response.text || '{}');
        setEditalData(data);
      } catch (error) {
        console.error("Erro ao processar edital:", error);
        alert("Erro ao processar o edital. Tente novamente.");
      } finally {
        setIsGenerating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const importEdital = () => {
    fileInputRef.current?.click();
  };

  const downloadPDF = () => {
    if (!editalData) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Edital: ${editalData.concurso}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Cargo: ${editalData.cargo}`, 10, 25);
    doc.text(`Banca: ${editalData.banca}`, 10, 32);
    doc.text(`Vagas: ${editalData.vagas}`, 10, 39);
    doc.text(`Salário: ${editalData.salario}`, 10, 46);

    let y = 60;
    doc.setFontSize(14);
    doc.text("Disciplinas e Assuntos", 10, y);
    y += 10;

    editalData.disciplinas.forEach((disc: any) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.text(disc.nome, 10, y);
      y += 7;
      
      const rows = disc.assuntos.map((assunto: string) => [assunto]);
      autoTable(doc, {
        startY: y,
        head: [['Assunto']],
        body: rows,
        theme: 'striped',
        margin: { left: 10 }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save('edital_verticalizado.pdf');
  };

  const toggleTopic = (assunto: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(assunto)) {
      newSelected.delete(assunto);
    } else {
      newSelected.add(assunto);
    }
    setSelectedTopics(newSelected);
  };

  const handleAction = (action: 'estudar' | 'revisar', assunto: string) => {
    console.log(`Action: ${action}, Topic: ${assunto}`);
    if (action === 'estudar') {
      if (confirm(`Deseja adicionar o tópico "${assunto}" aos seus conteúdos de estudo?`)) {
        handleTabChange('contents');
      }
    } else {
      alert(`Revisão agendada para o tópico: ${assunto}`);
    }
  };

  if (editalData) {
    return (
      <div className="space-y-8">
        {/* Header Info */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-widest">Concurso Aberto</span>
                <span className="text-stone-400 font-bold text-sm">{editalData.banca}</span>
              </div>
              <h2 className="text-3xl font-black text-stone-900">{editalData.concurso}</h2>
              <p className="text-stone-500 font-medium">{editalData.cargo}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={saveEdital}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all"
              >
                {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Edital</>}
              </button>
              <button 
                onClick={downloadPDF}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-stone-200 transition-all"
              >
                <Download className="w-4 h-4" /> Baixar PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Remuneração</p>
              <p className="font-bold text-emerald-600">{editalData.salario}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Vagas</p>
              <p className="font-bold text-stone-800">{editalData.vagas}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Jornada</p>
              <p className="font-bold text-stone-800">{editalData.jornada}</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Lotação</p>
              <p className="font-bold text-stone-800">{editalData.lotacao}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Principais Datas</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="font-bold text-stone-600">Inscrições:</span> {editalData.datas?.inscricoes || 'Não fornecida'}</p>
                <p><span className="font-bold text-stone-600">Isenção:</span> {editalData.datas?.isencao || 'Não fornecida'}</p>
                <p><span className="font-bold text-stone-600">Pagamento:</span> {editalData.datas?.pagamento || 'Não fornecida'}</p>
                <p><span className="font-bold text-stone-600">Prova:</span> {editalData.datas?.prova || 'Não fornecida'}</p>
              </div>
            </div>
            <div className="p-4 bg-stone-50 rounded-2xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Etapas e Provas</p>
              <ul className="text-sm text-stone-700 list-disc list-inside">
                {editalData.etapas?.map((etapa: string, i: number) => <li key={i}>{etapa}</li>) || <li>Não fornecidas</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Search & Progress */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar assunto no edital..."
              className="w-full bg-white border border-stone-200 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bg-white px-8 py-4 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Estudado</p>
              <p className="text-xl font-black text-emerald-600">32%</p>
            </div>
            <div className="w-px h-8 bg-stone-100" />
            <div className="text-center">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Revisado</p>
              <p className="text-xl font-black text-blue-600">18%</p>
            </div>
          </div>
        </div>

        {/* Verticalized List */}
        <div className="space-y-6">
          {editalData.disciplinas?.map((disc: any, i: number) => (
            <div key={i} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-stone-800">{disc.nome}</h3>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{disc.assuntos?.length || 0} Assuntos</span>
              </div>
              <div className="divide-y divide-stone-100">
                {disc.assuntos?.map((assunto: string, j: number) => (
                  <div key={j} className={`p-6 flex items-center justify-between group hover:bg-stone-50 transition-colors ${selectedTopics.has(assunto) ? 'bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-4" onClick={() => toggleTopic(assunto)}>
                      <button className={`transition-colors ${selectedTopics.has(assunto) ? 'text-emerald-500' : 'text-stone-200 hover:text-emerald-500'}`}>
                        {selectedTopics.has(assunto) ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                      <span className={`font-medium ${selectedTopics.has(assunto) ? 'text-emerald-900' : 'text-stone-700'}`}>{assunto}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAction('estudar', assunto)}
                        className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-colors"
                      >
                        Estudar
                      </button>
                      <button 
                        onClick={() => handleAction('revisar', assunto)}
                        className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        Revisar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto text-center py-12">
      <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <ListTodo className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-4xl font-black text-stone-900 mb-4">Edital Verticalizado</h2>
      <p className="text-stone-500 text-lg mb-12 max-w-2xl mx-auto">
        Organize seu estudo de forma estratégica. Nossa IA lê o edital em PDF e extrai automaticamente todas as disciplinas e tópicos para você.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-8 bg-white rounded-3xl border border-stone-200 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="font-bold mb-2">Importação por PDF</h4>
          <p className="text-sm text-stone-400">Arraste o edital e deixe a IA fazer o trabalho pesado.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-stone-200 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="font-bold mb-2">Análise de Peso</h4>
          <p className="text-sm text-stone-400">Identificamos os tópicos com maior incidência histórica.</p>
        </div>
        <div className="p-8 bg-white rounded-3xl border border-stone-200 shadow-sm">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold mb-2">Controle Total</h4>
          <p className="text-sm text-stone-400">Acompanhe seu progresso em tempo real por disciplina.</p>
        </div>
      </div>

      <button 
        onClick={importEdital}
        disabled={isGenerating}
        className="px-12 py-5 bg-stone-900 text-white rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-stone-800 transition-all shadow-2xl shadow-stone-200 mx-auto"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf" 
          className="hidden" 
        />
        {isGenerating ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            Analisando Edital...
          </>
        ) : (
          <>
            <FileText className="w-6 h-6" /> Importar Edital (PDF)
          </>
        )}
      </button>

      {savedEditais.length > 0 && (
        <div className="mt-16 max-w-2xl mx-auto">
          <h3 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2 justify-center">
            <FolderOpen className="w-6 h-6 text-emerald-600" /> Editais Salvos
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {savedEditais.map((edital: any) => (
              <button 
                key={edital.id}
                onClick={() => setEditalData(edital.data)}
                className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm text-left hover:border-emerald-500 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-stone-900">{edital.concurso}</h4>
                  <p className="text-sm text-stone-500">{edital.cargo}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditalVertical;
