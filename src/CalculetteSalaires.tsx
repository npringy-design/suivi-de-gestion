import React, { useState } from 'react';

const NAV = '#1e293b';

interface CalculetteSalairesProps {
  onBack: () => void;
}

export default function CalculetteSalaires({ onBack }: CalculetteSalairesProps) {
  // State for left table (Employees)
  const [employees, setEmployees] = useState([{ nom: '', equipe: '', heuresPayees: '', coutTotalCharge: '' }]);
  
  // State for Calculette
  const [caPrevu, setCaPrevu] = useState<string>('');

  // State for Equipes Actuelle
  const [equipesActuelle, setEquipesActuelle] = useState({
    cuisine: { cadre: { h: '', n: '' }, maitrise: { h: '', n: '' }, niv12: { h: '', n: '' }, niv3: { h: '', n: '' }, apprenti: { h: '', n: '' } },
    salle: { cadre: { h: '', n: '' }, maitrise: { h: '', n: '' }, niv12: { h: '', n: '' }, niv3: { h: '', n: '' }, apprenti: { h: '', n: '' } }
  });

  // State for Equipes Apres Changement
  const [equipesApres, setEquipesApres] = useState({
    cuisine: { cadre: { h: '', n: '' }, maitrise: { h: '', n: '' }, niv12: { h: '', n: '' }, niv3: { h: '', n: '' }, apprenti: { h: '', n: '' } },
    salle: { cadre: { h: '', n: '' }, maitrise: { h: '', n: '' }, niv12: { h: '', n: '' }, niv3: { h: '', n: '' }, apprenti: { h: '', n: '' } }
  });

  // State for Simulations
  const [simulationsMinus, setSimulationsMinus] = useState([{ poste: '', heuresHebdo: '', heuresMensuels: '', nombre: '', montant: '' }]);
  const [simulationsPlus, setSimulationsPlus] = useState([{ poste: '', heuresHebdo: '', heuresMensuels: '', nombre: '', montant: '' }]);
  
  const [pourcentSCCible, setPourcentSCCible] = useState<string>('');
  const [caCible, setCaCible] = useState<string>('');

  const parseNum = (v: string | number) => {
    if (typeof v === 'number') return v;
    return parseFloat((v || '0').replace(',', '.')) || 0;
  };

  const formatCurrency = (v: number) => v === 0 ? '0 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
  const formatPercent = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(v);
  const formatNum = (v: number) => v === 0 ? '0,00' : new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  // Calculations
  const totalCoutCharge = employees.reduce((sum, emp) => sum + parseNum(emp.coutTotalCharge), 0);
  const totalAvecProvCP = totalCoutCharge * 1.10;

  const caPrevuNum = parseNum(caPrevu);
  const scAvecEffectif = caPrevuNum > 0 ? totalAvecProvCP / caPrevuNum : 0;

  const handleEmployeeChange = (index: number, field: string, value: string) => {
    const newEmp = [...employees];
    newEmp[index] = { ...newEmp[index], [field]: value };
    setEmployees(newEmp);
  };

  const addEmployee = () => setEmployees([...employees, { nom: '', equipe: '', heuresPayees: '', coutTotalCharge: '' }]);
  const removeEmployee = () => {
    if (employees.length > 1) setEmployees(employees.slice(0, -1));
  };

  const handleEquipeChange = (isActuelle: boolean, dept: 'cuisine' | 'salle', role: string, field: 'h' | 'n', value: string) => {
    if (isActuelle) {
      setEquipesActuelle(prev => ({
        ...prev,
        [dept]: { ...prev[dept], [role]: { ...prev[dept][role as keyof typeof prev.cuisine], [field]: value } }
      }));
    } else {
      setEquipesApres(prev => ({
        ...prev,
        [dept]: { ...prev[dept], [role]: { ...prev[dept][role as keyof typeof prev.cuisine], [field]: value } }
      }));
    }
  };

  const handleSimMinusChange = (index: number, field: string, value: string) => {
    const newSim = [...simulationsMinus];
    newSim[index] = { ...newSim[index], [field]: value };
    setSimulationsMinus(newSim);
  };

  const addSimMinus = () => setSimulationsMinus([...simulationsMinus, { poste: '', heuresHebdo: '', heuresMensuels: '', nombre: '', montant: '' }]);
  const removeSimMinus = () => {
    if (simulationsMinus.length > 1) setSimulationsMinus(simulationsMinus.slice(0, -1));
  };

  const handleSimPlusChange = (index: number, field: string, value: string) => {
    const newSim = [...simulationsPlus];
    newSim[index] = { ...newSim[index], [field]: value };
    setSimulationsPlus(newSim);
  };

  const addSimPlus = () => setSimulationsPlus([...simulationsPlus, { poste: '', heuresHebdo: '', heuresMensuels: '', nombre: '', montant: '' }]);
  const removeSimPlus = () => {
    if (simulationsPlus.length > 1) setSimulationsPlus(simulationsPlus.slice(0, -1));
  };

  const calcEquipeTotal = (equipe: any, dept: 'cuisine' | 'salle', field: 'h' | 'n'): number => {
    return (Object.values(equipe[dept]) as any[]).reduce((sum: number, role: any) => sum + parseNum(role[field]), 0);
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '10px 8px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 10,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    background: '#f8fafc',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '6px 8px',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: '#1e293b',
    fontFamily: 'inherit',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none', fontSize: 11, fontFamily: 'inherit', color: '#1e293b', fontWeight: 600
  };

  const renderEquipeRow = (label: string, dept: 'cuisine' | 'salle', role: string) => (
    <tr key={`${dept}-${role}`}>
      <td style={{ ...tdStyle, textAlign: 'left', background: dept === 'cuisine' ? '#e0f2fe' : '#fef3c7' }}>{label}</td>
      <td style={{ ...tdStyle, background: dept === 'cuisine' ? '#e0f2fe' : '#fef3c7' }}>
        <input style={inputStyle} value={equipesActuelle[dept][role as keyof typeof equipesActuelle.cuisine].h} onChange={e => handleEquipeChange(true, dept, role, 'h', e.target.value)} />
      </td>
      <td style={{ ...tdStyle, background: dept === 'cuisine' ? '#e0f2fe' : '#fef3c7' }}>
        <input style={inputStyle} value={equipesActuelle[dept][role as keyof typeof equipesActuelle.cuisine].n} onChange={e => handleEquipeChange(true, dept, role, 'n', e.target.value)} />
      </td>
      <td style={{ ...tdStyle, background: dept === 'cuisine' ? '#e0f2fe' : '#fef3c7', borderLeft: '2px dashed #ef4444' }}>
        <input style={inputStyle} value={equipesApres[dept][role as keyof typeof equipesApres.cuisine].h} onChange={e => handleEquipeChange(false, dept, role, 'h', e.target.value)} />
      </td>
      <td style={{ ...tdStyle, background: dept === 'cuisine' ? '#e0f2fe' : '#fef3c7' }}>
        <input style={inputStyle} value={equipesApres[dept][role as keyof typeof equipesApres.cuisine].n} onChange={e => handleEquipeChange(false, dept, role, 'n', e.target.value)} />
      </td>
    </tr>
  );

  const totalMinus = simulationsMinus.reduce((sum, sim) => sum + parseNum(sim.montant), 0);
  const totalPlus = simulationsPlus.reduce((sum, sim) => sum + parseNum(sim.montant), 0);
  const scRecalculeMontant = totalAvecProvCP - totalMinus + totalPlus;
  const scRecalculePercent = caPrevuNum > 0 ? scRecalculeMontant / caPrevuNum : 0;

  const caHtAFaire = parseNum(pourcentSCCible) > 0 ? scRecalculeMontant / (parseNum(pourcentSCCible) / 100) : 0;
  const scFonctionCaCible = parseNum(caCible) > 0 ? scRecalculeMontant / parseNum(caCible) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 36px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: NAV, letterSpacing: '-.02em' }}>
              Projection Salaire et Charge
            </h1>
            <h2 style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 600, color: '#64748b' }}>
              Buro Monte
            </h2>
          </div>
          <button onClick={onBack} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px',
            color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.05)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            RETOUR ACCUEIL
          </button>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          
          {/* Left Table - Employees */}
          <div style={{ flex: '0 0 380px' }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 32 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  Équipe
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addEmployee} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Créer</button>
                  <button onClick={removeEmployee} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', padding: '20px' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>NOM</th>
                      <th style={thStyle}>EQUIPE</th>
                      <th style={thStyle}>HEURES PAYEES</th>
                      <th style={thStyle}>COUT TOTAL CHARGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={emp.nom} onChange={e => handleEmployeeChange(i, 'nom', e.target.value)} /></td>
                        <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={emp.equipe} onChange={e => handleEmployeeChange(i, 'equipe', e.target.value)} /></td>
                        <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={emp.heuresPayees} onChange={e => handleEmployeeChange(i, 'heuresPayees', e.target.value)} /></td>
                        <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={emp.coutTotalCharge} onChange={e => handleEmployeeChange(i, 'coutTotalCharge', e.target.value)} /></td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ ...tdStyle, background: '#fee2e2', color: '#ef4444', fontWeight: 800, textAlign: 'center' }}>Total</td>
                      <td style={{ ...tdStyle, background: '#fee2e2', color: '#ef4444', fontWeight: 800 }}>{formatCurrency(totalCoutCharge)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ ...tdStyle, background: '#fef08a', color: '#854d0e', fontWeight: 800, textAlign: 'center' }}>Total AVEC PROV CP</td>
                      <td style={{ ...tdStyle, background: '#fef08a', color: '#ef4444', fontWeight: 800 }}>{formatCurrency(totalAvecProvCP)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
              {/* CA A FAIRE Table */}
              <div style={{ width: 220 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      CA A FAIRE
                    </h2>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, fontSize: 10 }}>% SC</th>
                          <th style={{ ...thStyle, fontSize: 10 }}>CA HT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35].map(pct => {
                          const caHt = totalAvecProvCP / (pct / 100);
                          let bg = '#dcfce7'; // green
                          let color = '#166534';
                          if (pct >= 41) { bg = '#fee2e2'; color = '#991b1b'; } // red
                          else if (pct >= 38) { bg = '#ffedd5'; color = '#9a3412'; } // orange
                          
                          return (
                            <tr key={pct}>
                              <td style={{ ...tdStyle, background: bg, color, fontWeight: 700 }}>{pct}%</td>
                              <td style={{ ...tdStyle, background: bg, color, fontWeight: 800 }}>{formatCurrency(caHt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Equipes Table */}
              <div style={{ flex: 1 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      Équipes Actuelle vs Après Changement
                    </h2>
                  </div>
                  <div style={{ overflowX: 'auto', padding: '20px' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, border: 'none', background: 'transparent' }}></th>
                          <th colSpan={2} style={thStyle}>EQUIPES ACTUELLE</th>
                          <th colSpan={2} style={{ ...thStyle, color: '#ef4444', borderLeft: '2px dashed #ef4444', borderTop: '2px dashed #ef4444', borderRight: '2px dashed #ef4444' }}>EQUIPES APRES CHANGEMENT</th>
                        </tr>
                        <tr>
                          <th style={{ ...thStyle, border: 'none', background: 'transparent' }}></th>
                          <th style={{ ...thStyle, fontSize: 10, fontStyle: 'italic' }}>Heures</th>
                          <th style={{ ...thStyle, fontSize: 10, fontStyle: 'italic' }}>Nombre</th>
                          <th style={{ ...thStyle, fontSize: 10, fontStyle: 'italic', borderLeft: '2px dashed #ef4444' }}>Heures</th>
                          <th style={{ ...thStyle, fontSize: 10, fontStyle: 'italic', borderRight: '2px dashed #ef4444' }}>nombre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderEquipeRow('Cadre cuisine', 'cuisine', 'cadre')}
                        {renderEquipeRow('AG Maitrise Cuisine', 'cuisine', 'maitrise')}
                        {renderEquipeRow('Niv 1 & 2 Cuisine', 'cuisine', 'niv12')}
                        {renderEquipeRow('Niv 3 Cuisine', 'cuisine', 'niv3')}
                        {renderEquipeRow('Apprenti Cuisine', 'cuisine', 'apprenti')}
                        <tr>
                          <td style={{ ...tdStyle, textAlign: 'left', background: '#3b82f6', color: '#fff', fontWeight: 800 }}>Total cuisine</td>
                          <td style={{ ...tdStyle, background: '#3b82f6', color: '#fff', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'cuisine', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#3b82f6', color: '#fff', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'cuisine', 'n'))}</td>
                          <td style={{ ...tdStyle, background: '#3b82f6', color: '#fff', fontWeight: 800, borderLeft: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'cuisine', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#3b82f6', color: '#fff', fontWeight: 800, borderRight: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'cuisine', 'n'))}</td>
                        </tr>
                        {renderEquipeRow('Cadre Salle', 'salle', 'cadre')}
                        {renderEquipeRow('AG Maitrise Salle', 'salle', 'maitrise')}
                        {renderEquipeRow('Niv 1 & 2 Salle', 'salle', 'niv12')}
                        {renderEquipeRow('Niv 3 Salle', 'salle', 'niv3')}
                        {renderEquipeRow('Apprenti Salle', 'salle', 'apprenti')}
                        <tr>
                          <td style={{ ...tdStyle, textAlign: 'left', background: '#f97316', color: '#fff', fontWeight: 800 }}>Total salle</td>
                          <td style={{ ...tdStyle, background: '#f97316', color: '#fff', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'salle', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#f97316', color: '#fff', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'salle', 'n'))}</td>
                          <td style={{ ...tdStyle, background: '#f97316', color: '#fff', fontWeight: 800, borderLeft: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'salle', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#f97316', color: '#fff', fontWeight: 800, borderRight: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'salle', 'n'))}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle, textAlign: 'left', background: '#fef08a', fontWeight: 800 }}>Total restaurant</td>
                          <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'cuisine', 'h') + calcEquipeTotal(equipesActuelle, 'salle', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800 }}>{formatNum(calcEquipeTotal(equipesActuelle, 'cuisine', 'n') + calcEquipeTotal(equipesActuelle, 'salle', 'n'))}</td>
                          <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800, borderLeft: '2px dashed #ef4444', borderBottom: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'cuisine', 'h') + calcEquipeTotal(equipesApres, 'salle', 'h'))}</td>
                          <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800, borderRight: '2px dashed #ef4444', borderBottom: '2px dashed #ef4444' }}>{formatNum(calcEquipeTotal(equipesApres, 'cuisine', 'n') + calcEquipeTotal(equipesApres, 'salle', 'n'))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <button style={{
                background: '#fef08a', border: '1px solid #ca8a04', borderRadius: 8, padding: '12px 24px',
                color: '#ef4444', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                Exécuter SALAIRE ET<br/>CHARGE CALCULETTE
              </button>

              <div style={{ width: 300 }}>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                      CALCULETTE
                    </h2>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <tbody>
                        <tr>
                          <td style={{ ...tdStyle, background: '#fff', textAlign: 'left', fontWeight: 800 }}>CA PREVU</td>
                          <td style={{ ...tdStyle, background: '#fef08a' }}>
                            <input style={{ ...inputStyle, fontWeight: 800 }} value={caPrevu} onChange={e => setCaPrevu(e.target.value)} />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle, background: '#fff', textAlign: 'left', fontWeight: 700 }}>S/C Avec effectif</td>
                          <td style={{ ...tdStyle, background: '#fff', fontWeight: 800 }}>{formatPercent(scAvecEffectif)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* SIMULATIONS Table */}
            <div>
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                    SIMULATIONS
                  </h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { addSimMinus(); addSimPlus(); }} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Créer</button>
                    <button onClick={() => { removeSimMinus(); removeSimPlus(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', padding: '20px' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: 30 }}></th>
                        <th style={thStyle}>POSTE</th>
                        <th style={thStyle}>HEURES HEBDO</th>
                        <th style={thStyle}>Heures mensuels</th>
                        <th style={thStyle}>NOMBRE</th>
                        <th style={thStyle}>MONTANT</th>
                        <th style={thStyle}>S/C RECALCULE</th>
                        <th style={{ ...thStyle, background: '#fef08a' }}>% S/C CIBLE</th>
                        <th style={{ ...thStyle, background: '#fef08a' }}>CA CIBLE</th>
                      </tr>
                      <tr>
                        <th colSpan={6} style={{ border: 'none' }}></th>
                        <th style={{ ...thStyle, background: '#fff' }}></th>
                        <th style={{ ...thStyle, background: '#fff' }}>CA HT A FAIRE</th>
                        <th style={{ ...thStyle, background: '#fff' }}>% S/C FONCTION CA CIBLE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationsMinus.map((sim, i) => (
                        <tr key={`minus-${i}`}>
                          <td style={{ ...tdStyle, background: '#f1f5f9', fontWeight: 800 }}>-</td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.poste} onChange={e => handleSimMinusChange(i, 'poste', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.heuresHebdo} onChange={e => handleSimMinusChange(i, 'heuresHebdo', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.heuresMensuels} onChange={e => handleSimMinusChange(i, 'heuresMensuels', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.nombre} onChange={e => handleSimMinusChange(i, 'nombre', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.montant} onChange={e => handleSimMinusChange(i, 'montant', e.target.value)} /></td>
                          {i === 0 && (
                            <td rowSpan={simulationsMinus.length + simulationsPlus.length} style={{ ...tdStyle, background: '#fff', verticalAlign: 'top', paddingTop: 16, fontWeight: 800, fontSize: 14 }}>
                              {formatPercent(scRecalculePercent)}
                            </td>
                          )}
                          {i === 0 && (
                            <td rowSpan={simulationsMinus.length + simulationsPlus.length} style={{ ...tdStyle, background: '#fff', verticalAlign: 'top', paddingTop: 16, fontWeight: 800, fontSize: 14 }}>
                              <input style={{ ...inputStyle, fontSize: 14, fontWeight: 800, marginBottom: 8, background: '#fef08a', padding: '4px 8px', borderRadius: 4 }} value={pourcentSCCible} onChange={e => setPourcentSCCible(e.target.value)} placeholder="%" />
                              <br/>
                              {formatCurrency(caHtAFaire)}
                            </td>
                          )}
                          {i === 0 && (
                            <td rowSpan={simulationsMinus.length + simulationsPlus.length} style={{ ...tdStyle, background: '#fff', verticalAlign: 'top', paddingTop: 16, fontWeight: 800, fontSize: 14 }}>
                              <input style={{ ...inputStyle, fontSize: 14, fontWeight: 800, marginBottom: 8, background: '#fef08a', padding: '4px 8px', borderRadius: 4 }} value={caCible} onChange={e => setCaCible(e.target.value)} placeholder="€" />
                              <br/>
                              {formatPercent(scFonctionCaCible)}
                            </td>
                          )}
                        </tr>
                      ))}
                      {simulationsPlus.map((sim, i) => (
                        <tr key={`plus-${i}`}>
                          <td style={{ ...tdStyle, background: '#fed7aa', fontWeight: 800, color: '#9a3412' }}>+</td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.poste} onChange={e => handleSimPlusChange(i, 'poste', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.heuresHebdo} onChange={e => handleSimPlusChange(i, 'heuresHebdo', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.heuresMensuels} onChange={e => handleSimPlusChange(i, 'heuresMensuels', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.nombre} onChange={e => handleSimPlusChange(i, 'nombre', e.target.value)} /></td>
                          <td style={{ ...tdStyle, background: '#fff' }}><input style={inputStyle} value={sim.montant} onChange={e => handleSimPlusChange(i, 'montant', e.target.value)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
