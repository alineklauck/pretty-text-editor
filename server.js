const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/fonts", express.static("fonts"));

const dataDir = path.join(__dirname, "data");

// garante que a pasta data existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// ----------- LISTAR ARQUIVOS -----------
app.get("/api/arquivos", (req, res) => {
  const arquivos = fs.readdirSync(dataDir)
    .filter(f => f.endsWith(".html"))
    .map(f => {
      const id = path.basename(f, ".html");
      const conteudo = fs.readFileSync(path.join(dataDir, f), "utf8");
      const titulo = conteudo.match(/<title>(.*?)<\/title>/)?.[1] || "Sem título";
      return { id, titulo };
    });

  res.json(arquivos);
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
  res.json({ id, titulo: "Novo Arquivo" });
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
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
