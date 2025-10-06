// Tipos para as APIs da VTEX

export interface VTEXOrder {
  orderId: string;
  creationDate: string;
  clientProfileData: {
    firstName: string;
    lastName: string;
    email: string;
    document: string;
    phone: string;
  };
  shippingData: {
    address: {
      addressName: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  value: number;
  currencyCode: string;
  status: string;
  statusDescription: string;
}

export interface VTEXOrdersResponse {
  list: VTEXOrder[];
  paging: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}

export interface VTEXOrderDetails extends VTEXOrder {
  // Detalhes adicionais podem ser adicionados aqui conforme necessário
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface OrderTableRow {
  orderId: string;
  creationDate: string;
  customerName: string;
  email: string;
  document: string;
  phone: string;
  deliveryAddress: string;
  totalValue: number;
  currencyCode: string;
  status: string;
  statusDescription: string;
  clStatus: 'Está na CL' | 'Ausente na CL';
  newsletterOptIn?: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Interfaces para Data Entities (Clientes)
export interface VTEXClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  isNewsletterOptIn?: boolean;
}

export interface VTEXDataEntitiesResponse {
  data: VTEXClient[];
  range: {
    total: number;
    from: number;
    to: number;
  };
}

// Interface para cliente com newsletter ativo
export interface NewsletterClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  isNewsletterOptIn: boolean;
}

// Interface para dados da tabela AD
export interface ADData {
  id: string;
  customer: string; // Campo para cruzar com a tabela CL
  email: string;
  additionalData?: Record<string, any>;
}

// Interface para pedido de cliente com newsletter
export interface NewsletterClientOrder extends OrderTableRow {
  clientNewsletterStatus: boolean;
  adData?: ADData;
}