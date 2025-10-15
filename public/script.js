// ----------- TELA INICIAL -----------
if (document.getElementById("lista") && document.getElementById("novo")) {
  const lista = document.getElementById("lista");
  const btnNovo = document.getElementById("novo");

  function carregar() {
    fetch("/api/arquivos")
      .then(res => res.json())
      .then(arquivos => {
        lista.innerHTML = "";
        arquivos.forEach(arq => {
          const div = document.createElement("div");
          div.textContent = arq.titulo;
          div.onclick = () => {
            localStorage.setItem("arquivoAtual", arq.id);
            location.href = "editor.html";
          };
          lista.appendChild(div);
        });
      })
      .catch(err => console.error("Erro ao carregar arquivos:", err));
  }

  btnNovo.onclick = () => {
    fetch("/api/arquivos", { method: "POST" })
      .then(res => res.json())
      .then(() => carregar())
      .catch(err => console.error("Erro ao criar arquivo:", err));
  };

  carregar();
}

// ----------- TELA EDITOR -----------
if (document.getElementById("texto") && document.getElementById("titulo")) {
  const id = localStorage.getItem("arquivoAtual");
  const titulo = document.getElementById("titulo");
  const texto = document.getElementById("texto");
  const contador = document.getElementById("contador");
  const fonteSel = document.getElementById("font-family");
  let tamanhoFonte = 16;
  let arquivo = null;

  // Carregar arquivo
  fetch("/api/arquivos")
    .then(res => res.json())
    .then(arquivos => {
      arquivo = arquivos.find(a => a.id == id);
      if (!arquivo) return;
      titulo.value = arquivo.titulo;
      texto.innerHTML = arquivo.conteudo;
      atualizarContador();
    })
    .catch(err => console.error("Erro ao carregar arquivo:", err));

  // Toolbar
  window.comando = (cmd) => document.execCommand(cmd, false, null);
  window.colorir = (cor) => document.execCommand("foreColor", false, cor);

  // Contador de palavras
  texto.addEventListener("input", atualizarContador);
  function atualizarContador() {
    const palavras = texto.innerText.trim().split(/[\s—–-]+/).filter(p => p.length);
    contador.textContent = palavras.length;
    salvar();
  }

  // Fonte
  window.mudarFonte = (delta) => {
    tamanhoFonte += delta;
    texto.style.fontSize = tamanhoFonte + "px";
  };
  fonteSel.onchange = () => {
    const fonte = fonteSel.value;
    texto.style.fontFamily = fonte;
    document.execCommand("fontName", false, fonte);
  };

  // Voltar
  window.voltar = () => {
    salvar();
    location.href = "index.html";
  };

  // Auto salvar
  function salvar() {
    if (!arquivo) return;
    arquivo.titulo = titulo.value;
    arquivo.conteudo = texto.innerHTML;
    fetch("/api/arquivos/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arquivo)
    });
  }
}
