import React from 'react';
import { HelpCircle, Book, Calendar, Clock, BarChart3, Settings, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';

const Help: React.FC = () => {
  const sections = [
    {
      icon: Book,
      title: 'Gestão de Conteúdos',
      description: 'Cadastre suas disciplinas e organize os assuntos que precisa estudar. Use os ícones de status para marcar seu progresso.'
    },
    {
      icon: ListTodo,
      title: 'Dashboard de Estudos',
      description: 'Centralize seus editais verticalizados e conteúdos gerais em um único lugar. Importe editais em PDF e acompanhe seu progresso por disciplina.'
    },
    {
      icon: Calendar,
      title: 'Sistema de Revisões',
      description: 'O SiStudy agenda automaticamente suas revisões baseadas no seu progresso.'
    },
    {
      icon: Clock,
      title: 'Cronômetro e Pomodoro',
      description: 'Use o Cronômetro progressivo ou o Pomodoro (com tempo personalizado) para manter a concentração. Salve suas sessões ao finalizar!'
    },
    {
      icon: BarChart3,
      title: 'Relatórios de Desempenho',
      description: 'Acompanhe sua evolução através de gráficos detalhados de tempo dedicado a cada disciplina.'
    },
    {
      icon: Settings,
      title: 'Personalização',
      description: 'Acesse as configurações para alternar entre modo claro e escuro, ou para resetar seus dados caso queira começar um novo ciclo de estudos.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">Central de Ajuda</h2>
        <p className="text-stone-500 dark:text-stone-400">Tudo o que você precisa saber para dominar o SiStudy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-400 mb-6">
              <section.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-3">{section.title}</h3>
            <p className="text-stone-500 dark:text-stone-400 leading-relaxed">
              {section.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 bg-emerald-600 rounded-[2.5rem] text-white text-center shadow-xl shadow-emerald-200 dark:shadow-none">
        <h3 className="text-2xl font-bold mb-4">Ainda tem dúvidas?</h3>
        <p className="opacity-90 mb-8 max-w-lg mx-auto">
          Estamos sempre trabalhando para melhorar sua experiência. Se precisar de suporte adicional, entre em contato através das nossas redes sociais.
        </p>
        <button className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-stone-100 transition-colors">
          Falar com Suporte
        </button>
      </div>
    </motion.div>
  );
};

export default Help;
