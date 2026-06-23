# Base Integrada de Mapeamento e Análise — TRC Baixo Carbono

Dashboard estático de mapeamento da transição energética no transporte rodoviário de
cargas (TRC) e infraestrutura associada no Brasil. Integra a base normativa federal
mapeada (92 registros) com o radar legislativo da Câmara dos Deputados (443 proposições
2022–2026).

## Como abrir

O dashboard carrega um arquivo JSON derivado e **não abre** pelo protocolo `file://`
devido à política de segurança CORS dos navegadores. Use um servidor HTTP local:

```bash
python3 -m http.server 8000
```

Depois abra no navegador:

```
http://localhost:8000/index.html
```

## Como funciona em GitHub Pages

Todos os arquivos são estáticos (HTML, CSS, JS, JSON). Após publicação em GitHub Pages:

- O site carrega por HTTPS
- Não depende da máquina da pesquisadora ligada ou logada
- Não há backend, banco de dados ou API
- O JSON derivado é carregado por fetch relativo, sem necessidade de servidor próprio

## Limites metodológicos

- O dashboard **não certifica vigência**, redação consolidada, revogação ou
  suficiência regulatória.
- **Proposições legislativas não são direito vigente** — a tramitação atual das
  proposições não foi verificada.
- Classificações assistidas permanecem pendentes de validação humana conforme
  indicado nas tabelas.
- A geolocalização é federativa/institucional (esfera União, órgão, fonte e eixo
  regulatório). Não há coordenadas estaduais ou municipais.

## Fontes

- URLs oficiais disponíveis são exibidas por registro (Planalto, Câmara dos
  Deputados, DOU, ANTT, ANP, MME, MMA, etc.).
- Hashes SHA-256 indicam apenas a integridade dos artefatos derivados usados pelo
  dashboard. Não substituem as fontes oficiais.
- Registros sem URL oficial individual são preservados como mapeados, com a fonte
  institucional indicada.

## Conteúdo do pacote

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Ponto de entrada do dashboard |
| `assets/app.js` | Lógica de filtros, tabelas, gráficos, paginação e exportação CSV |
| `assets/styles.css` | Apresentação responsiva |
| `data/base_integrada_trc_baixo_carbono.json` | Artefato derivado (bundle público) |
| `README.md` | Este arquivo |
| `.nojekyll` | Sinaliza ao GitHub Pages que o diretório não usa Jekyll |

## O que não está neste pacote

Este pacote público contém **apenas** os arquivos mínimos para o dashboard estático.
Não estão incluídos:

- Bases internas do projeto (`data/raw/`, `data/processed/`, `data/manifests/`)
- Scripts de coleta e processamento (`scripts/`)
- Relatórios metodológicos e analíticos (`reports/`)
- Minutas de registros
- Arquivos legados (MackMonitor)
- Caches, ambientes virtuais ou zips

## Testes

O repositório de desenvolvimento possui testes automatizados. Para executá-los:

```bash
python3 -m unittest dashboard/tests/test_dashboard_static.py -v
node --check assets/app.js
```

## Licença / Uso

Dados provenientes de fontes oficiais (Câmara dos Deputados, Planalto, DOU, ANTT,
ANP e demais órgãos federais). Consulte as bases originais para verificação
independente. Este dashboard não substitui as fontes oficiais.
