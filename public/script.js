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
  let timer;

  // Carregar arquivo do servidor
  fetch("/api/arquivos/" + id)
    .then(res => res.text())
    .then(html => {
      // Extrair <body> e <title>
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);

      texto.innerHTML = bodyMatch ? bodyMatch[1] : "";
      titulo.value = titleMatch ? titleMatch[1] : "Novo Arquivo";

      // Carrega o tamanho da fonte salvo para este arquivo
      const savedFontSize = localStorage.getItem("fontSize-" + id);
      if (savedFontSize) {
        tamanhoFonte = parseInt(savedFontSize, 10);
      } else {
        tamanhoFonte = 16; // Usa o padrão se nada for salvo
      }
      // Aplica o tamanho da fonte ao editor
      texto.style.fontSize = tamanhoFonte + "px";

      atualizarContador();

      

      // Ativa auto-save com debounce
      texto.addEventListener("input", () => {
        clearTimeout(timer);
        atualizarContador();
        timer = setTimeout(salvar, 500);
      });

      titulo.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(salvar, 500);
      });
    })
    .catch(err => console.error("Erro ao carregar arquivo:", err));



  // Toolbar
  window.comando = (cmd) => {
    // Verifica se o comando já está ativo na seleção
    const ativo = document.queryCommandState(cmd);
    // Se estiver ativo, executa novamente para remover
    document.execCommand(cmd, false, !ativo ? null : null);
  };

  window.colorir = (cor) => {
    // Para cor, o toggle não existe nativo, então vamos verificar se a cor atual é igual
    const corAtual = document.queryCommandValue("foreColor");
    if (corAtual.toLowerCase() === cor.toLowerCase()) {
      document.execCommand("foreColor", false, ""); // Remove cor
    } else {
      document.execCommand("foreColor", false, cor); // Aplica nova cor
    }
  };

  // Contador de palavras
  function atualizarContador() {
    const textoRaw = texto.innerText.trim();

    // Separa palavras em inglês ou outros alfabetos por espaço
    const palavrasIngles = textoRaw
      .split(/\s+/)                    // separa por espaços
      .filter(p => /[A-Za-z0-9]/.test(p)); // mantém só palavras com letras ou números

    // Conta caracteres chineses
    const caracteresChines = textoRaw.match(/[\u4e00-\u9fff]/g) || []; // todos os caracteres chineses

    // Soma palavras em inglês + caracteres chineses
    const totalPalavras = palavrasIngles.length + caracteresChines.length;

    contador.textContent = totalPalavras;
  }

  // Fonte
  window.mudarFonte = (delta) => {
    tamanhoFonte += delta;
    texto.style.fontSize = tamanhoFonte + "px";
    if (id) {
      localStorage.setItem("fontSize-" + id, tamanhoFonte);
    }
  };
  fonteSel.onchange = () => {
    const fonte = fonteSel.value;
    // Aplica apenas na seleção atual
    document.execCommand("fontName", false, fonte);
  };

  // Voltar
  window.voltar = () => {
    salvar();
    location.href = "index.html";
  };

  // Função salvar sem sobrescrever conteúdo
  function salvar() {
    if (!id) return;

    const novoConteudo = texto.innerHTML;
    const novoTitulo = titulo.value;

    fetch("/api/arquivos/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: novoTitulo, conteudo: novoConteudo })
    })
    .catch(err => console.error("Erro ao salvar arquivo:", err));
  }
}

