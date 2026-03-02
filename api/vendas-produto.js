export default async function handler(req, res) {
  try {
    const { produtoId, de, ate, start } = req.query;

    if (!produtoId || !de || !ate) {
      return res.status(400).json({
        error: "Parâmetros obrigatórios: produtoId, de, ate"
      });
    }

    const START = Number(start || 0);
    const COUNT = 100;

    /* =========================
       1️⃣ AUTENTICAÇÃO VF
    ========================= */
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Usuario>
  <username>NALBERT SOUZA</username>
  <password>99861</password>
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

    const authText = await authResp.text();

    if (!authResp.ok) {
      return res.status(500).json({
        error: "Erro ao autenticar no Varejo Fácil",
        raw: authText
      });
    }

    const { accessToken } = JSON.parse(authText);

    /* =========================
       2️⃣ BUSCA CUPONS FISCAIS
       (PAGINADO, COM FILTRO DE DATA)
    ========================= */
    const url =
      `https://mercatto.varejofacil.com/api/v1/venda/cupons-fiscais` +
      `?start=${START}` +
      `&count=${COUNT}` +
      `&dataVendaInicial=${de}` +
      `&dataVendaFinal=${ate}`;

    const vendaResp = await fetch(url, {
      headers: {
        Authorization: accessToken,
        Accept: "application/json"
      }
    });

    if (!vendaResp.ok) {
      const t = await vendaResp.text();
      return res.status(500).json({
        error: "Erro ao consultar cupons fiscais",
        detalhe: t
      });
    }

    const vendaJson = await vendaResp.json();
    const items = vendaJson.items || [];

    /* =========================
       3️⃣ SOMA CORRETA DO PRODUTO
       (FILTRO REAL AQUI)
    ========================= */
    let somaPagina = 0;

    for (const cupom of items) {
      for (const item of cupom.itensVenda || []) {
        if (Number(item.produtoId) === Number(produtoId)) {

          const qtd =
            Number(item.quantidade) ||
            Number(item.qtd) ||
            Number(item.qtdItem) ||
            Number(item.quantidadeItem) ||
            0;

          somaPagina += qtd;
        }
      }
    }

    /* =========================
       4️⃣ CONTROLE DE LOOP (CORRETO)
       ⚠️ NÃO USA vendaJson.total
    ========================= */
    const terminou = items.length < COUNT;

    const proximoStart = terminou
      ? START
      : START + COUNT;

    /* =========================
       5️⃣ RETORNO FINAL
    ========================= */
    return res.status(200).json({
      somaPagina,          // soma apenas desta página
      startAtual: START,
      proximoStart,
      terminou             // true quando acabou
    });

  } catch (err) {
    console.error("ERRO vendas-produto:", err);
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
