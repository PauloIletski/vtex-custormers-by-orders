import axios, { AxiosInstance } from 'axios';
import { VTEXOrdersResponse, VTEXOrderDetails, VTEXOrder, OrderTableRow, DateRange, VTEXClient, NewsletterClient, ADData, NewsletterClientOrder } from '@/types/vtex';
import { DataCleaner } from '@/utils/dataCleaner';
import { getAxiosConfig, logApiCall, logCorsError } from '@/config/api';
import { RequestQueue } from '../utils/requestQueue';

class VTEXApiService {
  private api: AxiosInstance;

  constructor() {
    // Usar API routes locais para evitar problemas de CORS
    this.api = axios.create(getAxiosConfig());
    
    // Interceptor para logs de debugging
    this.api.interceptors.request.use(
      (config) => {
        logApiCall(config.method?.toUpperCase() || 'GET', config.url || '', config.params);
        return config;
      },
      (error) => {
        logCorsError(error, 'Request Interceptor');
        return Promise.reject(error);
      }
    );

    // Interceptor para logs de resposta
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        logCorsError(error, 'Response Interceptor');
        return Promise.reject(error);
      }
    );
  }


  async getOrders(
    page: number = 1,
    perPage: number = 100,
    dateRange?: DateRange
  ): Promise<VTEXOrdersResponse> {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        per_page: perPage.toString(),
      };

      // Adicionar filtro de data se fornecido
      if (dateRange) {
        const startDate = dateRange.startDate.toISOString();
        const endDate = dateRange.endDate.toISOString();
        params.f_creationDate = `creationDate:[${startDate} TO ${endDate}]`;
      }

      const response = await this.api.get('/orders', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Erro ao buscar pedidos:', error);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Erro desconhecido';
      throw new Error(errorMessage);
    }
  }

  async getOrderDetails(orderId: string): Promise<VTEXOrderDetails> {
    try {
      const orderDetailsQueue = new RequestQueue(250); // 1 requisição a cada 250ms (~4 por segundo)
      return orderDetailsQueue.add(async () => {
        const response = await this.api.get(`/orders/${orderId}`);
        return response.data;
      });
    } catch (error: unknown) {
      console.error(`Erro ao buscar detalhes do pedido ${orderId}:`, error);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Erro desconhecido';
      throw new Error(errorMessage);
    }
  }


  // Método para converter dados da VTEX para formato da tabela
  convertToTableRow(order: VTEXOrder): OrderTableRow {
    const { clientProfileData, shippingData, orderId, creationDate, value, currencyCode, status, statusDescription } = order;
    
    return {
      orderId,
      creationDate,
      customerName: DataCleaner.cleanName(`${clientProfileData.firstName} ${clientProfileData.lastName}`),
      email: DataCleaner.cleanEmail(clientProfileData.email),
      document: DataCleaner.cleanDocument(clientProfileData.document),
      phone: DataCleaner.cleanPhone(clientProfileData.phone),
      deliveryAddress: this.formatAddress(shippingData.address),
      totalValue: value,
      currencyCode,
      status,
      statusDescription,
      clStatus: 'Ausente na CL', // Valor padrão para o método sem verificação
      newsletterOptIn: false,
    };
  }

  /**
   * Converte pedido para linha da tabela com verificação de status na CL
   */
  async convertToTableRowWithCLStatus(order: VTEXOrder): Promise<OrderTableRow> {
    const { clientProfileData, shippingData, orderId, creationDate, value, currencyCode, status, statusDescription } = order;
    
    console.log(`📋 Pedido ${orderId}:`, {
      email: clientProfileData.email,
      document: clientProfileData.document,
      firstName: clientProfileData.firstName,
      lastName: clientProfileData.lastName
    });
    
    // Limpa o email original
    const cleanedEmail = DataCleaner.cleanEmail(clientProfileData.email);
    const cleanedDocument = DataCleaner.cleanDocument(clientProfileData.document);

    // Busca cliente na CL para obter status e newsletter
    const client = await this.getClientFromDataEntities(cleanedEmail, cleanedDocument);
    const clStatus = client ? 'Está na CL' : 'Ausente na CL';
    const newsletterOptIn = client?.isNewsletterOptIn ?? false;
    
    console.log(`📋 Pedido ${orderId} - Cliente encontrado:`, {
      email: cleanedEmail,
      document: cleanedDocument,
      client: client ? 'Sim' : 'Não',
      isNewsletterOptIn: client?.isNewsletterOptIn,
      newsletterOptIn
    });
    
    return {
      orderId,
      creationDate,
      customerName: DataCleaner.cleanName(`${clientProfileData.firstName} ${clientProfileData.lastName}`),
      email: cleanedEmail,
      document: DataCleaner.cleanDocument(clientProfileData.document),
      phone: DataCleaner.cleanPhone(clientProfileData.phone),
      deliveryAddress: this.formatAddress(shippingData.address),
      totalValue: value,
      currencyCode,
      status,
      statusDescription,
      clStatus,
      newsletterOptIn,
    };
  }

  private formatAddress(address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): string {
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  // Método para buscar pedidos com detalhes completos
  async getOrdersWithDetails(
    page: number = 1,
    perPage: number = 100,
    dateRange?: DateRange
  ): Promise<OrderTableRow[]> {
    try {
      const ordersResponse = await this.getOrders(page, perPage, dateRange);
      const tableRows: OrderTableRow[] = [];

      // Processar cada pedido para obter detalhes completos
      for (const order of ordersResponse.list) {
        try {
          const orderDetails = await this.getOrderDetails(order.orderId);
          // Usar verificação de status na CL
          const tableRow = await this.convertToTableRowWithCLStatus(orderDetails);
          tableRows.push(tableRow);
        } catch (error) {
          console.warn(`Erro ao obter detalhes do pedido ${order.orderId}:`, error);
          // Usar dados básicos com verificação de status se detalhes falharem
          const tableRow = await this.convertToTableRowWithCLStatus(order);
          tableRows.push(tableRow);
        }
      }

      return tableRows;
    } catch (error) {
      console.error('Erro ao buscar pedidos com detalhes:', error);
      throw error;
    }
  }


  /**
   * Busca cliente na Data Entities da VTEX por documento
   * @param document - Documento do cliente (CPF/CNPJ)
   * @returns Dados do cliente encontrado
   */
  async getClientFromDataEntitiesByDocument(document: string): Promise<VTEXClient | null> {
    try {
      if (!document) {
        console.log(`❌ Documento vazio, não buscando na Data Entities`);
        return null;
      }

      // Primeiro tenta com formatação (se o documento original tinha formatação)
      const hasFormatting = /[^\d]/.test(document);

      if (hasFormatting) {
        console.log(`🔍 Tentando buscar documento com formatação: ${document}`);
        const client = await this.searchDocumentInVTEX(document);
        if (client) {
          return client;
        }
      }

      // Se não encontrou com formatação ou documento não tinha formatação, tenta sem formatação
      const cleanDocument = document.replace(/\D/g, '');
      if (cleanDocument !== document) {
        console.log(`🔍 Tentando buscar documento sem formatação: ${cleanDocument}`);
        const client = await this.searchDocumentInVTEX(cleanDocument);
        if (client) {
          return client;
        }
      }

      console.log(`⚠️ Cliente não encontrado na Data Entities por documento: ${document}`);
      return null;
    } catch (error: unknown) {
      console.error(`❌ Erro ao buscar cliente ${document} na Data Entities:`, error);
      return null;
    }
  }

  /**
   * Busca documento específico na VTEX
   * @param document - Documento para buscar
   * @returns Dados do cliente encontrado
   */
  private async searchDocumentInVTEX(document: string): Promise<VTEXClient | null> {
    console.log(`🔍 Fazendo requisição para Data Entities por documento: /dataentities?document=${document}`);
    
    const response = await this.api.get('/dataentities', {
      params: {
        document,
        _fields: 'id,firstName,lastName,email,document,isNewsletterOptIn'
      }
    });

    const dataEntitiesResponse = response.data;
    console.log(`📊 Resposta da Data Entities (documento ${document}):`, dataEntitiesResponse);

    if (Array.isArray(dataEntitiesResponse) && dataEntitiesResponse.length > 0) {
      const client = dataEntitiesResponse.find(
        (c) =>
          c &&
          typeof c.document === 'string' &&
          c.document.replace(/\D/g, '') === document.replace(/\D/g, '')
      );
      if (client) {
        console.log(`✅ Cliente encontrado na Data Entities por documento: ${document} -> ${client.document}`);
        return client;
      }
    }

    return null;
  }

  /**
   * Busca cliente na Data Entities da VTEX tentando primeiro por email, depois por documento
   * @param email - Email do cliente
   * @param document - Documento do cliente (CPF/CNPJ)
   * @returns Dados do cliente encontrado
   */
  async getClientFromDataEntities(email: string, document?: string): Promise<VTEXClient | null> {
    // Primeiro tenta por email se válido
    if (email && DataCleaner.isValidEmail(email)) {
      console.log(`🔍 Tentando buscar cliente por email: ${email}`);
      const clientByEmail = await this.getClientFromDataEntitiesByEmail(email);
      if (clientByEmail) {
        return clientByEmail;
      }
    }

    // Se não encontrou por email e tem documento, tenta por documento
    if (document) {
      console.log(`🔍 Tentando buscar cliente por documento: ${document}`);
      return await this.getClientFromDataEntitiesByDocument(document);
    }

    return null;
  }

  /**
   * Busca cliente na Data Entities da VTEX por email (método específico)
   * @param email - Email do cliente
   * @returns Dados do cliente encontrado
   */
  async getClientFromDataEntitiesByEmail(email: string): Promise<VTEXClient | null> {
    try {
      if (!email) {
        console.log(`❌ Email vazio, não buscando na Data Entities`);
        return null;
      }

      console.log(`🔍 Fazendo requisição para Data Entities por email: /dataentities?email=${email}`);
      
      const response = await this.api.get('/dataentities', {
        params: {
          email,
          _fields: 'id,firstName,lastName,email,document,isNewsletterOptIn'
        }
      });

      const dataEntitiesResponse = response.data;
      console.log(`📊 Resposta da Data Entities (email):`, dataEntitiesResponse);

      if (Array.isArray(dataEntitiesResponse) && dataEntitiesResponse.length > 0) {
        const client = dataEntitiesResponse.find(
          (c) =>
            c &&
            typeof c.email === 'string' &&
            c.email.trim().toLowerCase() === email.trim().toLowerCase()
        );
        if (client) {
          console.log(`✅ Cliente encontrado na Data Entities por email: ${email} -> ${client.email}`);
          return client;
        }
      }

      console.log(`⚠️ Cliente não encontrado na Data Entities por email: ${email}`);
      return null;
    } catch (error: unknown) {
      console.error(`❌ Erro ao buscar cliente ${email} na Data Entities:`, error);
      return null;
    }
  }

  /**
   * Busca clientes com newsletter ativo da tabela CL
   * @param page - Página atual
   * @param pageSize - Tamanho da página
   * @param dateRange - Período de criação
   * @returns Lista de clientes com newsletter ativo
   */
  async getNewsletterClients(page: number = 1, pageSize: number = 100, dateRange?: DateRange): Promise<NewsletterClient[]> {
    try {
      console.log(`🔍 Buscando clientes com newsletter ativo - página ${page}, tamanho ${pageSize}, período:`, dateRange);
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };
      if (dateRange) {
        params.dateFrom = dateRange.startDate.toISOString();
        params.dateTo = dateRange.endDate.toISOString();
      }
      const response = await this.api.get('/newsletter-clients', { params });
      const clients = response.data;
      console.log(`📊 Encontrados ${clients?.length || 0} clientes com newsletter ativo`);
      return clients || [];
    } catch (error: unknown) {
      console.error(`❌ Erro ao buscar clientes com newsletter:`, error);
      return [];
    }
  }

  /**
   * Busca dados da tabela AD para um ou múltiplos customers (emails)
   * @param customers - Email(s) para buscar
   * @returns Dados da tabela AD
   */
  async getADData(customers: string | string[]): Promise<ADData[]> {
    try {
      const customerParam = Array.isArray(customers) ? customers.join(',') : customers;
      console.log(`🔍 Buscando dados da tabela AD para customers (emails): ${customerParam}`);
      const response = await this.api.get('/ad-data', {
        params: {
          customers: customerParam
        }
      });
      const adData = response.data;
      console.log(`📊 Encontrados ${adData?.length || 0} registros na tabela AD`);
      return adData || [];
    } catch (error: unknown) {
      console.error(`❌ Erro ao buscar dados da tabela AD:`, error);
      return [];
    }
  }

  /**
   * Busca pedidos por email
   * @param email - Email do cliente
   * @param dateRange - Filtro de data opcional
   * @param page - Página atual
   * @param perPage - Itens por página
   * @returns Lista de pedidos
   */
  async getOrdersByEmail(
    email: string, 
    dateRange?: DateRange, 
    page: number = 1, 
    perPage: number = 100
  ): Promise<VTEXOrdersResponse> {
    try {
      const params: Record<string, string> = {
        email,
        page: page.toString(),
        per_page: perPage.toString(),
      };

      // Adicionar filtro de data se fornecido
      if (dateRange) {
        const startDate = dateRange.startDate.toISOString();
        const endDate = dateRange.endDate.toISOString();
        params.dateFrom = startDate;
        params.dateTo = endDate;
      }

      console.log(`🔍 Buscando pedidos para email ${email}:`, params);
      
      const response = await this.api.get('/orders-by-email', { params });
      
      console.log(`📊 Encontrados ${response.data?.list?.length || 0} pedidos para email ${email}`);
      
      return response.data;
    } catch (error: unknown) {
      console.error(`❌ Erro ao buscar pedidos por email ${email}:`, error);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Erro desconhecido';
      throw new Error(errorMessage);
    }
  }

  /**
   * Nova abordagem: Inicia pela entidade CL (clientes com newsletter) -> cruza com AD -> busca pedidos
   * @param dateRange - Filtro de data opcional
   * @param page - Página atual
   * @param pageSize - Tamanho da página
   * @returns Lista de pedidos de clientes com newsletter
   */
  async getNewsletterClientOrders(
    dateRange?: DateRange,
    page: number = 1,
    pageSize: number = 100
  ): Promise<NewsletterClientOrder[]> {
    try {
      console.log(`🚀 NOVA ABORDAGEM: Iniciando pela entidade CL -> AD -> Orders (busca pedidos em lote)`);
      // PASSO 1: Buscar clientes com newsletter ativo na entidade CL
      const newsletterClients = await this.getNewsletterClients(page, pageSize, dateRange);
      if (newsletterClients.length === 0) return [];
      // PASSO 2: Buscar dados da AD
      const emails = newsletterClients.map(client => client.email).filter(Boolean);
      const adData = await this.getADData(emails);
      const adDataMap = new Map<string, ADData>();
      adData.forEach(ad => {
        if (ad.customer) adDataMap.set(ad.customer.trim().toLowerCase(), ad);
      });
      // PASSO 3: Buscar todos os pedidos do período, status finalizado
      let allOrders: VTEXOrder[] = [];
      let pedidosPage = 1;
      const perPage = 100;
      let hasMore = true;
      while (hasMore) {
        const ordersResp = await this.getOrders(pedidosPage, perPage, dateRange);
        const finalizados = (ordersResp.list || []).filter(order => {
          // status finalizado: invoiced, delivered, complete, etc (ajuste conforme necessário)
          const status = order.status?.toLowerCase();
          return [
            'invoiced', 'delivered', 'complete', 'faturado', 'entregue', 'completo'
          ].includes(status);
        });
        allOrders = allOrders.concat(finalizados);
        if (ordersResp.list.length < perPage) hasMore = false;
        else pedidosPage++;
      }
      // PASSO 4: Para cada cliente CL, filtrar pedidos pelo email
      const result: NewsletterClientOrder[] = [];
      for (const client of newsletterClients) {
        const clientEmail = client.email.trim().toLowerCase();
        const pedidosDoCliente = allOrders.filter(order => {
          const orderEmail = order.clientProfileData?.email?.trim().toLowerCase();
          return orderEmail === clientEmail;
        });
        const adDataForClient = adDataMap.get(clientEmail);
        if (pedidosDoCliente.length > 0) {
          for (const order of pedidosDoCliente) {
            const orderDetails = await this.getOrderDetails(order.orderId);
            const baseTableRow = await this.convertToTableRowWithCLStatus(orderDetails);
            result.push({
              ...baseTableRow,
              clientNewsletterStatus: true,
              adData: adDataForClient
            });
          }
        } else {
          result.push({
            orderId: '',
            creationDate: '',
            customerName: `${client.firstName} ${client.lastName}`,
            email: client.email,
            document: client.document,
            phone: '',
            deliveryAddress: adDataForClient?.additionalData?.address || '',
            totalValue: 0,
            currencyCode: '',
            status: '',
            statusDescription: '',
            clStatus: 'Está na CL',
            newsletterOptIn: client.isNewsletterOptIn,
            clientNewsletterStatus: true,
            adData: adDataForClient
          });
        }
      }
      return result;
    } catch (error: unknown) {
      console.error(`❌ Erro na nova abordagem CL->AD->Orders:`, error);
      throw error;
    }
  }
}

// Instância singleton
export const vtexApiService = new VTEXApiService();
export default VTEXApiService;
