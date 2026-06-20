import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { pregunta, datosNegocio } = await req.json()

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Todavía no está configurada la API key de Claude. Esta función va a funcionar apenas se cargue.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const systemPrompt = `Sos un asistente de negocios que ayuda al dueño de un comercio a entender los datos de su negocio.
Respondé en español de Argentina, de forma breve, clara y directa, como si le hablaras a un dueño de ferretería o pinturería sin conocimientos técnicos.
Usá los datos reales que te paso para responder, no inventes información.

Datos actuales del negocio:
${JSON.stringify(datosNegocio, null, 2)}`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: pregunta }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Error al consultar la IA" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const respuestaTexto = data.content?.[0]?.text || "No se pudo generar una respuesta."

    return new Response(JSON.stringify({ respuesta: respuestaTexto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})