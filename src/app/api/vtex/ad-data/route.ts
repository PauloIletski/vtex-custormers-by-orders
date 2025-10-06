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
    const customer = searchParams.get('customer');
    const customers = searchParams.get('customers'); // Para buscar múltiplos customers

    console.log(`🔍 API AD Data (NOVA ABORDAGEM - CRUZAMENTO CL-AD) recebeu:`, {
      customer,
      customers,
      url: request.url
    });

    if (!customer && !customers) {
      console.log(`❌ customer nem customers fornecido`);
      return NextResponse.json(
        { error: 'Parâmetro customer ou customers é obrigatório' },
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
      _fields: 'id,customer,email,additionalData', // Incluindo customer e outros campos úteis
    };

    // Se tem customer único, busca por customer
    if (customer) {
      params.customer = customer.trim();
    }
    
    // Se tem múltiplos customers, busca por eles
    if (customers) {
      const customerList = customers.split(',').map(c => c.trim()).filter(Boolean);
      if (customerList.length > 0) {
        // Para múltiplos customers, vamos fazer uma busca por cada um
        // ou usar filtro se a API suportar
        params.customer = customerList.join(',');
      }
    }

    console.log('Parâmetros finais enviados para VTEX AD (NOVA ABORDAGEM - CRUZAMENTO CL-AD):', params);

    const vtexUrl = `${api.defaults.baseURL}/AD/search`;
    logServerApiCall('GET', vtexUrl, params);
    console.log('🔗 NOVA ABORDAGEM: Cruzando dados CL com tabela AD pelo campo customer:', params);

    const response = await api.get('/AD/search', { params });

    console.log(`📊 Resposta da tabela AD:`, {
      total: response.data?.length || 0,
      sample: response.data?.slice(0, 3)
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Erro na API AD Data:', error);
    logServerCorsError(error as Error & { code?: string; config?: { url?: string; baseURL?: string } }, 'AD Data API');

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
        { error: 'Dados não encontrados na tabela AD para os customers fornecidos' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Falha ao buscar dados da tabela AD: ${axiosError.response?.status || 'Erro de rede'}` },
      { status: axiosError.response?.status || 500 }
    );
  }
}
