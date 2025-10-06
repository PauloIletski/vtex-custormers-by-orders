# VTEX Orders - Consulta de Pedidos

Uma aplicação Next.js para consultar, visualizar e exportar pedidos da plataforma VTEX.

## 🚀 Funcionalidades

- ✅ Consulta de pedidos via API VTEX
- ✅ Filtros por período de data
- ✅ Tabela interativa com ordenação e paginação
- ✅ Exportação para Excel (.xlsx)
- ✅ Interface responsiva e moderna
- ✅ Configuração via variáveis de ambiente

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta VTEX com acesso às APIs OMS
- Credenciais de autenticação VTEX

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd vtex-csv-client-orders
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.local.example .env.local
```

4. Edite o arquivo `.env.local` com suas credenciais:
```env
# Configurações da VTEX
VTEX_ACCOUNT=seu-nome-da-loja
VTEX_AUTH_COOKIE=seu-VtexIdclientAutCookie

# Opcional: AppKey e AppToken (caso necessário)
# VTEX_APP_KEY=sua-app-key
# VTEX_APP_TOKEN=seu-app-token
```

## 🔧 Configuração das Credenciais VTEX

### Método 1: VtexIdclientAutCookie (Recomendado)

1. Acesse sua loja VTEX no navegador
2. Faça login na conta administrativa
3. Abra as ferramentas de desenvolvedor (F12)
4. Vá para a aba "Application" > "Cookies"
5. Copie o valor do cookie `VtexIdclientAutCookie`
6. Cole no arquivo `.env.local`

### Método 2: AppKey e AppToken

1. Acesse o VTEX IO
2. Crie uma aplicação ou use uma existente
3. Obtenha a AppKey e AppToken
4. Configure no arquivo `.env.local`

## 🚀 Executando a Aplicação

### Desenvolvimento
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### Produção
```bash
npm run build
npm start
```

## 📊 Como Usar

1. **Configurar Período**: Use os filtros de data para selecionar o período desejado
2. **Visualizar Dados**: A tabela exibe todos os pedidos com informações completas
3. **Ordenar**: Clique nos cabeçalhos das colunas para ordenar
4. **Paginizar**: Use os controles de paginação na parte inferior
5. **Exportar**: Clique no botão "Exportar para Excel" para baixar os dados

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx           # Página principal
│   └── globals.css        # Estilos globais
├── components/
│   ├── DateFilter.tsx     # Componente de filtros de data
│   └── OrdersTable.tsx    # Componente da tabela
├── services/
│   ├── vtexApi.ts         # Serviço de integração VTEX
│   └── exportService.ts   # Serviço de exportação
└── types/
    └── vtex.ts           # Tipos TypeScript
```

## 🔌 APIs Utilizadas

### Listagem de Pedidos
- **Endpoint**: `GET /api/oms/pvt/orders`
- **Parâmetros**: page, per_page, f_creationDate

### Detalhes do Pedido
- **Endpoint**: `GET /api/oms/pvt/orders/{orderId}`
- **Retorna**: Dados completos do cliente e endereço

## 📋 Dados Exibidos

- **ID do Pedido** - Identificador único
- **Data de Criação** - Data e hora do pedido
- **Nome do Cliente** - Nome completo (limpo de caracteres especiais)
- **Email** - Email limpo sem máscaras VTEX
- **Documento** - CPF/CNPJ formatado (123.456.789-00)
- **Telefone** - Telefone formatado ((11) 99999-9999)
- **Endereço de Entrega** - Endereço completo
- **Valor Total** - Valor em reais (R$ 1.234,56)
- **Status do Pedido** - Status atual com cores

### 🧹 Limpeza Automática de Dados

A aplicação automaticamente:
- ✅ Remove máscaras de email, telefone e documento
- ✅ Formata CPF/CNPJ para exibição
- ✅ Formata telefones brasileiros
- ✅ Remove caracteres especiais de nomes
- ✅ Valida emails e alerta sobre inválidos

## 🚨 Limitações

- Máximo de 5000 pedidos por consulta (configurável via `NEXT_PUBLIC_MAX_ORDERS`)
- Requer autenticação válida na VTEX
- Taxa de requisições limitada pela API VTEX
- Timeout de requisições pode ocorrer com períodos muito longos

### ⚙️ Configurações Avançadas

Adicione ao `.env.local` para personalizar:

```env
# Limite máximo de pedidos (padrão: 5000)
NEXT_PUBLIC_MAX_ORDERS=10000

# Limite máximo de páginas (padrão: 100)
NEXT_PUBLIC_MAX_PAGES=200

# Tamanho do lote por requisição (padrão: 50)
NEXT_PUBLIC_PER_PAGE=100

# Timeout das requisições em ms (padrão: 30000)
NEXT_PUBLIC_REQUEST_TIMEOUT=60000
```

## 🛠️ Tecnologias

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **@tanstack/react-table** - Tabela interativa
- **Axios** - Cliente HTTP
- **XLSX** - Exportação Excel
- **date-fns** - Manipulação de datas

## 🐛 Solução de Problemas

### Erro 401 - Token Expirado
**Problema mais comum!** O VtexIdclientAutCookie expira em ~24 horas.

**Solução:**
1. Acesse https://taiff.vtexcommercestable.com.br/admin
2. F12 > Application > Cookies > copie o novo VtexIdclientAutCookie
3. Atualize o arquivo `.env.local`
4. Reinicie o servidor (`npm run dev`)

📋 **Instruções detalhadas:** Veja o arquivo `INSTRUCOES_TOKEN.md`

### Erro de Autenticação
- Verifique se as credenciais estão corretas
- Confirme se o cookie não expirou (erro mais comum)
- Teste com AppKey/AppToken se disponível

### Erro de CORS
- Execute a aplicação localmente
- Não acesse via IP, use localhost

### Timeout na API
- Reduza o período de busca
- Verifique a conexão com a internet
- Tente novamente em alguns minutos

## 📝 Licença

Este projeto é de uso interno e educacional.

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Desenvolvido para consulta eficiente de pedidos VTEX** 🚀