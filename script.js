// ---------- Estado ----------
let usuarios = [];   // [{id, usuario}]
let produtos = [];   // [{id, nome, preco, qtd}]
let sessao = null;   // nome do usuário logado ou null
let token = lerToken();

const $ = (id) => document.getElementById(id);

function lerToken() {
  try { return localStorage.getItem("token"); } catch { return null; }
}
function gravarToken(t) {
  token = t;
  try { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); } catch {}
}

// ---------- API ----------
async function api(caminho, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(caminho, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) sair(); // sessão expirou
    throw new Error(dados.erro || "Erro ao comunicar com o servidor.");
  }
  return dados;
}

// ---------- Utilidades ----------
function msg(el, texto, ok) {
  el.textContent = texto;
  el.className = "msg" + (ok ? " ok" : "");
}

const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- Login / cadastro ----------
let modoCadastro = false;

function alternarModo() {
  modoCadastro = !modoCadastro;
  $("authTitulo").textContent = modoCadastro ? "Criar conta" : "Entrar";
  $("authSub").textContent = modoCadastro ? "Escolha um usuário e uma senha." : "Use seu usuário e senha.";
  $("btnAuth").textContent = modoCadastro ? "Criar conta" : "Entrar";
  $("btnTroca").textContent = modoCadastro ? "Já tenho conta" : "Criar uma conta";
  $("boxConfirma").classList.toggle("hidden", !modoCadastro);
  msg($("authMsg"), "");
}

async function enviarAuth() {
  const usuario = $("aUser").value.trim();
  const senha = $("aPass").value;
  const aviso = $("authMsg");
  if (!usuario || !senha) return msg(aviso, "Preencha usuário e senha.");
  if (modoCadastro && senha !== $("aPass2").value) return msg(aviso, "As senhas não coincidem.");

  try {
    const r = await api(modoCadastro ? "/api/auth/registro" : "/api/auth/login", {
      method: "POST",
      body: { usuario, senha },
    });
    await entrar(r);
  } catch (e) {
    msg(aviso, e.message);
  }
}

async function entrar({ token: t, usuario }) {
  gravarToken(t);
  sessao = usuario;
  $("aUser").value = $("aPass").value = $("aPass2").value = "";
  msg($("authMsg"), "");
  await carregarDados();
  render();
}

function sair() {
  gravarToken(null);
  sessao = null;
  usuarios = [];
  produtos = [];
  render();
}

async function carregarDados() {
  [produtos, usuarios] = await Promise.all([api("/api/produtos"), api("/api/usuarios")]);
}

// ---------- Produtos ----------
async function adicionarProduto() {
  const nome = $("pNome").value.trim();
  const preco = parseFloat($("pPreco").value);
  const qtd = parseInt($("pQtd").value, 10);
  const aviso = $("prodMsg");
  if (!nome) return msg(aviso, "Informe o nome do produto.");
  if (isNaN(preco) || preco < 0) return msg(aviso, "Informe um preço válido.");
  if (isNaN(qtd) || qtd < 0) return msg(aviso, "Informe uma quantidade válida.");

  try {
    const novo = await api("/api/produtos", { method: "POST", body: { nome, preco, qtd } });
    produtos.push(novo);
    $("pNome").value = $("pPreco").value = $("pQtd").value = "";
    msg(aviso, "Produto adicionado.", true);
    render();
  } catch (e) {
    msg(aviso, e.message);
  }
}

async function removerProduto(id) {
  try {
    await api("/api/produtos/" + id, { method: "DELETE" });
    produtos = produtos.filter(p => p.id !== id);
    render(https://proj-stok-back.onrender.com);
  } catch (e) {
    msg($("prodMsg"), e.message);
  }
}

// ---------- Usuários (dentro do sistema) ----------
async function adicionarUsuario() {
  try {
    const novo = await api("/api/usuarios", {
      method: "POST",
      body: { usuario: $("uNome").value, senha: $("uSenha").value },
    });
    usuarios.push(novo);
    $("uNome").value = $("uSenha").value = "";
    msg($("userMsg"), "Usuário cadastrado.", true);
    render(https://proj-stok-back.onrender.com);
  } catch (e) {
    msg($("userMsg"), e.message);
  }
}

async function removerUsuario(id) {
  try {
    await api("/api/usuarios/" + id, { method: "DELETE" });
    usuarios = usuarios.filter(u => u.id !== id);
    render(https://proj-stok-back.onrender.com);
  } catch (e) {
    msg($("userMsg"), e.message);
  }
}

// ---------- Desenho da tela ----------
function celula(texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  return td;
}

function botaoRemover(acao, desativado) {
  const td = document.createElement("td");
  td.className = "n";
  const b = document.createElement("button");
  b.className = "del";
  b.textContent = "Remover";
  b.disabled = !!desativado;
  b.onclick = acao;
  td.appendChild(b);
  return td;
}

function render(https://proj-stok-back.onrender.com) {
  const logado = !!sessao;
  $("telaAuth").classList.toggle("hidden", logado);
  $("telaApp").classList.toggle("hidden", !logado);
  if (!logado) return;

  $("nomeLogado").textContent = sessao;

  const lp = $("listaProdutos");
  lp.innerHTML = "";
  produtos.forEach(p => {
    const tr = document.createElement("tr");
    tr.append(celula(p.nome), celula(brl(p.preco), "n"), celula(String(p.qtd), "n"),
              botaoRemover(() => removerProduto(p.id)));
    lp.appendChild(tr);
  });
  $("vazioProd").classList.toggle("hidden", produtos.length > 0);

  const lu = $("listaUsuarios");
  lu.innerHTML = "";
  usuarios.forEach(u => {
    const eu = u.usuario === sessao;
    const tr = document.createElement("tr");
    tr.append(celula(u.usuario + (eu ? " (você)" : "")),
              botaoRemover(() => removerUsuario(u.id), eu));
    lu.appendChild(tr);
  });
}

// ---------- Eventos ----------
$("btnAuth").onclick = enviarAuth;
$("btnTroca").onclick = alternarModo;
$("btnSair").onclick = sair;
$("btnProduto").onclick = adicionarProduto;
$("btnUsuario").onclick = adicionarUsuario;
["aUser", "aPass", "aPass2"].forEach(id =>
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") enviarAuth(); }));

// ---------- Inicialização ----------
(async function iniciar() {
  if (token) {
    try {
      const eu = await api("/api/auth/eu");
      sessao = eu.usuario;
      await carregarDados();
      return render();
    } catch {
      gravarToken(null);
      sessao = null;
    }
  }
  // Sem nenhum usuário ainda? Já abre na tela de cadastro.
  try {
    const { temUsuarios } = await api("/api/auth/status");
    if (!temUsuarios) alternarModo();
  } catch {
    msg($("authMsg"), "Não foi possível conectar ao servidor.");
  }
  render();
})();
