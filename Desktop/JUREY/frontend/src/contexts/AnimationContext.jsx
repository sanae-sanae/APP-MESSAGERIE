import React, { createContext, useContext, useState, useMemo } from 'react';
import Lottie from 'lottie-react';

const AnimationContext = createContext(null);
const ANIMATIONS = {
  loading: null,
  success: null,
  error: null,
  truck: null,
  location: null
};
const loadAnimations = async () => {
  try {
    ANIMATIONS.loading = await import('../../public/animations/loading.json');
    ANIMATIONS.success = await import('../../public/animations/success.json');
    ANIMATIONS.error = await import('../../public/animations/error.json');
    ANIMATIONS.truck = await import('../../public/animations/truck-driving.json');
    ANIMATIONS.location = await import('../../public/animations/location-pin.json');
  } catch (error) {
    console.error('Erreur de chargement des animations:', error);
  }
};
loadAnimations();

export const AnimationProvider = ({ children }) => {
  const [activeAnimations, setActiveAnimations] = useState({});
  const [globalLoader, setGlobalLoader] = useState(false);
  const playAnimation = (name, options = {}) => {
    const id = Date.now();
    
    setActiveAnimations(prev => ({
      ...prev,
      [id]: {
        name,
        options: {
          loop: options.loop || false,
          autoplay: true,
          ...options
        }
      }
    }));
    if (!options.loop && options.duration) {
      setTimeout(() => {
        removeAnimation(id);
      }, options.duration);
    }
    
    return id;
  };
  const removeAnimation = (id) => {
    setActiveAnimations(prev => {
      const newAnimations = { ...prev };
      delete newAnimations[id];
      return newAnimations;
    });
  };
  const showGlobalLoader = (message = 'Chargement...') => {
    setGlobalLoader(message);
    return () => setGlobalLoader(false);
  };
  const renderAnimations = () => (
    <div className="fixed inset-0 pointer-events-none z-[1000]">
      {Object.entries(activeAnimations).map(([id, anim]) => (
        <div 
          key={id}
          className="absolute inset-0 flex items-center justify-center"
          style={anim.options.style}
        >
          <Lottie 
            animationData={ANIMATIONS[anim.name]} 
            loop={anim.options.loop}
            autoplay={anim.options.autoplay}
            className={anim.options.className || 'w-48 h-48'}
          />
        </div>
      ))}
    </div>
  );
  const renderGlobalLoader = () => (
    globalLoader && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1001] flex flex-col items-center justify-center">
        <Lottie 
          animationData={ANIMATIONS.loading} 
          loop={true}
          autoplay={true}
          className="w-32 h-32"
        />
        <p className="text-white text-lg font-medium mt-4">{globalLoader}</p>
      </div>
    )
  );

  const value = useMemo(() => ({
    playAnimation,
    removeAnimation,
    showGlobalLoader,
    animations: ANIMATIONS
  }), []);

  return (
    <AnimationContext.Provider value={value}>
      {children}
      {renderAnimations()}
      {renderGlobalLoader()}
    </AnimationContext.Provider>
  );
};

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation doit être utilisé dans un AnimationProvider');
  }
  return context;
};