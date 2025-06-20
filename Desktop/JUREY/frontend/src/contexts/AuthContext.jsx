import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          throw new Error('Token expiré');
        }
        await api.get('/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser({
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
          avatar: decoded.avatar,
          isVerified: decoded.isVerified
        });
        const origin = location.state?.from?.pathname || getDashboardRoute(decoded.role);
        navigate(origin);
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        localStorage.removeItem('authToken');
        setUser(null);
        toast.error('Votre session a expiré. Veuillez vous reconnecter.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, [navigate, location]);
  const getDashboardRoute = (role) => {
    switch (role) {
      case 'driver': return '/driver-dashboard';
      case 'shipper': return '/shipper-dashboard';
      case 'admin': return '/admin-dashboard';
      default: return '/';
    }
  };
  const login = async (credentials) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('authToken', data.token);
      
      const decoded = jwtDecode(data.token);
      setUser({
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        avatar: decoded.avatar,
        isVerified: decoded.isVerified
      });
      
      navigate(getDashboardRoute(decoded.role));
      toast.success(`Bienvenue ${decoded.name} !`);
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast.error(error.response?.data?.message || 'Identifiants incorrects');
      return false;
    }
  };
  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      localStorage.setItem('authToken', data.token);
      
      const decoded = jwtDecode(data.token);
      setUser({
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        avatar: decoded.avatar,
        isVerified: decoded.isVerified
      });
      
      navigate(getDashboardRoute(decoded.role));
      toast.success('Compte créé avec succès !');
      return true;
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la création du compte');
      return false;
    }
  };
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/login');
    toast.info('Vous avez été déconnecté');
  };
  const updateProfile = async (profileData) => {
    try {
      const { data } = await api.put('/users/profile', profileData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      setUser(prev => ({
        ...prev,
        ...data.user
      }));
      
      toast.success('Profil mis à jour avec succès !');
      return data.user;
    } catch (error) {
      console.error('Erreur de mise à jour:', error);
      toast.error(error.response?.data?.message || 'Erreur de mise à jour');
      return null;
    }
  };
  const requireAuth = (roles = []) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return false;
    }
    
    if (roles.length > 0 && !roles.includes(user.role)) {
      navigate('/unauthorized');
      return false;
    }
    
    return true;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    requireAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};