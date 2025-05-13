// api/sendMessage.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { threadId, messageContent, assistantId } = req.body; // memoryContext kaldırıldı
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API anahtarı yapılandırılmamış.' });
  }

  if (!threadId || !messageContent || !assistantId) {
    return res.status(400).json({ error: 'threadId, messageContent ve assistantId gereklidir.' });
  }

  try {
    // 1. Mesajı thread'e ekle (Bu kısım aynı kalabilir)
    const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent,
      }),
    });

    if (!addMessageResponse.ok) {
      const errorData = await addMessageResponse.json();
      console.error('OpenAI Mesaj Ekleme Hatası:', errorData);
      return res.status(addMessageResponse.status).json({
        error: 'OpenAI API\'sine mesaj eklenirken hata oluştu.',
        details: errorData
      });
    }

    // 2. Run başlat
    const runRequestBody = {
      assistant_id: assistantId,
    };

    const createRunResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify(runRequestBody), // Sadece assistant_id içeriyor
    });

    if (!createRunResponse.ok) {
      const errorData = await createRunResponse.json();
      console.error('OpenAI Run Başlatma Hatası:', errorData);
      return res.status(createRunResponse.status).json({
        error: 'OpenAI API\'sinde run başlatılırken hata oluştu.',
        details: errorData
      });
    }

    const runData = await createRunResponse.json();
    return res.status(200).json({ runId: runData.id });

  } catch (error) {
    console.error('Proxy API Hatası (sendMessage):', error);
    return res.status(500).json({ error: 'İç sunucu hatası (sendMessage).', details: error.message });
  }
}