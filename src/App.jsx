import { useState, useMemo, useEffect } from "react"
import {
  Clock,
  Sun,
  Utensils,
  Briefcase,
  LogOut,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Save,
  Trash2,
  Plus,
  Heart,
  FileText,
  Sparkles,
  Pencil,
  Bell,
  Crown,
} from "lucide-react"

export default function CalculadoraPonto() {
  const getHojeFormatado = () => {
    const data = new Date()
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, "0")
    const dia = String(data.getDate()).padStart(2, "0")
    return `${ano}-${mes}-${dia}`
  }

  const [dataRegistro, setDataRegistro] = useState(getHojeFormatado())
  const [targetType, setTargetType] = useState("9")
  const [customHours, setCustomHours] = useState("08:48")

  // Pede permissão para notificações nativas assim que o app carrega
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  const handleMudancaData = (novaData) => {
    setDataRegistro(novaData)
    if (novaData) {
      const [ano, mes, dia] = novaData.split("-").map(Number)
      const dataObj = new Date(ano, mes - 1, dia)
      const diaSemana = dataObj.getDay()

      if (diaSemana === 5) {
        setTargetType("8")
      } else if (diaSemana >= 1 && diaSemana <= 4) {
        setTargetType("9")
      }
    }
  }

  const [batidas, setBatidas] = useState(["", "", "", ""])
  const [justificativa, setJustificativa] = useState("")
  const [toast, setToast] = useState({ show: false, message: "" })

  const [historico, setHistorico] = useState(() => {
    const dadosSalvos = localStorage.getItem("historicoPonto")
    return dadosSalvos ? JSON.parse(dadosSalvos) : {}
  })

  const dispararNotificacaoNativa = (titulo, corpo) => {
    // Exibe o Toast interno na tela
    setToast({ show: true, message: corpo })
    setTimeout(() => {
      setToast({ show: false, message: "" })
    }, 5000)

    // Dispara o Popup Nativo do Sistema/Celular se permitido
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(titulo, {
          body: corpo,
          icon: "/icone-ponto.png",
          badge: "/icone-ponto.png",
          vibrate: [200, 100, 200],
        })
      } catch (e) {
        console.log("Notificação nativa bloqueada ou erro:", e)
      }
    }
  }

  const timeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(":")) return null
    const [h, m] = timeStr.split(":").map(Number)
    return isNaN(h) || isNaN(m) ? null : h * 60 + m
  }

  const formatMinutesHuman = (minutes) => {
    if (
      minutes === null ||
      isNaN(minutes) ||
      minutes === undefined ||
      minutes < 0
    )
      return "0h 00min"
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${h}h ${String(m).padStart(2, "0")}min`
  }

  const formatarMinutosParaHora = (totalMinutos) => {
    const horas = Math.floor(totalMinutos / 60)
    const minutos = Math.floor(totalMinutos % 60)
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`
  }

  const targetMinutes = useMemo(() => {
    if (targetType === "9") return 9 * 60
    if (targetType === "8") return 8 * 60
    const custom = timeToMinutes(customHours)
    return custom !== null && custom > 0 ? custom : 8 * 60
  }, [targetType, customHours])

  let sugestaoSaida = null
  let minutosTrabalhados = 0
  let ultimaEntrada = 0
  let aguardandoSaida = false

  for (let i = 0; i < batidas.length; i += 2) {
    const entrada = timeToMinutes(batidas[i])
    const saida = timeToMinutes(batidas[i + 1])

    if (entrada !== null && saida !== null) {
      minutosTrabalhados += saida - entrada
    } else if (entrada !== null && saida === null) {
      ultimaEntrada = entrada
      aguardandoSaida = true
    }
  }

  const minutosRestantes = Math.max(0, targetMinutes - minutosTrabalhados)
  const progressPercent = Math.min(
    100,
    Math.round((minutosTrabalhados / targetMinutes) * 100),
  )

  const minutosManha =
    batidas[0] && batidas[1]
      ? timeToMinutes(batidas[1]) - timeToMinutes(batidas[0])
      : 0
  const minutosAlmoco =
    batidas[1] && batidas[2]
      ? timeToMinutes(batidas[2]) - timeToMinutes(batidas[1])
      : 0

  if (aguardandoSaida && minutosRestantes > 0) {
    const horaSaidaReal = ultimaEntrada + minutosRestantes
    sugestaoSaida = formatarMinutosParaHora(horaSaidaReal)
  }

  // --- MONITORES DE ALERTA NATIVO (Popup) ---
  useEffect(() => {
    const intervalo = setInterval(() => {
      const agora = new Date()
      const horaAtualStr = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`

      // 1. Alerta de Retorno do Almoço
      if (batidas[1] && !batidas[2]) {
        const minSaidaAlmoco = timeToMinutes(batidas[1])
        const minRetornoPrevisto = minSaidaAlmoco + 60
        const horaRetornoStr = formatarMinutosParaHora(minRetornoPrevisto)

        if (horaAtualStr === horaRetornoStr) {
          dispararNotificacaoNativa(
            "Calculadora de Ponto V PRO",
            "🍽️ Passou 1h do seu almoço! Hora de registrar o retorno.",
          )
        }
      }

      // 2. Alerta de Fim de Expediente
      if (sugestaoSaida && aguardandoSaida && horaAtualStr === sugestaoSaida) {
        dispararNotificacaoNativa(
          "Calculadora de Ponto V PRO",
          `⏰ Expediente concluído! Hora de bater o ponto de saída (${sugestaoSaida}).`,
        )
      }
    }, 15000)

    return () => clearInterval(intervalo)
  }, [batidas, sugestaoSaida, aguardandoSaida])

  const atualizarBatida = (index, valor) => {
    const novasBatidas = [...batidas]
    novasBatidas[index] = valor
    setBatidas(novasBatidas)
  }

  const adicionarTurno = () => setBatidas([...batidas, "", ""])

  const removerTurno = () => {
    if (batidas.length > 4) {
      const novasBatidas = [...batidas]
      novasBatidas.splice(-2, 2)
      setBatidas(novasBatidas)
    }
  }

  const limparDia = () => {
    setBatidas(["", "", "", ""])
    setJustificativa("")
    setDataRegistro(getHojeFormatado())
    setTargetType("9")
  }

  const preencherSugestao = () => {
    const [ano, mes, dia] = dataRegistro.split("-").map(Number)
    const dataObj = new Date(ano, mes - 1, dia)
    const isSexta = dataObj.getDay() === 5

    if (isSexta || targetType === "8") {
      setTargetType("8")
      setBatidas(["07:00", "12:00", "13:00", "16:00"])
      dispararNotificacaoNativa(
        "Ponto V PRO",
        "Sugestão aplicada para Sexta-feira (8h)!",
      )
    } else {
      setTargetType("9")
      setBatidas(["07:00", "12:00", "13:00", "17:00"])
      dispararNotificacaoNativa(
        "Ponto V PRO",
        "Sugestão aplicada para padrão diário (9h)!",
      )
    }
  }

  const salvarDia = () => {
    const [ano, mes, dia] = dataRegistro.split("-")
    const dataFormatada = `${dia}/${mes}/${ano}`

    const novoHistorico = {
      ...historico,
      [dataFormatada]: {
        batidas,
        cargaHoraria: formatMinutesHuman(targetMinutes),
        targetType,
        customHours,
        data: dataFormatada,
        justificativa: justificativa.trim(),
      },
    }
    setHistorico(novoHistorico)
    localStorage.setItem("historicoPonto", JSON.stringify(novoHistorico))
    dispararNotificacaoNativa(
      "Ponto V PRO",
      `Registro do dia ${dataFormatada} salvo com sucesso!`,
    )
  }

  const editarRegistro = (dataBR) => {
    const registro = historico[dataBR]
    if (registro) {
      const [dia, mes, ano] = dataBR.split("/")
      setDataRegistro(`${ano}-${mes}-${dia}`)
      setBatidas(registro.batidas || ["", "", "", ""])
      setJustificativa(registro.justificativa || "")
      if (registro.targetType) setTargetType(registro.targetType)
      if (registro.customHours) setCustomHours(registro.customHours)

      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const apagarRegistro = (dataBR) => {
    if (
      window.confirm(
        `Tem certeza que deseja apagar permanentemente o registro do dia ${dataBR}?`,
      )
    ) {
      const novoHistorico = { ...historico }
      delete novoHistorico[dataBR]
      setHistorico(novoHistorico)
      localStorage.setItem("historicoPonto", JSON.stringify(novoHistorico))
      dispararNotificacaoNativa(
        "Ponto V PRO",
        `O registro do dia ${dataBR} foi excluído.`,
      )
    }
  }

  const getTurnConfig = (index) => {
    if (index === 0)
      return {
        label: "1º Turno (Entrada)",
        icon: <Sun className="w-4 h-4 text-amber-400" />,
      }
    if (index === 1)
      return {
        label: "Saída Almoço",
        icon: <Utensils className="w-4 h-4 text-orange-400" />,
      }
    if (index === 2)
      return {
        label: "Retorno Almoço",
        icon: <RotateCcw className="w-4 h-4 text-blue-400" />,
      }
    if (index === 3)
      return {
        label: "Saída (Fim)",
        icon: <LogOut className="w-4 h-4 text-indigo-400" />,
      }
    return {
      label:
        index % 2 === 0
          ? `Entrada Extra ${Math.floor(index / 2)}`
          : `Saída Extra ${Math.floor(index / 2)}`,
      icon: <Clock className="w-4 h-4 text-slate-400" />,
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans antialiased relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Cabeçalho */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Gestão de Expediente Inteligente
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 fill-indigo-500/20" />
              Calculadora de Ponto{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 ml-1">
                V PRO
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Descubra a hora exata da sua saída sem estourar nem dever minutos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={preencherSugestao}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sugestão
              Automática
            </button>
          </div>
        </header>

        {/* Data e Jornada Contratual Inteligente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Data do Registro
            </label>
            <input
              type="date"
              value={dataRegistro}
              onChange={(e) => handleMudancaData(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]"
            />
          </div>

          <div className="md:col-span-2 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Briefcase className="w-4 h-4 text-indigo-400" /> Jornada
              Selecionada (Detectada pela Data)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("9")}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${targetType === "9" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50" : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800"}`}
              >
                <span className="text-sm font-bold block">9h</span>
                <span className="text-[10px] text-slate-400">Seg a Qui</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType("8")}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${targetType === "8" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50" : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800"}`}
              >
                <span className="text-sm font-bold block">8h</span>
                <span className="text-[10px] text-emerald-400">
                  Sexta-feira
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType("custom")}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${targetType === "custom" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50" : "bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800"}`}
              >
                <span className="text-sm font-bold block">Outro</span>
                <span className="text-[10px] text-slate-400">Customizado</span>
              </button>
            </div>
          </div>
        </div>

        {targetType === "custom" && (
          <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-300">
              Duração diária desejada:
            </label>
            <input
              type="time"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
            />
          </div>
        )}

        {/* Entradas e Saídas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {batidas.map((hora, index) => {
            const config = getTurnConfig(index)
            return (
              <div
                key={index}
                className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm"
              >
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
                  {config.icon} {config.label}
                </label>
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => atualizarBatida(index, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-3 text-lg font-mono text-center text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all [color-scheme:dark]"
                />
              </div>
            )
          })}
        </div>

        {/* Botões de Adicionar e Remover Turno */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={adicionarTurno}
            className="flex-1 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Adicionar Turno Extra
          </button>
          {batidas.length > 4 && (
            <button
              onClick={removerTurno}
              className="flex-1 py-3 rounded-xl border border-dashed border-rose-900/50 text-rose-500/70 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Crown className="w-4 h-4 text-indigo-400" /> Remover Último Turno
              Adicionado
            </button>
          )}
        </div>

        {/* Justificativa */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Justificativa /
            Observação do Dia (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Saí 10 min mais cedo para compromisso..."
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-600"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={limparDia}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Limpar Formulário
          </button>
          <button
            onClick={salvarDia}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-colors"
          >
            <Save className="w-4 h-4" /> Salvar Registro
          </button>
        </div>

        {/* Dashboard de Resultado */}
        {sugestaoSaida && (
          <section className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-950/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden mt-6 flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide uppercase border border-indigo-500/20">
                <LogOut className="w-3.5 h-3.5" /> Horário Recomendado de Saída
              </span>

              <div className="py-2 flex flex-col items-center">
                <div className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white font-mono drop-shadow-md">
                  {sugestaoSaida}
                </div>
                <p className="text-xs sm:text-sm text-emerald-400 mt-3 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Bater este horário cumpre
                  exatamente {formatMinutesHuman(targetMinutes)}
                </p>
              </div>

              <div className="w-full max-w-lg space-y-2 pt-4">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>
                    Realizado: {formatMinutesHuman(minutosTrabalhados)}
                  </span>
                  <span>Restante: {formatMinutesHuman(minutosRestantes)}</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-6 mt-4 border-t border-slate-800/80 text-left">
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    1º Turno (Manhã)
                  </span>
                  <span className="text-base font-semibold font-mono text-slate-200">
                    {formatMinutesHuman(minutosManha)}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    Intervalo Almoço
                  </span>
                  <span className="text-base font-semibold font-mono text-slate-200">
                    {formatMinutesHuman(minutosAlmoco)}
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">
                    A Fazer (Tarde)
                  </span>
                  <span className="text-base font-semibold font-mono text-indigo-400">
                    {formatMinutesHuman(minutosRestantes)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Histórico Local */}
        <div className="mt-12 pt-8 border-t border-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center uppercase tracking-wider">
            <Clock className="w-4 h-4 mr-2 text-indigo-400" /> Histórico (Neste
            Aparelho)
          </h3>

          {Object.keys(historico).length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800/80">
              Nenhum registro salvo ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(historico)
                .reverse()
                .map(([data, dados]) => (
                  <div
                    key={data}
                    className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            {data}
                          </span>
                          <span className="text-[11px] px-2 py-1 bg-slate-950 text-slate-400 rounded-md border border-slate-800">
                            Meta: {dados.cargaHoraria}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => editarRegistro(data)}
                            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent group-hover:border-slate-700"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => apagarRegistro(data)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent group-hover:border-slate-700"
                            title="Apagar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dados.batidas.map((hora, idx) => {
                          if (!hora) return null
                          const isEntrada = idx % 2 === 0
                          const turnoNum = Math.floor(idx / 2) + 1
                          return (
                            <span
                              key={idx}
                              className={`text-xs font-mono px-2 py-1 rounded border ${isEntrada ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-orange-500/10 text-orange-300 border-orange-500/20"}`}
                            >
                              <strong className="opacity-70">
                                {isEntrada ? `E${turnoNum}:` : `S${turnoNum}:`}
                              </strong>{" "}
                              {hora}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    {dados.justificativa && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60">
                        <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50 flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="italic">{dados.justificativa}</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Assinatura */}
        <div className="mt-8 pb-6 text-center space-y-2">
          <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
            <span className="w-8 h-[1px] bg-slate-700/50"></span>
            Desenvolvido por
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 tracking-wider">
              Valdiney
            </span>
            <span className="w-8 h-[1px] bg-slate-700/50"></span>
          </p>
          <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
            Dedicado à Luana{" "}
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      <div
        className={`fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 transition-all duration-500 transform ${toast.show ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"}`}
      >
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-indigo-500/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-emerald-500/20 p-1.5 rounded-full">
            <Bell className="w-5 h-5 text-emerald-400 animate-bounce" />
          </div>
          <p className="text-sm font-medium text-slate-200 pr-2">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  )
}
