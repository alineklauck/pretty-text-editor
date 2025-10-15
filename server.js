const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/fonts", express.static("fonts"));

const dataFile = path.join(__dirname, "data", "arquivos.json");

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

app.get("/api/arquivos", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  res.json(data);
});

app.post("/api/arquivos", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  const novo = {
    id: Date.now(),
    titulo: "Novo Arquivo",
    conteudo: ""
  };
  data.push(novo);
  fs.writeFileSync(dataFile, JSON.stringify(data));
  res.json(novo);
});

app.put("/api/arquivos/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync(dataFile));
  const idx = data.findIndex(a => a.id == req.params.id);
  if (idx >= 0) {
    data[idx] = req.body;
    fs.writeFileSync(dataFile, JSON.stringify(data));
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Arquivo não encontrado" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
