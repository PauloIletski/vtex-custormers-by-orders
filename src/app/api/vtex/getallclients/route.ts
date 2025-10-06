import { NextResponse } from "next/server";
import { Parser } from "json2csv";

const vtexBase = (account: string, environment: string) =>
  `https://${account}.${environment}.com.br/api`;

const headers = {
  "Content-Type": "application/json",
  "VtexIdclientAutCookie": process.env.VTEX_IDCOOKIE!, // 👈 troca aqui
};

export async function GET() {
  try {
    const account = process.env.VTEX_ACCOUNT!;
    const env = process.env.VTEX_ENVIRONMENT!;

    // 1) Buscar clientes newsletter
    const clUrl = `${vtexBase(account, env)}/dataentities/CL/search?_where=isNewsletterOptIn=true&_fields=id,email,firstName,lastName`;
    const clientes = await fetch(clUrl, { headers, cache: "no-store" }).then(r => r.json());

    const linhas: any[] = [];

    for (const cliente of clientes) {
      // 2) Validar endereço na AD
      const adUrl = `${vtexBase(account, env)}/dataentities/AD/search?_where=customer=${cliente.id}&_fields=street,city,state`;
      const enderecos = await fetch(adUrl, { headers, cache: "no-store" }).then(r => r.json());

      if (!enderecos.length) continue;

      // 3) Buscar pedidos finalizados
      const ordersUrl = `${vtexBase(account, env)}/oms/pvt/orders?f_status=Invoiced&f_clientEmail=${cliente.email}`;
      const pedidos = await fetch(ordersUrl, { headers, cache: "no-store" }).then(r => r.json());

      if (!pedidos.list?.length) continue;

      for (const pedido of pedidos.list) {
        linhas.push({
          ClienteID: cliente.id,
          Nome: `${cliente.firstName || ""} ${cliente.lastName || ""}`,
          Email: cliente.email,
          Rua: enderecos[0].street,
          Cidade: enderecos[0].city,
          Estado: enderecos[0].state,
          PedidoID: pedido.orderId,
          Status: pedido.status,
          ValorTotal: pedido.value / 100,
          Data: pedido.creationDate,
        });
      }
    }

    // 4) Gerar CSV
    const parser = new Parser();
    const csv = parser.parse(linhas);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=clientes-com-pedidos.csv",
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
