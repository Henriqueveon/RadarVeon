# RADAR VEON — Deploy na Vercel

Guia passo a passo para colocar a plataforma em produção.

## Pré-requisitos
- [x] Schema v2 aplicado no Supabase (`supabase/migration_v2_auth.sql`)
- [ ] Patch de segurança v3 aplicado (`supabase/migration_v3_security.sql`)
- [ ] Conta no GitHub
- [ ] Conta na Vercel (gratuita — pode usar login com GitHub)

---

## Passo 1 — Aplicar patch de segurança no Supabase

Antes de subir, **rode este SQL no [SQL Editor do Supabase](https://supabase.com/dashboard/project/dvosmxavctlxsevfhwjo/sql/new)**:

Abra o arquivo `supabase/migration_v3_security.sql`, copie o conteúdo e rode. Ele:
- Impede que qualquer usuário se auto-promova a Almirante
- Impede que aprovado fique como `true` por conta própria
- Força novos cadastros a começarem como `cabo`/`tenente`/`capitao` (não `almirante`)

## Passo 2 — Configurar URL de produção no Supabase

No painel do Supabase: **Authentication → URL Configuration**

Adicione a URL da Vercel que você vai receber (ex: `https://radar-veon.vercel.app`) nos campos:
- **Site URL**
- **Redirect URLs** (adicione a mesma URL)

## Passo 3 — Criar repositório no GitHub

```bash
cd "c:/Users/ninob/OneDrive/Desktop/Gestão de Tripulantes/radar-veon"
git init
git add .
git commit -m "Initial commit - RADAR VEON"
```

Crie um repositório novo no GitHub (privado) e siga as instruções:

```bash
git remote add origin https://github.com/SEU_USUARIO/radar-veon.git
git branch -M main
git push -u origin main
```

## Passo 4 — Deploy na Vercel

1. Acesse https://vercel.com/new
2. Importe o repositório `radar-veon`
3. Na tela de configuração:
   - **Framework Preset**: Vite (deve detectar sozinho)
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `dist`
4. **Environment Variables** — clique "Add":
   - `VITE_SUPABASE_URL` = `https://dvosmxavctlxsevfhwjo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_Xskij75mMaIzqHmB63399Q_WRc_O8fD`
5. Clique **Deploy**

Em 2-3 minutos o site está no ar.

## Passo 5 — Atualizar Site URL no Supabase

Depois que a Vercel gerar o domínio (ex: `https://radar-veon-xyz.vercel.app`):
1. Volte em **Supabase → Authentication → URL Configuration**
2. Atualize **Site URL** para o domínio da Vercel
3. Adicione também em **Redirect URLs**

Isso garante que os emails de signup/reset de senha funcionem.

## Passo 6 — Testar fluxo completo

1. Acesse o domínio da Vercel
2. Clique "Primeira vez? Solicitar acesso"
3. Cadastre um usuário de teste (cargo Cabo ou Tenente)
4. Entre com sua conta Almirante (`ninobr112@gmail.com`)
5. Verifique se o sino mostra a solicitação
6. Aprove o usuário
7. Deslogue, entre com o usuário aprovado, confirme que vê o dashboard

## Passo 7 — Convidar sua equipe

Envie o link da Vercel para:
- Matheus, Rafael, Breno, etc.
- Eles se cadastram, você recebe notificação, aprova.

---

## Rollback

Se algo der errado:
- Na Vercel: **Deployments** → escolha um deploy anterior → **Promote to Production**
- Todo deploy é imutável; rollback é instantâneo.

## Monitoramento

- **Vercel Analytics**: já incluso no plano grátis
- **Supabase Logs**: painel Supabase → Logs → Postgres / Auth
- **Erros client-side**: abra o DevTools (F12) no browser

---

## Suporte

- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
