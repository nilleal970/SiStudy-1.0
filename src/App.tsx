import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { UserProfile, Subject, Topic, StudySession, Revision } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Contents from './components/Contents';
import Simulados from './components/Simulados';
import EditalVertical from './components/EditalVertical';
import Estudos from './components/Estudos';
import Revisions from './components/Revisions';
import StudyTimer from './components/StudyTimer';
import Reports from './components/Reports';
import Profile from './components/Profile';
import Settings from './components/Settings';
import StudyCalendar from './components/StudyCalendar';
import Help from './components/Help';
import { BookOpen, LayoutDashboard, ClipboardList, ListTodo, Calendar, Clock, BarChart3, User as UserIcon, HelpCircle, LogIn, LogOut, Menu, Settings as SettingsIcon, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [editalData, setEditalData] = useState<any>(null);

  const handleTabChange = (tab: string) => {
    if (activeTab === 'edital' && editalData && tab !== 'edital') {
      if (!confirm('Os dados do edital verticalizado serão perdidos se você sair sem baixar o PDF. Deseja continuar?')) {
        return;
      }
      setEditalData(null);
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const theme = profile?.theme || 'system';
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [profile?.theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Estudante',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
              dailyGoalHours: 4,
              weeklyGoalHours: 24,
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));
    const unsubSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    });

    const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', user.uid));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession)));
    });

    const revisionsQuery = query(collection(db, 'revisions'), where('userId', '==', user.uid), where('completed', '==', false));
    const unsubRevisions = onSnapshot(revisionsQuery, (snapshot) => {
      setRevisions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Revision)));
    });

    return () => {
      unsubSubjects();
      unsubSessions();
      unsubRevisions();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-stone-200"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">SiStudy</h1>
          <p className="text-stone-500 mb-8">Sua jornada rumo à aprovação começa aqui com inteligência e organização.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-4 px-6 bg-stone-900 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-stone-800 transition-all active:scale-95 shadow-lg shadow-stone-200"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard profile={profile} subjects={subjects} sessions={sessions} revisions={revisions} />;
      case 'estudos': return <Estudos subjects={subjects} editalData={editalData} setEditalData={setEditalData} handleTabChange={handleTabChange} />;
      case 'contents': return <Contents subjects={subjects} />;
      case 'simulados': return <Simulados subjects={subjects} />;
      case 'edital': return <EditalVertical editalData={editalData} setEditalData={setEditalData} handleTabChange={handleTabChange} />;
      case 'revisions': return <Revisions revisions={revisions} subjects={subjects} />;
      case 'timer': return <StudyTimer subjects={subjects} />;
      case 'reports': return <Reports sessions={sessions} subjects={subjects} />;
      case 'calendar': return <StudyCalendar revisions={revisions} subjects={subjects} />;
      case 'profile': return <Profile profile={profile} setProfile={setProfile} />;
      case 'settings': return <Settings profile={profile} setProfile={setProfile} />;
      case 'help': return <Help />;
      default: return <Dashboard profile={profile} subjects={subjects} sessions={sessions} revisions={revisions} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        handleTabChange={handleTabChange} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        user={user}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64 md:ml-20' : 'md:ml-20'} ml-0 p-4 md:p-8`}>
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-wrap items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-600 dark:text-stone-400 shadow-sm"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1 truncate">
                  {activeTab === 'dashboard' ? 'Bem-vindo de volta' : 
                   activeTab === 'estudos' ? 'Meus Estudos' :
                   activeTab === 'contents' ? 'Conteúdos' :
                   activeTab === 'simulados' ? 'Simulados' :
                   activeTab === 'edital' ? 'Edital Vertical' :
                   activeTab === 'revisions' ? 'Revisões' :
                   activeTab === 'calendar' ? 'Calendário' :
                   activeTab === 'timer' ? 'Cronômetro' :
                   activeTab === 'reports' ? 'Relatórios' :
                   activeTab === 'profile' ? 'Perfil' :
                   activeTab === 'settings' ? 'Configurações' :
                   activeTab === 'help' ? 'Ajuda' : activeTab}
                </h2>
                <h1 className="text-xl md:text-3xl font-bold text-stone-900 dark:text-white truncate">
                  {activeTab === 'dashboard' ? `Olá, ${profile?.displayName?.split(' ')[0]}` : 
                   activeTab === 'estudos' ? 'Meus Estudos' :
                   activeTab === 'contents' ? 'Meus Conteúdos' :
                   activeTab === 'simulados' ? 'Simulados' :
                   activeTab === 'edital' ? 'Edital Vertical' :
                   activeTab === 'revisions' ? 'Minhas Revisões' :
                   activeTab === 'calendar' ? 'Calendário de Estudos' :
                   activeTab === 'timer' ? 'Cronômetro' :
                   activeTab === 'reports' ? 'Relatórios de Desempenho' :
                   activeTab === 'profile' ? 'Meu Perfil' :
                   activeTab === 'settings' ? 'Configurações' :
                   activeTab === 'help' ? 'Central de Ajuda' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={logout}
                className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-stone-800 shadow-md">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" referrerPolicy="no-referrer" />
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Help Button */}
      <button 
        onClick={() => setActiveTab('help')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 z-50"
      >
        <HelpCircle className="w-7 h-7" />
      </button>
    </div>
  );
}
