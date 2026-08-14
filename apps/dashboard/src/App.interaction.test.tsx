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

const fillInput = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
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
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }));

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
      .mockResolvedValueOnce(jsonResponse(200, { data: adminSession, meta: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [tenant], meta: {} }));

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
});
