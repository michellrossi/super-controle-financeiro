import { GoogleGenAI, Type } from "@google/genai";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "../types";

export interface AIParsedTransaction {
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  type: 'INCOME' | 'EXPENSE';
}

export const AIService = {
  // Used for both Bank Statements and Credit Card Statements
  parseStatement: async (
    text: string, 
    incomeCats: string[] = INCOME_CATEGORIES, 
    expenseCats: string[] = EXPENSE_CATEGORIES
  ): Promise<AIParsedTransaction[]> => {
    console.log("Iniciando processamento de IA...");
    
    // 1. Tentar obter a chave de várias fontes possíveis
    let apiKey = '';
    
    // Tentativa 1: process.env (Bundlers/Node)
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env?.API_KEY) {
        // @ts-ignore
        apiKey = process.env.API_KEY;
      }
    } catch (e) {}

    // Tentativa 2: window.process (Shims de navegador)
    if (!apiKey && typeof window !== 'undefined') {
      // @ts-ignore
      const winProcess = window.process;
      if (winProcess?.env?.API_KEY) {
        apiKey = winProcess.env.API_KEY;
      }
    }

    // Tentativa 3: import.meta.env.VITE_GEMINI_API_KEY (Vite)
    if (!apiKey && import.meta.env?.VITE_GEMINI_API_KEY) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }

    if (!apiKey) {
      console.error("API Key não encontrada.");
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
      console.log("Enviando prompt para Gemini...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um assistente financeiro especialista. Analise o texto do extrato bancário/fatura e extraia as transações.
        
        Categorias de Entrada (INCOME) permitidas: ${incomeCats.join(", ")}.
        Categorias de Saída (EXPENSE) permitidas: ${expenseCats.join(", ")}.
        
        Regras:
        1. Extraia a descrição, valor (sempre positivo), data e categoria.
        2. Use o campo "type" com valor "INCOME" para créditos/depósitos e "EXPENSE" para débitos/gastos.
        3. Formate a data estritamente como YYYY-MM-DD. Assuma o ano ${new Date().getFullYear()} se não estiver explícito.
        4. Ignore cabeçalhos, saldos totais ou linhas informativas que não sejam transações.
        5. Se a categoria não for óbvia, use "Outros".
        
        Texto do extrato:
        ${text}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                date: { type: Type.STRING },
                category: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] }
              },
              required: ["description", "amount", "date", "category", "type"]
            }
          }
        }
      });

      console.log("Resposta da IA recebida");
      if (response.text) {
        return JSON.parse(response.text) as AIParsedTransaction[];
      }
      return [];
    } catch (error: any) {
      console.error("AI Parsing Error Detalhado:", error);
      throw new Error(`Falha na IA: ${error.message || 'Erro desconhecido'}`);
    }
  },

  generateHealthReport: async (
    currentMonthName: string,
    currentIncome: number,
    currentExpense: number,
    categoryCurrent: { name: string; value: number }[],
    prevIncome: number,
    prevExpense: number,
    categoryPrev: { name: string; value: number }[],
    totalSavings: number,
    averageExpense: number
  ): Promise<string> => {
    console.log("Iniciando geração de relatório de saúde com IA...");
    
    let apiKey = '';
    
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env?.API_KEY) {
        // @ts-ignore
        apiKey = process.env.API_KEY;
      }
    } catch (e) {}

    if (!apiKey && typeof window !== 'undefined') {
      // @ts-ignore
      const winProcess = window.process;
      if (winProcess?.env?.API_KEY) {
        apiKey = winProcess.env.API_KEY;
      }
    }

    if (!apiKey && import.meta.env?.VITE_GEMINI_API_KEY) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }

    if (!apiKey) {
      console.error("API Key não encontrada.");
      throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um consultor financeiro pessoal (financial planner) experiente e amigável.
        Analise a saúde financeira do usuário para o mês de ${currentMonthName}.
        
        Aqui estão os dados financeiros consolidados:
        
        --- Mês Atual (${currentMonthName}) ---
        - Total de Entradas: R$ ${currentIncome.toFixed(2)}
        - Total de Saídas/Despesas: R$ ${currentExpense.toFixed(2)}
        - Distribuição de gastos por categoria:
          ${categoryCurrent.map(c => `- ${c.name}: R$ ${c.value.toFixed(2)}`).join('\n          ')}
        
        --- Mês Anterior ---
        - Total de Entradas: R$ ${prevIncome.toFixed(2)}
        - Total de Saídas/Despesas: R$ ${prevExpense.toFixed(2)}
        - Distribuição de gastos por categoria:
          ${categoryPrev.map(c => `- ${c.name}: R$ ${c.value.toFixed(2)}`).join('\n          ')}
          
        --- Histórico Geral ---
        - Saldo acumulado (Reserva Financeira Estimada): R$ ${totalSavings.toFixed(2)}
        - Despesa média mensal: R$ ${averageExpense.toFixed(2)}
        
        Gere um relatório de diagnóstico financeiro em Português do Brasil utilizando formato Markdown limpo e amigável.
        A análise deve conter os seguintes tópicos bem organizados:
        1. **Resumo Executivo**: Uma visão geral do mês atual (se fechou no azul ou vermelho, se o saldo é positivo, etc).
        2. **Comparativo com o Mês Anterior**: Analise variações de gastos, indicando aumentos ou reduções notáveis em categorias específicas.
        3. **Reserva Financeira & Cobertura**: Calcule e discuta quantos meses a reserva de R$ ${totalSavings.toFixed(2)} cobre com base no gasto médio mensal de R$ ${averageExpense.toFixed(2)} (Reserva / Despesa Média). Diga se a reserva é suficiente (o ideal são 6 meses).
        4. **Dicas Práticas e Recomendações**: Pelo menos 3 conselhos práticos e específicos para melhorar o controle e economizar com base nos dados.
        
        Seja encorajador, objetivo e adote um tom profissional mas acolhedor.`,
      });

      return response.text || "Não foi possível gerar a análise no momento.";
    } catch (error: any) {
      console.error("AI Report Error:", error);
      throw new Error(`Falha ao gerar relatório: ${error.message || 'Erro desconhecido'}`);
    }
  }
};