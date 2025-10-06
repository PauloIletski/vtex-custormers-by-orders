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
    const document = searchParams.get('document');
    const fields = searchParams.get('_fields') || 'id,firstName,lastName,email,document,isNewsletterOptIn';

    console.log(`🔍 API Data Entities recebeu:`, {
      email,
      document,
      fields,
      url: request.url
    });

    if (!email && !document) {
      console.log(`❌ email nem documento fornecido`);
      return NextResponse.json(
        { error: 'Parâmetro email ou document é obrigatório' },
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
      baseURL: `https://${accountName}.vtexcommercestable.com.br/api/dataentities`,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `VtexIdclientAutCookie=${authCookie}`,
      },
    });

    const params: Record<string, string> = {
      _fields: fields,
    };

    // Se tem email, busca por email
    if (email) {
      params.email = email.trim().toLowerCase();
    }
    
    // Se tem documento, busca por documento
    if (document) {
      params.document = document.trim();
    }

   

    console.log('Parâmetros finais enviados para VTEX:', params);

    const vtexUrl = `${api.defaults.baseURL}/CL/search`;
    logServerApiCall('GET', vtexUrl, params);
    console.log('Buscando cliente na Data Entities:', { email, document, params });

    const response = await api.get('/CL/search', { params });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Erro na API Data Entities:', error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, 'Data Entities API');

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
        { error: 'Cliente não encontrado na Data Entities' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Falha ao buscar cliente na Data Entities: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
