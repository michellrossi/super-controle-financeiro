import React from 'react';

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
      case 'Assinatura': return '📱';
      case 'Besteira': return '🍕';
      case 'Carro':
      case 'Transporte': return '🚗';
      case 'Comemoração': return '🥳';
      case 'Educação':
      case 'Estudo': return '📚';
      case 'Farmácia':
      case 'Saúde': return '💊';
      case 'Ifood': return '🥡';
      case 'Investimento': return '📈';
      case 'Lazer': return '🎮';
      case 'Mercado':
      case 'Compra': return '🛍️';
      case 'Pessoal':
      case 'Lucas': return '👤';
      case 'Presente': return '🎁';
      case 'Viagem': return '✈️';
      case 'Vestuário': return '👕';
      case 'Serviço': return '💡';
      case 'Imposto': return '📋';
      case 'Doação e Oferta': return '🙌';
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
