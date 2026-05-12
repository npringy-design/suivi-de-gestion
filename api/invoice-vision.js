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

    const prompt = `Tu es un assistant comptable pour un restaurant. Analyse cette facture et retourne UNIQUEMENT un objet JSON valide, sans markdown, sans backticks, sans texte avant ou apres.

Colonnes fournisseurs disponibles dans notre systeme :
${knownSuppliers.map((supplier) => `- col ${supplier.col} : ${String(supplier.name || '').replace(/\n/g, ' ')}`).join('\n')}

Regles de correspondance :
- EPISAVEURS / EPISAVEUR -> colonne EPISAVEUR si disponible.
- TERREAZUR / TERRE AZUR / POMONA -> colonne POMONA F&L si disponible.
- RICHARD VINS / VINS RICHARD -> colonne RICHARD VINS si disponible.
- CAFE RICHARD / CAFES RICHARD -> colonne CAFE RICHARD si disponible.
- METRO -> colonne METRO / DEPANNAGE si disponible.
- MARTEL / GH MARTEL -> colonne MARTEL si disponible.
- BRAKE / BRAKES -> colonne BRAKE si disponible.
- SOCOPA -> colonne SOCOPA si disponible.
- Si le fournisseur n'existe pas dans les colonnes, choisis la colonne metier la plus proche selon la nature des produits. Si aucune correspondance claire, choisis METRO / DEPANNAGE.

Le document peut etre scanne, photographie ou tourne. Lis-le comme une image.

Retourne EXACTEMENT ce JSON :
{
  "supplier": "nom exact du fournisseur tel qu'il apparait sur la facture",
  "targetCol": <numero entier entre 45 et 57>,
  "amountHt": <TOTAL HT de la facture entiere, nombre decimal avec point, ex: 1394.29>,
  "invoiceDate": "<date de facturation au format YYYY-MM-DD>"
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
