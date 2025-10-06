import { NextRequest, NextResponse } from 'next/server';
import { vtexApiService } from '@/services/vtexApi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log(`🔍 API Newsletter Orders recebeu:`, {
      page,
      pageSize,
      dateFrom,
      dateTo,
      url: request.url
    });

    // Criar filtro de data se fornecido
    let dateRange;
    if (dateFrom && dateTo) {
      dateRange = {
        startDate: new Date(dateFrom),
        endDate: new Date(dateTo)
      };
    }

    console.log('🚀 Iniciando busca de pedidos de clientes com newsletter...');

    const newsletterOrders = await vtexApiService.getNewsletterClientOrders(
      dateRange,
      page,
      pageSize
    );

    console.log(`🎉 Busca concluída: ${newsletterOrders.length} pedidos encontrados`);

    return NextResponse.json({
      orders: newsletterOrders,
      total: newsletterOrders.length,
      page,
      pageSize,
      dateRange: dateRange ? {
        from: dateRange.startDate.toISOString(),
        to: dateRange.endDate.toISOString()
      } : null
    });

  } catch (error: unknown) {
    console.error('❌ Erro na API Newsletter Orders:', error);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessage = (error as any)?.message || 'Erro desconhecido';
    
    return NextResponse.json(
      { 
        error: `Falha ao buscar pedidos de clientes com newsletter: ${errorMessage}`,
        details: error
      },
      { status: 500 }
    );
  }
}
