  const API_URL = "/api";
//const API_URL = "https://proj-stok-back-1.onrender.com/api";


const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authBtn = document.getElementById("auth-btn");
const authToggleText = document.getElementById("toggle-mode");
const authError = document.getElementById("auth-error");
const inputUsuario = document.getElementById("usuario");
const inputSenha = document.getElementById("senha");

const currentUserName = document.getElementById("current-user-name");
const logoutBtn = document.getElementById("logout-btn");

const produtoForm = document.getElementById("produto-form");
const prodNome = document.getElementById("prod-nome");
const prodPreco = document.getElementById("prod-preco");
const prodQtd = document.getElementById("prod-qtd");
const produtosTbody = document.getElementById("produtos-tbody");

let isRegistering = false;

async function parseJSON(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/eu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJSON(res);
        if (data && data.usuario) {
          showApp(data.usuario);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("token");
  }
  
  checkAuthStatus();
});

async function checkAuthStatus() {
  try {
    const res = await fetch(`${API_URL}/auth/status`);
    const data = await parseJSON(res);
    if (data && !data.temUsuarios) {
      isRegistering = true;
      updateAuthMode();
      authError.textContent = "Nenhum usuário cadastrado. Crie o primeiro acesso.";
    }
  } catch (e) {
    authError.textContent = "Erro ao conectar com o servidor.";
  }
}

authToggleText.addEventListener("click", (e) => {
  e.preventDefault();
  isRegistering = !isRegistering;
  updateAuthMode();
});

function updateAuthMode() {
  authError.textContent = "";
  if (isRegistering) {
    authTitle.textContent = "Criar Primeira Conta";
    authBtn.textContent = "Cadastrar";
    authToggleText.innerHTML = 'Já tem uma conta? <a href="#">Entrar</a>';
  } else {
    authTitle.textContent = "Entrar no Sistema";
    authBtn.textContent = "Entrar";
    authToggleText.innerHTML = 'Não tem uma conta? <a href="#">Cadastre o primeiro usuário</a>';
  }
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const endpoint = isRegistering ? "/auth/registro" : "/auth/login";

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: inputUsuario.value,
        senha: inputSenha.value
      })
    });

    const data = await parseJSON(res);
    if (!res.ok) throw new Error(data?.erro || "Erro na autenticação");

    localStorage.setItem("token", data.token);
    showApp(data.usuario);
  } catch (err) {
    authError.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  appContainer.classList.add("hidden");
  authContainer.classList.remove("hidden");
  inputUsuario.value = "";
  inputSenha.value = "";
  checkAuthStatus();
});

function showApp(username) {
  authContainer.classList.add("hidden");
  appContainer.classList.remove("hidden");
  currentUserName.textContent = username;
  carregarProdutos();
}

async function carregarProdutos() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Erro ao carregar produtos");
    
    const produtos = await parseJSON(res);
    produtosTbody.innerHTML = "";

    if (!produtos || produtos.length === 0) {
      produtosTbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Nenhum produto cadastrado.</td></tr>`;
      return;
    }

    produtos.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.nome)}</td>
        <td>R$ ${Number(p.preco).toFixed(2)}</td>
        <td>${p.qtd}</td>
        <td>
          <button class="btn danger sm" onclick="deletarProduto('${p.id}')">Excluir</button>
        </td>
      `;
      produtosTbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

produtoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/produtos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        nome: prodNome.value,
        preco: parseFloat(prodPreco.value),
        qtd: parseInt(prodQtd.value)
      })
    });

    const data = await parseJSON(res);
    if (!res.ok) throw new Error(data?.erro || "Erro ao cadastrar produto");

    prodNome.value = "";
    prodPreco.value = "";
    prodQtd.value = "";
    carregarProdutos();
  } catch (err) {
    alert(err.message);
  }
});

async function deletarProduto(id) {
  if (!confirm("Deseja realmente excluir este produto?")) return;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/produtos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Erro ao excluir produto");
    await parseJSON(res);
    carregarProdutos();
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}