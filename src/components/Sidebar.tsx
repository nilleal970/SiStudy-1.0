import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  ListTodo, 
  Calendar, 
  CalendarDays,
  Clock, 
  BarChart3, 
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Settings as SettingsIcon,
  HelpCircle,
  X
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  handleTabChange: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, handleTabChange, isOpen, setIsOpen, user }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'estudos', label: 'Estudos', icon: BookMarked },
    { id: 'contents', label: 'Conteúdos', icon: BookOpen },
    { id: 'simulados', label: 'Simulados', icon: ClipboardList },
    { id: 'edital', label: 'Edital Vertical', icon: ListTodo },
    { id: 'revisions', label: 'Revisões', icon: Calendar },
    { id: 'calendar', label: 'Calendário', icon: CalendarDays },
    { id: 'timer', label: 'Cronômetro', icon: Clock },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
    { id: 'help', label: 'Ajuda', icon: HelpCircle },
  ];

  const handleTabClick = (id: string) => {
    handleTabChange(id);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      <div 
        className={`fixed inset-0 bg-stone-900/50 z-[55] transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      <aside 
        className={`fixed left-0 top-0 h-full bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 transition-all duration-300 z-[60] 
          ${isOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'} 
          lg:w-auto ${isOpen ? 'lg:w-64' : 'lg:w-20'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            {isOpen ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg md:text-xl tracking-tight dark:text-white">SiStudy</span>
              </div>
            ) : (
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto">
                <BookMarked className="w-5 h-5 text-white" />
              </div>
            )}
            
            {/* Mobile/Tablet Close Button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold' 
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <item.icon className={`w-6 h-6 flex-shrink-0 ${activeTab === item.id ? 'text-emerald-600' : ''}`} />
                {isOpen && <span className="truncate">{item.label}</span>}
                {activeTab === item.id && isOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-stone-100 dark:border-stone-800 hidden lg:block">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-400 transition-colors"
            >
              {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
