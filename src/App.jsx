import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  History, 
  Calculator, 
  Crown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' | 'history'
  
  // Data atual formatada YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Turnos do dia selecionado: [{ id, entry, exit }]
  const [shifts, setShifts] = useState([
    { id: 1, entry: '07:00', exit: '12:00' },
    { id: 2, entry: '13:00', exit: '' }
  ]);

  const [justification, setJustification] = useState('');
  
  // Histórico salvo no localStorage: { 'YYYY-MM-DD': { shifts: [...], totalMinutes: X, targetMinutes: Y, justification: '...' } }
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('v_ponto_history');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Estado para controlar quais meses estão expandidos no histórico (Ex: { '2026-11': true })
  const [expandedMonths, setExpandedMonths] = useState({});

  // Salvar histórico sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem('v_ponto_history', JSON.stringify(history));
    } catch (e) {
      console.error("Erro ao salvar no localStorage", e);
    }
  }, [history]);

  // Quando mudar a data, carregar os turnos dela se existirem
  useEffect(() => {
    if (history[selectedDate]) {
      setShifts(history[selectedDate].shifts || [{ id: Date.now(), entry: '', exit: '' }]);
      setJustification(history[selectedDate].justification || '');
    } else {
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        setShifts([
          { id: 1, entry: '07:00', exit: '12:00' },
          { id: 2, entry: '13:00', exit: '' }
        ]);
      } else {
        setShifts([{ id: 1, entry: '', exit: '' }]);
      }
      setJustification('');
    }
  }, [selectedDate]);

  // Determinar meta diária com base no dia da semana (Seg-Qui = 9h / 540m, Sex = 8h / 480m)
  const getTargetMinutesForDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5) return 480; // Sexta-feira: 8h
    if (dayOfWeek >= 1 && dayOfWeek <= 4) return 540; // Seg-Qui: 9h
    return 0; // Fim de semana
  };

  const targetMinutes = getTargetMinutesForDate(selectedDate);

  // Manipulação de turnos
  const handleAddShift = () => {
    setShifts([...shifts, { id: Date.now(), entry: '', exit: '' }]);
  };

  const handleRemoveShift = (id) => {
    if (shifts.length === 1) {
      setShifts([{ id: Date.now(), entry: '', exit: '' }]);
    } else {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  const handleShiftChange = (id, field, value) => {
    setShifts(shifts.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  // Conversões e cálculos de tempo
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToHoursAndMinutes = (totalMins) => {
    const isNegative = totalMins < 0;
    const absMins = Math.abs(totalMins);
    const h = Math.floor(absMins / 60);
    const m = absMins % 60;
    return `${isNegative ? '-' : ''}${h}h ${m}m`;
  };

  const calculateTotalWorkedMinutes = () => {
    let total = 0;
    shifts.forEach(shift => {
      if (shift.entry && shift.exit) {
        const start = timeToMinutes(shift.entry);
        const end = timeToMinutes(shift.exit);
        if (end > start) {
          total += (end - start);
        }
      }
    });
    return total;
  };

  const totalWorkedMinutes = calculateTotalWorkedMinutes();
  const balanceMinutes = totalWorkedMinutes - targetMinutes;

  const calculateEstimatedExit = () => {
    const lastShift = shifts[shifts.length - 1];
    if (!lastShift || !lastShift.entry || lastShift.exit) return null;

    let completedMins = 0;
    shifts.slice(0, -1).forEach(s => {
      if (s.entry && s.exit) {
        const start = timeToMinutes(s.entry);
        const end = timeToMinutes(s.exit);
        if (end > start) completedMins += (end - start);
      }
    });

    const remainingNeeded = targetMinutes - completedMins;
    if (remainingNeeded <= 0) return 'Meta já atingida!';

    const entryMins = timeToMinutes(lastShift.entry);
    const exitMins = entryMins + remainingNeeded;
    
    const h = Math.floor(exitMins / 60) % 24;
    const m = exitMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const estimatedExitTime = calculateEstimatedExit();

  const handleSaveDay = () => {
    setHistory({
      ...history,
      [selectedDate]: {
        shifts,
        totalMinutes: totalWorkedMinutes,
        targetMinutes,
        balanceMinutes,
        justification
      }
    });
    alert('Jornada salva com sucesso!');
  };

  const handleClearDay = () => {
    if (confirm('Deseja limpar os registros desta data?')) {
      const newHist = { ...history };
      delete newHist[selectedDate];
      setHistory(newHist);
      setShifts([{ id: Date.now(), entry: '07:00', exit: '' }]);
      setJustification('');
    }
  };

  // Alternar expansão do mês
  const toggleMonthAccordion = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Agrupar histórico por mês
  const groupedHistory = Object.keys(history).sort().reverse().reduce((acc, dateStr) => {
    const monthKey = dateStr.substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push({ date: dateStr, ...history[dateStr] });
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Calculadora de Ponto V PRO
            </h1>
            <p className="text-xs text-slate-400">Gerenciamento Inteligente de Jornada</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('calc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'calc' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Registro</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'calc' ? (
          <>
            {/* Seletor de Data e Meta */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Data da Jornada
                  </label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl flex items-center justify-between sm:justify-start space-x-4">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Meta Diária</span>
                    <span className="text-sm font-bold text-slate-200">{minutesToHoursAndMinutes(targetMinutes)}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-800"></div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      targetMinutes === 480 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      targetMinutes === 540 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {targetMinutes === 480 ? 'Sexta (8h)' : targetMinutes === 540 ? 'Padrão (9h)' : 'Fim de Semana'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Turnos de Ponto */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Turnos e Batidas</span>
                </h2>
                <button
                  onClick={handleAddShift}
                  className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center space-x-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Turno</span>
                </button>
              </div>

              <div className="space-y-3">
                {shifts.map((shift, index) => (
                  <div key={shift.id} className="flex items-center space-x-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-xs font-bold text-slate-500 w-6">#{index + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Entrada</label>
                        <input 
                          type="time" 
                          value={shift.entry}
                          onChange={(e) => handleShiftChange(shift.id, 'entry', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Saída</label>
                        <input 
                          type="time" 
                          value={shift.exit}
                          onChange={(e) => handleShiftChange(shift.id, 'exit', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShift(shift.id)}
                      className="text-slate-500 hover:text-red-400 p-2 transition rounded-lg hover:bg-red-500/10 mt-5"
                      title="Remover turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Justificativa (Opcional) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Justificativa / Observação (Opcional)
              </label>
              <input 
                type="text" 
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Ex: Saída médica, compensação de horas, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Card de Resultados e Previsão */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
              <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Resumo da Jornada</h2>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Trabalhadas</span>
                  <span className="text-base md:text-lg font-bold text-slate-100">{minutesToHoursAndMinutes(totalWorkedMinutes)}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Previsão Saída</span>
                  <span className="text-base md:text-lg font-bold text-cyan-400">{estimatedExitTime || '--:--'}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Saldo</span>
                  <span className={`text-base md:text-lg font-bold ${balanceMinutes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {balanceMinutes >= 0 ? `+${minutesToHoursAndMinutes(balanceMinutes)}` : minutesToHoursAndMinutes(balanceMinutes)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                {history[selectedDate] && (
                  <button
                    onClick={handleClearDay}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                  >
                    Excluir Registro
                  </button>
                )}
                <button
                  onClick={handleSaveDay}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Jornada</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Aba de Histórico em Acordeons Mensais */
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Histórico de Jornadas por Mês</span>
              </h2>

              {Object.keys(groupedHistory).length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhum registro salvo no histórico ainda.
                </div>
              ) : (
                Object.keys(groupedHistory).map(monthKey => {
                  const monthName = new Date(monthKey + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  const days = groupedHistory[monthKey];
                  
                  const totalMonthMinutes = days.reduce((acc, d) => acc + d.totalMinutes, 0);
                  const totalMonthTarget = days.reduce((acc, d) => acc + d.targetMinutes, 0);
                  const monthBalance = totalMonthMinutes - totalMonthTarget;
                  const isExpanded = !!expandedMonths[monthKey];

                  return (
                    <div key={monthKey} className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden transition">
                      {/* Cabeçalho do Acordeon do Mês (Clicável) */}
                      <button
                        onClick={() => toggleMonthAccordion(monthKey)}
                        className="w-full px-4 py-3.5 flex items-center justify-between bg-slate-950/80 hover:bg-slate-9orge/60 transition text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-indigo-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider capitalize">{monthName}</h3>
                            <span className="text-[10px] text-slate-400">{days.length} {days.length === 1 ? 'dia registrado' : 'dias registrados'}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${monthBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            Saldo: {monthBalance >= 0 ? `+${minutesToHoursAndMinutes(monthBalance)}` : minutesToHoursAndMinutes(monthBalance)}
                          </span>
                        </div>
                      </button>

                      {/* Conteúdo do Mês (Só aparece se expandido) */}
                      {isExpanded && (
                        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/20">
                          {days.map(item => (
                            <div 
                              key={item.date} 
                              onClick={() => { setSelectedDate(item.date); setActiveTab('calc'); }}
                              className="bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 p-3 rounded-xl transition cursor-pointer flex items-center justify-between"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-medium text-slate-200">
                                  {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                </span>
                                {item.justification && (
                                  <p className="text-[10px] text-slate-400 italic">Obs: {item.justification}</p>
                                )}
                              </div>
                              <div className="text-right space-y-0.5">
                                <span className="text-xs font-bold text-slate-200">{minutesToHoursAndMinutes(item.totalMinutes)}</span>
                                <span className={`block text-[10px] font-semibold ${item.balanceMinutes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {item.balanceMinutes >= 0 ? `+${minutesToHoursAndMinutes(item.balanceMinutes)}` : minutesToHoursAndMinutes(item.balanceMinutes)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}