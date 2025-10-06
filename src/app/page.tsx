'use client';

import React, { useState, useEffect } from 'react';
import { OrderTableRow, DateRange, NewsletterClientOrder } from '@/types/vtex';
import { vtexApiService } from '@/services/vtexApi';
import { ExportService } from '@/services/exportService';
import OrdersTable from '@/components/OrdersTable';
import DateFilter from '@/components/DateFilter';
import { CONFIG, isLimitReached, getLimitMessage } from '@/config/constants';

export default function Home() {
  const [orders, setOrders] = useState<OrderTableRow[]>([]);
  const [newsletterOrders, setNewsletterOrders] = useState<NewsletterClientOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null); // aplicado
  const [dateRangeDraft, setDateRangeDraft] = useState<DateRange | null>(null); // edição
  const [totalOrders, setTotalOrders] = useState(0);
  const [showOnlyInCL, setShowOnlyInCL] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'newsletter'>('all');

  const loadOrders = async (range?: DateRange | null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar pedidos em lotes para evitar timeout
      const allOrders: OrderTableRow[] = [];
      let page = 1;
      const perPage = CONFIG.PER_PAGE;
      let hasMore = true;

      while (hasMore && allOrders.length < CONFIG.MAX_ORDERS && page <= CONFIG.MAX_PAGES) {
        console.log(`Carregando página ${page}... (${allOrders.length} pedidos carregados)`);
        
        const ordersData = await vtexApiService.getOrdersWithDetails(page, perPage, range || undefined);
        
        if (ordersData.length === 0) {
          hasMore = false;
        } else {
          allOrders.push(...ordersData);
          page++;
          
          // Se retornou menos que o esperado, não há mais páginas
          if (ordersData.length < perPage) {
            hasMore = false;
          }
        }
      }

      // Aviso se atingiu o limite
      if (isLimitReached(allOrders.length)) {
        console.warn(`Limite de ${CONFIG.MAX_ORDERS} pedidos atingido. Pode haver mais pedidos disponíveis.`);
      }

      setOrders(allOrders);
      setTotalOrders(allOrders.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar pedidos';
      setError(errorMessage);
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNewsletterOrders = async (range?: DateRange | null) => {
    console.log('🚀 INICIANDO loadNewsletterOrders - Nova Abordagem CL->AD->Orders');
    setLoading(true);
    setError(null);
    
    try {
      console.log('📧 Carregando pedidos de clientes com newsletter...');
      console.log('🔍 Parâmetros:', { range, page: 1, perPage: CONFIG.PER_PAGE });
      
      const newsletterOrdersData = await vtexApiService.getNewsletterClientOrders(range || undefined, 1, CONFIG.PER_PAGE);
      
      console.log(`✅ loadNewsletterOrders CONCLUÍDO: ${newsletterOrdersData.length} pedidos carregados`);
      console.log('📊 Dados carregados:', newsletterOrdersData.slice(0, 2)); // Mostrar apenas 2 primeiros para debug
      
      setNewsletterOrders(newsletterOrdersData);
      setTotalOrders(newsletterOrdersData.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar pedidos de newsletter';
      console.error('❌ ERRO em loadNewsletterOrders:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Novo: só executa busca ao aplicar
  const handleApplyDateRange = () => {
    setDateRange(dateRangeDraft);
    if (viewMode === 'newsletter') {
      loadNewsletterOrders(dateRangeDraft);
    } else {
      loadOrders(dateRangeDraft);
    }
  };

  // Mudança de draft (edição)
  const handleDateRangeDraftChange = (range: DateRange | null) => {
    setDateRangeDraft(range);
  };

  // handleViewModeChange: ao trocar modo, executa busca com dateRange já aplicado
  const handleViewModeChange = (mode: 'all' | 'newsletter') => {
    setViewMode(mode);
    if (mode === 'newsletter') {
      loadNewsletterOrders(dateRange);
    } else {
      loadOrders(dateRange);
    }
  };

  const handleExport = () => {
    try {
      if (viewMode === 'newsletter') {
        // Exportar pedidos de newsletter (já filtrados por newsletter)
        ExportService.exportToExcel(newsletterOrders.map(order => ({
          ...order,
          newsletterStatus: 'Ativo',
          adData: order.adData ? 'Presente na AD' : 'Ausente na AD'
        })));
      } else {
        const ordersToExport = showOnlyInCL 
          ? orders.filter(order => order.clStatus === 'Está na CL')
          : orders;
        ExportService.exportToExcel(ordersToExport);
      }
    } catch (err) {
      setError('Erro ao exportar dados para Excel');
      console.error('Erro na exportação:', err);
    }
  };

  const toggleCLFilter = () => {
    setShowOnlyInCL(!showOnlyInCL);
  };

  // Filtrar pedidos baseado no status CL (apenas para modo 'all')
  const filteredOrders = viewMode === 'newsletter' 
    ? newsletterOrders 
    : (showOnlyInCL 
      ? orders.filter(order => order.clStatus === 'Está na CL')
      : orders);

  // Carregar pedidos iniciais (últimos 30 dias) - apenas uma vez
  useEffect(() => {
    const initialDateRange: DateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    setDateRange(initialDateRange);
    setDateRangeDraft(initialDateRange);
    loadOrders(initialDateRange);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Consulta de Pedidos VTEX
          </h1>
          <p className="mt-2 text-gray-600">
            Visualize e exporte pedidos da sua loja VTEX com filtros por data
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-8 space-y-4">
          {/* Seletor de Modo */}
          <div className="flex items-center space-x-4">
            <div className="flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => handleViewModeChange('all')}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium border ${
                  viewMode === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''} rounded-l-lg`}
              >
                Todos os Pedidos
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('newsletter')}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium border ${
                  viewMode === 'newsletter'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''} rounded-r-lg`}
              >
                Clientes com Newsletter
              </button>
            </div>
            
            {viewMode === 'newsletter' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-green-600 font-medium">
                  📧 Modo Newsletter Ativo
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
            {viewMode === 'all' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600 font-medium">
                  📋 Modo Todos os Pedidos
                </span>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
            
            {/* Botão de debug temporário */}
            <button
              onClick={() => {
                console.log('🔍 DEBUG - Estado atual:', {
                  viewMode,
                  ordersLength: orders.length,
                  newsletterOrdersLength: newsletterOrders.length,
                  filteredOrdersLength: filteredOrders.length,
                  showOnlyInCL,
                  loading,
                  error
                });
              }}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
              title="Debug - Ver estado atual no console"
            >
              🔍 Debug
            </button>
          </div>

          <DateFilter
            onDateRangeChange={handleDateRangeDraftChange}
            onApply={handleApplyDateRange}
            loading={loading}
            value={dateRangeDraft}
          />
          
          {/* Filtro de Status CL (apenas no modo 'all') */}
          {viewMode === 'all' && (
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleCLFilter}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors ${
                  showOnlyInCL
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                {showOnlyInCL ? 'Mostrar Apenas na CL' : 'Filtrar por Status CL'}
              </button>
              
              {showOnlyInCL && (
                <span className="text-sm text-gray-600">
                  Mostrando {filteredOrders.length} de {orders.length} pedidos
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erro ao carregar dados
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  <p className="mt-1">
                    Verifique suas configurações no arquivo .env.local e tente novamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informações sobre os dados carregados */}
        {!loading && !error && (
          <div className={`mb-6 border rounded-lg p-4 ${
            viewMode === 'newsletter' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${
                  viewMode === 'newsletter' ? 'text-green-400' : 'text-blue-400'
                }`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className={`text-sm ${
                  viewMode === 'newsletter' ? 'text-green-800' : 'text-blue-800'
                }`}>
                  <strong>{totalOrders}</strong> {viewMode === 'newsletter' ? 'pedidos de clientes com newsletter' : 'pedidos carregados'}
                  {dateRange && (
                    <span className="ml-2">
                      • Período: {dateRange.startDate.toLocaleDateString('pt-BR')} até {dateRange.endDate.toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </p>
                {viewMode === 'newsletter' && newsletterOrders.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    📊 {newsletterOrders.filter(order => order.adData).length} clientes também encontrados na tabela AD
                  </p>
                )}
                {viewMode === 'all' && isLimitReached(totalOrders) && (
                  <p className="text-xs text-blue-600 mt-1">
                    {getLimitMessage(totalOrders)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabela de pedidos */}
        <OrdersTable
          data={filteredOrders}
          loading={loading}
          onExport={filteredOrders.length > 0 ? handleExport : undefined}
        />

        {/* Rodapé */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>
              Aplicação desenvolvida para consulta de pedidos VTEX
            </p>
            <p className="mt-1">
              Configure suas credenciais no arquivo <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code>
            </p>
          </div>
      </footer>
      </div>
    </div>
  );
}
