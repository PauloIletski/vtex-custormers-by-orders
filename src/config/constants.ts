// Configurações da aplicação

export const CONFIG = {
  // Limite máximo de pedidos para evitar timeout
  MAX_ORDERS: parseInt(process.env.NEXT_PUBLIC_MAX_ORDERS || '5000'),
  
  // Limite máximo de páginas como fallback
  MAX_PAGES: parseInt(process.env.NEXT_PUBLIC_MAX_PAGES || '100'),
  
  // Tamanho do lote para requisições
  PER_PAGE: parseInt(process.env.NEXT_PUBLIC_PER_PAGE || '50'),
  
  // Timeout para requisições (em ms)
  REQUEST_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT || '30000'),
} as const;

// Função para verificar se o limite foi atingido
export const isLimitReached = (currentCount: number): boolean => {
  return currentCount >= CONFIG.MAX_ORDERS;
};

// Função para obter mensagem de limite atingido
export const getLimitMessage = (currentCount: number): string => {
  if (isLimitReached(currentCount)) {
    return `⚠️ Limite de ${CONFIG.MAX_ORDERS} pedidos atingido. Reduza o período para ver mais pedidos.`;
  }
  return '';
};
