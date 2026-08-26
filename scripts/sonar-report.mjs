const HOST = (process.env.SONAR_HOST_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.SONAR_TOKEN ?? "";
const PROJECT_KEY = process.env.SONAR_PROJECTKEY ?? "";

if (!HOST || !TOKEN || !PROJECT_KEY) {
  console.error("SONAR_HOST_URL, SONAR_TOKEN e SONAR_PROJECTKEY sao obrigatorios");
  process.exit(1);
}

const sonarFetch = async (path) => {
  const url = HOST.concat(path);
  const basicAuth = Buffer.from(`${TOKEN}:`).toString("base64");
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${basicAuth}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} em ${path}`);
  }

  return response.json();
};

const waitForAnalysisProcessing = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const payload = await sonarFetch(
        `/api/ce/component?component=${encodeURIComponent(PROJECT_KEY)}`,
      );
      const status = payload.task?.status;

      if (status && status !== "PENDING" && status !== "PROCESSING") {
        return status;
      }
    } catch {
      // tarefa ainda nao visivel: tenta novamente ate esgotar as tentativas
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  return "TIMEOUT";
};

const waitForQualityGate = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const payload = await sonarFetch(
        `/api/qualitygates/project_status?projectKey=${encodeURIComponent(PROJECT_KEY)}`,
      );
      const status = payload.projectStatus?.status;

      if (status === "OK" || status === "ERROR" || status === "WARN") {
        return { status, conditions: payload.projectStatus?.conditions ?? [] };
      }
    } catch {
      // analise ainda nao processada: tenta novamente ate esgotar as tentativas
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  return { status: "TIMEOUT", conditions: [] };
};

const fetchIssueFacets = async () => {
  const payload = await sonarFetch(
    `/api/issues/search?componentKeys=${encodeURIComponent(PROJECT_KEY)}&resolved=false&ps=1&facet=types&facet=severities`,
  );

  const facetBy = (property) =>
    payload.facets?.find((facet) => facet.property === property)?.entries ?? [];

  return { total: payload.total ?? 0, types: facetBy("types"), severities: facetBy("severities") };
};

const fetchTopIssues = async () => {
  const payload = await sonarFetch(
    `/api/issues/search?componentKeys=${encodeURIComponent(PROJECT_KEY)}&resolved=false&s=SEVERITY&asc=false&ps=15`,
  );

  return (payload.issues ?? []).map((issue) => ({
    severity: issue.severity,
    type: issue.type,
    message: issue.message,
    component: (issue.component ?? "").replace(`${PROJECT_KEY}:`, ""),
    line: issue.line ?? "-",
    rule: issue.rule,
  }));
};

const main = async () => {
  const taskStatus = await waitForAnalysisProcessing();

  if (taskStatus === "FAILED") {
    console.error("::warning::Analise do SonarQube falhou no Compute Engine — dados podem estar defasados.");
  }

  const gate = await waitForQualityGate();

  const lines = ["## SonarQube", "", `- **Quality Gate:** \`${gate.status}\``, ""];

  for (const condition of gate.conditions) {
    if (condition.status === "ERROR") {
      lines.push(`- Falhou: ${condition.metric} = ${condition.actual} (limite ${condition.errorThreshold})`);
    }
  }

  if (gate.status === "ERROR") {
    lines.push("> **Quality Gate reprovado: trate os itens abaixo como tarefas.**");
    console.warn("::warning::SonarQube Quality Gate reprovado — pendencias listadas no resumo do job.");
  } else if (gate.status === "TIMEOUT") {
    lines.push("> SonarQube nao finalizou o processamento da analise a tempo.");
  }

  try {
    const facets = await fetchIssueFacets();
    const topIssues = await fetchTopIssues();

    lines.push("", `### Pendencias abertas: ${facets.total}`, "");

    if (facets.types.length > 0) {
      lines.push("| Tipo | Quantidade |", "| --- | --- |");
      for (const entry of facets.types) {
        lines.push(`| ${entry.val} | ${entry.count} |`);
      }
      lines.push("");
    }

    if (facets.severities.length > 0) {
      lines.push("| Severidade | Quantidade |", "| --- | --- |");
      for (const entry of facets.severities) {
        lines.push(`| ${entry.val} | ${entry.count} |`);
      }
      lines.push("");
    }

    if (topIssues.length > 0) {
      lines.push(
        "### Tarefas a realizar (top 15 por severidade)",
        "",
        "| Severidade | Tipo | Descricao | Local | Regra |",
        "| --- | --- | --- | --- | --- |",
      );
      for (const issue of topIssues) {
        const message = issue.message.replaceAll("|", "\\|");
        lines.push(
          `| ${issue.severity} | ${issue.type} | ${message} | \`${issue.component}:${issue.line}\` | ${issue.rule} |`,
        );
      }
    }
  } catch (error) {
    lines.push(`> Nao foi possivel listar pendencias: ${error.message}`);
  }

  console.log(lines.join("\n"));
};

await main();
