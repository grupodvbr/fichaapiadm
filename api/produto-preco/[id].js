export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "ID do produto não informado" });
    }

    /* ================== AUTH (IGUAL AO POSTMAN) ================== */
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Usuario>
  <username>NALBERT SOUZA</username>
  <password>99861</password>
</Usuario>`;

    const authResponse = await fetch(
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

    const authRaw = await authResponse.text();

    if (!authResponse.ok) {
      return res.status(authResponse.status).json({
        error: "Erro ao autenticar no Varejo Fácil",
        raw: authRaw
      });
    }

    const authJson = JSON.parse(authRaw);
    const accessToken = authJson.accessToken;

    if (!accessToken) {
      return res.status(401).json({ error: "accessToken não retornado" });
    }

    /* ================== PREÇO DO PRODUTO ================== */
    const precoResponse = await fetch(
      `https://mercatto.varejofacil.com/api/v1/produto/produtos/${id}/precos`,
      {
        method: "GET",
        headers: {
          Authorization: accessToken, // ⚠️ SEM Bearer
          Accept: "application/json"
        }
      }
    );

    const precoRaw = await precoResponse.text();

    if (!precoResponse.ok) {
      return res.status(precoResponse.status).json({
        error: "Erro ao buscar preço do produto",
        raw: precoRaw
      });
    }

    const precoJson = JSON.parse(precoRaw);

    /* ================== RESPOSTA FINAL ================== */
    // 🔥 SEM fallback
    // 🔥 SEM valor inventado
    return res.status(200).json(precoJson);

  } catch (err) {
    console.error("ERRO API PRODUTO PREÇO:", err);
    return res.status(500).json({
      error: "Erro interno na API de produto-preco",
      message: err.message
    });
  }
}
