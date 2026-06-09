import React, { useState, useEffect } from 'react';

interface FactureDevisProps {
  onBack: () => void;
}

interface Company {
  name: string;
  address: string;
  siret: string;
  info: string;
  iban: string;
  bic: string;
}

const COMPANIES: Company[] = [
  {
    name: 'HIP CORM',
    address: '4 RUE DES BLANCS MONTS\n51350 CORMONTREUIL',
    siret: '91474632600018',
    info: 'SAS HIP CORM AU CAPITAL DE 5000€ | 4 RUE DES BLANCS MONTS 51350 CORMONTREUIL\nSIRET N° 91474632600018 | APE : 5610A | Numéro TVA Intracommunautaire : FR59914746326 | RCS Reims B 914 746 326',
    iban: 'FR76 3000 4024 8400 0105 7442 923',
    bic: 'BNPAFRPPXXX'
  },
  {
    name: 'BURO CORM',
    address: '4 RUE DES BLANCS MONTS\n51350 CORMONTREUIL',
    siret: '91474679700010',
    info: 'SAS BURO CORM AU CAPITAL DE 5000€ | 4 RUE DES BLANCS MONTS 51350 CORMONTREUIL\nSIRET N° 91474679700010 | APE : 5610A | Numéro TVA Intracommunautaire : FR17914746797 | RCS Reims B 914 746 797',
    iban: 'FR76 3000 4024 8400 0105 7433 223',
    bic: 'BNPAFRPPXXX'
  },
  {
    name: 'HIP THILL',
    address: 'PARC MILLESIME\n51370 THILLOIS',
    siret: '90389428500027',
    info: 'SAS HIP THILL AU CAPITAL DE 5000€ | PARC MILLESIME 51370 THILLOIS\nSIRET N° 90389428500027 | APE : 5610A | Numéro TVA Intracommunautaire : FR46903894285 | RCS Reims B 903 894 285',
    iban: 'FR76 3000 4008 7000 0107 8315 149',
    bic: 'BNPAFRPPXXX'
  },
  {
    name: 'LEO THILL',
    address: 'PARC MILLESIME\n51370 THILLOIS',
    siret: '90390437300029',
    info: 'SAS LEO THILL AU CAPITAL DE 5000€ | PARC MILLESIME 51370 THILLOIS\nSIRET N° 90390437300029 | APE : 5610A | Numéro TVA Intracommunautaire : FR46903904373 | RCS Reims B 903 904 373',
    iban: 'FR76 3000 4008 7000 0107 8305 449',
    bic: 'BNPAFRPPXXX'
  },
  {
    name: 'BURO MONTE',
    address: '30 AV DE LA FERME BRIARDE\n77144 MONTREVRAIN',
    siret: '91480995900010',
    info: 'SAS BURO MONTE AU CAPITAL DE 5000€ | 30 AV DE LA FERME BRIARDE ZAC CLOS DU CHENE 77144 MONTREVRAIN\nSIRET N° 91480995900010 | APE : 5610A | Numéro TVA Intracommunautaire : FR62914809959 | RCS Meaux B 914 809 959',
    iban: 'FR76 3000 3016 7000 0200 3561 503',
    bic: 'SOGEFRPPXXX'
  },
  {
    name: 'HIP STV',
    address: '3 RUE DES VERGERS\n77400 ST THIBAULT DES VIGNES',
    siret: '92482896500021',
    info: 'SAS HIP STV AU CAPITAL DE 5000€ | 3 RUE DES VERGERS 77400 ST THIBAULT DES VIGNES\nSIRET N° 92482896500021 | APE : 5610A | Numéro TVA Intracommunautaire : FR78924828965 | RCS Meaux 924 828 965',
    iban: 'FR76 3000 3016 7000 0200 4245 450',
    bic: 'SOGEFRPP'
  },
  {
    name: 'VOLTO',
    address: '2 RUE Charlie Chaplin Ccial BAY 1\n77200 TORCY',
    siret: '93250979700027',
    info: 'SAS VOLTO AU CAPITAL DE 5000€ | 2 RUE Charlie Chaplin Ccial BAY 1 77200 TORCY\nSIRET N° 93250979700027 | APE : 5610A | Numéro TVA Intracommunautaire : FR30932509797 | RCS Meaux 932509797',
    iban: 'FR76 3000 3016 7000 0200 4446 822',
    bic: 'SOGEFRPP'
  },
  {
    name: 'LDM RESTAURATION',
    address: '7 RUE LAZARE HOCHE\n92100 BOULOGNE BILLANCOURT',
    siret: '90230032600011',
    info: 'SAS LDM AU CAPITAL DE 5000€ | 7 RUE LAZARE HOCHE 92100 BOULOGNE BILLANCOURT\nSIRET N° 90230032600011 | APE : 6420Z | Numéro TVA Intracommunautaire : FR75902300326 | RCS Nanterre B 902 300 326',
    iban: 'FR76 3000 3016 7000 0200 3241 403',
    bic: 'SOGEFRPP'
  }
];

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
}

export default function FactureDevis({ onBack }: FactureDevisProps) {
  const [isDevis, setIsDevis] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company>(COMPANIES[4]); // Default BURO MONTE
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientSiret, setClientSiret] = useState('');
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPriceHT: 0, tvaRate: 10 }
  ]);

  const [calcTTC, setCalcTTC] = useState<number>(0);
  const [calcTVA, setCalcTVA] = useState<number>(5.5);

  // Generate unique number
  const generateNumber = () => {
    const prefix = isDevis ? 'DEV' : 'FAC';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setInvoiceNumber(`${prefix}${year}${month}${day}${random}`);
  };

  useEffect(() => {
    if (!invoiceNumber) {
      generateNumber();
    } else {
      // Update prefix if switching between Devis and Facture
      if (isDevis && invoiceNumber.startsWith('FAC')) {
        setInvoiceNumber('DEV' + invoiceNumber.substring(3));
      } else if (!isDevis && invoiceNumber.startsWith('DEV')) {
        setInvoiceNumber('FAC' + invoiceNumber.substring(3));
      }
    }
  }, [isDevis]);

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPriceHT: 0, tvaRate: 10 }]);
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const totalHT = lines.reduce((sum, line) => sum + (line.quantity * line.unitPriceHT), 0);
  
  const tvaTotals = lines.reduce((acc, line) => {
    const tvaAmount = line.quantity * line.unitPriceHT * (line.tvaRate / 100);
    acc[line.tvaRate] = (acc[line.tvaRate] || 0) + tvaAmount;
    return acc;
  }, {} as Record<number, number>);

  const totalTVA = Object.values(tvaTotals).reduce<number>((sum, val) => sum + (val as number), 0);
  const totalTTC = totalHT + totalTVA;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  if (showConfig) {
    return (
      <div className="min-h-screen bg-white p-8 font-sans">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setShowConfig(false)} className="text-red-600 font-bold underline text-xl">
            RETOUR FACTURE
          </button>
        </div>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">Nom Societe</th>
              <th className="border border-black p-2 text-left">Adresse</th>
              <th className="border border-black p-2 text-left">Information</th>
              <th className="border border-black p-2 text-left">Banques</th>
            </tr>
          </thead>
          <tbody>
            {COMPANIES.map((company, idx) => (
              <tr key={idx} className="cursor-pointer hover:bg-blue-50" onClick={() => { setSelectedCompany(company); setShowConfig(false); }}>
                <td className="border border-black p-2 font-semibold">{company.name}</td>
                <td className="border border-black p-2 whitespace-pre-line">{company.address}<br/>SIRET N° {company.siret}</td>
                <td className="border border-black p-2 whitespace-pre-line">{company.info}</td>
                <td className="border border-black p-2">
                  {company.iban}<br/>
                  {company.bic}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white shadow-lg p-8">
        
        {/* Controls (Not printed) */}
        <div className="print:hidden mb-8 flex flex-wrap gap-4 items-center justify-between bg-gray-100 p-4 rounded-lg">
          <div className="flex gap-4">
            <button onClick={onBack} className="text-red-600 font-bold underline hover:text-red-800">
              RETOUR ACCUEIL
            </button>
            <button onClick={() => setShowConfig(true)} className="text-blue-600 font-bold underline hover:text-blue-800">
              CONFIGURATION FACTURE
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={!isDevis} onChange={() => setIsDevis(!isDevis)} />
                <div className={`block w-14 h-8 rounded-full ${isDevis ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${!isDevis ? 'translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3 text-gray-700 font-medium">
                {isDevis ? 'Mode Devis' : 'Mode Facture'}
              </div>
            </label>
            
            <button onClick={() => window.print()} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">
              Imprimer / PDF
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex gap-6">
            <div className="w-24 h-24 bg-gray-200 flex items-center justify-center font-bold text-gray-400 border-2 border-dashed border-gray-300">
              LOGO
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-4">{selectedCompany.name}</h1>
              <div className="text-sm font-semibold leading-relaxed">
                {selectedCompany.address.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                <div>SIRET N° {selectedCompany.siret}</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-4xl font-bold uppercase tracking-wider mb-8">{isDevis ? 'DEVIS' : 'FACTURE'}</h2>
            
            <div className="print:hidden flex flex-col items-center">
              <div className="text-red-600 text-6xl mb-2">⚠️</div>
              <button 
                onClick={generateNumber}
                className="bg-yellow-300 border-2 border-yellow-500 text-red-700 font-bold p-3 rounded-xl max-w-xs text-sm shadow-md hover:bg-yellow-400 transition-colors"
              >
                CLIQUER ICI AVANT CHAQUE FACTURE POUR GENERER NUMERO DE FACTURE AUTOMATIQUE
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex justify-between mb-8">
          <div className="w-1/3">
            <div className="bg-blue-600 text-white font-bold p-2 mb-2">
              Facturer à :
            </div>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Nom du client" 
                className="w-full border-b border-gray-300 p-1 text-sm font-semibold focus:outline-none focus:border-blue-500"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <textarea 
                placeholder="Adresse" 
                className="w-full border-b border-gray-300 p-1 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="SIRET N°" 
                className="w-full border-b border-gray-300 p-1 text-sm font-semibold focus:outline-none focus:border-blue-500"
                value={clientSiret}
                onChange={(e) => setClientSiret(e.target.value)}
              />
            </div>
          </div>

          <div className="w-1/2 flex flex-col justify-end">
            <div className="flex justify-between font-bold mb-1 px-2">
              <span>Date :</span>
              <input 
                type="date" 
                className="text-right focus:outline-none"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="text-right font-bold mb-2 px-2 capitalize">
              {formatDate(invoiceDate)}
            </div>
            <div className="border-2 border-black p-4 flex justify-between items-center font-bold">
              <span>N°</span>
              <span>{invoiceNumber}</span>
            </div>
          </div>
        </div>

        {/* Aide Calcul HT (Print Hidden) */}
        <div className="print:hidden flex justify-end mb-8">
          <div className="flex items-center gap-4">
            <div className="text-red-600 font-bold bg-yellow-200 px-2 py-1 border border-red-600 text-sm">
              Bien inscrire le HT sur la facture avec les centimes
            </div>
            <table className="border-collapse border border-black text-sm text-center">
              <thead>
                <tr>
                  <th colSpan={3} className="border border-black p-1 bg-gray-100">AIDE CALCUL HT</th>
                </tr>
                <tr>
                  <th className="border border-black p-1">Prix TTC</th>
                  <th className="border border-black p-1">TVA</th>
                  <th className="border border-black p-1">Prix HT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1">
                    <input 
                      type="number" 
                      className="w-20 text-center focus:outline-none" 
                      value={calcTTC || ''} 
                      onChange={(e) => setCalcTTC(parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="border border-black p-1 font-bold">
                    <select 
                      className="focus:outline-none bg-transparent"
                      value={calcTVA}
                      onChange={(e) => setCalcTVA(parseFloat(e.target.value))}
                    >
                      <option value="5.5">5,50%</option>
                      <option value="10">10,00%</option>
                      <option value="20">20,00%</option>
                    </select>
                  </td>
                  <td className="border border-black p-1 font-bold bg-gray-50">
                    {(calcTTC / (1 + calcTVA / 100)).toFixed(2)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Table */}
        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="bg-blue-600 text-white text-left">
              <th className="p-2 w-1/2">Description</th>
              <th className="p-2 text-center">Quantité</th>
              <th className="p-2 text-right">Prix unitaire HT</th>
              <th className="p-2 text-right">Prix total HT</th>
              <th className="p-2 text-center">Taux de TVA</th>
              <th className="p-2 print:hidden w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="border-b border-gray-200 even:bg-gray-50">
                <td className="p-2">
                  <input 
                    type="text" 
                    className="w-full bg-transparent focus:outline-none" 
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    placeholder="Description de l'article"
                  />
                </td>
                <td className="p-2 text-center">
                  <input 
                    type="number" 
                    className="w-16 text-center bg-transparent focus:outline-none" 
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </td>
                <td className="p-2 text-right">
                  <input 
                    type="number" 
                    className="w-24 text-right bg-transparent focus:outline-none" 
                    value={line.unitPriceHT || ''}
                    onChange={(e) => updateLine(idx, 'unitPriceHT', parseFloat(e.target.value) || 0)}
                  /> €
                </td>
                <td className="p-2 text-right font-semibold">
                  {(line.quantity * line.unitPriceHT).toFixed(2)} €
                </td>
                <td className="p-2 text-center">
                  <select 
                    className="bg-transparent focus:outline-none"
                    value={line.tvaRate}
                    onChange={(e) => updateLine(idx, 'tvaRate', parseFloat(e.target.value))}
                  >
                    <option value="5.5">5.5%</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                  </select>
                </td>
                <td className="p-2 print:hidden text-center">
                  <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="print:hidden mb-12">
          <button onClick={addLine} className="text-blue-600 font-semibold hover:underline">+ Ajouter une ligne</button>
        </div>

        {/* Totals & Payment Info */}
        <div className="flex justify-between items-end mb-12">
          <div className="w-1/2 bg-gray-100 p-4 rounded text-sm">
            <div className="bg-blue-600 text-white font-bold p-2 text-center mb-4 uppercase">
              Paiement à réception de {isDevis ? 'devis' : 'facture'}
            </div>
            <div className="flex justify-between font-bold mb-6">
              <span>Échéance</span>
              <input 
                type="date" 
                className="bg-transparent text-right focus:outline-none"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="text-center font-bold mb-4">RIB</div>
            <div className="flex justify-between mb-2">
              <span>{selectedCompany.iban}</span>
              <span className="font-semibold">IBAN</span>
            </div>
            <div className="flex justify-between">
              <span>{selectedCompany.bic}</span>
              <span className="font-semibold">BIC</span>
            </div>
          </div>

          <div className="w-1/3">
            <div className="flex justify-between mb-2 text-gray-600">
              <span>TOTAL HT :</span>
              <span>{totalHT.toFixed(2)} €</span>
            </div>
            {Object.entries(tvaTotals).map(([rate, amount]) => (amount as number) > 0 && (
              <div key={rate} className="flex justify-between mb-2 text-gray-600 italic text-sm">
                <span>TVA à {rate}% :</span>
                <span>{(amount as number).toFixed(2)} €</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-2xl mt-4 pt-4 border-t-2 border-gray-300 text-blue-800">
              <span>TOTAL TTC :</span>
              <span>{totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Legal Text */}
        <div className="text-xs italic text-gray-800 mb-8 space-y-2">
          <p>Taux des pénalités de retard : Taux de refinancement de la BCE majoré de 10 points</p>
          <p>En cas de retard de paiement, indemnité forfaitaire pour les frais de recouvrement : 40€</p>
          <p>Notre société ne consent pas d'escompte</p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-xs font-semibold text-gray-600 whitespace-pre-line">
          {selectedCompany.info}
        </div>

      </div>
    </div>
  );
}
