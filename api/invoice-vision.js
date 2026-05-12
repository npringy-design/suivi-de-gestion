const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const cleanJsonResponse = (value) => String(value || '')
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    json(res, 503, { error: 'Gemini is not configured' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const imageParts = Array.isArray(body.imageParts) ? body.imageParts.slice(0, 2) : [];
    const knownSuppliers = Array.isArray(body.knownSuppliers) ? body.knownSuppliers : [];

    if (imageParts.length === 0) {
      json(res, 400, { error: 'No invoice image provided' });
      return;
    }

    const prompt = `Tu es un assistant comptable. Analyse cette facture et extrait exactement 3 informations.

1. Le nom du fournisseur (emetteur de la facture, pas le destinataire)
2. La date de la facture (pas la date de livraison ni l'echeance)
3. Le montant total HT de la facture entiere (hors TVA, hors TTC)

Compare le nom du fournisseur avec cette liste de colonnes :
${knownSuppliers.map((supplier) => `- col ${supplier.col} : ${String(supplier.name || '').replace(/\n/g, ' ')}`).join('\n')}

Choisis la colonne dont le nom ressemble le plus au fournisseur trouve. Si aucune ne correspond, prends la col 56.

Retourne UNIQUEMENT ce JSON sans markdown :
{
  "supplier": "nom du fournisseur tel qu'il apparait sur la facture",
  "targetCol": <numero entier>,
  "amountHt": <montant total HT en nombre decimal avec point>,
  "invoiceDate": "<YYYY-MM-DD>"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            ...imageParts.map((part) => ({
              inline_data: {
                mime_type: part.mimeType || 'image/jpeg',
                data: part.data,
              },
            })),
            { text: prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      json(res, response.status, { error: `Gemini API error ${response.status}` });
      return;
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(cleanJsonResponse(raw));
    json(res, 200, { invoice: parsed });
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Invoice vision failed' });
  }
}
