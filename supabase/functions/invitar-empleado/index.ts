import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const LIMITES_POR_PLAN = {
  basico: 1,
  pro: 3,
  premium: 20,
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
const { email, negocioId, rol } = await req.json()
const { pregunta, datosNegocio } = await req.json()
    const authHeader = req.headers.get("Authorization")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    const supabaseCliente = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await supabaseCliente.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: miembro } = await supabaseAdmin
      .from("miembros_negocio")
      .select("rol")
      .eq("negocio_id", negocioId)
      .eq("user_id", user.id)
      .single()

    if (!miembro || miembro.rol !== "dueño") {
      return new Response(
        JSON.stringify({ error: "Solo el dueño puede invitar empleados" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { data: negocio } = await supabaseAdmin
      .from("negocios")
      .select("plan")
      .eq("id", negocioId)
      .single()

    const { count } = await supabaseAdmin
      .from("miembros_negocio")
      .select("*", { count: "exact", head: true })
      .eq("negocio_id", negocioId)

    const limite = LIMITES_POR_PLAN[negocio?.plan] || 1

    if (count >= limite) {
      return new Response(
        JSON.stringify({
          error: `Tu plan permite hasta ${limite} usuario(s). Hacé upgrade para agregar más.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { data: invitado, error: errorInvitacion } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (errorInvitacion) {
      return new Response(JSON.stringify({ error: errorInvitacion.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const rolFinal = ["vendedor", "encargado", "empleado"].includes(rol) ? rol : "empleado"

    const { error: errorMiembro } = await supabaseAdmin
      .from("miembros_negocio")
      .insert([
        { negocio_id: negocioId, user_id: invitado.user.id, rol: rolFinal },
      ])

    if (errorMiembro) {
      return new Response(JSON.stringify({ error: errorMiembro.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ exito: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})