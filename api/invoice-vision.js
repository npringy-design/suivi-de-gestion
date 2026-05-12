const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  json(res, 410, {
    error: 'Invoice Vision is disabled',
    message: 'La lecture IA des factures est desactivee. Utiliser le flux local PDF/OCR/regex.',
  });
}
