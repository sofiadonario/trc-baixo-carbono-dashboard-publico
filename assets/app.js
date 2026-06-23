"use strict";

const DATA_URL = "data/base_integrada_trc_baixo_carbono.json";
const TABLE_RENDER_LIMIT = 200;

const state = {
  data: null,
  integrated: [],
  filtered: [],
};

const camaraState = {
  all: [],
  filtered: [],
  page: 1,
  perPage: 100,
};

const labels = {
  submatriz_validacao_juridica_estrita: "Submatriz estrita",
  camada_auxiliar_rastreavel: "Camada auxiliar",
  cobertura_federal_ampliada: "Cobertura ampliada",
  radar_legislativo_camara: "Radar Câmara",
  risco_superinclusao_nao_identificado: "Não identificado",
  risco_superinclusao_baixo: "Baixo",
  risco_superinclusao_moderado: "Moderado",
  sobreposicao_tematica_com_cobertura_ampliada: "Sobreposição com cobertura ampliada",
  sobreposicao_tematica_com_matriz_principal_e_cobertura_ampliada: "Sobreposição com submatriz e ampliada",
  sem_relacao_normativa_identificada: "Sem relação identificada",
  tema_emergente_sem_norma_correspondente_identificada: "Tema emergente",
  checklist_inicial_criado_pendente_revisao_material: "Checklist criado; revisão material pendente",
  manter_em_quarentena_metodologica: "Quarentena metodológica",
  fora_do_fluxo_curto_contextual: "Fora do fluxo curto — contextual",
  fora_do_fluxo_curto_por_inconsistencia_tematica: "Fora do fluxo — inconsistência temática",
  pendente_validacao_humana: "Validação humana pendente",
  bloqueado_pendente_ato_direto: "Bloqueado — ato direto pendente",
  preparacao_pacote_3_incompleta_pendente_retificacao: "Pré-Pacote 3 — retificação pendente",
};

const byId = (id) => document.getElementById(id);
const text = (value) => value === null || value === undefined || value === "" ? "não localizado" : String(value);
const pretty = (value) => labels[value] || text(value).replaceAll("_", " ");
const normalize = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const arrayify = (value) => Array.isArray(value) ? value : value ? String(value).split(";").map((item) => item.trim()).filter(Boolean) : [];
const escapeHtml = (value) => text(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function indexBy(items, key) {
  return Object.fromEntries(items.map((item) => [String(item[key]), item]));
}

function buildIntegrated(data) {
  const validation = indexBy(data.camara.validacao.validacao, "id_camara");
  const exams = indexBy(data.camara.exames.exames, "id_camara");
  const crosses = indexBy(data.camara.cruzamento.cruzamentos, "id_camara");
  const reviews = indexBy(data.camara.revisao_risco.revisoes, "id_camara");
  const operational = indexBy(data.federal.fechamento.status_detalhado, "id_consolidado");

  const strict = data.federal.submatriz_estrita.map((item) => ({
    id: item.id,
    title: item.titulo,
    url: "",
    nature: "registro_normativo_federal",
    layer: "submatriz_validacao_juridica_estrita",
    year: item.ano,
    axes: [],
    status: item.status_metodologico,
    relevanceClass: "",
    risk: "",
    relation: "",
    institution: item.orgao,
    observation: item.observacao,
  }));

  const auxiliary = data.federal.camada_auxiliar.map((item) => ({
    id: item.id,
    title: item.titulo,
    url: "",
    nature: "registro_normativo_federal",
    layer: "camada_auxiliar_rastreavel",
    year: item.ano,
    axes: [],
    status: item.status_metodologico,
    relevanceClass: "",
    risk: "",
    relation: "",
    institution: item.orgao,
    observation: item.observacao,
  }));

  const expanded = data.federal.cobertura_ampliada.map((item) => ({
    id: item.id,
    title: item.titulo,
    url: item.url,
    nature: "registro_normativo_federal",
    layer: "cobertura_federal_ampliada",
    year: item.ano,
    axes: arrayify(item.eixo_tematico),
    status: operational[item.id]?.decisao || item.status_validacao || item.status_localizacao,
    relevanceClass: item.hipotese_pertinencia,
    risk: "",
    relation: "",
    institution: item.orgao || item.fonte,
    observation: item.observacao,
  }));

  const radar = data.camara.radar.map((item) => {
    const val = validation[String(item.id_camara)];
    const exam = exams[String(item.id_camara)];
    const cross = crosses[String(item.id_camara)];
    const review = reviews[String(item.id_camara)];
    return {
      id: item.id_radar,
      idCamara: item.id_camara,
      title: `${item.sigla_tipo} ${item.numero}/${item.ano} — ${item.ementa}`,
      shortTitle: `${item.sigla_tipo} ${item.numero}/${item.ano}`,
      url: item.url,
      nature: "proposicao_legislativa",
      layer: "radar_legislativo_camara",
      year: item.ano,
      axes: exam?.eixos_tematicos_confirmados || val?.eixos_tematicos_validados || item.eixos_tematicos || [],
      status: exam?.status_exame_inteiro_teor || val?.status_validacao || item.status_metodologico,
      relevanceClass: exam?.classe_pos_inteiro_teor || val?.classe_relevancia_validada || item.classe_relevancia,
      risk: review?.risco_superinclusao_revisado || cross?.risco_superinclusao || "",
      relation: review?.classe_cruzamento_revisada || cross?.tipo_relacao || "",
      institution: "Câmara dos Deputados",
      observation: review?.justificativa_revisao || cross?.justificativa_cruzamento || exam?.justificativa_exame || item.observacao,
    };
  });

  return [...strict, ...auxiliary, ...expanded, ...radar];
}

function fillSelect(id, values) {
  const select = byId(id);
  [...new Set(values.filter(Boolean).map(String))]
    .sort((a, b) => pretty(a).localeCompare(pretty(b), "pt-BR"))
    .forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = pretty(value);
      select.appendChild(option);
    });
}

function initializeFilters() {
  fillSelect("layerFilter", state.integrated.map((item) => item.layer));
  fillSelect("axisFilter", state.integrated.flatMap((item) => item.axes));
  fillSelect("statusFilter", state.integrated.map((item) => item.status));
  fillSelect("classFilter", state.integrated.map((item) => item.relevanceClass));
  fillSelect("yearFilter", state.integrated.map((item) => item.year).filter(Boolean).sort((a, b) => b - a));
  fillSelect("riskFilter", state.integrated.map((item) => item.risk));
  fillSelect("relationFilter", state.integrated.map((item) => item.relation));

  ["searchFilter", "layerFilter", "axisFilter", "statusFilter", "classFilter", "yearFilter", "riskFilter", "relationFilter"]
    .forEach((id) => byId(id).addEventListener(id === "searchFilter" ? "input" : "change", applyFilters));
  byId("clearFilters").addEventListener("click", clearFilters);
  byId("exportCsv").addEventListener("click", exportCsv);
}

function applyFilters() {
  const query = normalize(byId("searchFilter").value);
  const selected = {
    layer: byId("layerFilter").value,
    axis: byId("axisFilter").value,
    status: byId("statusFilter").value,
    relevanceClass: byId("classFilter").value,
    year: byId("yearFilter").value,
    risk: byId("riskFilter").value,
    relation: byId("relationFilter").value,
  };

  state.filtered = state.integrated.filter((item) => {
    const haystack = normalize([
      item.id, item.title, item.year, item.layer, item.status, item.relevanceClass,
      item.risk, item.relation, item.institution, item.observation, ...item.axes,
    ].join(" "));
    return (!query || haystack.includes(query))
      && (!selected.layer || item.layer === selected.layer)
      && (!selected.axis || item.axes.includes(selected.axis))
      && (!selected.status || item.status === selected.status)
      && (!selected.relevanceClass || item.relevanceClass === selected.relevanceClass)
      && (!selected.year || String(item.year) === selected.year)
      && (!selected.risk || item.risk === selected.risk)
      && (!selected.relation || item.relation === selected.relation);
  });
  renderIntegratedTable();
}

function clearFilters() {
  ["searchFilter", "layerFilter", "axisFilter", "statusFilter", "classFilter", "yearFilter", "riskFilter", "relationFilter"]
    .forEach((id) => { byId(id).value = ""; });
  applyFilters();
}

function chip(value, tone = "") {
  if (!value) return '<span class="muted">—</span>';
  return `<span class="chip ${tone}">${escapeHtml(pretty(value))}</span>`;
}

function renderIntegratedTable() {
  const rows = state.filtered.slice(0, TABLE_RENDER_LIMIT);
  byId("filteredCount").textContent = state.filtered.length.toLocaleString("pt-BR");
  byId("totalCount").textContent = state.integrated.length.toLocaleString("pt-BR");
  byId("renderLimitNote").textContent = state.filtered.length > TABLE_RENDER_LIMIT
    ? `Tabela limitada aos primeiros ${TABLE_RENDER_LIMIT} itens; a exportação inclui todo o recorte.`
    : "";
  byId("integratedTableBody").innerHTML = rows.map((item) => `
    <tr>
      <td class="item-title">
        ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}
        <span class="item-id">${escapeHtml(item.id)}</span>
      </td>
      <td>${chip(item.nature, "chip--gray")}${chip(item.layer)}</td>
      <td>${escapeHtml(item.year)}</td>
      <td>${item.axes.length ? item.axes.map((axis) => chip(axis)).join("") : '<span class="muted">não localizado consistentemente</span>'}</td>
      <td>${chip(item.status, "chip--gray")}${chip(item.relevanceClass)}</td>
      <td>${chip(item.risk, "chip--amber")}${chip(item.relation, "chip--gray")}</td>
      <td>${escapeHtml(item.institution)}</td>
    </tr>
  `).join("");
}

function renderBars(containerId, entries, total = null) {
  const normalizedEntries = Object.entries(entries).sort((a, b) => b[1] - a[1]);
  const denominator = total || Math.max(...normalizedEntries.map(([, value]) => value), 1);
  byId(containerId).innerHTML = normalizedEntries.map(([label, value]) => `
    <div class="bar-row">
      <span class="bar-row__label">${escapeHtml(pretty(label))}</span>
      <span class="bar-row__track"><span class="bar-row__fill" style="width:${Math.max((value / denominator) * 100, 1)}%"></span></span>
      <span class="bar-row__value">${value}</span>
    </div>
  `).join("");
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const value = getter(item);
    if (value) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function renderStaticSections(data) {
  byId("generationDate").textContent = `Artefato derivado: ${new Date(data.metadados.data_geracao).toLocaleString("pt-BR")}`;
  byId("strictTableBody").innerHTML = data.federal.submatriz_estrita.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.titulo)}</td>
      <td>${escapeHtml(item.ano)}</td>
      <td>${escapeHtml(pretty(item.pertinencia_trc))}</td>
      <td>${escapeHtml(pretty(item.pertinencia_baixo_carbono))}</td>
      <td>${escapeHtml(pretty(item.status_metodologico))}</td>
    </tr>
  `).join("");

  const summary = data.federal.fechamento.sumario;
  renderBars("funnelBars", {
    checklist_inicial_criado_pendente_revisao_material: summary.registros_aptos_P2,
    manter_em_quarentena_metodologica: summary.registros_quarentena,
    bloqueado_pendente_ato_direto: summary.registros_bloqueados,
    fora_do_fluxo_curto_contextual: summary.registros_fora_fluxo,
    pendente_validacao_humana: summary.registros_pendentes_humanos,
    preparacao_pacote_3_incompleta_pendente_retificacao: summary.registros_pre_pacote_3,
  }, 61);

  renderBars("yearBars", countBy(data.camara.radar, (item) => item.ano), 115);
  renderBars("classBars", countBy(data.camara.radar, (item) => item.classe_relevancia), 152);
  renderBars("relationBars", data.camara.cruzamento.contagens_tipo_relacao, 35);
  renderBars("riskBars", {
    risco_superinclusao_nao_identificado: data.camara.cruzamento.riscos_superinclusao.risco_superinclusao_nao_identificado,
    risco_superinclusao_baixo: data.camara.cruzamento.riscos_superinclusao.risco_superinclusao_baixo,
    risco_superinclusao_moderado: data.camara.cruzamento.riscos_superinclusao.risco_superinclusao_moderado,
  }, 35);

  const reviews = indexBy(data.camara.revisao_risco.revisoes, "id_camara");
  byId("crossTableBody").innerHTML = data.camara.cruzamento.cruzamentos.map((item) => {
    const review = reviews[String(item.id_camara)];
    return `
      <tr>
        <td><strong>${escapeHtml(`${item.sigla_tipo} ${item.numero}/${item.ano}`)}</strong><span class="item-id">${escapeHtml(item.ementa_resumida)}</span></td>
        <td>${escapeHtml(item.ano)}</td>
        <td>${escapeHtml(pretty(item.eixo_regulatorio))}</td>
        <td>${escapeHtml(pretty(review?.classe_cruzamento_revisada || item.tipo_relacao))}</td>
        <td>${chip(review?.risco_superinclusao_revisado || item.risco_superinclusao, "chip--amber")}</td>
        <td>${escapeHtml(review?.justificativa_revisao || item.justificativa_cruzamento)}</td>
      </tr>
    `;
  }).join("");

  const gap = data.sintese.registros_sintese.find((item) => item.id_sintese_integrada === "SINT-INT-013");
  byId("gapFinding").textContent = gap?.principais_achados || "não localizado";

  const institutions = [
    ...data.federal.submatriz_estrita.map((item) => item.orgao),
    ...data.federal.camada_auxiliar.map((item) => item.orgao),
    ...data.federal.cobertura_ampliada.map((item) => item.orgao || item.fonte),
  ];
  const institutionCounts = countBy(institutions, (item) => item);
  renderBars("institutionBars", Object.fromEntries(Object.entries(institutionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)));

  byId("sourceTableBody").innerHTML = data.metadados.fonte_derivada_de.map((source) => `
    <tr><td>${escapeHtml(source.fonte)}</td><td>${escapeHtml(source.sha256)}</td></tr>
  `).join("");
}

function csvCell(value) {
  return `"${text(value).replaceAll('"', '""')}"`;
}

function exportCsv() {
  const header = ["id", "titulo", "natureza", "camada", "ano", "eixos", "status_metodologico", "classe_relevancia", "risco_superinclusao", "tipo_relacao", "instituicao", "url"];
  const rows = state.filtered.map((item) => [
    item.id, item.title, item.nature, item.layer, item.year, item.axes.join("; "), item.status,
    item.relevanceClass, item.risk, item.relation, item.institution, item.url,
  ]);
  const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "base_integrada_trc_recorte_dashboard.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function renderFederalFullTable(data) {
  const strict = data.federal.submatriz_estrita.map((item) => ({
    id: item.id, title: item.titulo, year: item.ano,
    layer: "Submatriz estrita", institution: item.orgao,
    status: item.status_metodologico,
  }));
  const aux = data.federal.camada_auxiliar.map((item) => ({
    id: item.id, title: item.titulo, year: item.ano,
    layer: "Camada auxiliar", institution: item.orgao,
    status: item.status_metodologico,
  }));
  const operational = indexBy(data.federal.fechamento.status_detalhado, "id_consolidado");
  const expanded = data.federal.cobertura_ampliada.map((item) => ({
    id: item.id, title: item.titulo, year: item.ano,
    layer: "Cobertura ampliada",
    institution: item.orgao || item.fonte,
    status: operational[item.id]?.decisao || item.status_validacao || item.status_localizacao,
  }));
  const all = [...strict, ...aux, ...expanded];
  byId("federalFullTableBody").innerHTML = all.map((item) => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.year)}</td>
      <td>${chip(item.layer)}</td>
      <td>${escapeHtml(item.institution)}</td>
      <td>${escapeHtml(pretty(item.status))}</td>
    </tr>
  `).join("");
}

function renderGapsTable(data) {
  const records = data.sintese.registros_sintese;
  const gaps = records.filter((r) => r.id_sintese_integrada === "SINT-INT-013");
  const agenda = records.filter((r) => r.id_sintese_integrada === "SINT-INT-014");

  const rows = [];

  if (gaps.length) {
    const gap = gaps[0];
    const achados = gap.principais_achados || "";
    const lacunaRegex = /([a-zà-ü]+(?:\s[a-zà-ü]+)*)\s*\((alta|media|baixa)\)/gi;
    let match;
    while ((match = lacunaRegex.exec(achados)) !== null) {
      rows.push({
        id: `lacuna-${rows.length + 1}`,
        bloco: "Lacuna regulatória",
        descricao: `${match[1].trim()} (nível: ${match[2]})`,
        proximo: gap.proximo_passo || "não localizado",
      });
    }
  }

  if (agenda.length) {
    const ag = agenda[0];
    rows.push({
      id: "AGENDA-001",
      bloco: "Convergências temáticas",
      descricao: (ag.principais_achados || "").slice(0, 240) + "…",
      proximo: ag.proximo_passo || "não localizado",
    });
    if (gaps.length) {
      rows.push({
        id: "AGENDA-002",
        bloco: "Próximo passo lacunas",
        descricao: gaps[0].principais_achados || "",
        proximo: gaps[0].proximo_passo || "não localizado",
      });
    }
  }

  byId("gapsTableBody").innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.bloco)}</td>
      <td>${escapeHtml(row.descricao)}</td>
      <td>${escapeHtml(row.proximo)}</td>
    </tr>
  `).join("");
}

// ──────────────────────────────────────────
// CÂMARA — paginação real + filtros
// ──────────────────────────────────────────

function renderCamaraTable(data) {
  const radar = data.camara.radar;
  const examsMap = indexBy(data.camara.exames.exames, "id_camara");
  const cruzMap = indexBy(data.camara.cruzamento.cruzamentos, "id_camara");
  const reviewMap = indexBy(data.camara.revisao_risco.revisoes, "id_camara");

  function getStatus(item) {
    const e = examsMap[String(item.id_camara)];
    return e?.status_exame_inteiro_teor || item.status_metodologico;
  }
  function getAxes(item) {
    const e = examsMap[String(item.id_camara)];
    return e?.eixos_tematicos_confirmados || item.eixos_tematicos || [];
  }
  function hasExame(item) {
    return !!examsMap[String(item.id_camara)];
  }

  // Seed all items with enriched data
  camaraState.all = radar.map((item) => ({
    item,
    sigla: item.sigla_tipo,
    numero: item.numero,
    ano: item.ano,
    ementa: item.ementa,
    url: item.url,
    classe: item.classe_relevancia,
    axes: getAxes(item),
    statusLabel: getStatus(item),
    hasExame: hasExame(item),
  }));

  // Build filter options
  const classVals = [...new Set(radar.map((r) => r.classe_relevancia).filter(Boolean))].sort();
  const yearVals = [...new Set(radar.map((r) => r.ano).filter(Boolean))].sort((a, b) => b - a);
  const axisVals = [...new Set(radar.flatMap((r) => r.eixos_tematicos || []))].sort();
  const statusVals = [...new Set(radar.map((r) => r.status_metodologico).filter(Boolean))].sort();

  fillSelect("camaraClassFilter", classVals);
  fillSelect("camaraYearFilter", yearVals);
  fillSelect("camaraAxisFilter", axisVals);
  fillSelect("camaraStatusFilter", statusVals);

  function filterAll() {
    const query = normalize(byId("camaraSearchFilter").value);
    const selClass = byId("camaraClassFilter").value;
    const selYear = byId("camaraYearFilter").value;
    const selAxis = byId("camaraAxisFilter").value;
    const selStatus = byId("camaraStatusFilter").value;

    camaraState.filtered = camaraState.all.filter((enr) => {
      if (selClass && enr.classe !== selClass) return false;
      if (selYear && String(enr.ano) !== selYear) return false;
      if (selAxis && !enr.axes.includes(selAxis)) return false;
      if (selStatus && enr.statusLabel !== selStatus) return false;
      if (query) {
        const haystack = normalize([
          enr.sigla, enr.numero, enr.ano, enr.ementa, ...enr.axes, enr.classe, enr.statusLabel,
        ].join(" "));
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    camaraState.page = 1;
    renderCamaraPage();
  }

  function renderCamaraPage() {
    const { page, perPage, filtered, all } = camaraState;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const offset = (page - 1) * perPage;
    const pageItems = filtered.slice(offset, offset + perPage);

    // Summary
    byId("camaraFilteredCount").textContent = filtered.length.toLocaleString("pt-BR");
    byId("camaraTotalCount").textContent = all.length.toLocaleString("pt-BR");

    // Zero results
    if (filtered.length === 0) {
      byId("camaraTableBody").innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma proposição encontrada com os filtros atuais.</td></tr>';
      byId("camaraPagination").innerHTML = "";
      byId("camaraPageInfo").textContent = "";
      byId("camaraExportBtn").disabled = true;
      return;
    }
    byId("camaraExportBtn").disabled = false;

    // Page info
    byId("camaraPageInfo").textContent = `Exibindo ${offset + 1}–${Math.min(offset + perPage, filtered.length)} de ${filtered.length} proposições filtradas`;

    // Table rows
    byId("camaraTableBody").innerHTML = pageItems.map((enr) => {
      const badge = enr.hasExame
        ? '<span class="chip chip--inteiro-teor">inteiro teor</span>'
        : "";
      return `
        <tr>
          <td class="item-title">
            <a href="${escapeHtml(enr.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(enr.sigla)} ${escapeHtml(enr.numero)}/${escapeHtml(enr.ano)}</a>
            <span class="item-id">${escapeHtml(enr.ementa)}</span>
          </td>
          <td>${escapeHtml(enr.ano)}</td>
          <td>${chip(enr.classe)}</td>
          <td>${enr.axes.length ? enr.axes.map((a) => chip(a)).join("") : '<span class="muted">—</span>'}</td>
          <td>${escapeHtml(pretty(enr.statusLabel))}</td>
          <td>${badge || '<span class="muted">—</span>'}</td>
        </tr>
      `;
    }).join("");

    // Pagination controls
    const prevDisabled = page <= 1;
    const nextDisabled = page >= totalPages;
    byId("camaraPagination").innerHTML = `
      <button class="pagination__btn pagination__btn--prev" ${prevDisabled ? "disabled" : ""} data-page="${page - 1}">Anterior</button>
      <span class="pagination__info">Página ${page} de ${totalPages}</span>
      <button class="pagination__btn pagination__btn--next" ${nextDisabled ? "disabled" : ""} data-page="${page + 1}">Próxima</button>
      <label class="pagination__perpage">
        Itens/página:
        <select>
          <option value="25" ${perPage === 25 ? "selected" : ""}>25</option>
          <option value="50" ${perPage === 50 ? "selected" : ""}>50</option>
          <option value="100" ${perPage === 100 ? "selected" : ""}>100</option>
          <option value="200" ${perPage === 200 ? "selected" : ""}>200</option>
          <option value="443" ${perPage === 443 ? "selected" : ""}>Todas</option>
        </select>
      </label>
    `;

    // Wire pagination buttons
    byId("camaraPagination").querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        camaraState.page = parseInt(btn.dataset.page, 10);
        renderCamaraPage();
      });
    });
    byId("camaraPagination").querySelector(".pagination__perpage select").addEventListener("change", (e) => {
      camaraState.perPage = parseInt(e.target.value, 10);
      camaraState.page = 1;
      renderCamaraPage();
    });
  }

  // Wire filters
  byId("camaraSearchFilter").addEventListener("input", filterAll);
  byId("camaraClassFilter").addEventListener("change", filterAll);
  byId("camaraYearFilter").addEventListener("change", filterAll);
  byId("camaraAxisFilter").addEventListener("change", filterAll);
  byId("camaraStatusFilter").addEventListener("change", filterAll);
  byId("camaraExportBtn").addEventListener("click", exportCamaraCsv);

  // Initial render
  filterAll();
}

function exportCamaraCsv() {
  const header = ["sigla_tipo", "numero", "ano", "ementa", "classe_relevancia", "eixos", "status", "url", "possui_inteiro_teor"];
  const rows = camaraState.filtered.map((enr) => [
    enr.sigla, enr.numero, enr.ano, enr.ementa, enr.classe, enr.axes.join("; "),
    enr.statusLabel, enr.url, enr.hasExame ? "sim" : "nao",
  ]);
  const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "camara_recorte_dashboard.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────
// TABELA AUTÔNOMA — 35 pós-inteiro teor
// ──────────────────────────────────────────

function renderInteiroTeorTable(data) {
  const exames = data.camara.exames.exames;
  const cruzMap = indexBy(data.camara.cruzamento.cruzamentos, "id_camara");
  const reviewMap = indexBy(data.camara.revisao_risco.revisoes, "id_camara");

  const isPendente = (id) => {
    const r = reviewMap[String(id)];
    return r?.pendencia_validacao_humana === true || String(id) === "2358223"; // PL 2917/2023
  };

  byId("inteiroTeorTableBody").innerHTML = exames.map((item) => {
    const cruz = cruzMap[String(item.id_camara)];
    const review = reviewMap[String(item.id_camara)];
    const riscoFinal = review?.risco_superinclusao_revisado || cruz?.risco_superinclusao || "";
    const pendente = isPendente(item.id_camara);
    return `
      <tr>
        <td class="item-title">
          ${item.url_oficial ? `<a href="${escapeHtml(item.url_oficial)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.sigla_tipo)} ${escapeHtml(item.numero)}/${escapeHtml(item.ano)}</a>` : escapeHtml(`${item.sigla_tipo} ${item.numero}/${item.ano}`)}
          <span class="item-id">${escapeHtml(item.ementa_resumida)}</span>
        </td>
        <td>${escapeHtml(item.ano)}</td>
        <td>${item.eixos_tematicos_confirmados?.length ? item.eixos_tematicos_confirmados.map((a) => chip(a)).join("") : '<span class="muted">—</span>'}</td>
        <td>${chip(item.classe_pos_inteiro_teor)}</td>
        <td>${chip(item.status_exame_inteiro_teor)}</td>
        <td>${riscoFinal ? chip(riscoFinal, "chip--amber") : '<span class="muted">—</span>'}</td>
        <td>${pendente ? '<span class="chip chip--amber">validação humana prioritária</span>' : '<span class="muted">—</span>'}</td>
        <td>${item.url_inteiro_teor ? `<a href="${escapeHtml(item.url_inteiro_teor)}" target="_blank" rel="noopener noreferrer">PDF</a>` : '<span class="muted">—</span>'}</td>
      </tr>
    `;
  }).join("");
}

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    state.integrated = buildIntegrated(state.data);
    state.filtered = [...state.integrated];
    initializeFilters();
    renderStaticSections(state.data);
    renderIntegratedTable();
    renderFederalFullTable(state.data);
    renderCamaraTable(state.data);
    renderInteiroTeorTable(state.data);
    renderGapsTable(state.data);
  } catch (error) {
    byId("loadError").hidden = false;
    console.error("Falha ao carregar dados derivados do dashboard:", error);
  }
}

document.addEventListener("DOMContentLoaded", init);
