import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Target, Calendar, Save, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileProps {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
}

const Profile: React.FC<ProfileProps> = ({ profile, setProfile }) => {
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    studyArea: profile?.studyArea || '',
    dailyGoalHours: profile?.dailyGoalHours || 4,
    weeklyGoalHours: profile?.weeklyGoalHours || 24,
    preferredBoard: profile?.preferredBoard || ''
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        studyArea: profile.studyArea || '',
        dailyGoalHours: profile.dailyGoalHours || 4,
        weeklyGoalHours: profile.weeklyGoalHours || 24,
        preferredBoard: profile.preferredBoard || ''
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), formData);
      setProfile({ ...profile, ...formData });
      setToast('Perfil atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
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
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-stone-900 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-3xl border-4 border-white overflow-hidden shadow-xl">
              <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} alt="Profile" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" /> Dados Pessoais
              </h3>
              
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">E-mail</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-500">
                  <Mail className="w-4 h-4" />
                  <span>{profile?.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Área do Concurso</label>
                <select 
                  value={formData.studyArea}
                  onChange={(e) => setFormData({...formData, studyArea: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione...</option>
                  <option value="policial">Policial</option>
                  <option value="tribunais">Tribunais</option>
                  <option value="administrativa">Administrativa</option>
                  <option value="fiscal">Fiscal</option>
                  <option value="saude">Saúde</option>
                  <option value="educacao">Educação</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" /> Metas de Estudo
              </h3>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Meta Diária (Horas)</label>
                <input 
                  type="number" 
                  value={formData.dailyGoalHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData({...formData, dailyGoalHours: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Meta Semanal (Horas)</label>
                <input 
                  type="number" 
                  value={formData.weeklyGoalHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setFormData({...formData, weeklyGoalHours: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Banca Preferida</label>
                <input 
                  type="text" 
                  placeholder="Ex: Cebraspe, FGV, FCC"
                  value={formData.preferredBoard}
                  onChange={(e) => setFormData({...formData, preferredBoard: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-stone-400 hover:text-emerald-600 transition-colors font-bold text-sm">
                <Bell className="w-4 h-4" /> Notificações
              </button>
              <button className="flex items-center gap-2 text-stone-400 hover:text-blue-600 transition-colors font-bold text-sm">
                <Calendar className="w-4 h-4" /> Integração Agenda
              </button>
            </div>
            <button 
              onClick={handleSave}
              className="px-10 py-4 bg-stone-900 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-stone-800 transition-all shadow-xl shadow-stone-200"
            >
              <Save className="w-5 h-5" /> Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
