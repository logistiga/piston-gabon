// Utility function for rounding amounts according to rules
const roundAmount = (amount: number): number => {
  // Get decimal part
  const decimal = amount % 1;
  
  // Round according to rules:
  // - If decimal < 0.5, round down
  // - If decimal >= 0.5, round up
  return decimal < 0.5 ? Math.floor(amount) : Math.ceil(amount);
};

// Format currency without decimals
export const formatCurrency = (amount: number): string => {
  const roundedAmount = roundAmount(amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
};

// Format date to French locale
const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};