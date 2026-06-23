import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Definición de herramientas disponibles para Claude ──────────────────────
const tools = [
  {
    name: "consultar_stock",
    description: "Consulta el stock actual de productos en una sucursal. Usá esta herramienta cuando el usuario pregunte por disponibilidad, stock, inventario o cuánto hay de algún producto.",
    input_schema: {
      type: "object",
      properties: {
        busqueda: {
          type: "string",
          description: "Nombre o parte del nombre del producto a buscar. Puede ser vacío para traer todos.",
        },
        sucursal_nombre: {
          type: "string",
          description: "Nombre de la sucursal. Si no se menciona, traer de todas.",
        },
        solo_stock_bajo: {
          type: "boolean",
          description: "Si es true, traer solo productos con stock bajo el mínimo.",
        },
      },
      required: [],
    },
  },
  {
    name: "transferir_stock",
    description: "Transfiere unidades de un producto de una sucursal a otra. Usá esta herramienta cuando el usuario pida mover, transferir o enviar stock entre sucursales.",
    input_schema: {
      type: "object",
      properties: {
        producto_nombre: {
          type: "string",
          description: "Nombre o parte del nombre del producto a transferir.",
        },
        sucursal_origen: {
          type: "string",
          description: "Nombre de la sucursal desde donde se transfiere.",
        },
        sucursal_destino: {
          type: "string",
          description: "Nombre de la sucursal hacia donde se transfiere.",
        },
        cantidad: {
          type: "number",
          description: "Cantidad de unidades a transferir.",
        },
        nota: {
          type: "string",
          description: "Nota opcional sobre la transferencia.",
        },
      },
      required: ["producto_nombre", "sucursal_origen", "sucursal_destino", "cantidad"],
    },
  },
  {
    name: "crear_presupuesto",
    description: "Crea un presupuesto para un cliente con los productos indicados. Usá esta herramienta cuando el usuario pida hacer, crear o armar un presupuesto.",
    input_schema: {
      type: "object",
      properties: {
        cliente_nombre: {
          type: "string",
          description: "Nombre o parte del nombre del cliente. Puede ser vacío para presupuesto sin cliente.",
        },
        items: {
          type: "array",
          description: "Lista de productos con sus cantidades.",
          items: {
            type: "object",
            properties: {
              producto_nombre: { type: "string" },
              cantidad: { type: "number" },
            },
            required: ["producto_nombre", "cantidad"],
          },
        },
        nota: {
          type: "string",
          description: "Nota opcional para el presupuesto.",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "listar_ventas",
    description: "Lista las ventas recientes del negocio. Usá cuando pregunten por ventas, facturación, cuánto se vendió o cuáles fueron las últimas ventas.",
    input_schema: {
      type: "object",
      properties: {
        dias: {
          type: "number",
          description: "Cantidad de días hacia atrás para traer ventas. Por defecto 7.",
        },
        sucursal_nombre: {
          type: "string",
          description: "Nombre de la sucursal. Si no se menciona, traer de todas.",
        },
      },
      required: [],
    },
  },
  {
    name: "listar_clientes",
    description: "Lista los clientes del negocio. Usá cuando pregunten por clientes, compradores o cuentas.",
    input_schema: {
      type: "object",
      properties: {
        busqueda: {
          type: "string",
          description: "Nombre o parte del nombre del cliente a buscar.",
        },
      },
      required: [],
    },
  },
]

// ── Ejecutores de herramientas ────────────────────────────────────────────────
async function ejecutarHerramienta(nombre: string, input: any, supabase: any, negocioId: string) {
  switch (nombre) {

    case "consultar_stock": {
      let query = supabase
        .from("stock_sucursal")
        .select("stock, stock_minimo, productos(nombre, precio), sucursales(nombre)")
        .eq("sucursales.negocio_id", negocioId)

      const { data: stockData } = await supabase
        .from("stock_sucursal")
        .select(`
          stock, stock_minimo,
          productos!inner(nombre, precio, negocio_id),
          sucursales!inner(nombre, negocio_id)
        `)
        .eq("productos.negocio_id", negocioId)

      if (!stockData || stockData.length === 0) {
        return { resultado: "No se encontraron productos en el inventario." }
      }

      let filtrado = stockData
      if (input.busqueda) {
        filtrado = filtrado.filter((s: any) =>
          s.productos?.nombre?.toLowerCase().includes(input.busqueda.toLowerCase())
        )
      }
      if (input.sucursal_nombre) {
        filtrado = filtrado.filter((s: any) =>
          s.sucursales?.nombre?.toLowerCase().includes(input.sucursal_nombre.toLowerCase())
        )
      }
      if (input.solo_stock_bajo) {
        filtrado = filtrado.filter((s: any) => s.stock <= s.stock_minimo)
      }

      if (filtrado.length === 0) {
        return { resultado: "No se encontraron productos con esos criterios." }
      }

      const resumen = filtrado.map((s: any) => ({
        producto: s.productos?.nombre,
        sucursal: s.sucursales?.nombre,
        stock: s.stock,
        stock_minimo: s.stock_minimo,
        estado: s.stock <= s.stock_minimo ? "⚠️ Stock bajo" : "✅ OK",
        precio: s.productos?.precio,
      }))

      return { resultado: resumen, total: filtrado.length }
    }

    case "transferir_stock": {
      // Buscar producto
      const { data: productos } = await supabase
        .from("productos")
        .select("id, nombre")
        .eq("negocio_id", negocioId)
        .ilike("nombre", `%${input.producto_nombre}%`)
        .limit(1)

      if (!productos || productos.length === 0) {
        return { error: `No encontré ningún producto que coincida con "${input.producto_nombre}".` }
      }
      const producto = productos[0]

      // Buscar sucursales
      const { data: sucursales } = await supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("negocio_id", negocioId)

      const origen = sucursales?.find((s: any) =>
        s.nombre.toLowerCase().includes(input.sucursal_origen.toLowerCase())
      )
      const destino = sucursales?.find((s: any) =>
        s.nombre.toLowerCase().includes(input.sucursal_destino.toLowerCase())
      )

      if (!origen) return { error: `No encontré la sucursal de origen "${input.sucursal_origen}".` }
      if (!destino) return { error: `No encontré la sucursal de destino "${input.sucursal_destino}".` }
      if (origen.id === destino.id) return { error: "La sucursal de origen y destino no pueden ser la misma." }

      // Verificar stock en origen
      const { data: stockOrigen } = await supabase
        .from("stock_sucursal")
        .select("stock, stock_minimo")
        .eq("producto_id", producto.id)
        .eq("sucursal_id", origen.id)
        .single()

      if (!stockOrigen || stockOrigen.stock < input.cantidad) {
        return { error: `No hay suficiente stock en ${origen.nombre}. Stock disponible: ${stockOrigen?.stock || 0} unidades.` }
      }

      // Ejecutar transferencia
      const nuevoStockOrigen = stockOrigen.stock - input.cantidad

      await supabase
        .from("stock_sucursal")
        .update({ stock: nuevoStockOrigen })
        .eq("producto_id", producto.id)
        .eq("sucursal_id", origen.id)

      const { data: stockDestino } = await supabase
        .from("stock_sucursal")
        .select("stock, stock_minimo")
        .eq("producto_id", producto.id)
        .eq("sucursal_id", destino.id)
        .single()

      const nuevoStockDestino = (stockDestino?.stock || 0) + input.cantidad

      await supabase
        .from("stock_sucursal")
        .upsert({
          producto_id: producto.id,
          sucursal_id: destino.id,
          stock: nuevoStockDestino,
          stock_minimo: stockDestino?.stock_minimo || 5,
        }, { onConflict: "producto_id,sucursal_id" })

      await supabase.from("transferencias_stock").insert([{
        negocio_id: negocioId,
        producto_id: producto.id,
        sucursal_origen_id: origen.id,
        sucursal_destino_id: destino.id,
        cantidad: input.cantidad,
        nota: input.nota || "Transferencia via Asistente IA",
      }])

      return {
        resultado: `Transferencia realizada correctamente.`,
        detalle: {
          producto: producto.nombre,
          cantidad: input.cantidad,
          desde: origen.nombre,
          hacia: destino.nombre,
          stock_origen_nuevo: nuevoStockOrigen,
          stock_destino_nuevo: nuevoStockDestino,
        }
      }
    }

    case "crear_presupuesto": {
      // Buscar cliente si se especificó
      let clienteId = null
      let clienteNombre = "Sin cliente"
      if (input.cliente_nombre) {
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, nombre")
          .eq("negocio_id", negocioId)
          .ilike("nombre", `%${input.cliente_nombre}%`)
          .limit(1)

        if (clientes && clientes.length > 0) {
          clienteId = clientes[0].id
          clienteNombre = clientes[0].nombre
        }
      }

      // Buscar sucursal activa (primera disponible)
      const { data: sucursales } = await supabase
        .from("sucursales")
        .select("id")
        .eq("negocio_id", negocioId)
        .limit(1)

      const sucursalId = sucursales?.[0]?.id

      // Buscar productos y armar items
      const itemsResueltos = []
      const errores = []

      for (const item of input.items) {
        const { data: productos } = await supabase
          .from("productos")
          .select("id, nombre, precio")
          .eq("negocio_id", negocioId)
          .ilike("nombre", `%${item.producto_nombre}%`)
          .limit(1)

        if (!productos || productos.length === 0) {
          errores.push(`No encontré "${item.producto_nombre}"`)
          continue
        }

        itemsResueltos.push({
          producto_id: productos[0].id,
          nombre_producto: productos[0].nombre,
          precio_unitario: productos[0].precio,
          cantidad: item.cantidad,
        })
      }

      if (itemsResueltos.length === 0) {
        return { error: `No pude encontrar ningún producto. ${errores.join(", ")}` }
      }

      const total = itemsResueltos.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)

      const { data: presupuesto, error: errorPres } = await supabase
        .from("presupuestos")
        .insert([{
          negocio_id: negocioId,
          cliente_id: clienteId,
          sucursal_id: sucursalId,
          total,
          nota: input.nota || "Presupuesto creado via Asistente IA",
          estado: "pendiente",
        }])
        .select()
        .single()

      if (errorPres) return { error: "Error al crear el presupuesto." }

      await supabase.from("presupuesto_items").insert(
        itemsResueltos.map((i) => ({ ...i, presupuesto_id: presupuesto.id }))
      )

      return {
        resultado: "Presupuesto creado correctamente.",
        detalle: {
          cliente: clienteNombre,
          items: itemsResueltos.map((i) => `${i.cantidad}x ${i.nombre_producto} = $${(i.cantidad * i.precio_unitario).toLocaleString("es-AR")}`),
          total: `$${total.toLocaleString("es-AR")}`,
          estado: "pendiente",
        },
        advertencias: errores.length > 0 ? errores : undefined,
      }
    }

    case "listar_ventas": {
      const dias = input.dias || 7
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)
      desde.setHours(0, 0, 0, 0)

      let query = supabase
        .from("ventas")
        .select("total, created_at, clientes(nombre), sucursales(nombre), venta_items(cantidad, productos(nombre))")
        .eq("negocio_id", negocioId)
        .gte("created_at", desde.toISOString())
        .order("created_at", { ascending: false })
        .limit(20)

      const { data: ventas } = await query

      if (!ventas || ventas.length === 0) {
        return { resultado: `No hay ventas en los últimos ${dias} días.` }
      }

      const totalFacturado = ventas.reduce((acc, v) => acc + Number(v.total), 0)

      return {
        resultado: ventas.map((v) => ({
          fecha: new Date(v.created_at).toLocaleDateString("es-AR"),
          cliente: v.clientes?.nombre || "Consumidor final",
          sucursal: v.sucursales?.nombre,
          total: `$${Number(v.total).toLocaleString("es-AR")}`,
          productos: v.venta_items?.map((i: any) => `${i.cantidad}x ${i.productos?.nombre}`).join(", "),
        })),
        resumen: {
          total_ventas: ventas.length,
          total_facturado: `$${totalFacturado.toLocaleString("es-AR")}`,
          ticket_promedio: `$${Math.round(totalFacturado / ventas.length).toLocaleString("es-AR")}`,
        }
      }
    }

    case "listar_clientes": {
      let query = supabase
        .from("clientes")
        .select("nombre, telefono, email")
        .eq("negocio_id", negocioId)
        .order("nombre")
        .limit(20)

      if (input.busqueda) {
        query = query.ilike("nombre", `%${input.busqueda}%`)
      }

      const { data: clientes } = await query

      if (!clientes || clientes.length === 0) {
        return { resultado: "No se encontraron clientes." }
      }

      return { resultado: clientes, total: clientes.length }
    }

    default:
      return { error: `Herramienta "${nombre}" no reconocida.` }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { pregunta, datosNegocio, negocioId, historial } = await req.json()

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key de Claude no configurada." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Cliente de Supabase con permisos de servicio para ejecutar acciones
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const systemPrompt = `Sos un asistente de negocios inteligente integrado en Workpilot, un sistema de gestión comercial para comercios argentinos.
Podés tanto responder preguntas como ejecutar acciones reales en el sistema (transferir stock, crear presupuestos, etc.).
Respondé en español de Argentina, de forma breve y directa, como si le hablaras a un dueño de ferretería o pinturería.
Cuando ejecutes una acción, confirmala claramente indicando qué hiciste.
Cuando no puedas hacer algo, explicá por qué y sugería alternativas.

Datos actuales del negocio:
${JSON.stringify(datosNegocio, null, 2)}`

    // Construir historial de mensajes
    const mensajes = historial || []
    mensajes.push({ role: "user", content: pregunta })

    // Primera llamada a Claude con herramientas
    let response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: mensajes,
      }),
    })

    let data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Error al consultar la IA" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Bucle de tool use — Claude puede pedir ejecutar varias herramientas
    let acciones: any[] = []

    while (data.stop_reason === "tool_use") {
      const toolUses = data.content.filter((b: any) => b.type === "tool_use")

      // Agregar respuesta de Claude al historial
      mensajes.push({ role: "assistant", content: data.content })

      // Ejecutar todas las herramientas solicitadas
      const toolResults = []
      for (const toolUse of toolUses) {
        const resultado = await ejecutarHerramienta(toolUse.name, toolUse.input, supabase, negocioId)
        acciones.push({ herramienta: toolUse.name, input: toolUse.input, resultado })
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(resultado),
        })
      }

      mensajes.push({ role: "user", content: toolResults })

      // Segunda llamada con los resultados de las herramientas
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          tools,
          messages: mensajes,
        }),
      })

      data = await response.json()
    }

    const respuestaTexto = data.content?.find((b: any) => b.type === "text")?.text
      || "No se pudo generar una respuesta."

    return new Response(
      JSON.stringify({
        respuesta: respuestaTexto,
        acciones: acciones.length > 0 ? acciones : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})