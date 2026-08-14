import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

type MockResponseBody = Record<string, unknown>;

const adminSession = {
  accessToken: "access-token-1",
  refreshToken: "refresh-token-1",
  expiresInSeconds: 900,
  user: {
    id: "user-1",
    tenantId: "tenant-admin-1",
    email: "admin@acme.test",
    roles: ["platform_admin", "admin"]
  }
};

const tenant = {
  id: "tenant-1",
  publicId: "acme",
  name: "Acme",
  status: "active" as const,
  planId: "plan-starter",
  defaultLocale: "pt-BR",
  deletedAt: null
};

const domain = {
  id: "domain-1",
  tenantId: "tenant-1",
  domain: "acme.com",
  isVerified: false
};

const widgetConfig = {
  tenantId: "tenant-1",
  theme: "dark" as const,
  primaryColor: "#111111",
  iconUrl: "https://example.com/icon.png",
  initialMessage: "Bem-vindo",
  placeholder: "Escreva aqui"
};

const agentConfig = {
  id: "agent-config-1",
  tenantId: "tenant-1",
  provider: "n8n" as const,
  model: "gpt-4.1-mini",
  webhookEndpointId: "11111111-1111-4111-8111-111111111111",
  encryptedCredentialsRef: "vault://tenant-1/agent",
  routingRules: { fallback: "n8n" },
  timeoutMs: 15000,
  retryPolicy: { attempts: 2 },
  isActive: true
};

const updatedWidgetConfig = {
  tenantId: "tenant-1",
  theme: "light" as const,
  primaryColor: "#123456",
  iconUrl: "https://cdn.example.com/icon.png",
  initialMessage: "Olá, posso ajudar?",
  placeholder: "Digite sua dúvida"
};

const updatedAgentConfig = {
  id: "agent-config-2",
  tenantId: "tenant-1",
  provider: "custom" as const,
  model: "custom-model",
  webhookEndpointId: "22222222-2222-4222-8222-222222222222",
  encryptedCredentialsRef: "vault://tenant-1/agent-v2",
  routingRules: { fallback: "n8n", priority: 1 },
  timeoutMs: 25000,
  retryPolicy: { attempts: 3, backoffMs: 500 },
  isActive: false
};

const jsonResponse = (status: number, body: MockResponseBody) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });

const setupDom = () => {
  document.body.innerHTML = '<div id="root"></div>';
  const element = document.getElementById("root");
  if (!element) {
    throw new Error("Root element not found");
  }

  return createRoot(element);
};

const fillInput = (input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    "value",
  ) as PropertyDescriptor | undefined;

  descriptor?.set?.call(input, value);

  if (input instanceof HTMLSelectElement) {
    input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    return;
  }

  input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
};

const submitForm = (form: HTMLFormElement) => {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  });
};

const waitForBodyText = async (text: string) => {
  for (let i = 0; i < 10; i += 1) {
    if (document.body.textContent?.includes(text)) {
      return;
    }

    await flush();
  }

  throw new Error(`Timed out waiting for text: ${text}`);
};

describe("App interactions", () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    window.localStorage.clear();
    root = setupDom();
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    vi.unstubAllGlobals();
  });

  it("authenticates and loads the tenant list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }));
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [domain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }));

    await act(async () => {
      root!.render(<App />);
    });

    await flush();

    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const loginButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

    fillInput(emailInput, "admin@acme.test");
    fillInput(passwordInput, "senha-super-secreta");

    await act(async () => {
      loginButton.click();
    });

    await flush();

    expect(document.body.textContent).toContain("Lista de tenants");
    expect(document.body.textContent).toContain("acme");
    expect(document.body.textContent).toContain("Dominios autorizados");
    expect(document.body.textContent).toContain(
      '<script src="https://faqchatbot.rigbie.com.br/widget.js?data-agent=acme" data-agent="acme" async></script>',
    );
    expect(vi.mocked(fetch)).toHaveBeenNthCalledWith(
      2,
      "/v1/admin/tenants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token-1"
        })
      }),
    );
  });

  it("creates a tenant, refreshes the session and logs out", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: {} }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            id: "tenant-2",
            publicId: "beta",
            name: "Beta",
            status: "active",
            planId: "plan-growth",
            defaultLocale: "pt-BR",
            deletedAt: null
          },
          meta: {}
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [
            {
              id: "tenant-2",
              publicId: "beta",
              name: "Beta",
              status: "active",
              planId: "plan-growth",
              defaultLocale: "pt-BR",
              deletedAt: null
            }
          ],
          meta: {}
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: null, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: null, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: {} }));

    await act(async () => {
      root!.render(<App />);
    });

    await flush();

    const [emailInput, passwordInput] = Array.from(
      document.querySelectorAll('input[type="email"], input[type="password"]'),
    ) as [HTMLInputElement, HTMLInputElement];

    fillInput(emailInput, "admin@acme.test");
    fillInput(passwordInput, "senha-super-secreta");

    await act(async () => {
      (document.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    await flush();

    await waitForBodyText("Lista de tenants");

    const inputs = Array.from(document.querySelectorAll("input"));
    const [publicIdInput, nameInput, localeInput] = inputs as [
      HTMLInputElement,
      HTMLInputElement,
      HTMLInputElement
    ];
    const planSelect = document.querySelector("select") as HTMLSelectElement;
    fillInput(publicIdInput, "beta");
    fillInput(nameInput, "Beta");
    fillInput(planSelect, "growth");
    fillInput(localeInput, "pt-BR");

    await flush();

    await act(async () => {
      submitForm(document.querySelector("form") as HTMLFormElement);
    });

    await waitForBodyText("Beta");

    expect(document.body.textContent).toContain("Beta");
    expect(document.body.textContent).toContain("Tenant criado com sucesso.");

    const refreshButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Renovar sessao"),
    ) as HTMLButtonElement;
    const logoutButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Sair"),
    ) as HTMLButtonElement;

    await act(async () => {
      refreshButton.click();
    });

    await flush();

    expect(vi.mocked(fetch).mock.calls.some((call) => call[0] === "/v1/auth/refresh")).toBe(true);

    await act(async () => {
      logoutButton.click();
    });

    await flush();

    expect(document.body.textContent).toContain("Acesso administrativo");
    expect(document.body.textContent).toContain("Sessao encerrada.");
  });

  it("edits and suspends the selected tenant", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [domain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            ...tenant,
            name: "Acme Atualizada",
            status: "inactive",
            defaultLocale: "en-US"
          },
          meta: {}
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [
            {
              ...tenant,
              name: "Acme Atualizada",
              status: "inactive",
              defaultLocale: "en-US"
            }
          ],
          meta: {}
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: [domain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: {
            ...tenant,
            name: "Acme Atualizada",
            status: "suspended",
            defaultLocale: "en-US"
          },
          meta: {}
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: {} }));

    await act(async () => {
      root!.render(<App />);
    });

    await flush();

    const [emailInput, passwordInput] = Array.from(
      document.querySelectorAll('input[type="email"], input[type="password"]'),
    ) as [HTMLInputElement, HTMLInputElement];

    fillInput(emailInput, "admin@acme.test");
    fillInput(passwordInput, "senha-super-secreta");

    await act(async () => {
      (document.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    await waitForBodyText("Lista de tenants");

    await act(async () => {
      (Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Editar"),
      ) as HTMLButtonElement).click();
    });

    await waitForBodyText("Tenant selecionado");

    const editForms = document.querySelectorAll("form");
    const editForm = editForms[1] as HTMLFormElement;
    const editInputs = Array.from(editForm.querySelectorAll("input"));
    const editSelects = Array.from(editForm.querySelectorAll("select"));
    const [editPublicIdInput, editNameInput, editLocaleInput] = editInputs as [
      HTMLInputElement,
      HTMLInputElement,
      HTMLInputElement
    ];
    const [planSelect, statusSelect] = editSelects as [HTMLSelectElement, HTMLSelectElement];

    fillInput(editPublicIdInput, "acme");
    fillInput(editNameInput, "Acme Atualizada");
    fillInput(planSelect, "growth");
    fillInput(statusSelect, "inactive");
    fillInput(editLocaleInput, "en-US");

    await flush();

    await act(async () => {
      submitForm(editForm);
    });

    await waitForBodyText("Acme Atualizada");
    expect(document.body.textContent).toContain("Tenant atualizado com sucesso.");

    await act(async () => {
      (Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Suspender tenant"),
      ) as HTMLButtonElement).click();
    });

    await flush();

    expect(vi.mocked(fetch).mock.calls.some((call) => call[0] === "/v1/admin/tenants/tenant-1")).toBe(true);
    expect(document.body.textContent).toContain("Tenant suspenso com sucesso.");
  });

  it("adds an authorized domain and saves the public widget config", async () => {
    const createdDomain = {
      id: "domain-2",
      tenantId: "tenant-1",
      domain: "example.com",
      isVerified: false
    };

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [domain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: createdDomain, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [createdDomain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: updatedWidgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [createdDomain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: updatedWidgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: updatedAgentConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [createdDomain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: updatedWidgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: updatedAgentConfig, meta: {} }));

    await act(async () => {
      root!.render(<App />);
    });

    await flush();

    const [emailInput, passwordInput] = Array.from(
      document.querySelectorAll('input[type="email"], input[type="password"]'),
    ) as [HTMLInputElement, HTMLInputElement];

    fillInput(emailInput, "admin@acme.test");
    fillInput(passwordInput, "senha-super-secreta");

    await act(async () => {
      (document.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    await waitForBodyText("Dominios autorizados");

    const domainInput = document.querySelector('#domains input') as HTMLInputElement;
    fillInput(domainInput, "example.com");

    await act(async () => {
      submitForm(document.querySelector("#domains form") as HTMLFormElement);
    });

    await waitForBodyText("Dominio autorizado com sucesso.");
    expect(document.body.textContent).toContain("example.com");

    const widgetForm = document.querySelector("#widget-config form") as HTMLFormElement;
    const [themeSelect, primaryColorInput, iconUrlInput, initialMessageInput, placeholderInput] = Array.from(
      widgetForm.querySelectorAll("input, select"),
    ) as [HTMLSelectElement, HTMLInputElement, HTMLInputElement, HTMLInputElement, HTMLInputElement];

    fillInput(themeSelect, "light");
    fillInput(primaryColorInput, "#123456");
    fillInput(iconUrlInput, "https://cdn.example.com/icon.png");
    fillInput(initialMessageInput, "Olá, posso ajudar?");
    fillInput(placeholderInput, "Digite sua dúvida");

    await act(async () => {
      submitForm(widgetForm);
    });

    await waitForBodyText("Configuracao do widget salva com sucesso.");

    const configRequest = vi
      .mocked(fetch)
      .mock.calls.find(
        ([path, init]) => path === "/v1/admin/tenants/tenant-1/config" && init?.method === "PUT",
      );

    expect(configRequest).toBeDefined();
    expect(JSON.parse(configRequest?.[1]?.body as string)).toEqual({
      theme: "light",
      primaryColor: "#123456",
      iconUrl: "https://cdn.example.com/icon.png",
      initialMessage: "Olá, posso ajudar?",
      placeholder: "Digite sua dúvida"
    });

    const agentForm = document.querySelector("#agent-config form") as HTMLFormElement;
    const providerSelect = agentForm.querySelector("select") as HTMLSelectElement;
    const agentInputs = Array.from(
      agentForm.querySelectorAll('input:not([type="checkbox"])'),
    ) as [HTMLInputElement, HTMLInputElement, HTMLInputElement, HTMLInputElement];
    const [modelInput, webhookInput, credentialsInput, timeoutInput] = agentInputs;
    const agentTextareas = Array.from(agentForm.querySelectorAll("textarea")) as [
      HTMLTextAreaElement,
      HTMLTextAreaElement
    ];
    const [routingRulesInput, retryPolicyInput] = agentTextareas;
    const activeInput = agentForm.querySelector('input[type="checkbox"]') as HTMLInputElement;

    fillInput(providerSelect, "custom");
    fillInput(modelInput, "custom-model");
    fillInput(webhookInput, "22222222-2222-4222-8222-222222222222");
    fillInput(credentialsInput, "vault://tenant-1/agent-v2");
    fillInput(timeoutInput, "25000");
    fillInput(routingRulesInput, '{\n  "fallback": "n8n",\n  "priority": 1\n}');
    fillInput(retryPolicyInput, '{\n  "attempts": 3,\n  "backoffMs": 500\n}');
    activeInput.click();

    await act(async () => {
      submitForm(agentForm);
    });

    await waitForBodyText("Configuracao de agente salva com sucesso.");

    const agentRequest = vi
      .mocked(fetch)
      .mock.calls.find(
        ([path, init]) => path === "/v1/admin/tenants/tenant-1/agent-config" && init?.method === "PUT",
      );

    expect(agentRequest).toBeDefined();
    expect(JSON.parse(agentRequest?.[1]?.body as string)).toEqual({
      provider: "custom",
      model: "custom-model",
      webhookEndpointId: "22222222-2222-4222-8222-222222222222",
      encryptedCredentialsRef: "vault://tenant-1/agent-v2",
      routingRules: { fallback: "n8n", priority: 1 },
      timeoutMs: 25000,
      retryPolicy: { attempts: 3, backoffMs: 500 },
      isActive: false
    });
  });

  it("manages tenant users, roles and api keys locally in the dashboard", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [domain], meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: widgetConfig, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: agentConfig, meta: {} }));

    await act(async () => {
      root!.render(<App />);
    });

    await flush();

    const [emailInput, passwordInput] = Array.from(
      document.querySelectorAll('input[type="email"], input[type="password"]'),
    ) as [HTMLInputElement, HTMLInputElement];

    fillInput(emailInput, "admin@acme.test");
    fillInput(passwordInput, "senha-super-secreta");

    await act(async () => {
      (document.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    });

    await waitForBodyText("Usuarios do tenant");

    const usersForm = document.querySelector("#users form") as HTMLFormElement;
    const [inviteEmailInput] = Array.from(usersForm.querySelectorAll("input")) as [HTMLInputElement];
    const inviteRoleSelect = usersForm.querySelector("select") as HTMLSelectElement;

    fillInput(inviteEmailInput, "novo.usuario@acme.test");
    fillInput(inviteRoleSelect, "editor");

    await act(async () => {
      submitForm(usersForm);
    });

    await waitForBodyText("Convite de usuario preparado localmente.");
    expect(document.body.textContent).toContain("novo.usuario@acme.test");

    const createdUserRoleSelect = Array.from(document.querySelectorAll("#users .user-row select"))[0] as HTMLSelectElement;
    fillInput(createdUserRoleSelect, "operator");
    await flush();
    expect(document.body.textContent).toContain("Roles do usuario atualizados localmente.");

    const apiKeysForm = document.querySelector("#api-keys form") as HTMLFormElement;
    const apiKeyNameInput = apiKeysForm.querySelector("input") as HTMLInputElement;
    fillInput(apiKeyNameInput, "Key do painel");

    await act(async () => {
      submitForm(apiKeysForm);
    });

    await waitForBodyText("Chave criada. O segredo fica visivel apenas agora.");
    expect(document.body.textContent).toContain("Key do painel");
    expect(document.body.textContent).toContain("Segredo gerado uma unica vez");

    const createdKeyRow = Array.from(document.querySelectorAll("#api-keys .api-key-row")).find((row) =>
      row.textContent?.includes("Key do painel"),
    ) as HTMLDivElement;
    expect(createdKeyRow).toBeDefined();

    await act(async () => {
      (createdKeyRow.querySelector("button") as HTMLButtonElement).click();
    });

    await flush();
    expect(document.body.textContent).toContain("Chave revogada localmente.");
    expect(createdKeyRow.textContent).toContain("Revogada em");
  });
});
