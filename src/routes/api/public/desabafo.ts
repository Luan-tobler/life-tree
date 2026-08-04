import { createFileRoute } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Você é o "Raiz", um acompanhante gentil dentro de um app de bem-estar que ajuda a reduzir cortisol (estresse).
Regras:
- Fale em português do Brasil, em tom calmo, humano e curto (no máximo 4 frases).
- Primeiro acolha o que a pessoa sente, sem julgar e sem clichês vazios.
- Faça no máximo uma pergunta aberta por resposta para a pessoa continuar falando.
- Quando fizer sentido, sugira UM passo pequeno e concreto (respirar 5 min, caminhar, beber água, dormir mais cedo, falar com alguém).
- Nunca dê diagnóstico nem receite remédios. Você não substitui profissional de saúde.
- Se houver qualquer sinal de risco de vida ou automutilação, acolha e oriente a ligar 188 (CVV, 24h, gratuito) ou procurar emergência agora.
- Não use listas longas nem markdown pesado; escreva como uma conversa.`;

export const Route = createFileRoute("/api/public/desabafo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response(JSON.stringify({ error: "missing_key" }), { status: 500 });

        let body: { messages?: Msg[]; mood?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "bad_json" }), { status: 400 });
        }

        const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
        if (!messages.length) {
          return new Response(JSON.stringify({ error: "no_messages" }), { status: 400 });
        }

        const input = [
          { role: "system" as const, content: SYSTEM },
          ...(body.mood ? [{ role: "system" as const, content: `A pessoa marcou o humor: ${body.mood}.` }] : []),
          ...messages.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: String(m.content ?? "").slice(0, 4000),
          })),
        ];

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            input,
            stream: true,
            store: false,
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          const status = res.status === 429 || res.status === 402 ? res.status : 502;
          return new Response(JSON.stringify({ error: "gateway", status: res.status, detail: detail.slice(0, 500) }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as { type?: string; delta?: string };
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
                text += evt.delta;
              }
            } catch {
              /* ignore partial frames */
            }
          }
        }

        return new Response(JSON.stringify({ text: text.trim() }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
