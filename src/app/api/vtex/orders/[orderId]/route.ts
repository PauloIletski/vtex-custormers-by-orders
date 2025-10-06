import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Logs para debugging de CORS
const logServerApiCall = (method: string, url: string, params?: Record<string, unknown>) => {
  console.log(`🖥️ Server API Call: ${method} ${url}`, params);
};

const logServerCorsError = (error: Error & { code?: string; config?: { url?: string; baseURL?: string } }, context: string) => {
  console.error(`❌ Server CORS Error in ${context}:`, {
    message: error.message,
    code: error.code,
    url: error.config?.url,
    baseURL: error.config?.baseURL,
  });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const accountName = process.env.VTEX_ACCOUNT;
    const authCookie = process.env.VTEX_AUTH_COOKIE;

    if (!accountName || !authCookie) {
      return NextResponse.json(
        { error: 'Configurações VTEX não encontradas' },
        { status: 500 }
      );
    }

    const api = axios.create({
      baseURL: `https://${accountName}.vtexcommercestable.com.br/api/oms/pvt`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `VtexIdclientAutCookie=${authCookie}`,
      },
    });

    const vtexUrl = `${api.defaults.baseURL}/orders/${orderId}`;
    logServerApiCall('GET', vtexUrl);
    console.log('Buscando detalhes do pedido:', orderId);

    const response = await api.get(`/orders/${orderId}`);
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const { orderId } = await params;
    console.error(`Erro ao buscar detalhes do pedido ${orderId}:`, error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, `Order Details API - ${orderId}`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    
    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        { 
          error: 'Token VTEX expirado! Siga as instruções no arquivo INSTRUCOES_TOKEN.md para obter um novo token.',
          details: 'O VtexIdclientAutCookie expirou. Acesse sua loja VTEX, copie o novo cookie e atualize o arquivo .env.local'
        },
        { status: 401 }
      );
    } else if (axiosError.response?.status === 404) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: `Falha ao buscar detalhes do pedido: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
