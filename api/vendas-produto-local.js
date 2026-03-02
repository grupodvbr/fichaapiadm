import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { produtoId, de, ate } = req.query;

  const { data, error } = await supabase
    .from("vendas_produto_dia")
    .select("quantidade")
    .eq("produto_id", produtoId)
    .gte("data_venda", de)
    .lte("data_venda", ate);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const total = data.reduce((s, r) => s + Number(r.quantidade), 0);

  res.json({ quantidade: total });
}
