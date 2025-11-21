import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ListTodo, Menu, X, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/leads', label: user?.role === 'Admin' ? 'All Leads' : 'My Leads', icon: <Users size={20} /> },
    { path: '/activities', label: 'Activities', icon: <ListTodo size={20} /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 transition-all duration-300">
        <div className="p-6 flex items-center border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">Apex CRM</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`mr-3 transition-colors ${isActive(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {user?.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role} • {user?.territory || 'Global'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Logout">
                <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-20 flex items-center justify-between p-4 shadow-sm">
        <div className="flex items-center">
           <div className="w-8 h-8 bg-blue-600 rounded-lg mr-3 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-lg font-bold text-gray-800">Apex CRM</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 hover:bg-gray-100 p-2 rounded-md">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-800 bg-opacity-50 z-10 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}>
          <div className="bg-white w-64 h-full shadow-2xl p-4 pt-20 space-y-2 flex flex-col" onClick={e => e.stopPropagation()}>
            {navItems.map((item) => (
              <div
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                 <span className="mr-3">{item.icon}</span>
                 {item.label}
              </div>
            ))}
             <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                        {user?.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    <LogOut size={16} className="mr-2" /> Logout
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;