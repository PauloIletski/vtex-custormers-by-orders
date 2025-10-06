/**
 * Configurações das APIs
 * Centraliza todas as configurações para evitar problemas de CORS
 */

export const API_CONFIG = {
  // Base URL para todas as chamadas da VTEX (sempre usar API Routes locais)
  VTEX_BASE_URL: '/api/vtex',
  
  // Endpoints específicos
  ENDPOINTS: {
    ORDERS: '/orders',
    ORDER_DETAILS: '/orders', // Será concatenado com /[orderId]
    DATA_ENTITIES: '/dataentities',
  },
  
  // Configurações de timeout
  TIMEOUT: {
    DEFAULT: 30000, // 30 segundos
    LONG_REQUEST: 60000, // 1 minuto para requests pesados
  },
  
  // Headers padrão
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Verifica se estamos no lado do cliente ou servidor
 */
export const isClient = typeof window !== 'undefined';

/**
 * Configuração do Axios para evitar CORS
 */
export const getAxiosConfig = () => ({
  baseURL: API_CONFIG.VTEX_BASE_URL,
  timeout: API_CONFIG.TIMEOUT.DEFAULT,
  headers: API_CONFIG.HEADERS,
});

/**
 * Logs para debugging de CORS
 */
export const logApiCall = (method: string, url: string, params?: Record<string, unknown>) => {
  if (isClient) {
    console.log(`🌐 API Call [Client]: ${method} ${url}`, params);
  } else {
    console.log(`🖥️ API Call [Server]: ${method} ${url}`, params);
  }
};

/**
 * Logs para debugging de CORS errors
 */
export const logCorsError = (error: Error & { code?: string; config?: { url?: string; baseURL?: string } }, context: string) => {
  console.error(`❌ CORS Error in ${context}:`, {
    message: error.message,
    code: error.code,
    url: error.config?.url,
    baseURL: error.config?.baseURL,
  });
};
