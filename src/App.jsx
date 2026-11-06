import { useState, useMemo } from 'react';
import { 
  Clock, Sun, Utensils, Briefcase, LogOut, Calendar, 
  RotateCcw, CheckCircle2, Save, Trash2, Plus, Heart, Crown
} from 'lucide-react';

export default function CalculadoraPonto() {
  // Configuração da jornada
  const [targetType, setTargetType] = useState('9'); 
  const [customHours, setCustomHours] = useState('08:48');

  // Histórico e Batidas Dinâmicas
  const [batidas, setBatidas] = useState(['', '', '', '']);
  const [historico, setHistorico] = useState(() => {
    const dadosSalvos = localStorage.getItem('historicoPonto');
    return dadosSalvos ? JSON.parse(dadosSalvos) : {};
  });

  const timeToMinutes = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  };

  const formatMinutesHuman = (minutes) => {
    if (minutes === null || isNaN(minutes) || minutes === undefined || minutes < 0) return '0h 00min';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${String(m).padStart(2, '0')}min`;
  };

  const formatarMinutosParaHora = (totalMinutos) => {
    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.floor(totalMinutos % 60);
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  };

  const targetMinutes = useMemo(() => {
    if (targetType === '9') return 9 * 60;
    if (targetType === '8') return 8 * 60;
    const custom = timeToMinutes(customHours);
    return custom !== null && custom > 0 ? custom : 8 * 60;
  }, [targetType, customHours]);

  // Cálculos Centrais
  let sugestaoSaida = null;
  let minutosTrabalhados = 0;
  let ultimaEntrada = 0;
  let aguardandoSaida = false;

  for (let i = 0; i < batidas.length; i += 2) {
    const entrada = timeToMinutes(batidas[i]);
    const saida = timeToMinutes(batidas[i + 1]);

    if (entrada !== null && saida !== null) {
      minutosTrabalhados += (saida - entrada);
    } else if (entrada !== null && saida === null) {
      ultimaEntrada = entrada;
      aguardandoSaida = true;
    }
  }

  const minutosRestantes = Math.max(0, targetMinutes - minutosTrabalhados);
  const progressPercent = Math.min(100, Math.round((minutosTrabalhados / targetMinutes) * 100));

  const minutosManha = (batidas[0] && batidas[1]) ? (timeToMinutes(batidas[1]) - timeToMinutes(batidas[0])) : 0;
  const minutosAlmoco = (batidas[1] && batidas[2]) ? (timeToMinutes(batidas[2]) - timeToMinutes(batidas[1])) : 0;

  if (aguardandoSaida && minutosRestantes > 0) {
    const horaSaidaReal = ultimaEntrada + minutosRestantes;
    sugestaoSaida = formatarMinutosParaHora(horaSaidaReal);
  }

  const atualizarBatida = (index, valor) => {
    const novasBatidas = [...batidas];
    novasBatidas[index] = valor;
    setBatidas(novasBatidas);
  };

  const adicionarTurno = () => setBatidas([...batidas, '', '']);
  
  const removerTurno = () => {
    if (batidas.length > 4) {
      const novasBatidas = [...batidas];
      novasBatidas.splice(-2, 2);
      setBatidas(novasBatidas);
    }
  };

  const limparDia = () => setBatidas(['', '', '', '']);

  const salvarDia = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const novoHistorico = {
      ...historico,
      [hoje]: { batidas, cargaHoraria: formatMinutesHuman(targetMinutes), data: hoje }
    };
    setHistorico(novoHistorico);
    localStorage.setItem('historicoPonto', JSON.stringify(novoHistorico));
    alert('✅ Batidas salvas com sucesso!');
  };

  const getTurnConfig = (index) => {
    if (index === 0) return { label: '1º Turno (Entrada)', icon: <Sun className="w-4 h-4 text-amber-400" /> };
    if (index === 1) return { label: 'Saída Almoço', icon: <Utensils className="w-4 h-4 text-orange-400" /> };
    if (index === 2) return { label: 'Retorno Almoço', icon: <RotateCcw className="w-4 h-4 text-blue-400" /> };
    if (index === 3) return { label: 'Saída (Fim)', icon: <LogOut className="w-4 h-4 text-indigo-400" /> };
    return { 
      label: index % 2 === 0 ? `Entrada Extra ${Math.floor(index/2)}` : `Saída Extra ${Math.floor(index/2)}`, 
      icon: <Clock className="w-4 h-4 text-slate-400" /> 
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans antialiased relative">
      {/* Luzes de Fundo (Glassmorphism) */}
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
              Gestão de Expediente
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 fill-indigo-500/20" />
              Calculadora de Ponto <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 ml-1">V PRO</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={limparDia} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-400 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
            <button onClick={salvarDia} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-colors">
              <Save className="w-3.5 h-3.5" /> Salvar Dia
            </button>
          </div>
        </header>

        {/* Jornada Contratual */}
        <section className="bg-slate-900/90 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-400" /> Jornada Contratual do Dia
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button type="button" onClick={() => setTargetType('9')} className={`py-3 px-2 rounded-xl border text-center transition-all ${targetType === '9' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50' : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'}`}>
              <span className="text-lg font-bold block">9h</span><span className="text-[11px] text-slate-400">Padrão Diário</span>
            </button>
            <button type="button" onClick={() => setTargetType('8')} className={`py-3 px-2 rounded-xl border text-center transition-all ${targetType === '8' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50' : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'}`}>
              <span className="text-lg font-bold block">8h</span><span className="text-[11px] text-emerald-400 flex items-center justify-center gap-1"><Calendar className="w-3 h-3" /> Sexta-feira</span>
            </button>
            <button type="button" onClick={() => setTargetType('custom')} className={`py-3 px-2 rounded-xl border text-center transition-all ${targetType === 'custom' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50' : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'}`}>
              <span className="text-lg font-bold block">Outro</span><span className="text-[11px] text-slate-400">Customizado</span>
            </button>
          </div>
          {targetType === 'custom' && (
            <div className="pt-2 flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mt-2">
              <label className="text-xs text-slate-300">Duração diária desejada:</label>
              <input type="time" value={customHours} onChange={(e) => setCustomHours(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          )}
        </section>

        {/* Entradas e Saídas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {batidas.map((hora, index) => {
            const config = getTurnConfig(index);
            return (
              <div key={index} className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
                  {config.icon} {config.label}
                </label>
                <input 
                  type="time" 
                  value={hora} 
                  onChange={(e) => atualizarBatida(index, e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-3 text-lg font-mono text-center text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                />
              </div>
            );
          })}
        </div>

        {/* Botões de Ação de Turnos */}
        <div className="flex gap-3">
          <button onClick={adicionarTurno} className="flex-1 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <Plus className="w-4 h-4" /> Adicionar Turno Extra
          </button>
          {batidas.length > 4 && (
            <button onClick={removerTurno} className="flex-1 py-3 rounded-xl border border-dashed border-rose-900/50 text-rose-500/70 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all flex items-center justify-center gap-2 text-sm font-medium">
              <Trash2 className="w-4 h-4" /> Remover Turno
            </button>
          )}
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
                  <CheckCircle2 className="w-4 h-4" /> Bater este horário cumpre exatamente {formatMinutesHuman(targetMinutes)}
                </p>
              </div>

              <div className="w-full max-w-lg space-y-2 pt-4">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Realizado: {formatMinutesHuman(minutosTrabalhados)}</span>
                  <span>Restante: {formatMinutesHuman(minutosRestantes)}</span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-6 mt-4 border-t border-slate-800/80 text-left">
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">1º Turno (Manhã)</span>
                  <span className="text-base font-semibold font-mono text-slate-200">{formatMinutesHuman(minutosManha)}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">Intervalo Almoço</span>
                  <span className="text-base font-semibold font-mono text-slate-200">{formatMinutesHuman(minutosAlmoco)}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-inner">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-1">A Fazer (Tarde)</span>
                  <span className="text-base font-semibold font-mono text-indigo-400">{formatMinutesHuman(minutosRestantes)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Histórico Local */}
        <div className="mt-12 pt-8 border-t border-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center uppercase tracking-wider">
            <Clock className="w-4 h-4 mr-2 text-indigo-400" /> Histórico (Neste Aparelho)
          </h3>
          
          {Object.keys(historico).length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8 bg-slate-900/50 rounded-xl border border-slate-800/80">
              Nenhum registro salvo ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(historico).reverse().map(([data, dados]) => (
                <div key={data} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-200">{data}</span>
                    <span className="text-[11px] px-2 py-1 bg-slate-950 text-slate-400 rounded-md border border-slate-800">Meta: {dados.cargaHoraria}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dados.batidas.map((hora, idx) => hora ? (
                      <span key={idx} className={`text-xs font-mono px-2 py-1 rounded border ${idx % 2 === 0 ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-orange-500/10 text-orange-300 border-orange-500/20'}`}>
                        {idx % 2 === 0 ? 'E:' : 'S:'} {hora}
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- ASSINATURA E DEDICATÓRIA --- */}
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
            Dedicado à Luana <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
          </p>
        </div>

      </div>
    </div>
  );
}