import * as XLSX from 'xlsx';
import { OrderTableRow } from '@/types/vtex';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataCleaner } from '@/utils/dataCleaner';

export class ExportService {
  static exportToExcel(orders: OrderTableRow[], filename?: string): void {
    try {
      // Preparar dados para exportação
      const exportData = orders.map(order => {
        const newsletterValue = order.newsletterOptIn !== undefined ? (order.newsletterOptIn ? 'Sim' : 'Não') : 'Não';
        console.log(`Exportando pedido ${order.orderId}: newsletterOptIn = ${order.newsletterOptIn}, valor = ${newsletterValue}`);
        
        return {
          'ID do Pedido': order.orderId,
          'Data de Criação': format(new Date(order.creationDate), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Nome do Cliente': order.customerName,
          'Email': order.email,
          'Documento': DataCleaner.formatDocument(order.document),
          'Telefone': DataCleaner.formatPhone(order.phone),
          'Endereço de Entrega': order.deliveryAddress,
          'Valor Total': this.formatCurrency(order.totalValue, order.currencyCode),
          'Status': order.statusDescription,
          'Status CL': order.clStatus,
          'Newsletter': newsletterValue,
        };
      });

      // Criar workbook e worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Definir larguras das colunas
      const columnWidths = [
        { wch: 15 }, // ID do Pedido
        { wch: 20 }, // Data de Criação
        { wch: 25 }, // Nome do Cliente
        { wch: 30 }, // Email
        { wch: 15 }, // Documento
        { wch: 15 }, // Telefone
        { wch: 40 }, // Endereço de Entrega
        { wch: 15 }, // Valor Total
        { wch: 20 }, // Status
        { wch: 15 }, // Status CL
        { wch: 12 }, // Newsletter
      ];
      worksheet['!cols'] = columnWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

      // Gerar nome do arquivo com timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss', { locale: ptBR });
      const defaultFilename = `pedidos_vtex_${timestamp}.xlsx`;
      const finalFilename = filename || defaultFilename;

      // Fazer download do arquivo
      XLSX.writeFile(workbook, finalFilename);

      console.log(`Arquivo Excel exportado: ${finalFilename}`);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      throw new Error('Falha ao exportar dados para Excel');
    }
  }

  private static formatCurrency(value: number, currencyCode: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode,
    }).format(value / 100);
  }

  static exportToCSV(orders: OrderTableRow[], filename?: string): void {
    try {
      // Preparar dados para exportação
      const exportData = orders.map(order => {
        const newsletterValue = order.newsletterOptIn !== undefined ? (order.newsletterOptIn ? 'Sim' : 'Não') : 'Não';
        
        return {
          'ID do Pedido': order.orderId,
          'Data de Criação': format(new Date(order.creationDate), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Nome do Cliente': order.customerName,
          'Email': order.email,
          'Documento': DataCleaner.formatDocument(order.document),
          'Telefone': DataCleaner.formatPhone(order.phone),
          'Endereço de Entrega': order.deliveryAddress,
          'Valor Total': this.formatCurrency(order.totalValue, order.currencyCode),
          'Status': order.statusDescription,
          'Status CL': order.clStatus,
          'Newsletter': newsletterValue,
        };
      });

      // Converter para CSV
      const csvContent = this.convertToCSV(exportData);

      // Gerar nome do arquivo com timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss', { locale: ptBR });
      const defaultFilename = `pedidos_vtex_${timestamp}.csv`;
      const finalFilename = filename || defaultFilename;

      // Fazer download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', finalFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Arquivo CSV exportado: ${finalFilename}`);
    } catch (error) {
      console.error('Erro ao exportar para CSV:', error);
      throw new Error('Falha ao exportar dados para CSV');
    }
  }

  private static convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    // Obter cabeçalhos
    const headers = Object.keys(data[0]);
    
    // Criar linha de cabeçalho
    const csvHeaders = headers.join(',');
    
    // Criar linhas de dados
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar aspas duplas e vírgulas
        const stringValue = String(value || '').replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}