# Videco Platform

🎥 **AI Personalized Video Generation Platform for Cold Outreach**

Videco is an open-source AI-powered video generation platform designed for creating personalized videos for cold outreach campaigns. This project enables anyone to build and deploy their own video personalization solution.

🌐 **Website:** [videco.io](https://videco.io)

👨‍💻 **Developed by:** [Malith](https://x.com/malith_dev)

⚡ **Powered by:** [ZapDigits](https://zapdigits.com/) - Part of ZapDigits Web3 projects

---

## 🚀 Getting Started

This project is based on Next.js SSG. Please use Yarn for package management.



## ⚙️ Environment Setup

Before running the project, copy the environment variables template and configure your settings:

```bash
cp env.example .env.local
```

Fill in your actual API keys and configuration values in `.env.local`. See the `env.example` file for all required environment variables.

## 📦 Available Scripts

### 🔧 Running the development server

```bash
yarn dev
```

### 🏗️ Building for production

```bash
yarn build
```

### 🚀 Running the production server

```bash
yarn start
```

## 🎯 Features

- **AI-Powered Video Generation**: Create personalized videos using advanced AI technology
- **Cold Outreach Optimization**: Specifically designed for sales and marketing outreach campaigns
- **Customizable Templates**: Multiple video templates and personalization options
- **Analytics Dashboard**: Track video performance and engagement metrics
- **Integration Ready**: Connect with popular CRM and marketing tools
- **Open Source**: Free to use, modify, and distribute

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, Chakra UI
- **Backend**: Next.js API Routes (served via Netlify), Supabase (Auth, DB, Realtime, Edge Functions, Storage)
- **AI Services (2026)**: Muapi.ai (image/video/lipsync), OpenAI (Responses, Realtime, LLM scripting & TTS)
- **Legacy (transitional)**: Sync.so, Cloudinary, Speechify, Inngest
- **Hosting**: Netlify (replacing Vercel)
- **Payment**: Stripe
- **Analytics**: PostHog, Usetiful
- **State Management**: Zustand
- **Internationalization**: next-i18next

## 📚 Learn More

### **Chakra UI**

Chakra UI is a simple, modular and accessible component library that gives you the building blocks you need to build your React applications.

[Go To Documentation](https://chakra-ui.com/docs/getting-started)


### **Zustand**

A small, fast and scalable bearbones state-management solution using simplified flux principles.

[Go To Documentation](https://github.com/pmndrs/zustand)


### **next-i18next**

next-i18next is a plugin for Next.js projects that allows you to get translations up and running quickly and easily, while fully supporting SSR, multiple namespaces with codesplitting, etc.

[Go To Documentation](https://github.com/isaachinman/next-i18next)


### **ESLint**

A pluggable and configurable linter tool for identifying and reporting on patterns in JavaScript. Maintain your code quality with ease.

[Go To Documentation](https://eslint.org/docs/user-guide/getting-started)


### **Prettier**

An opinionated code formatter; Supports many languages; Integrates with most editors.

[Go To Documentation](https://prettier.io/docs/en/index.html)


### **lint-staged**

 The concept of lint-staged is to run configured linter (or other) tasks on files that are staged in git.

[Go To Documentation](https://github.com/okonet/lint-staged)


### **Testing Library**

The React Testing Library is a very light-weight solution for testing React components. It provides light utility functions on top of react-dom and react-dom/test-utils.

[Go To Documentation](https://testing-library.com/docs/)


### **Github Actions**

GitHub Actions makes it easy to automate all your software workflows, now with world-class CI/CD. Build, test, and deploy your code right from GitHub.

[Go To Documentation](https://docs.github.com/en/actions)


## 🧩 How this fork is built

Upstream Videco ran on Vercel with Inngest, Speechify, Sync.so, Cloudinary and
Stripe. This fork runs on **Netlify + Supabase + Muapi + OpenAI** and keeps the
upstream product features:

| Feature | Where it lives |
|---|---|
| Voice cloning ("record your intro") | `api` Edge Function `videos/preview`, using Speechify |
| Personalized campaign videos | `videos/process`: cloned-voice name card + website-scroll background, composed with Cloudinary |
| AI clone (lip-sync) | `videos/clone`: Muapi `sync-lipsync` in the cloned voice |
| Job status | `jobs?id=&action=poll`, driven by `pollUntilDone` in `src/services` |
| Billing | `pages/api/stripe/{checkout,portal,webhooks}.ts` |

The browser calls everything through `src/services` (`callMuapi`), which targets
`<SUPABASE_URL>/functions/v1/api/...`.

## 🚀 Setup and deployment

1. **Environment.** Copy `env.example` to `.env.local` and fill it in. Set the same
   values in Netlify. Edge Function keys go in Supabase secrets, as listed at the
   bottom of `env.example`.
2. **Database.** Apply `supabase/migrations/20261116_videco_pipeline_columns.sql`
   and `20261117_videco_public_player.sql`. The second adds the public-player
   RPCs that anonymous viewers need. Videco shares its Supabase project with other apps. Apply only
   Videco's migration files, one at a time, through the SQL editor or
   `apply_migration`. **Do not run `supabase db push`** against a shared project.
   Never add triggers on `auth.users`; Videco creates tenants per user, on demand.
3. **Edge Functions.** Deploy `api`, plus the retired stubs that replace the
   old, unsafe functions:
   ```bash
   supabase functions deploy api videos jobs images leads auth ai-orchestrator --project-ref <ref>
   ```
4. **Stripe.** Create the Prices, put their ids in `NEXT_PUBLIC_PLAN_*`, and add a
   webhook endpoint at `https://<site>/api/stripe/webhooks`.
5. **Run locally** with `yarn dev` and test with `yarn test`; `yarn build` must pass
   before Netlify will deploy.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [videco.io](https://videco.io)
- **Developer**: [Malith on X](https://x.com/malith_dev)
- **Powered by**: [ZapDigits](https://zapdigits.com/)
- **Telegram Community**: [Join ZapDigits ($ZD) Group](https://t.me/+xeLiHJPIYdMxZjQ0)
- **Contract Address**: `6vvfNVTdwN6pYHcKERLbnPZaEHEHJakRCvPmXaJnory`

---

**Made with ❤️ as part of ZapDigits Web3 projects**
