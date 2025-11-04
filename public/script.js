// ----------- TELA INICIAL (drag handle compatível mobile) -----------
if (document.getElementById("lista") && document.getElementById("novo")) {
  const lista = document.getElementById("lista");
  const btnNovo = document.getElementById("novo");

  let isDragging = false;
  let draggedEl = null;        // elemento original (.item-arquivo)
  let ghost = null;            // elemento visual que segue o ponteiro
  let placeholder = null;      // espaço reservado na lista
  let pointerId = null;
  let offsetY = 0;

  async function carregar() {
    try {
      const res = await fetch("/api/arquivos");
      const arquivos = await res.json();
      lista.innerHTML = "";

      arquivos.forEach(arq => {
        const div = document.createElement("div");
        div.className = "item-arquivo";
        div.dataset.id = String(arq.id);
        div.tabIndex = 0;
        div.innerHTML = `<span class="titulo-arquivo">${escapeHtml(arq.titulo)}</span>`;

        // abre o editor
        div.addEventListener("click", () => {
          localStorage.setItem("arquivoAtual", arq.id);
          location.href = "editor.html";
        });

        // botão excluir
        const btnExcluir = document.createElement("button");
        btnExcluir.className = "btn-excluir";
        btnExcluir.innerHTML = "✕";
        btnExcluir.title = "Excluir";
        btnExcluir.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Excluir "${arq.titulo}"?`)) return;
          const del = await fetch(`/api/arquivos/${arq.id}`, { method: "DELETE" });
          if (del.ok) carregar();
        });

        // handle (bolinha) - inicia o drag via pointer events
        const handle = document.createElement("div");
        handle.className = "drag-handle";
        handle.title = "Segure para arrastar";

        let holdTimer = null;

        handle.addEventListener("pointerdown", (e) => {
          if (e.button && e.button !== 0) return;
          e.preventDefault();

          // inicia o arraste apenas após breve segurar (para evitar arrastar acidental)
          holdTimer = setTimeout(() => {
            startDrag(e, div);
          }, 100);

          // se soltar antes do tempo, cancela
          document.addEventListener("pointerup", cancelHold, { once: true });
          document.addEventListener("pointercancel", cancelHold, { once: true });

          function cancelHold() {
            clearTimeout(holdTimer);
            holdTimer = null;
          }
        });

        function startDrag(e, div) {
          draggedEl = div;
          pointerId = e.pointerId;

          const rect = draggedEl.getBoundingClientRect();
          offsetY = e.clientY - rect.top;

          // placeholder
          placeholder = document.createElement("div");
          placeholder.className = "placeholder";
          placeholder.style.height = `${rect.height}px`;
          lista.insertBefore(placeholder, draggedEl.nextSibling);

          // ghost
          ghost = draggedEl.cloneNode(true);
          ghost.classList.add("drag-ghost");
          Object.assign(ghost.style, {
            position: "fixed",
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            pointerEvents: "none",
            margin: "0",
            zIndex: 9999,
            transform: "translateZ(0)"
          });
          document.body.appendChild(ghost);

          draggedEl.classList.add("invisible-drag-source");

          isDragging = true;

          // 👉 captura os eventos globais no document
          document.addEventListener("pointermove", onPointerMove, { passive: false });
          document.addEventListener("pointerup", onPointerUp);
          document.addEventListener("pointercancel", onPointerUp);
        }
        
        // montagem
        div.appendChild(handle);
        div.appendChild(btnExcluir);
        lista.appendChild(div);
      });

    } catch (err) {
      console.error("Erro ao carregar arquivos:", err);
    }
  }

  // move o ghost e atualiza placeholder conforme a posição Y do ponteiro
  function onPointerMove(e) {
    if (!isDragging || e.pointerId !== pointerId) return;
    e.preventDefault(); // evita scroll da página durante arraste no mobile

    const clientY = e.clientY;
    // posiciona ghost centrado verticalmente segundo offsetY
    ghost.style.top = `${clientY - offsetY}px`;

    // determina onde inserir o placeholder
    const items = Array.from(lista.querySelectorAll(".item-arquivo:not(.invisible-drag-source)"));
    let inserted = false;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (clientY < mid) {
        if (placeholder.nextSibling !== it) {
          lista.insertBefore(placeholder, it);
        }
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      // coloca no fim
      lista.appendChild(placeholder);
    }
  }

  // termina o arraste: insere o elemento no lugar do placeholder, remove ghost, salva ordem

  // ====== SALVAR NOVA ORDEM NO SERVIDOR ======
  async function onPointerUp(e) {
    if (!isDragging || e.pointerId !== pointerId) return;
    e.preventDefault();

    // limpa listeners
    document.removeEventListener("pointermove", onPointerMove, { passive: false });
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);

    // insere no lugar do placeholder
    if (placeholder && draggedEl) {
      lista.insertBefore(draggedEl, placeholder);
      placeholder.remove();
    }

    // limpa ghost e estilo
    if (ghost && ghost.parentElement) ghost.parentElement.removeChild(ghost);
    if (draggedEl) draggedEl.classList.remove("invisible-drag-source");

    // reset estados
    isDragging = false;
    draggedEl = null;
    ghost = null;
    placeholder = null;
    pointerId = null;
    offsetY = 0;

    await salvarOrdem();
  }

  // ====== SALVAR NOVA ORDEM NO SERVIDOR ======
  async function salvarOrdem() {
  const ids = Array.from(document.querySelectorAll(".item-arquivo"))
    .map(el => el.dataset.id);

    try {
      await fetch("/api/ordem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: ids })
      });
      console.log("✅ Ordem salva no servidor!");
    } catch (err) {
      console.error("Erro ao salvar ordem:", err);
    }
  }


  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  btnNovo.addEventListener("click", async () => {
    const res = await fetch("/api/arquivos", { method: "POST" });
    if (res.ok) carregar();
  });

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

