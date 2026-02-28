# Agenda Visual de Profissionais - TODO

## Database & Backend
- [x] Schema: tabela professionals
- [x] Schema: tabela activity_blocks
- [x] Schema: tabela activity_types (cores fixas por tipo)
- [x] Schema: índices por data e professional_id
- [x] tRPC router: professionals (CRUD)
- [x] tRPC router: activity_blocks (CRUD, por data)
- [x] tRPC router: reports (horas normais/extras por profissional e por período)
- [x] Cálculo automático de horas normais e horas extras (faixas 07-10h e 19-23h)
- [x] Seed: 13 profissionais padrão

## Frontend - Agenda Principal
- [x] Layout com header de navegação
- [x] Tela de agenda diária com 13 colunas
- [x] Eixo de tempo vertical 07:00–23:00 com intervalos de 30 minutos
- [x] Blocos de atividade coloridos por tipo
- [x] Drag vertical com snap de 30 minutos
- [x] Redimensionamento vertical com snap de 30 minutos
- [x] Tooltip ao passar mouse sobre bloco
- [x] Navegação de datas (anterior/próximo/hoje)
- [x] Seletor de data no topo
- [x] Resumo diário de horas por profissional

## Frontend - Modal de Blocos
- [x] Modal de criação de bloco (clique na coluna)
- [x] Modal de edição de bloco (clique no bloco)
- [x] Campos: profissional, horário início/fim, tipo de atividade, descrição
- [x] Validação de sobreposição de blocos
- [x] Confirmação de exclusão

## Frontend - Autenticação e Perfis
- [x] Login com OAuth Manus
- [x] Perfil Admin: criar/editar/excluir blocos e gerenciar profissionais
- [x] Perfil Viewer: somente visualização
- [x] Proteção de rotas por perfil

## Frontend - Gestão de Profissionais (Admin)
- [x] Página de gerenciamento de profissionais
- [x] Adicionar, editar e remover profissionais
- [x] Ordenação das colunas (1–13)

## Frontend - Relatórios (Admin)
- [x] Módulo de relatórios mensais
- [x] Filtros por profissional e período
- [x] Totais de horas normais e extras
- [x] Exportação Excel (.xlsx)
- [x] Exportação PDF

## UX & Qualidade
- [x] Interface elegante com tema escuro
- [x] Responsivo para desktop
- [x] Performance fluida com muitos registros
- [x] Testes vitest para routers principais (11 testes passando)

## Melhorias - Campos Obrigatórios e Horas Extras Visuais
- [x] Schema: tabela requesters (solicitantes gerenciáveis)
- [x] Schema: adicionar campos job_number, job_name, requester_id ao activity_blocks
- [x] tRPC router: requesters (CRUD - listar, criar, excluir)
- [x] Seed: solicitantes padrão (Bruno, Anna, Gabi, Lucas, Mirian, Allan, Phill)
- [x] Modal: campos Número do Job, Nome do Job e Solicitante obrigatórios
- [x] Modal: select de solicitantes com opção de adicionar novo
- [x] Visual: fundo hachurado vermelho nas faixas de hora extra (07-10h e 19-23h) na agenda
- [x] Visual: blocos que cruzam hora extra mostram overlay hachurado vermelho na parte excedente
- [x] Tooltip: exibir número do job, nome do job e solicitante

## Melhorias - Separação Visual e Redesign Apple
- [x] Schema: campo group_id ou is_secondary no professionals para marcar os dois últimos
- [x] Agenda: separador visual (linha + label) entre grupo principal e grupo secundário
- [x] Redesign: tipografia SF Pro / Inter, espaçamento generoso, bordas suaves
- [x] Redesign: glassmorphism no header e barra de datas
- [x] Redesign: paleta de cores monocromática refinada (cinza frio + azul Apple)
- [x] Redesign: blocos com visual mais clean, sem bordas pesadas
- [x] Redesign: botões e inputs com estilo Apple (rounded, shadow sutil)

## Fix - Separador Físico entre Grupos
- [x] Agenda: espaço físico real (gap) entre grupo principal e grupo secundário no header e no corpo da grade

## Fix - Solicitante no Bloco e Tooltip
- [x] AgendaBlock: exibir nome do solicitante no corpo do bloco (quando houver espaço)
- [x] AgendaBlock: exibir nome do solicitante em destaque no tooltip

## Melhoria - Responsividade da Agenda
- [x] Colunas com largura dinâmica (flex) para caber todas na tela sem scroll horizontal
- [x] Largura mínima por coluna (72px) para manter textos legíveis
- [x] Separador "Outra Frente" também responsivo
- [x] Textos dos blocos se adaptam à largura disponível
