const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/fonts", express.static("fonts"));

const dataDir = path.join(__dirname, "data");
const ordemPath = path.join(__dirname, "ordem.json");

// garante que a pasta data existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// garante que ordem.json existe
if (!fs.existsSync(ordemPath)) {
  fs.writeFileSync(ordemPath, JSON.stringify([]));
}

// ----------- LISTAR ARQUIVOS -----------
app.get("/api/arquivos", (req, res) => {
  // Lê ordem atual
  let ordem = [];
  try {
    ordem = JSON.parse(fs.readFileSync(ordemPath, "utf8"));
  } catch {
    ordem = [];
  }

  // Lê arquivos existentes
  const arquivosExistentes = fs.readdirSync(dataDir)
    .filter(f => f.endsWith(".html"))
    .map(f => path.basename(f, ".html"));

  // Adiciona novos arquivos que não estão na ordem
  const novos = arquivosExistentes.filter(id => !ordem.includes(id));
  if (novos.length > 0) {
    ordem.push(...novos);
    fs.writeFileSync(ordemPath, JSON.stringify(ordem, null, 2));
  }

  // Monta lista de arquivos com título
  const arquivos = ordem
    .filter(id => arquivosExistentes.includes(id)) // ignora IDs que não existem mais
    .map(id => {
      const filePath = path.join(dataDir, `${id}.html`);
      const conteudo = fs.readFileSync(filePath, "utf8");
      const titulo = conteudo.match(/<title>(.*?)<\/title>/)?.[1] || "Sem título";
      return { id, titulo };
    });

  res.json(arquivos);
});

// ----------- SALVAR NOVA ORDEM -----------
app.put("/api/ordem", (req, res) => {
  const { ordem } = req.body;
  if (!Array.isArray(ordem)) {
    return res.status(400).json({ error: "Formato inválido" });
  }

  fs.writeFileSync(ordemPath, JSON.stringify(ordem, null, 2));
  res.json({ ok: true });
});

// ----------- CRIAR NOVO -----------
app.post("/api/arquivos", (req, res) => {
  const id = Date.now().toString();
  const novoArquivo = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Novo Arquivo</title></head>
<body></body>
</html>`;

  fs.writeFileSync(path.join(dataDir, `${id}.html`), novoArquivo);

  // Atualiza ordem
  let ordem = JSON.parse(fs.readFileSync(ordemPath, "utf8"));
  ordem.push(id);
  fs.writeFileSync(ordemPath, JSON.stringify(ordem, null, 2));

  res.json({ id, titulo: "Novo Arquivo" });
});

//---------------- EXCLUIR ARQUIVO -----------
app.delete("/api/arquivos/:id", (req, res) => {
  const filePath = path.join(dataDir, `${req.params.id}.html`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado" });
  }

  try {
    fs.unlinkSync(filePath);

    // Remove da ordem
    let ordem = JSON.parse(fs.readFileSync(ordemPath, "utf8"));
    ordem = ordem.filter(id => id !== req.params.id);
    fs.writeFileSync(ordemPath, JSON.stringify(ordem, null, 2));

    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir arquivo:", err);
    res.status(500).json({ error: "Falha ao excluir arquivo" });
  }
});

// ----------- LER ARQUIVO -----------
app.get("/api/arquivos/:id", (req, res) => {
  const filePath = path.join(dataDir, `${req.params.id}.html`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado" });
  }
  const conteudo = fs.readFileSync(filePath, "utf8");
  res.send(conteudo);
});

// ----------- ATUALIZAR ARQUIVO -----------
app.put("/api/arquivos/:id", (req, res) => {
  const filePath = path.join(dataDir, `${req.params.id}.html`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Arquivo não encontrado" });
  }

  const { titulo, conteudo } = req.body;

  if (conteudo === undefined) {
    return res.status(400).json({ error: "Conteúdo não enviado" });
  }

  const novoHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>${titulo || "Sem título"}</title></head>
<body>${conteudo}</body>
</html>`;

  fs.writeFileSync(filePath, novoHtml);
  res.json({ ok: true });
});

// garante que existe um arquivo ordem.json
if (!fs.existsSync(ordemPath)) {
  fs.writeFileSync(ordemPath, JSON.stringify([]));
}

// ----------- SALVAR ORDEM -----------
app.put("/api/ordem", (req, res) => {
  const { ordem } = req.body;

  if (!Array.isArray(ordem)) {
    return res.status(400).json({ error: "Formato inválido" });
  }

  fs.writeFileSync(ordemPath, JSON.stringify(ordem, null, 2));
  res.json({ ok: true });
});

// ----------- LISTAR ARQUIVOS (com ordem) -----------
app.get("/api/arquivos", (req, res) => {
  const arquivosNoDisco = fs.readdirSync(dataDir)
    .filter(f => f.endsWith(".html"))
    .map(f => {
      const id = path.basename(f, ".html");
      const conteudo = fs.readFileSync(path.join(dataDir, f), "utf8");
      const titulo = conteudo.match(/<title>(.*?)<\/title>/)?.[1] || "Sem título";
      return { id, titulo };
    });

  // lê ordem salva
  let ordem = [];
  try {
    ordem = JSON.parse(fs.readFileSync(ordemPath, "utf8"));
  } catch {
    ordem = [];
  }

  // adiciona ids não mapeados ao final
  const idsExistentes = new Set(ordem);
  const novos = arquivosNoDisco
    .map(a => a.id)
    .filter(id => !idsExistentes.has(id));
  ordem.push(...novos);

  // reordena os arquivos conforme ordem
  const arquivosOrdenados = ordem
    .map(id => arquivosNoDisco.find(a => a.id === id))
    .filter(Boolean);

  res.json(arquivosOrdenados);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
