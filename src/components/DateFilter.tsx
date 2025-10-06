'use client';

import React, { useState, useEffect } from 'react';
import { DateRange } from '@/types/vtex';
import { format, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateFilterProps {
  onDateRangeChange: (dateRange: DateRange | null) => void;
  onApply: () => void;
  loading?: boolean;
  value?: DateRange | null;
}

export default function DateFilter({ onDateRangeChange, onApply, loading = false, value }: DateFilterProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('');

  // Sincroniza value externo (dateRangeDraft) com os inputs
  useEffect(() => {
    if (value) {
      setStartDate(format(value.startDate, 'yyyy-MM-dd'));
      setEndDate(format(value.endDate, 'yyyy-MM-dd'));
    }
  }, [value]);

  const presets = [
    {
      label: 'Últimos 7 dias',
      getDates: () => ({
        start: subDays(new Date(), 7),
        end: new Date(),
      }),
    },
    {
      label: 'Últimos 30 dias',
      getDates: () => ({
        start: subDays(new Date(), 30),
        end: new Date(),
      }),
    },
    {
      label: 'Últimos 3 meses',
      getDates: () => ({
        start: subMonths(new Date(), 3),
        end: new Date(),
      }),
    },
    {
      label: 'Últimos 6 meses',
      getDates: () => ({
        start: subMonths(new Date(), 6),
        end: new Date(),
      }),
    },
    {
        label: 'Últimos 12 meses',
        getDates: () => ({
          start: subMonths(new Date(), 12),
          end: new Date(),
        }),
      },
  ];

  const handlePresetClick = (preset: typeof presets[0], presetLabel: string) => {
    const { start, end } = preset.getDates();
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    
    setStartDate(startStr);
    setEndDate(endStr);
    setActivePreset(presetLabel);
    
    onDateRangeChange({
      startDate: start,
      endDate: end,
    });
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Definir horário para cobrir o dia inteiro
      end.setHours(23, 59, 59, 999);
      
      setActivePreset('');
      onDateRangeChange({
        startDate: start,
        endDate: end,
      });
    } else {
      onDateRangeChange(null);
    }
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset('');
    onDateRangeChange(null);
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Filtrar por Período
      </h3>
      
      {/* Presets rápidos */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Períodos rápidos:</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset, preset.label)}
              disabled={loading}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                activePreset === preset.label
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros customizados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            Data Final
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCustomDateChange}
            disabled={loading || !startDate || !endDate}
            className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            Pré-visualizar
          </button>
          <button
            onClick={onApply}
            disabled={loading || !startDate || !endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            Aplicar
          </button>
          <button
            onClick={handleClearFilter}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Informações sobre o filtro ativo */}
      {activePreset && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Filtro ativo:</strong> {activePreset}
          </p>
        </div>
      )}
      
      {startDate && endDate && !activePreset && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Período customizado:</strong> {format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} até {format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
      )}
    </div>
  );
}
