import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    /* =========================
       DATA PROCESSADA (ONTEM)
    ========================= */
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = ontem.toISOString().slice(0, 10);

    const COUNT = 200;
    let start = 0;
    let terminou = false;

    const agregados = {};

    /* =========================
       AUTENTICAÇÃO VF
    ========================= */
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Usuario>
  <username>${process.env.VF_USER}</username>
  <password>${process.env.VF_PASS}</password>
</Usuario>`;

    const authResp = await fetch(
      "https://mercatto.varejofacil.com/api/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          "Accept": "application/json"
        },
        body: xml
      }
    );

    const { accessToken } = JSON.parse(await authResp.text());

    /* =========================
       LOOP DE CUPONS (ATÉ ACABAR)
    ========================= */
    while (!terminou) {
      const url =
        `https://mercatto.varejofacil.com/api/v1/venda/cupons-fiscais` +
        `?start=${start}` +
        `&count=${COUNT}` +
        `&dataVendaInicial=${data}` +
        `&dataVendaFinal=${data}`;

      const resp = await fetch(url, {
        headers: {
          Authorization: accessToken,
          Accept: "application/json"
        }
      });

      const json = await resp.json();
      const cupons = json.items || [];

      for (const cupom of cupons) {
        for (const item of cupom.itensVenda || []) {

          const key = `${data}_${item.produtoId}`;

          if (!agregados[key]) {
            agregados[key] = {
              data_venda: data,
              produto_id: item.produtoId,
              produto_nome: item.descricao || "",
              quantidade: 0,
              valor_total: 0
            };
          }

          const qtd =
            Number(item.quantidade) ||
            Number(item.qtd) ||
            Number(item.qtdItem) ||
            Number(item.quantidadeItem) ||
            0;

          agregados[key].quantidade += qtd;
          agregados[key].valor_total += Number(item.valorTotal || 0);
        }
      }

      if (cupons.length < COUNT) terminou = true;
      start += COUNT;
    }

    /* =========================
       UPSERT NO BANCO
    ========================= */
    const rows = Object.values(agregados);

    if (rows.length) {
      await supabase
        .from("vendas_produto_dia")
        .upsert(rows, {
          onConflict: "data_venda,produto_id"
        });
    }

    return res.status(200).json({
      status: "ok",
      data_processada: data,
      produtos_processados: rows.length
    });

  } catch (err) {
    console.error("ERRO SYNC VENDAS:", err);
    return res.status(500).json({
      error: "Erro no job",
      message: err.message
    });
  }
}
