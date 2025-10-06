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
    const pageSize = searchParams.get('pageSize') || '100';
    // Remover dateFrom/dateTo/createdIn

    console.log(`🔍 API Newsletter Clients recebeu:`, {
      page,
      pageSize,
      url: request.url
    });

    const accountName = process.env.VTEX_ACCOUNT;
    const authCookie = process.env.VTEX_AUTH_COOKIE;

    if (!accountName || !authCookie) {
      return NextResponse.json(
        { error: 'VTEX_ACCOUNT ou VTEX_AUTH_COOKIE não configurados nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const api = axios.create({
      baseURL: `https://${accountName}.vtexcommercestable.com.br/api/dataentities`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `VtexIdclientAutCookie=${authCookie}`,
      },
    });

    // Buscar clientes com newsletter ativo
    const params: Record<string, string> = {
      _fields: 'id,firstName,lastName,email,document,isNewsletterOptIn,createdIn',
      isNewsletterOptIn: 'true',
    };
    // Não adicionar filtro de data

    console.log('Parâmetros finais enviados para VTEX (NOVA ABORDAGEM - INICIANDO PELA CL):', params);

    const vtexUrl = `${api.defaults.baseURL}/CL/search`;
    logServerApiCall('GET', vtexUrl, params);
    console.log('🚀 NOVA ABORDAGEM: Buscando clientes com newsletter ativo na tabela CL:', params);

    const response = await api.get('/CL/search', { params });

    console.log(`📊 Resposta da Data Entities (newsletter clients):`, {
      total: response.data?.length || 0,
      sample: response.data?.slice(0, 3)
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Erro na API Newsletter Clients:', error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, 'Newsletter Clients API');

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
        { error: 'Erro de permissão: Sua conta não tem acesso à API Data Entities' },
        { status: 403 }
      );
    } else if (axiosError.response?.status === 404) {
      return NextResponse.json(
        { error: 'Nenhum cliente com newsletter ativo encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Falha ao buscar clientes com newsletter: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
