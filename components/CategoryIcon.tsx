import React from 'react';
import { 
  Utensils, Home, Tv, Coffee, Car, PartyPopper, GraduationCap, 
  HeartPulse, Pizza, TrendingUp, Gamepad2, ShoppingCart, 
  MoreHorizontal, User, Gift, Bus, Plane, Shirt, 
  Banknote, Wallet, Coins, History, Briefcase, Zap, Smartphone, Tag
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, size = 16, className = "" }) => {
  const getEmoji = () => {
    switch (category) {
      // Despesas
      case 'Alimentação': return '🍔';
      case 'Apê':
      case 'Moradia': return '🏠';
      case 'Assinaturas': return '📱';
      case 'Besteiras': return '🍕';
      case 'Carro':
      case 'Transporte': return '🚗';
      case 'Comemoração': return '🥳';
      case 'Educação':
      case 'Estudo': return '📚';
      case 'Farmácia':
      case 'Saúde': return '💊';
      case 'Ifood': return '🥡';
      case 'Investimento':
      case 'Investimentos': return '📈';
      case 'Lazer': return '🎮';
      case 'Mercado':
      case 'Compras': return '🛍️';
      case 'Pessoais':
      case 'Lucas': return '👤';
      case 'Presente': return '🎁';
      case 'Viagem':
      case 'Viagens': return '✈️';
      case 'Vestuário': return '👕';
      case 'Serviços': return '💡';
      case 'Impostos': return '📋';
      case 'Doações e Ofertas': return '🙌';
      case 'Pet': return '🐾';
      
      // Receitas
      case 'Salário': return '💰';
      case 'Bonificação':
      case '13°': return '🧧';
      case 'Empréstimo': return '🤝';
      case 'Vale Alimentação':
      case 'Vale Refeição': return '🍱';
      case 'Saldo Anterior': return '🔙';
      case 'ISK': return '💼';
      case 'Periculosidade': return '⚠️';
      
      default: return '🏷️';
    }
  };

  const emoji = getEmoji();

  return (
    <span 
      className={`inline-flex items-center justify-center ${className}`} 
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      {emoji}
    </span>
  );
};
