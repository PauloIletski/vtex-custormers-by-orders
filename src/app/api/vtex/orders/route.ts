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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '50';
    const fCreationDate = searchParams.get('f_creationDate');

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

    const params: Record<string, string> = {
      page,
      per_page: perPage,
    };

    if (fCreationDate) {
      params.f_creationDate = fCreationDate;
    }

    const vtexUrl = `${api.defaults.baseURL}/orders`;
    logServerApiCall('GET', vtexUrl, params);
    console.log('Fazendo requisição VTEX:', {
      url: vtexUrl,
      params,
      headers: api.defaults.headers,
    });

    const response = await api.get('/orders', { params });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Erro na API VTEX:', error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, 'Orders API');
    
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
    } else if (axiosError.response?.status === 403) {
      return NextResponse.json(
        { error: 'Erro de permissão: Sua conta não tem acesso à API OMS' },
        { status: 403 }
      );
    } else if (axiosError.response?.status === 404) {
      return NextResponse.json(
        { error: 'Conta VTEX não encontrada: Verifique se o VTEX_ACCOUNT está correto' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: `Falha ao buscar pedidos da VTEX: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
