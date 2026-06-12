import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(body: object) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw { status: 429, message: "Limite de requisições excedido. Tente novamente em alguns segundos." };
    if (status === 402) throw { status: 402, message: "Créditos insuficientes." };
    throw { status: 500, message: "Erro no gateway de IA" };
  }
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ===== JWT validation: only signed-in users can spend AI credits =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, mode, sources, type, question, interleaving, count, difficulty } = await req.json();

    const sourcesText = (sources || []).map((s: any) => `[${s.title}]: ${s.content}`).join("\n\n");

    if (type === "quiz") {
      const interleavingNote = interleaving
        ? "\nIMPORTANTE: Misture assuntos de DIFERENTES fontes nas questões (técnica Interleaving). Não agrupe perguntas por tema."
        : "";
      const qCount = Math.max(1, Math.min(30, Number(count) || 10));
      const diff = typeof difficulty === "string" ? difficulty : "Médio";
      const difficultyNote = {
        "Fácil": "Mantenha as questões em nível introdutório, com pegadinhas mínimas.",
        "Médio": "Equilibre questões diretas com aplicações práticas.",
        "Difícil": "Inclua questões com raciocínio multietapa e distratores fortes.",
        "Nível EsPCEx": "Use o estilo da prova da EsPCEx: questões objetivas, técnicas, com nível de dificuldade alto, redação formal e enunciados curtos.",
      }[diff] ?? "";

      const systemPrompt = `Você é um tutor especializado em gerar quizzes interativos.
Baseie-se ESTRITAMENTE nas seguintes fontes/anotações do aluno:

--- FONTES ---
${sourcesText}
--- FIM DAS FONTES ---
${interleavingNote}
Gere exatamente ${qCount} questões de múltipla escolha (A, B, C, D). Cada questão DEVE ter exatamente 4 alternativas.
Dificuldade alvo: ${diff}. ${difficultyNote}
Para cada alternativa incorreta, inclua uma breve explicação de por que está errada.
Para a alternativa correta, inclua uma explicação de por que está certa.

Responda APENAS com JSON válido neste formato exato, sem markdown ou texto extra:
{
  "questions": [
    {
      "question": "texto da pergunta",
      "options": [
        { "label": "A", "text": "texto da alternativa", "explanation": "explicação" },
        { "label": "B", "text": "texto da alternativa", "explanation": "explicação" },
        { "label": "C", "text": "texto da alternativa", "explanation": "explicação" },
        { "label": "D", "text": "texto da alternativa", "explanation": "explicação" }
      ],
      "correctIndex": 0
    }
  ]
}

Todas as perguntas em português do Brasil.`;

      const response = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere o quiz baseado nas minhas anotações." },
        ],
        stream: false,
      });
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        console.error("Raw AI quiz response (parse failure):", content);
        return new Response(JSON.stringify({ error: "Falha ao parsear quiz. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (type === "explain") {
      const systemPrompt = `Você é um tutor de estudos. Explique detalhadamente a questão abaixo, por que a resposta correta é a certa e por que as outras estão erradas. Use linguagem clara e didática.
${sourcesText ? `\nUse estas fontes como referência:\n${sourcesText}` : ""}
Responda em português do Brasil com formatação Markdown.`;

      const response = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question || "Explique esta questão." },
        ],
        stream: true,
      });
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    if (type === "feynman") {
      const systemPrompt = `Você é um avaliador especializado na Técnica Feynman. O aluno vai explicar um conceito com suas próprias palavras.

Sua tarefa:
1. Avalie a CLAREZA da explicação (nota de 1 a 10)
2. Identifique LACUNAS de conhecimento (conceitos que faltaram ou foram mal explicados)
3. Sugira como MELHORAR a explicação
4. Se disponível, compare com as fontes do aluno

${sourcesText ? `--- FONTES DO ALUNO ---\n${sourcesText}\n--- FIM ---` : ""}

Responda em português do Brasil com Markdown. Use emojis para tornar a avaliação mais visual.
Formato:
## 📊 Nota de Clareza: X/10
## ✅ Pontos Fortes
## ⚠️ Lacunas Identificadas
## 💡 Sugestões de Melhoria`;

      const response = await callAI({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question || "Avalie minha explicação." },
        ],
        stream: true,
      });
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Chat mode
    let systemPrompt: string;
    if (mode === "sources_only") {
      systemPrompt = `Você é um tutor de estudos. Responda APENAS com base nas fontes/anotações fornecidas abaixo. Se a pergunta não puder ser respondida com as fontes, diga educadamente que não há informação suficiente nas anotações.

--- FONTES ---
${sourcesText}
--- FIM DAS FONTES ---

Responda sempre em português do Brasil com formatação Markdown.`;
    } else {
      systemPrompt = `Você é um tutor de estudos generalista e amigável. Pode usar seu conhecimento geral para responder perguntas. Responda sempre em português do Brasil com formatação Markdown.`;
    }

    const response = await callAI({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    });

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e: any) {
    const status = e?.status || 500;
    const message = e?.message || (e instanceof Error ? e.message : "Erro desconhecido");
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
