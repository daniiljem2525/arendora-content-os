import { prisma } from "@/lib/db";
import { integrationsStatus, INTEGRATION_SPECS } from "@/lib/integrations";
import { getAppSetting } from "@/lib/app-settings";
import { Section } from "@/components/ui";
import { BrandRuleEditor } from "./BrandRuleEditor";
import { IntegrationCredentialsForm } from "./IntegrationCredentialsForm";
import { AutoPublishToggle } from "./AutoPublishToggle";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [rules, knowledge, integrations, autoPublish] = await Promise.all([
    prisma.brandRule.findMany({ orderBy: { key: "asc" } }),
    prisma.productKnowledge.findMany({ orderBy: { createdAt: "asc" } }),
    integrationsStatus(),
    getAppSetting("auto_publish"),
  ]);

  return (
    <div className="space-y-8">
      <Section title="Автопубликация">
        <p className="text-sm text-slate-500">
          Когда включено, приложение каждую минуту проверяет расписание и автоматически публикует одобренный контент,
          время которого наступило. Настройте дату и время на странице «Content Calendar».
          Без настроенных API-ключей платформы публикации остаются в режиме MOCK (никогда не выдаются за реальные).
        </p>
        <AutoPublishToggle enabled={autoPublish === "true"} />
      </Section>

      <Section title="Учётные данные интеграций">
        <p className="text-sm text-slate-500">
          Данные хранятся в базе зашифрованными (AES-256-GCM) и никогда не показываются обратно.
          Приоритет: значения из формы перекрывают переменные из .env.
          Важно: соцсети принимают <strong>API-токены</strong>, а не логин/пароль - поля логина и пароля служат только
          справочной записью для вас.{" "}
          <a className="font-medium text-brand-600 hover:underline" href="/api/v1/guide" target="_blank" rel="noreferrer">
            📖 Пошаговая инструкция: как получить все ключи
          </a>
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.values(INTEGRATION_SPECS).map((spec) => {
            const status = integrations.find((i) => i.key === spec.key);
            return (
              <IntegrationCredentialsForm
                key={spec.key}
                spec={{ key: spec.key, name: spec.name, description: spec.description, fields: spec.fields, docsUrl: spec.docsUrl }}
                live={status?.live ?? false}
                setFields={status?.setFields ?? []}
                source={status?.source ?? "none"}
              />
            );
          })}
        </div>
      </Section>

      <Section title="База знаний бренда">
        <p className="text-sm text-slate-500">
          Центральные знания Arendora: каждый агент читает эти правила перед генерацией. Критическое правило - никогда
          не выдумывать фичи, цены, клиентов и статистику - проверяется brand guard и QA-агентом.
        </p>
        <div className="space-y-3">
          {rules.map((r) => (
            <BrandRuleEditor key={r.key} ruleKey={r.key} value={r.value} category={r.category} />
          ))}
        </div>
      </Section>

      <Section title="Знания о продукте">
        <table className="table-base card">
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Факт</th>
              <th>Проверено</th>
            </tr>
          </thead>
          <tbody>
            {knowledge.map((k) => (
              <tr key={k.id}>
                <td className="font-medium">{k.title}</td>
                <td>{k.category}</td>
                <td className="max-w-96 text-slate-600">{k.body}</td>
                <td>{k.verified ? <span className="text-emerald-600">verified</span> : <span className="text-slate-400">unknown</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
