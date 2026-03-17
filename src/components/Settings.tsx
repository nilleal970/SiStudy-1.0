import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Moon, Sun, Monitor, Trash2, AlertTriangle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ profile, setProfile }) => {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    if (!profile || !auth.currentUser) return;
    
    const newProfile = { ...profile, theme };
    setProfile(newProfile);
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { theme });
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  const handleResetSystem = async () => {
    if (!auth.currentUser) return;
    setIsResetting(true);

    try {
      const userId = auth.currentUser.uid;
      const collectionsToReset = ['subjects', 'topics', 'sessions', 'revisions', 'exams', 'editais'];
      
      for (const collName of collectionsToReset) {
        const q = query(collection(db, collName), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) continue;

        // Process in batches of 500 (Firestore limit)
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }

      // Also reset the user profile to defaults instead of deleting it
      // This ensures the user stays logged in but with a fresh start
      await updateDoc(doc(db, 'users', userId), {
        studyArea: '',
        dailyGoalHours: 4,
        weeklyGoalHours: 24,
        preferredBoard: '',
        theme: 'system'
      });

      setResetSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error resetting system:', error);
      alert('Erro ao resetar o sistema. Tente novamente.');
      setIsResetting(false);
    }
  };

  const themes = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Escuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Theme Section */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-emerald-600" /> Aparência
        </h3>
        <p className="text-stone-500 dark:text-stone-400 mb-6">Escolha como o SiStudy deve ser exibido no seu dispositivo.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id as any)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                (profile?.theme || 'system') === t.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
            >
              <t.icon className="w-6 h-6" />
              <span className="font-bold">{t.label}</span>
              {(profile?.theme || 'system') === t.id && <Check className="ml-auto w-5 h-5" />}
            </button>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-stone-900 rounded-3xl border border-red-100 dark:border-red-900/30 p-8 shadow-sm">
        <h3 className="text-xl font-bold text-red-600 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Zona de Perigo
        </h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h4 className="font-bold text-stone-900 dark:text-white mb-1">Resetar Sistema</h4>
            <p className="text-stone-500 dark:text-stone-400 text-sm">Isso apagará permanentemente todas as suas disciplinas, tópicos, sessões de estudo e simulados. Esta ação não pode ser desfeita.</p>
          </div>
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-6 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Trash2 className="w-5 h-5" /> Resetar Tudo
          </button>
        </div>
      </section>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            >
              {!resetSuccess ? (
                <>
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">Você tem certeza?</h2>
                  <p className="text-stone-500 dark:text-stone-400 mb-8">
                    Esta ação irá apagar **todos os seus dados** de estudo. Você perderá seu histórico de progresso e simulados.
                  </p>
                  <div className="flex gap-4">
                    <button
                      disabled={isResetting}
                      onClick={() => setIsResetModalOpen(false)}
                      className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      disabled={isResetting}
                      onClick={handleResetSystem}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                      {isResetting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Sim, Apagar Tudo'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900 dark:text-white mb-2">Sistema Resetado!</h2>
                  <p className="text-stone-500 dark:text-stone-400">Reiniciando o aplicativo...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
