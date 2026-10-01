# Telepresença — guia para agentes

## UI do operador (`public/`)

O operador está em chamada ao vivo; a interface deve ser **silenciosa e autoexplicativa**.

### Texto explicativo: só no hover, nunca “grudado” na tela

- **Proibido** no HUD da chamada: parágrafos, legendas ou hints **sempre visíveis** que ensinem o controle (texto sob joystick, sob slider, bloco de ajuda no drawer).
- **Permitido e preferido** para detalhes: tooltip HUD (`initTooltips` em `.ctrl` e `.quick-dock-btn`) via `aria-label`, ou `title` nativo em controles **fora** desse seletor — nunca os dois ao mesmo tempo.
- **Permitido** na superfície: rótulos curtos de seção, valores (`75%`, `8`), ícones e estados (mutar/desmutar).
- Erros e convites (`invite`) podem ter copy funcional; o HUD durante a chamada não.

### Padrões já adotados

- Drawer do robô: seções planas no painel de vidro, sem cards cinzas aninhados.
- Velocidade: título + badge + três modos (`Devagar` / `Normal` / `Rápida` → fatores 0.35 / 0.75 / 1.0); sem tooltips nos botões (rótulo visível).
- Volume: cabeçalho título + badge (sem ícone — o mute já usa alto-falante) + slider; sem presets 50%/100%.

### Drawer “Controles do robô” (contrato anti-drift)

Novas seções de controle **devem** usar `public/js/ui/robot-drawer-section.js` (`createDrawerSectionHead`, `createDrawerSectionInner`).

| Elemento | Classe | Anti-padrão (não fazer) |
| --- | --- | --- |
| Cabeçalho | `robot-drawer-section-head` + título + badge; ícone se não houver outro na linha de controles | `robot-drawer-card-*`, ícone duplicado (ex. volume + mute) |
| Controles | filho direto do inner, sem caixa cinza extra | `segmented` com fundo/borda de “card” |
| Divisores | só via `robot-drawer-body` + seção seguinte (CSS global) | `border-top` / `hr` dentro da feature |
| Tooltips | só onde o rótulo visível não basta | `title` duplicando o texto do botão |

Ritmo vertical: `gap` no `.robot-drawer-body` + `padding-top` na seção irmã; não colar linha divisória no último controle.

Ao revisar PRs, rejeite diff que torne microcopy **visível por padrão** no HUD; tooltips/`title` estão ok.
