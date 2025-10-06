'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { OrderTableRow } from '@/types/vtex';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataCleaner } from '@/utils/dataCleaner';

interface OrdersTableProps {
  data: OrderTableRow[];
  loading?: boolean;
  onExport?: () => void;
}

const columnHelper = createColumnHelper<OrderTableRow>();

export default function OrdersTable({ data, loading = false, onExport }: OrdersTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('orderId', {
        header: 'ID do Pedido',
        cell: (info) => (
          <span className="font-mono text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('creationDate', {
        header: 'Data de Criação',
        cell: (info) => {
          const date = new Date(info.getValue());
          return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
        },
      }),
      columnHelper.accessor('customerName', {
        header: 'Nome do Cliente',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => (
          <a 
            href={`mailto:${info.getValue()}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor('document', {
        header: 'Documento',
        cell: (info) => {
          const document = info.getValue();
          const formattedDoc = DataCleaner.formatDocument(document);
          return (
            <span className="font-mono text-sm" title={document}>
              {formattedDoc}
            </span>
          );
        },
      }),
      columnHelper.accessor('phone', {
        header: 'Telefone',
        cell: (info) => {
          const phone = info.getValue();
          const formattedPhone = DataCleaner.formatPhone(phone);
          return (
            <a 
              href={`tel:${phone}`}
              className="text-blue-600 hover:text-blue-800"
              title={phone}
            >
              {formattedPhone}
            </a>
          );
        },
      }),
      columnHelper.accessor('deliveryAddress', {
        header: 'Endereço de Entrega',
        cell: (info) => (
          <div className="max-w-xs truncate" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor('totalValue', {
        header: 'Valor Total',
        cell: (info) => {
          const value = info.getValue();
          const currency = info.row.original.currencyCode;
          return (
            <span className="font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency || 'BRL',
              }).format(value / 100)}
            </span>
          );
        },
      }),
      columnHelper.accessor('statusDescription', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const statusClass = getStatusClass(status);
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {status}
            </span>
          );
        },
      }),
      columnHelper.accessor('clStatus', {
        header: 'Status CL',
        cell: (info) => {
          const status = info.getValue();
          const isInCL = status === 'Está na CL';
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isInCL 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {status}
            </span>
          );
        },
      }),
      columnHelper.accessor('newsletterOptIn', {
        header: 'Newsletter',
        cell: (info) => {
          const opt = info.getValue();
          const isOn = !!opt;
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOn ? 'bg-green-100 text-green-800 border border-green-200'
                   : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {isOn ? 'Sim' : 'Não'}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: Math.ceil(data.length / pagination.pageSize),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando pedidos...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Nenhum pedido encontrado para o período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com botão de exportação */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Pedidos ({data.length} encontrados)
        </h2>
        {onExport && (
          <button
            onClick={onExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Exportar para Excel</span>
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-1">
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getIsSorted() === 'asc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando{' '}
                <span className="font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>{' '}
                até{' '}
                <span className="font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    data.length
                  )}
                </span>{' '}
                de{' '}
                <span className="font-medium">{data.length}</span> resultados
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusClass(status: string): string {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('confirmado') || statusLower.includes('confirmado')) {
    return 'bg-green-100 text-green-800';
  }
  if (statusLower.includes('pendente') || statusLower.includes('pending')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (statusLower.includes('cancelado') || statusLower.includes('cancelled')) {
    return 'bg-red-100 text-red-800';
  }
  if (statusLower.includes('entregue') || statusLower.includes('delivered')) {
    return 'bg-blue-100 text-blue-800';
  }
  
  return 'bg-gray-100 text-gray-800';
}
