
//const API_URL = "http://localhost:3000/api";
const API_URL = "https://proj-stok-back.onrender.com";
// Para produção, utilize:
// const API_URL = "https://proj-stok-back-1.onrender.com/api";

// ---------- Elementos HTML ----------

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

// ---------- Variáveis ----------

let isRegistering = false;

// ---------- Funções auxiliares ----------

// Converter resposta para JSON
async function parseJSON(res) {
  const text = await res.text();

  return text ? JSON.parse(text) : null;
}

// Obter token
function getToken() {
  return localStorage.getItem("token");
}

// Fazer logout
function logout() {
  localStorage.removeItem("token");

  appContainer.classList.add("hidden");
  authContainer.classList.remove("hidden");

  inputUsuario.value = "";
  inputSenha.value = "";

  produtosTbody.innerHTML = "";

  checkAuthStatus();
}

// Escapar HTML
function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[tag]);
}

// ---------- Inicialização ----------

document.addEventListener("DOMContentLoaded", async () => {
  const token = getToken();

  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/eu`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await parseJSON(res);

        if (data && data.usuario) {
          showApp(data.usuario);
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao verificar sessão:", err);
    }

    localStorage.removeItem("token");
  }

  checkAuthStatus();
});

// ---------- Verificar usuários cadastrados ----------

async function checkAuthStatus() {
  try {
    const res = await fetch(`${API_URL}/auth/status`);

    const data = await parseJSON(res);

    if (!res.ok) {
      throw new Error(
        data?.erro || "Erro ao verificar usuários."
      );
    }

    if (data && !data.temUsuarios) {
      isRegistering = true;

      updateAuthMode();

      authError.textContent =
        "Nenhum usuário cadastrado. Crie o primeiro acesso.";
    } else {
      isRegistering = false;
      updateAuthMode();
    }

  } catch (err) {
    console.error(err);

    authError.textContent =
      "Erro ao conectar com o servidor.";
  }
}

// ---------- Alternar login e cadastro ----------

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

    authToggleText.innerHTML =
      'Já tem uma conta? <a href="#">Entrar</a>';

  } else {
    authTitle.textContent = "Entrar no Sistema";

    authBtn.textContent = "Entrar";

    authToggleText.innerHTML =
      'Não tem uma conta? <a href="#">Cadastre o primeiro usuário</a>';
  }
}

// ---------- Login e cadastro ----------

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  authError.textContent = "";

  const endpoint = isRegistering
    ? "/auth/registro"
    : "/auth/login";

  try {
    authBtn.disabled = true;

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        usuario: inputUsuario.value,
        senha: inputSenha.value
      })
    });

    const data = await parseJSON(res);

    if (!res.ok) {
      throw new Error(
        data?.erro || "Erro na autenticação."
      );
    }

    localStorage.setItem("token", data.token);

    showApp(data.usuario);

  } catch (err) {
    authError.textContent = err.message;

  } finally {
    authBtn.disabled = false;
  }
});

// ---------- Logout ----------

logoutBtn.addEventListener("click", logout);

// ---------- Mostrar aplicação ----------

function showApp(username) {
  authContainer.classList.add("hidden");

  appContainer.classList.remove("hidden");

  currentUserName.textContent = username;

  carregarProdutos();
}

// ======================================
// PRODUTOS
// ======================================

// ---------- Listar produtos ----------

async function carregarProdutos() {
  try {
    const token = getToken();

    const res = await fetch(`${API_URL}/produtos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const produtos = await parseJSON(res);

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      throw new Error(
        produtos?.erro || "Erro ao carregar produtos."
      );
    }

    produtosTbody.innerHTML = "";

    if (!produtos || produtos.length === 0) {
      produtosTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center;">
            Nenhum produto cadastrado.
          </td>
        </tr>
      `;

      return;
    }

    produtos.forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(p.nome)}</td>

        <td>
          R$ ${Number(p.preco).toFixed(2)}
        </td>

        <td>${p.qtd}</td>

        <td>
          <button
            class="btn danger sm"
            onclick="deletarProduto('${p.id}')"
          >
            Excluir
          </button>
        </td>
      `;

      produtosTbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
  }
}

// ---------- Cadastrar produto ----------

produtoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();

  try {
    const res = await fetch(`${API_URL}/produtos`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },

      body: JSON.stringify({
        nome: prodNome.value.trim(),
        preco: parseFloat(prodPreco.value),
        qtd: parseInt(prodQtd.value, 10)
      })
    });

    const data = await parseJSON(res);

    if (!res.ok) {
      if (res.status === 401) {
        logout();
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      throw new Error(
        data?.erro || "Erro ao cadastrar produto."
      );
    }

    produtoForm.reset();

    await carregarProdutos();

  } catch (err) {
    alert(err.message);
  }
});

// ---------- Excluir produto ----------

async function deletarProduto(id) {
  if (!confirm("Deseja realmente excluir este produto?")) {
    return;
  }

  const token = getToken();

  try {
    const res = await fetch(`${API_URL}/produtos/${id}`, {
      method: "DELETE",

      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const data = await parseJSON(res);

      if (res.status === 401) {
        logout();
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      throw new Error(
        data?.erro || "Erro ao excluir produto."
      );
    }

    await carregarProdutos();

  } catch (err) {
    alert(err.message);
  }
}
