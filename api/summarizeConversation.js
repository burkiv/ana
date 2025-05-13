// api/summarizeConversation.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { messagesToSummarize } = req.body;
  const apiKey = process.env.OPENAI_API_KEY; // Ensure this is set in Vercel env

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API anahtarı yapılandırılmamış.' });
  }

  if (!messagesToSummarize || !Array.isArray(messagesToSummarize) || messagesToSummarize.length === 0) {
    return res.status(400).json({ error: 'Özetlenecek mesajlar (messagesToSummarize) gereklidir ve bir dizi olmalıdır.' });
  }

  // Prepare messages for the summarization model
  const conversationText = messagesToSummarize
    .map(msg => `${msg.sender === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.text}`)
    .join('\n');

  const summarizationPrompt = `Aşağıdaki konuşmayı kısa ve öz bir şekilde özetle. Bu özet, gelecekteki konuşmalarda yapay zekanın bağlamı hatırlamasına yardımcı olacak. Önemli konuları, kararları ve kullanıcı tercihlerini vurgula:\n\n${conversationText}\n\nÖzet:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Or gpt-4o for higher quality but more cost
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes conversations.' },
          { role: 'user', content: summarizationPrompt },
        ],
        max_tokens: 150, // Adjust as needed
        temperature: 0.3, // Lower temperature for more factual summaries
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Özetleme Hatası:', errorData);
      return res.status(response.status).json({
        error: 'OpenAI API ile özetleme yapılırken hata oluştu.',
        details: errorData,
      });
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim();

    if (!summary) {
      return res.status(500).json({ error: 'Özet oluşturulamadı.' });
    }

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('Özetleme API Hatası:', error);
    return res.status(500).json({ error: 'İç sunucu hatası (özetleme).', details: error.message });
  }
}