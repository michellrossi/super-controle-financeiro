/**
 * Utilitários para exportação de dados em formatos JSON e CSV.
 */

// Helper para converter um valor para formato de célula CSV seguro
const formatCSVValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val);
  if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converte um array de objetos para uma string no formato CSV.
 */
export const convertToCSV = (data: any[]): string => {
  if (!data || data.length === 0) return '';
  
  // Obter todas as chaves exclusivas de todos os objetos
  const headers = Array.from(
    new Set(data.reduce((acc, obj) => [...acc, ...Object.keys(obj)], [] as string[]))
  );

  const csvRows = [];
  
  // Adiciona o cabeçalho
  csvRows.push(headers.join(','));

  // Adiciona as linhas correspondentes
  for (const row of data) {
    const values = headers.map(header => formatCSVValue(row[header]));
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Dispara o download de um arquivo de texto/dados no navegador.
 */
export const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Exporta dados consolidados em formato JSON.
 */
export const exportToJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename, 'application/json;charset=utf-8;');
};

/**
 * Exporta um array de dados para formato CSV.
 */
export const exportToCSV = (data: any[], filename: string) => {
  const csvString = convertToCSV(data);
  downloadFile(csvString, filename, 'text/csv;charset=utf-8;');
};
