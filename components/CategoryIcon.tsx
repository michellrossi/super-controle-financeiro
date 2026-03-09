import React from 'react';
import { 
  Utensils, Car, Heart, Stethoscope, GraduationCap, Home, Shirt, 
  PlayCircle, Package, Wallet, TrendingUp, Gift, HelpCircle 
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, size = 20, className = "" }) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Alimentação': <Utensils size={size} className={className} />,
    'Transporte': <Car size={size} className={className} />,
    'Lazer': <Heart size={size} className={className} />,
    'Saúde': <Stethoscope size={size} className={className} />,
    'Educação': <GraduationCap size={size} className={className} />,
    'Moradia': <Home size={size} className={className} />,
    'Vestuário': <Shirt size={size} className={className} />,
    'Assinaturas': <PlayCircle size={size} className={className} />,
    'Outros': <Package size={size} className={className} />,
    'Salário': <Wallet size={size} className={className} />,
    'Investimentos': <TrendingUp size={size} className={className} />,
    'Presente': <Gift size={size} className={className} />,
  };

  return iconMap[category] || <HelpCircle size={size} className={className} />;
};
