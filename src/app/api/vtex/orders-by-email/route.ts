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
    const email = searchParams.get('email');
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '100';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log(`🔍 API Orders by Email (NOVA ABORDAGEM):`, {
      email,
      page,
      perPage,
      dateFrom,
      dateTo,
      url: request.url
    });

    if (!email) {
      console.log(`❌ email não fornecido`);
      return NextResponse.json(
        { error: 'Parâmetro email é obrigatório' },
        { status: 400 }
      );
    }

    const accountName = process.env.VTEX_ACCOUNT;
    const authCookie = process.env.VTEX_AUTH_COOKIE;

    if (!accountName || !authCookie) {
      return NextResponse.json(
        { error: 'VTEX_ACCOUNT ou VTEX_AUTH_COOKIE não configurados nas variáveis de ambiente' },
        { status: 500 }
      );
    }

    const api = axios.create({
      baseURL: `https://${accountName}.vtexcommercestable.com.br/api/oms/pvt/orders`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `VtexIdclientAutCookie=${authCookie}`,
      },
    });

    const params: Record<string, string> = {
      page,
      per_page: perPage,
      f_clientEmail: email.trim().toLowerCase(),
    };

    // Adicionar filtro de data se fornecido
    if (dateFrom && dateTo) {
      params.f_creationDate = `creationDate:[${dateFrom} TO ${dateTo}]`;
    }

    console.log('Parâmetros finais enviados para VTEX Orders:', params);

    const vtexUrl = `${api.defaults.baseURL}`;
    logServerApiCall('GET', vtexUrl, params);
    console.log('Buscando pedidos por email:', params);

    const response = await api.get('', { params });

    console.log(`📊 Resposta dos pedidos por email:`, {
      total: response.data?.list?.length || 0,
      paging: response.data?.paging,
      sample: response.data?.list?.slice(0, 3)
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Erro na API Orders by Email:', error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, 'Orders by Email API');

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
        { error: 'Erro de permissão: Sua conta não tem acesso à API de Pedidos' },
        { status: 403 }
      );
    } else if (axiosError.response?.status === 404) {
      return NextResponse.json(
        { error: 'Nenhum pedido encontrado para este email' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Falha ao buscar pedidos por email: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
