/**
 * Utilitários para limpeza de dados vindos da VTEX
 * Remove máscaras, caracteres especiais e formatações desnecessárias
 */


export class DataCleaner {
  /**
   * Limpa email removendo máscaras e caracteres especiais da VTEX
   */
  static cleanEmail(email: string): string {
    if (!email) return '';
    
    // Remove espaços em branco
    let cleanEmail = email.trim();
    
    // Casos específicos da VTEX
    // Exemplo: lu_bellevicari@hotmail.com-253800444819b.ct.vtex.com.br
    const vtexEmailPattern = /^(.+@[^-]+)-(\d+[a-z]?\.ct\.vtex\.com\.br)$/;
    const vtexMatch = cleanEmail.match(vtexEmailPattern);
    
    if (vtexMatch) {
      // Extrai apenas a parte do email real
      cleanEmail = vtexMatch[1];
      console.log(`Email VTEX detectado: "${email}" -> extraído: "${cleanEmail}"`);
    }
    
    // Casos com sufixos @ct.vtex.com.br (emails internos da VTEX)
    if (cleanEmail.endsWith('@ct.vtex.com.br')) {
      // Se é um hash/ID, não é um email real
      const localPart = cleanEmail.split('@')[0];
      if (/^[a-f0-9]{32}$/.test(localPart)) {
        console.warn(`Email VTEX interno detectado (hash): "${email}" - não é um email real`);
        return ''; // Retorna vazio para emails internos da VTEX
      }
    }
    
    // Remove caracteres especiais comuns em máscaras VTEX
    // Como: [email], <email>, "email", etc.
    cleanEmail = cleanEmail.replace(/^[\[<"]+/, '').replace(/[\]>"]+$/, '');
    
    // Remove múltiplos espaços
    cleanEmail = cleanEmail.replace(/\s+/g, ' ');
    
    // Remove caracteres não válidos para email (exceto @, ., -, _)
    cleanEmail = cleanEmail.replace(/[^a-zA-Z0-9@._-]/g, '');
    
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      console.warn(`Email inválido detectado: "${email}" -> "${cleanEmail}"`);
      return ''; // Retorna vazio para emails inválidos
    }
    
    // Verifica se não é um domínio VTEX (emails internos)
    if (cleanEmail.includes('@vtex.com.br') || cleanEmail.includes('@ct.vtex.com.br')) {
      console.warn(`Email VTEX interno detectado: "${email}" - não é um email real do cliente`);
      return ''; // Retorna vazio para emails internos da VTEX
    }
    
    return cleanEmail;
  }

  /**
   * Limpa telefone removendo máscaras e caracteres especiais
   */
  static cleanPhone(phone: string): string {
    if (!phone) return '';
    
    // Remove todos os caracteres não numéricos (exceto + no início)
    let cleanPhone = phone.trim();
    
    // Se começa com +, mantém
    const hasCountryCode = cleanPhone.startsWith('+');
    if (hasCountryCode) {
      cleanPhone = '+' + cleanPhone.slice(1).replace(/\D/g, '');
    } else {
      cleanPhone = cleanPhone.replace(/\D/g, '');
    }
    
    return cleanPhone;
  }

  /**
   * Limpa documento (CPF/CNPJ) removendo máscaras
   */
  static cleanDocument(document: string): string {
    if (!document) {
      console.log(`⚠️ Documento vazio recebido: "${document}"`);
      return '';
    }
    
    const cleaned = document.replace(/[^a-zA-Z0-9]/g, '').trim();
    console.log(`📄 Limpando documento: "${document}" -> "${cleaned}"`);
    
    // Remove todos os caracteres não alfanuméricos
    return cleaned;
  }

  /**
   * Limpa nome removendo caracteres especiais e espaços extras
   */
  static cleanName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .replace(/\s+/g, ' ') // Remove múltiplos espaços
      .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove caracteres especiais, mantém letras, números e espaços
      .trim();
  }

  /**
   * Formata documento para exibição (CPF/CNPJ com máscara)
   */
  static formatDocument(document: string): string {
    if (!document) return '';
    
    const cleanDoc = this.cleanDocument(document);
    
    // CPF (11 dígitos)
    if (cleanDoc.length === 11) {
      return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    // CNPJ (14 dígitos)
    if (cleanDoc.length === 14) {
      return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    // Retorna limpo se não for CPF nem CNPJ
    return cleanDoc;
  }

  /**
   * Formata telefone para exibição
   */
  static formatPhone(phone: string): string {
    if (!phone) return '';
    
    const cleanPhone = this.cleanPhone(phone);
    
    // Telefone com código do país (+55)
    if (cleanPhone.startsWith('+55') && cleanPhone.length === 14) {
      return cleanPhone.replace(/(\+55)(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4');
    }
    
    // Telefone celular brasileiro (11 dígitos)
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    // Telefone fixo brasileiro (10 dígitos)
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    // Retorna limpo se não for formato conhecido
    return cleanPhone;
  }

  /**
   * Limpa e formata todos os campos de um pedido
   */
  static cleanOrderData(orderData: Record<string, unknown>) {
    return {
      ...orderData,
      customerName: this.cleanName(String(orderData.customerName || '')),
      email: this.cleanEmail(String(orderData.email || '')),
      document: this.cleanDocument(String(orderData.document || '')),
      phone: this.cleanPhone(String(orderData.phone || '')),
    };
  }

  /**
   * Verifica se o cliente está na tabela CL da VTEX
   * @param email - Email do cliente para busca na Data Entities
   * @param document - Documento do cliente para busca alternativa
   * @returns Status do cliente na CL
   */
  static async checkClientInCL(email: string, document: string): Promise<'Está na CL' | 'Ausente na CL'> {
    const cleanedEmail = this.cleanEmail(email);
    const cleanedDoc = this.cleanDocument(document);
    
    console.log(`🔍 Verificando cliente na CL:`, {
      email: cleanedEmail,
      document: cleanedDoc,
      emailValido: this.isValidEmail(cleanedEmail)
    });
    
    const { vtexApiService } = await import('@/services/vtexApi');
    const client = await vtexApiService.getClientFromDataEntities(cleanedEmail, cleanedDoc);
    
    if (!client) {
      console.log(`⚠️ Cliente não encontrado na CL por email nem documento`);
      return 'Ausente na CL';
    }

    console.log(`✅ Cliente encontrado na CL:`, {
      email: client.email,
      document: client.document,
      isNewsletterOptIn: client.isNewsletterOptIn
    });
    return 'Está na CL';
  }

  /**
   * Valida se um email tem formato válido
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && !email.includes('@vtex.com.br') && !email.includes('@ct.vtex.com.br');
  }
}
